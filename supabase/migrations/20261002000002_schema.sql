-- AGORA · 002 · Core schema
-- 임베딩 차원: 1536 (text-embedding-3-small 기본값). 다른 모델을 쓰려면 vector(N)을 함께 바꿔야 합니다.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- 공통: updated_at 자동 갱신
-- ---------------------------------------------------------------------------
create or replace function public.agora_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- 메모리 테이블용: 접근 기록(last_accessed_at, access_count)만 바뀐 경우에는 updated_at 을 유지한다.
-- recency 점수는 updated_at(내용의 신선도) 기준이므로, 단순 조회가 recency 를 올리지 않도록 한다.
create or replace function public.agora_set_memory_updated_at()
returns trigger
language plpgsql
set search_path = public, extensions   -- vector 비교 연산자(=)가 extensions 스키마에 있다
as $$
begin
  if new.content is distinct from old.content
     or new.importance is distinct from old.importance
     or new.confidence is distinct from old.confidence
     or new.embedding is distinct from old.embedding then
    new.updated_at = now();
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles : auth.users 1:1
-- ---------------------------------------------------------------------------
create table public.agora_profiles (
  id             uuid primary key references auth.users (id) on delete cascade,
  nickname       text,
  avatar_url     text,
  memory_enabled boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger agora_profiles_updated_at before update on public.agora_profiles
  for each row execute function public.agora_set_updated_at();

-- ---------------------------------------------------------------------------
-- characters : 공개 콘텐츠 (Persona 원문은 별도 테이블에서 비공개로 관리)
-- ---------------------------------------------------------------------------
create table public.agora_characters (
  id               uuid primary key default gen_random_uuid(),
  code             text not null unique,
  name             text not null,
  name_en          text not null,
  birth_year       integer,          -- 기원전은 음수 (예: -470)
  death_year       integer,
  lifetime_label   text,             -- 표시용 (예: "기원전 470년경 – 기원전 399년")
  description      text not null,
  short_philosophy text not null,
  tagline          text,             -- 카드용 한 줄 (예: "삶 · 사랑 · 성장")
  topics           text[] not null default '{}',
  portrait_url     text,
  sort_order       integer not null default 0,
  is_active        boolean not null default true,
  created_at       timestamptz not null default now()
);

-- Persona Profile (identity / worldview / conversational_style / avoid_behavior ...)
-- 클라이언트에서 읽을 수 없도록 RLS 정책을 두지 않는다 → Edge Function(service role)만 접근.
create table public.agora_character_personas (
  character_id   uuid primary key references public.agora_characters (id) on delete cascade,
  persona        jsonb not null,
  persona_prompt text,               -- 선택: 구조화 Persona 뒤에 덧붙일 추가 지시문
  updated_at     timestamptz not null default now()
);
create trigger agora_character_personas_updated_at before update on public.agora_character_personas
  for each row execute function public.agora_set_updated_at();

-- ---------------------------------------------------------------------------
-- chat_sessions / chat_messages
-- ---------------------------------------------------------------------------
create table public.agora_chat_sessions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  character_id              uuid not null references public.agora_characters (id),
  topic                     text,
  reflection                text,
  message_count             integer not null default 0,
  memory_extracted_count    integer not null default 0,   -- 마지막 추출 시점의 message_count
  last_memory_extraction_at timestamptz,
  started_at                timestamptz not null default now(),
  ended_at                  timestamptz,
  updated_at                timestamptz not null default now()
);
create index agora_chat_sessions_user_idx on public.agora_chat_sessions (user_id, started_at desc);
create index agora_chat_sessions_user_character_idx on public.agora_chat_sessions (user_id, character_id, started_at desc);
create trigger agora_chat_sessions_updated_at before update on public.agora_chat_sessions
  for each row execute function public.agora_set_updated_at();

create table public.agora_chat_messages (
  id         uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.agora_chat_sessions (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null check (role in ('user', 'assistant', 'system')),
  content    text not null,
  metadata   jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index agora_chat_messages_session_idx on public.agora_chat_messages (session_id, created_at);

-- 메시지 수를 세션에 집계 (메모리 추출 주기 판단용)
create or replace function public.agora_bump_session_message_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.agora_chat_sessions
     set message_count = message_count + 1
   where id = new.session_id;
  return new;
end;
$$;
create trigger agora_chat_messages_count after insert on public.agora_chat_messages
  for each row execute function public.agora_bump_session_message_count();

-- ---------------------------------------------------------------------------
-- user_memories : Episodic / Semantic Long-term Memory
--   character_id IS NULL  → GLOBAL MEMORY  (모든 인물이 참고)
--   character_id NOT NULL → CHARACTER MEMORY (해당 인물만 참고)
-- ---------------------------------------------------------------------------
create table public.agora_user_memories (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  character_id      uuid references public.agora_characters (id) on delete cascade,
  memory_type       text not null check (memory_type in ('episodic', 'semantic')),
  content           text not null,
  importance        real not null default 0.5 check (importance between 0 and 1),
  confidence        real not null default 0.7 check (confidence between 0 and 1),
  embedding         vector(1536),
  source_session_id uuid references public.agora_chat_sessions (id) on delete set null,
  archived          boolean not null default false,   -- 통합(consolidation)되어 비활성화된 기억
  consolidated_into uuid references public.agora_user_memories (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  last_accessed_at  timestamptz,
  access_count      integer not null default 0
);
create index agora_user_memories_user_idx on public.agora_user_memories (user_id, archived, character_id);
create index agora_user_memories_embedding_idx on public.agora_user_memories
  using hnsw (embedding vector_cosine_ops);
create trigger agora_user_memories_updated_at before update on public.agora_user_memories
  for each row execute function public.agora_set_memory_updated_at();

-- ---------------------------------------------------------------------------
-- user_profiles_ai : 대화에서 추론한 사용자 프로필 (CURRENT USER PROFILE)
-- ---------------------------------------------------------------------------
create table public.agora_user_profiles_ai (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null unique references auth.users (id) on delete cascade,
  summary     text,
  "values"    jsonb not null default '[]'::jsonb,
  goals       jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '[]'::jsonb,
  updated_at  timestamptz not null default now()
);
create trigger agora_user_profiles_ai_updated_at before update on public.agora_user_profiles_ai
  for each row execute function public.agora_set_updated_at();

-- ---------------------------------------------------------------------------
-- relationship_memories : 특정 인물과 사용자 사이에 쌓인 관계의 기억
-- ---------------------------------------------------------------------------
create table public.agora_relationship_memories (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  character_id      uuid not null references public.agora_characters (id) on delete cascade,
  content           text not null,
  importance        real not null default 0.5 check (importance between 0 and 1),
  confidence        real not null default 0.7 check (confidence between 0 and 1),
  embedding         vector(1536),
  source_session_id uuid references public.agora_chat_sessions (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  last_accessed_at  timestamptz,
  access_count      integer not null default 0
);
create index agora_relationship_memories_user_char_idx on public.agora_relationship_memories (user_id, character_id);
create index agora_relationship_memories_embedding_idx on public.agora_relationship_memories
  using hnsw (embedding vector_cosine_ops);
create trigger agora_relationship_memories_updated_at before update on public.agora_relationship_memories
  for each row execute function public.agora_set_memory_updated_at();

-- 관계의 현재 상태 요약 (사용자 변화 추적)
create table public.agora_relationship_profiles (
  user_id       uuid not null references auth.users (id) on delete cascade,
  character_id  uuid not null references public.agora_characters (id) on delete cascade,
  summary       text,
  recent_change text,
  themes        jsonb not null default '[]'::jsonb,
  updated_at    timestamptz not null default now(),
  primary key (user_id, character_id)
);
create trigger agora_relationship_profiles_updated_at before update on public.agora_relationship_profiles
  for each row execute function public.agora_set_updated_at();

-- ---------------------------------------------------------------------------
-- Character Knowledge Base (RAG) — 사용자 Memory와 완전히 분리
-- ---------------------------------------------------------------------------
create table public.agora_character_documents (
  id             uuid primary key default gen_random_uuid(),
  character_id   uuid not null references public.agora_characters (id) on delete cascade,
  title          text not null,
  source         text,                -- 출처 (예: "Plato, Apology")
  source_type    text not null check (source_type in (
                   'primary_text',      -- 실제 원문/번역 (인용 가능)
                   'work_summary',      -- 저작 요약 (인용 불가, 해석)
                   'biography',         -- 생애
                   'thought_summary',   -- 사상 정리
                   'misattribution'     -- 흔한 오인용 경고
                 )),
  author         text,
  published_year integer,
  content        text not null,
  metadata       jsonb not null default '{}'::jsonb,  -- source_location, original_text, translated_text, verbatim, translator ...
  embedded_at    timestamptz,
  created_at     timestamptz not null default now(),
  unique (character_id, title)   -- 시드를 다시 실행해도 중복되지 않도록
);

create table public.agora_character_document_chunks (
  id           uuid primary key default gen_random_uuid(),
  document_id  uuid not null references public.agora_character_documents (id) on delete cascade,
  character_id uuid not null references public.agora_characters (id) on delete cascade,
  chunk_index  integer not null,
  content      text not null,
  embedding    vector(1536),
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  unique (document_id, chunk_index)
);
create index agora_character_document_chunks_character_idx on public.agora_character_document_chunks (character_id);
create index agora_character_document_chunks_embedding_idx on public.agora_character_document_chunks
  using hnsw (embedding vector_cosine_ops);

-- ---------------------------------------------------------------------------
-- 신규 가입 시 agora_profiles / agora_user_profiles_ai 생성
-- ---------------------------------------------------------------------------
create or replace function public.agora_handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.agora_profiles (id, nickname, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'nickname',
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;

  insert into public.agora_user_profiles_ai (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
exception when others then
  -- auth.users 를 다른 서비스와 공유하므로, AGORA 쪽 오류가 다른 서비스의 가입을 막으면 안 된다.
  raise warning 'agora_handle_new_user failed for %: %', new.id, sqlerrm;
  return new;
end;
$$;

create trigger agora_on_auth_user_created
  after insert on auth.users
  for each row execute function public.agora_handle_new_user();

-- 이미 가입되어 있는 사용자(공유 프로젝트의 기존 회원)도 AGORA 프로필을 갖도록 채운다
insert into public.agora_profiles (id, nickname, avatar_url)
select u.id,
       coalesce(
         u.raw_user_meta_data ->> 'nickname',
         u.raw_user_meta_data ->> 'full_name',
         u.raw_user_meta_data ->> 'name',
         split_part(u.email, '@', 1)
       ),
       u.raw_user_meta_data ->> 'avatar_url'
  from auth.users u
on conflict (id) do nothing;

insert into public.agora_user_profiles_ai (user_id)
select u.id from auth.users u
on conflict (user_id) do nothing;
