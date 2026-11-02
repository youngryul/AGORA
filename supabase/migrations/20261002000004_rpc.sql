-- AGORA · 004 · Retrieval RPCs
-- 모든 함수는 SECURITY INVOKER 이다.
--  - 클라이언트(authenticated)가 호출하면 RLS 가 그대로 적용된다.
--  - Edge Function(service role)이 호출하면 RLS 는 우회되지만, p_user_id 로 반드시 필터링한다.

set search_path = public, extensions;

-- ---------------------------------------------------------------------------
-- agora_match_user_memories
--   memory_score = similarity*w_s + importance*w_i + recency*w_r + frequency*w_f
--   1) 임베딩 거리 기준으로 후보(p_candidate_count개)를 HNSW 인덱스로 빠르게 뽑고
--   2) 후보 안에서 복합 점수로 재정렬하여 상위 p_match_count개만 반환
--   스코프: GLOBAL(character_id is null) + 해당 CHARACTER MEMORY
-- ---------------------------------------------------------------------------
create or replace function public.agora_match_user_memories(
  p_user_id                uuid,
  p_character_id           uuid,
  p_query_embedding        vector(1536),
  p_match_count            integer default 5,
  p_min_similarity         double precision default 0.25,
  p_candidate_count        integer default 40,
  p_w_similarity           double precision default 0.55,
  p_w_importance           double precision default 0.20,
  p_w_recency              double precision default 0.15,
  p_w_frequency            double precision default 0.10,
  p_recency_half_life_days double precision default 30
)
returns table (
  id           uuid,
  character_id uuid,
  memory_type  text,
  content      text,
  importance   real,
  confidence   real,
  created_at   timestamptz,
  similarity   double precision,
  recency      double precision,
  frequency    double precision,
  score        double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with candidates as (
    select m.*,
           1 - (m.embedding <=> p_query_embedding) as sim
      from public.agora_user_memories m
     where m.user_id = p_user_id
       and not m.archived
       and m.embedding is not null
       and (m.character_id is null or m.character_id = p_character_id)
     order by m.embedding <=> p_query_embedding
     limit p_candidate_count
  ),
  scored as (
    select c.id, c.character_id, c.memory_type, c.content, c.importance, c.confidence, c.created_at,
           c.sim as similarity,
           exp(-ln(2) * (extract(epoch from (now() - c.updated_at)) / 86400.0) / p_recency_half_life_days) as recency,
           least(1.0, ln(1 + c.access_count) / ln(21)) as frequency
      from candidates c
     where c.sim >= p_min_similarity
  )
  select s.*,
         s.similarity * p_w_similarity
       + s.importance * p_w_importance
       + s.recency    * p_w_recency
       + s.frequency  * p_w_frequency as score
    from scored s
   order by score desc
   limit p_match_count;
$$;

-- ---------------------------------------------------------------------------
-- agora_match_relationship_memories : 특정 인물과의 관계 기억
-- ---------------------------------------------------------------------------
create or replace function public.agora_match_relationship_memories(
  p_user_id                uuid,
  p_character_id           uuid,
  p_query_embedding        vector(1536),
  p_match_count            integer default 3,
  p_min_similarity         double precision default 0.15,
  p_candidate_count        integer default 30,
  p_w_similarity           double precision default 0.55,
  p_w_importance           double precision default 0.20,
  p_w_recency              double precision default 0.15,
  p_w_frequency            double precision default 0.10,
  p_recency_half_life_days double precision default 45
)
returns table (
  id          uuid,
  content     text,
  importance  real,
  confidence  real,
  created_at  timestamptz,
  similarity  double precision,
  recency     double precision,
  frequency   double precision,
  score       double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  with candidates as (
    select r.*,
           1 - (r.embedding <=> p_query_embedding) as sim
      from public.agora_relationship_memories r
     where r.user_id = p_user_id
       and r.character_id = p_character_id
       and r.embedding is not null
     order by r.embedding <=> p_query_embedding
     limit p_candidate_count
  ),
  scored as (
    select c.id, c.content, c.importance, c.confidence, c.created_at,
           c.sim as similarity,
           exp(-ln(2) * (extract(epoch from (now() - c.updated_at)) / 86400.0) / p_recency_half_life_days) as recency,
           least(1.0, ln(1 + c.access_count) / ln(21)) as frequency
      from candidates c
     where c.sim >= p_min_similarity
  )
  select s.*,
         s.similarity * p_w_similarity
       + s.importance * p_w_importance
       + s.recency    * p_w_recency
       + s.frequency  * p_w_frequency as score
    from scored s
   order by score desc
   limit p_match_count;
$$;

-- ---------------------------------------------------------------------------
-- agora_match_character_documents : Character Knowledge RAG
-- ---------------------------------------------------------------------------
create or replace function public.agora_match_character_documents(
  p_character_id    uuid,
  p_query_embedding vector(1536),
  p_match_count     integer default 4,
  p_min_similarity  double precision default 0.2
)
returns table (
  chunk_id       uuid,
  document_id    uuid,
  content        text,
  metadata       jsonb,
  title          text,
  source         text,
  source_type    text,
  author         text,
  published_year integer,
  similarity     double precision
)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select ch.id, ch.document_id, ch.content, ch.metadata,
         d.title, d.source, d.source_type, d.author, d.published_year,
         1 - (ch.embedding <=> p_query_embedding) as similarity
    from public.agora_character_document_chunks ch
    join public.agora_character_documents d on d.id = ch.document_id
   where ch.character_id = p_character_id
     and ch.embedding is not null
     and 1 - (ch.embedding <=> p_query_embedding) >= p_min_similarity
   order by ch.embedding <=> p_query_embedding
   limit p_match_count;
$$;

-- ---------------------------------------------------------------------------
-- agora_find_similar_user_memory : 신규 기억 저장 전 중복 확인
-- ---------------------------------------------------------------------------
create or replace function public.agora_find_similar_user_memory(
  p_user_id         uuid,
  p_character_id    uuid,
  p_query_embedding vector(1536),
  p_min_similarity  double precision default 0.92
)
returns table (id uuid, content text, importance real, confidence real, similarity double precision)
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select m.id, m.content, m.importance, m.confidence,
         1 - (m.embedding <=> p_query_embedding) as similarity
    from public.agora_user_memories m
   where m.user_id = p_user_id
     and not m.archived
     and m.embedding is not null
     and m.character_id is not distinct from p_character_id
     and 1 - (m.embedding <=> p_query_embedding) >= p_min_similarity
   order by m.embedding <=> p_query_embedding
   limit 1;
$$;

-- ---------------------------------------------------------------------------
-- touch_* : 검색되어 프롬프트에 사용된 기억의 접근 기록 갱신 (frequency 반영)
--   agora_set_memory_updated_at 트리거 덕분에 updated_at(recency 기준)은 바뀌지 않는다.
-- ---------------------------------------------------------------------------
create or replace function public.agora_touch_user_memories(p_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update public.agora_user_memories
     set last_accessed_at = now(),
         access_count = access_count + 1
   where id = any (p_ids);
$$;

create or replace function public.agora_touch_relationship_memories(p_ids uuid[])
returns void
language sql
security invoker
set search_path = public
as $$
  update public.agora_relationship_memories
     set last_accessed_at = now(),
         access_count = access_count + 1
   where id = any (p_ids);
$$;

-- ---------------------------------------------------------------------------
-- agora_delete_all_my_memories : 사용자가 "전체 Memory 삭제"를 요청한 경우
--   Long-term / Relationship Memory 와 AI 프로필 요약을 모두 초기화한다. (대화 기록은 유지)
-- ---------------------------------------------------------------------------
create or replace function public.agora_delete_all_my_memories()
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  delete from public.agora_user_memories where user_id = v_uid;
  delete from public.agora_relationship_memories where user_id = v_uid;
  delete from public.agora_relationship_profiles where user_id = v_uid;
  update public.agora_user_profiles_ai
     set summary = null, "values" = '[]'::jsonb, goals = '[]'::jsonb, preferences = '[]'::jsonb
   where user_id = v_uid;
end;
$$;

-- 검색/갱신 RPC 는 Edge Function(service role) 전용. 클라이언트에는 전체 삭제만 허용한다.
revoke execute on function public.agora_match_user_memories from public, anon, authenticated;
revoke execute on function public.agora_match_relationship_memories from public, anon, authenticated;
revoke execute on function public.agora_match_character_documents from public, anon, authenticated;
revoke execute on function public.agora_find_similar_user_memory from public, anon, authenticated;
revoke execute on function public.agora_touch_user_memories from public, anon, authenticated;
revoke execute on function public.agora_touch_relationship_memories from public, anon, authenticated;
grant execute on function public.agora_match_user_memories to service_role;
grant execute on function public.agora_match_relationship_memories to service_role;
grant execute on function public.agora_match_character_documents to service_role;
grant execute on function public.agora_find_similar_user_memory to service_role;
grant execute on function public.agora_touch_user_memories to service_role;
grant execute on function public.agora_touch_relationship_memories to service_role;
revoke execute on function public.agora_delete_all_my_memories from public, anon;
grant execute on function public.agora_delete_all_my_memories to authenticated;
