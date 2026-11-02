-- AGORA · 003 · Row Level Security
-- 원칙
--  1) 사용자 데이터는 auth.uid() = user_id 인 행만 접근 가능
--  2) 메시지 / 메모리 INSERT 는 Edge Function(service role)만 수행 → 클라이언트 INSERT 정책 없음
--  3) 공용 콘텐츠(characters, documents, chunks)는 읽기만 허용
--  4) character_personas 는 정책 없음 → 클라이언트에서 전혀 읽을 수 없음

alter table public.agora_profiles                  enable row level security;
alter table public.agora_characters                enable row level security;
alter table public.agora_character_personas        enable row level security;
alter table public.agora_chat_sessions             enable row level security;
alter table public.agora_chat_messages             enable row level security;
alter table public.agora_user_memories             enable row level security;
alter table public.agora_user_profiles_ai          enable row level security;
alter table public.agora_relationship_memories     enable row level security;
alter table public.agora_relationship_profiles     enable row level security;
alter table public.agora_character_documents       enable row level security;
alter table public.agora_character_document_chunks enable row level security;

-- profiles ------------------------------------------------------------------
create policy "profiles: read own" on public.agora_profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "profiles: update own" on public.agora_profiles
  for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

-- characters (public read) ---------------------------------------------------
create policy "characters: public read active" on public.agora_characters
  for select to anon, authenticated using (is_active);

-- chat_sessions ---------------------------------------------------------------
create policy "chat_sessions: read own" on public.agora_chat_sessions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "chat_sessions: create own" on public.agora_chat_sessions
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy "chat_sessions: delete own" on public.agora_chat_sessions
  for delete to authenticated using (user_id = (select auth.uid()));
-- 세션 종료/회고 갱신은 generate-reflection Edge Function 이 수행하므로 UPDATE 정책은 두지 않는다.

-- chat_messages ---------------------------------------------------------------
create policy "chat_messages: read own" on public.agora_chat_messages
  for select to authenticated using (user_id = (select auth.uid()));

-- user_memories ---------------------------------------------------------------
create policy "user_memories: read own" on public.agora_user_memories
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_memories: update own" on public.agora_user_memories
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "user_memories: delete own" on public.agora_user_memories
  for delete to authenticated using (user_id = (select auth.uid()));

-- user_profiles_ai ------------------------------------------------------------
create policy "user_profiles_ai: read own" on public.agora_user_profiles_ai
  for select to authenticated using (user_id = (select auth.uid()));
create policy "user_profiles_ai: update own" on public.agora_user_profiles_ai
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- relationship_memories -------------------------------------------------------
create policy "relationship_memories: read own" on public.agora_relationship_memories
  for select to authenticated using (user_id = (select auth.uid()));
create policy "relationship_memories: delete own" on public.agora_relationship_memories
  for delete to authenticated using (user_id = (select auth.uid()));

-- relationship_profiles -------------------------------------------------------
create policy "relationship_profiles: read own" on public.agora_relationship_profiles
  for select to authenticated using (user_id = (select auth.uid()));
create policy "relationship_profiles: delete own" on public.agora_relationship_profiles
  for delete to authenticated using (user_id = (select auth.uid()));

-- character knowledge (public read) -------------------------------------------
create policy "character_documents: public read" on public.agora_character_documents
  for select to anon, authenticated using (true);
create policy "character_document_chunks: public read" on public.agora_character_document_chunks
  for select to anon, authenticated using (true);
