# AGORA

> **시대를 넘어, 대화하다.**

AGORA는 괴테, 소크라테스, 마르쿠스 아우렐리우스 같은 역사적·철학적 인물과 **지속적으로** 대화하는 사유·자기성찰 플랫폼입니다.
정답을 주는 챗봇이 아니라, 당신을 기억하고 질문을 던져 생각을 넓혀 주는 **사유의 상대**를 목표로 합니다.

사용자가 느껴야 하는 것:

- "AI가 답했다"가 아니라 **"괴테와 이야기를 나누었다."**
- **"그가 지난번 이야기를 기억하고 있다."**
- **"대화를 거듭할수록 나를 조금씩 알아가고 있다."**

핵심 차별점:

| | |
|---|---|
| **Character Persona** | 단순한 "너는 괴테다"가 아니라 identity / worldview / questioning_style / avoid_behavior 등으로 구조화된 Persona Profile |
| **Long-term Memory** | Episodic · Semantic 기억을 추출해 pgvector로 검색 (similarity + importance + recency + frequency) |
| **Relationship Memory** | 인물별로 쌓이는 관계의 기억과 "최근 관계 변화" 추적 |
| **Character RAG** | 실제 저작/생애 지식을 검색. 실제 인용(VERBATIM)과 해석을 구분하며, 없는 명언을 만들지 않음 |

---

## 목차

1. [Architecture](#architecture)
2. [Tech Stack](#tech-stack)
3. [Folder Structure](#folder-structure)
4. [시작하기 (로컬)](#시작하기-로컬)
5. [Supabase 설정](#supabase-설정)
6. [Supabase Auth 설정](#supabase-auth-설정)
7. [Database Migration · pgvector](#database-migration--pgvector)
8. [Edge Functions 배포](#edge-functions-배포)
9. [AI API 설정](#ai-api-설정)
10. [Environment Variables](#environment-variables)
11. [Memory Architecture](#memory-architecture)
12. [RAG Architecture](#rag-architecture)
13. [Safety Layer](#safety-layer)
14. [Security](#security)
15. [Deployment](#deployment)
16. [테스트](#테스트)
17. [Roadmap](#roadmap)

---

## Architecture

```
┌────────────────────────┐
│ React (Vite, Vercel)   │  anon key 만 보유. AI API 직접 호출 없음.
│  TanStack Query (서버) │
│  Zustand (UI/스트리밍) │
└──────────┬─────────────┘
           │ Supabase Auth (Email / Google) → JWT
           ├──────────────────────────────► Supabase PostgreSQL (RLS)
           │   공개 콘텐츠 · 내 세션/메시지/기억 조회        ▲
           │                                                 │ service role
           ▼                                                 │
┌──────────────────────────────────────────────────────────┐
│ Supabase Edge Functions (Deno)                           │
│  chat · extract-memory · consolidate-memory               │
│  generate-reflection · embed-document · update-memory     │
│  ─ _shared/ai/        LLM · Embedding Provider 추상화      │
│  ─ _shared/ai/prompt-builder.ts                           │
│  ─ _shared/prompts/   Safety / Persona / Memory 템플릿    │
│  ─ _shared/memory/    검색 · 추출 · 통합 (Chat 과 분리)    │
│  ─ _shared/rag/       Character Knowledge 검색 · Chunking │
│  ─ _shared/safety/    위험 신호 탐지                       │
└──────────┬───────────────────────────────────────────────┘
           ▼
     OpenAI (또는 호환) API — Secret 은 Edge Function 에만
```

### 대화 요청 흐름 (`chat`)

```
User Message
 → React (fetch + ReadableStream)
 → Edge Function `chat`
    1. JWT 검증
    2. 사용자 메시지 저장
    3. Recent Conversation 조회 (Working Memory, 최근 16개)
    4. 질의 임베딩 1회 → 아래 검색을 병렬 실행
       ├ Long-term Memory   (agora_match_user_memories)
       ├ Relationship Memory(agora_match_relationship_memories)
       └ Character RAG      (agora_match_character_documents)
    5. Risk 평가 (Safety Layer)
    6. Prompt Builder 조립
    7. LLM Streaming → SSE 로 그대로 전달
    8. Assistant Message 저장 · 사용된 기억 access_count 갱신
    9. 새 메시지가 12개 이상 쌓였으면 백그라운드 Memory Extraction
```

클라이언트가 중간에 연결을 끊어도 생성과 저장은 `EdgeRuntime.waitUntil` 로 끝까지 진행됩니다.

### Prompt 조립 순서

```
SYSTEM SAFETY            (_shared/prompts/safety.ts)      ← 항상 최우선
+ CHARACTER PERSONA      (_shared/prompts/persona.ts)
+ QUOTATION POLICY / RESPONSE GUIDELINES
+ CURRENT USER PROFILE   (user_profiles_ai)
+ RELEVANT LONG-TERM MEMORY (3~7개만)
+ RELATIONSHIP MEMORY
+ CHARACTER KNOWLEDGE RAG ([VERBATIM] / [요약·해석] 표시)
+ THIS CONVERSATION      (날짜, 주제)
+ RECENT CONVERSATION    (문자 예산 내로 trim)
+ [SAFETY MODE OVERRIDE] (위험 감지 시 현재 메시지 직전에 한 번 더)
+ CURRENT USER MESSAGE
```

> 요구사항의 `src/lib/ai/prompt-builder.ts` 는 **서버 측** `supabase/functions/_shared/ai/prompt-builder.ts` 에 있습니다.
> Prompt 와 Persona 는 서버에서만 조립되어야 하기 때문입니다 (클라이언트가 프롬프트를 조작하거나 Persona 원문을 볼 수 없도록).
> 클라이언트의 `src/lib/ai/` 에는 SSE 스트림 리더만 있습니다.

---

## Tech Stack

| 영역 | 사용 |
|---|---|
| Frontend | React 19, TypeScript, Vite, React Router, Zustand, TanStack Query, Tailwind CSS v4 |
| Backend | Supabase (PostgreSQL, Auth, Edge Functions, pgvector, RLS) |
| AI | OpenAI Chat Completions / Embeddings (또는 OpenAI 호환 API), Provider 교체 가능 |
| Deploy | Vercel (Frontend) + Supabase (DB / Functions) |

별도의 Node/Spring API 서버는 없습니다.

---

## Folder Structure

```
src/
  app/                 App, router, providers
  components/
    layout/            AppShell (헤더/푸터/내비)
    ui/                Button, Field, Switch, Dialog, Portrait, Spinner, States
  features/
    auth/              auth-store, api, RequireAuth
    characters/        api, CharacterCard, topics
    chat/              api, useChatStream, MessageBubble, Composer, SafetyNotice
    memory/            api, MemoryCard
    history/           api
    relationship/      api
  pages/               Landing, Characters, CharacterDetail, TopicSelect, Chat,
                       History, Memory, Relationship, Login, AuthCallback, NotFound
  lib/
    supabase/          client, functions (JWT 헤더로 Edge Function 호출)
    ai/                chat-stream (SSE 리더)
    query-keys.ts, utils.ts
  stores/              ui-store (theme), chat-store (스트리밍 상태)
  styles/              index.css (디자인 토큰, light/dark)
  types/               database.ts

supabase/
  config.toml
  migrations/
    ..._extensions.sql   pgvector
    ..._schema.sql       테이블, 트리거
    ..._rls.sql          Row Level Security
    ..._rpc.sql          agora_match_* / agora_touch_* / agora_delete_all_my_memories
  seed.sql               인물 3명 + Persona + Knowledge Base
  functions/
    _shared/             (위 Architecture 참고)
    chat/  extract-memory/  consolidate-memory/
    generate-reflection/  embed-document/  update-memory/
    tests/core_test.ts   Deno 단위 테스트

scripts/embed-documents.mjs   Knowledge Base 임베딩 생성
public/portraits/             인물 초상 (SVG 메달리온 — 퍼블릭 도메인 초상화로 교체 가능)
```

---

## 시작하기 (로컬)

### 준비물

- Node.js 20+
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase` 로도 실행 가능)
- Docker Desktop (로컬 Supabase 실행 시)
- OpenAI API Key (또는 OpenAI 호환 API)

### 1. 의존성 설치

```bash
npm install
```

### 2. 로컬 Supabase 실행 (마이그레이션 + 시드 자동 적용)

```bash
npx supabase start
```

출력된 `API URL` 과 `anon key` 를 `.env.local` 에 넣습니다.

```bash
cp .env.local .env.local
```

### 3. Edge Function Secret 설정 (로컬)

```bash
cp supabase/functions/.env.local supabase/functions/.env
```

`supabase/functions/.env` 에 `OPENAI_API_KEY` 등을 채웁니다. (이 파일은 `.gitignore` 대상입니다.)

```bash
npx supabase functions serve --env-file supabase/functions/.env
```

### 4. Knowledge Base 임베딩 생성

```bash
SUPABASE_URL=http://127.0.0.1:54331 SUPABASE_SERVICE_ROLE_KEY=<supabase start 출력의 service_role key> npm run embed:docs
```

> PowerShell: `$env:SUPABASE_URL="..."; $env:SUPABASE_SERVICE_ROLE_KEY="..."; npm run embed:docs`

### 5. 프론트엔드 실행

```bash
npm run dev
```

http://localhost:5173 에서 확인합니다.

---

## Supabase 설정

1. [supabase.com](https://supabase.com) 에서 프로젝트 생성
2. 로컬과 연결

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

3. **Project Settings → API** 에서 `Project URL` 과 `anon` (또는 publishable) key 를 확인해 프론트엔드 환경 변수로 사용합니다.

---

## Supabase Auth 설정

### Email

**Authentication → Providers → Email** 활성화. 이메일 확인(Confirm email)을 켜면 가입 후 메일 링크를 통해 `/auth/callback` 으로 돌아옵니다.

### Google OAuth

1. Google Cloud Console → OAuth 클라이언트 ID (웹 애플리케이션) 생성
2. 승인된 리디렉션 URI: `https://<project-ref>.supabase.co/auth/v1/callback`
3. Supabase **Authentication → Providers → Google** 에 Client ID / Secret 입력
4. **Authentication → URL Configuration**
   - Site URL: `https://<your-vercel-domain>`
   - Redirect URLs: `http://localhost:5173/auth/callback`, `https://<your-vercel-domain>/auth/callback`

로컬에서 Google 로그인을 쓰려면 `supabase/config.toml` 의 `[auth.external.google] enabled = true` 로 바꾸고
`SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` / `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` 환경 변수를 설정합니다.

가입 시 `agora_on_auth_user_created` 트리거가 `agora_profiles` 와 `agora_user_profiles_ai` 행을 자동 생성합니다.

### 접근 범위

| 로그인 없이 | 로그인 필요 |
|---|---|
| Landing, 인물 목록, 인물 소개 | 주제 선택(세션 생성), Chat, 대화 기록, 관계, 기억 |

---

## Database Migration · pgvector

AGORA 는 다른 서비스와 같은 Supabase 프로젝트를 공유할 수 있도록 `public` 스키마의 모든 테이블, 함수, 트리거, 인덱스에 `agora_` 접두사를 씁니다.

### 공유 운영 DB 에 적용

Dashboard → **SQL Editor** 에서 아래 파일을 **순서대로** 실행합니다.

1. `supabase/migrations/20261002000001_extensions.sql`
2. `supabase/migrations/20261002000002_schema.sql`
3. `supabase/migrations/20261002000003_rls.sql`
4. `supabase/migrations/20261002000004_rpc.sql`
5. `supabase/seed.sql`

- 2번은 `auth.users` 에 트리거를 추가하고, 기존 회원 전원의 `agora_profiles` 행을 만듭니다.
- 2~4번은 다시 실행하면 이미 있는 객체 때문에 실패합니다. 5번은 다시 실행해도 안전합니다.
- 공유 프로젝트에서는 `supabase db push` 를 쓰지 마세요. 원격 마이그레이션 이력이 이 저장소와 달라 거부되거나 이력이 꼬일 수 있습니다.

### pgvector

`20261002000001_extensions.sql` 이 `extensions` 스키마에 `vector` 를 활성화합니다.
모든 임베딩 컬럼은 `vector(1536)` 이며 HNSW (`vector_cosine_ops`) 인덱스를 사용합니다.

> 다른 차원의 임베딩 모델을 쓰려면 마이그레이션의 `vector(1536)` 과 RPC 시그니처, `AI_EMBEDDING_DIMENSIONS` 를 함께 바꿔야 합니다.

### 테이블

| 테이블 | 설명 |
|---|---|
| `agora_profiles` | 닉네임, `memory_enabled` |
| `agora_characters` | 공개 카드 정보 |
| `agora_character_personas` | Persona Profile (jsonb). **RLS 정책 없음 → 클라이언트 접근 불가** |
| `agora_chat_sessions` | topic, reflection, 메모리 추출 진행 상태 |
| `agora_chat_messages` | 대화. 메타데이터에 사용된 기억/지식/safety 기록 |
| `agora_user_memories` | Episodic / Semantic. `character_id` null = GLOBAL, 값 있음 = CHARACTER |
| `agora_user_profiles_ai` | 사용자 요약, values, goals, preferences |
| `agora_relationship_memories` | 인물과의 관계 기억 |
| `agora_relationship_profiles` | 관계 요약, 최근 변화, 주제 |
| `agora_character_documents` / `agora_character_document_chunks` | Knowledge Base 원문 / 임베딩 청크 |

> 요구사항 대비 변경점: Persona 원문은 `characters.persona_prompt` 대신 별도 비공개 테이블 `agora_character_personas` 에 둡니다.
> `agora_characters` 는 비로그인 사용자도 읽을 수 있어야 하므로, 같은 테이블에 두면 Persona 가 그대로 노출됩니다.

---

## Edge Functions 배포

```bash
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy chat
npx supabase functions deploy extract-memory
npx supabase functions deploy consolidate-memory
npx supabase functions deploy generate-reflection
npx supabase functions deploy embed-document
npx supabase functions deploy update-memory
```

배포 후 Knowledge Base 임베딩을 생성합니다.

```bash
SUPABASE_URL=https://<ref>.supabase.co SUPABASE_SERVICE_ROLE_KEY=<service role key> npm run embed:docs
```

| Function | 호출자 | 역할 |
|---|---|---|
| `chat` | 사용자 | 메시지 저장 → 검색 → 프롬프트 → **SSE 스트리밍** → 저장. `kickoff: true` 면 인물이 먼저 인사 |
| `extract-memory` | 사용자 / 내부 | 대화 분석 → 기억·프로필·관계 갱신 (JSON Schema 출력) |
| `consolidate-memory` | 사용자 / 내부 | 유사 기억 클러스터 → 상위 Semantic Memory 로 통합 |
| `generate-reflection` | 사용자 | 대화 종료 · 한 문장 회고 · 백그라운드 메모리 추출 |
| `embed-document` | **service role 전용** | 문서 Chunking → Embedding → 저장 |
| `update-memory` | 사용자 | 기억 수정 시 재임베딩 |

모든 함수는 `verify_jwt = false` 로 두고 코드에서 직접 검증합니다 (`_shared/auth.ts`). 신규 publishable/secret key 체계와 호환되도록 하기 위함입니다.

---

## AI API 설정

Provider 는 `_shared/ai/types.ts` 의 `LLMProvider` / `EmbeddingProvider` 인터페이스로 추상화되어 있습니다.

- **OpenAI**: `OPENAI_API_KEY` 만 설정
- **OpenAI 호환 API** (Together, Groq, vLLM, Ollama 등): `AI_PROVIDER=openai-compatible`, `AI_BASE_URL`, `AI_API_KEY`
- **Embedding 을 다른 곳에서**: `AI_EMBEDDING_BASE_URL`, `AI_EMBEDDING_API_KEY`, `AI_EMBEDDING_MODEL`
- **새 SDK Provider**: 인터페이스를 구현하고 `_shared/ai/index.ts` 팩토리에 `case` 추가

메모리 추출/통합/회고는 `AI_MEMORY_MODEL` 로 대화 모델과 다른(저렴한) 모델을 쓸 수 있습니다.

---

## Environment Variables

### Frontend (`.env.local` / Vercel)

| 변수 | 설명 |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Project URL |
| `VITE_SUPABASE_ANON_KEY` | anon / publishable key (공개되어도 RLS 로 보호됨) |

### Edge Function Secrets (`supabase secrets set`)

| 변수 | 기본값 | 설명 |
|---|---|---|
| `OPENAI_API_KEY` | — | **필수** (또는 `AI_API_KEY`) |
| `AI_PROVIDER` | `openai` | `openai` / `openai-compatible` |
| `AI_BASE_URL` | `https://api.openai.com/v1` | |
| `AI_CHAT_MODEL` | `gpt-4o-mini` | 대화 모델 |
| `AI_MEMORY_MODEL` | `AI_CHAT_MODEL` | 추출/통합/회고 모델 |
| `AI_EMBEDDING_MODEL` | `text-embedding-3-small` | |
| `AI_EMBEDDING_DIMENSIONS` | `1536` | DB `vector(1536)` 과 일치해야 함 |
| `MEMORY_SCORE_WEIGHTS` | `0.55,0.20,0.15,0.10` | similarity, importance, recency, frequency |
| `MEMORY_CONTEXT_LIMIT` | `5` | 프롬프트에 넣을 기억 수 (3~7 권장) |
| `ALLOWED_ORIGINS` | `*` | CORS 허용 도메인 (콤마 구분) |

`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 는 Supabase 가 Edge Function 에 자동 주입합니다.

> ⚠ `OPENAI_API_KEY` 와 `SUPABASE_SERVICE_ROLE_KEY` 는 **절대** `VITE_` 변수나 프론트엔드 코드에 넣지 마세요.

---

## Memory Architecture

모델을 사용자별로 Fine-tuning 하지 않는 **Memory-Augmented Agent** 구조입니다.

| 종류 | 저장 위치 | 내용 |
|---|---|---|
| Working Memory | `agora_chat_messages` | 현재 대화의 최근 16개 메시지 |
| Episodic Memory | `agora_user_memories (memory_type='episodic')` | "2026-10-01, 팀장에게 기여를 인정받지 못해 속상했다고 이야기했다." |
| Semantic Memory | `agora_user_memories (memory_type='semantic')` | "노력이 정당하게 평가받는 것을 중요하게 여긴다." |
| Relationship Memory | `agora_relationship_memories` + `agora_relationship_profiles` | "괴테와 인정과 자기 가치에 대해 여러 번 이야기했다." / 최근 변화 |

**Scope**: `user_memories.character_id` 가 `null` 이면 모든 인물이 참고하는 GLOBAL, 값이 있으면 해당 인물만 아는 CHARACTER 기억입니다.

### 추출 (`_shared/memory/extraction.ts`)

- 시점: 대화 종료(`generate-reflection`) 또는 대화 중 새 메시지 12개마다
- `memory_enabled = false` 이면 **아무것도 저장하지 않음**
- 낙관적 잠금(`last_memory_extraction_at`)으로 같은 메시지 구간을 두 번 분석하지 않음
- LLM 은 JSON 으로 `memories[] / profile_update / relationship_update` 반환 (`_shared/prompts/memory.ts`)
- 우선 기억: 반복되는 고민, 장기 목표, 가치관, 중요한 사건, 대화 선호, 반복 감정 주제, 관계상의 순간, "기억해 줘"라고 한 내용
- 필터: importance < 0.35 또는 confidence < 0.5 제외, 위험 표현의 구체적 내용 제외, 식별 정보 제외
- 중복: 기존 기억과 유사도 ≥ 0.92 이면 새로 만들지 않고 기존 기억을 강화

### 검색 (`_shared/memory/retrieval.ts` → RPC)

```
memory_score = similarity * 0.55 + importance * 0.20 + recency * 0.15 + frequency * 0.10
recency   = 0.5 ^ (경과일 / 30)      ← updated_at 기준 (단순 조회로는 갱신되지 않음)
frequency = min(1, ln(1+access_count) / ln(21))
```

HNSW 인덱스로 후보 40개를 뽑은 뒤 복합 점수로 재정렬해 **상위 5개**만 프롬프트에 넣습니다. 사용된 기억은 `access_count` 가 증가합니다.

### 통합 (`_shared/memory/consolidation.ts`)

같은 scope 안에서 유사도 ≥ 0.8 인 기억이 3개 이상 모이면 LLM 이 통합 여부를 판단하고, 상위 개념의 Semantic Memory 를 만듭니다. 원본은 삭제하지 않고 `archived = true`, `consolidated_into` 로 연결합니다. 활성 기억이 30개 이상이면 추출 후 자동 실행되고, 기억 화면의 "비슷한 기억 정리하기"로도 실행됩니다.

### 사용자 제어 (기억 화면)

저장 ON/OFF · 조회 · 수정(재임베딩) · 개별 삭제 · 전체 삭제(`agora_delete_all_my_memories()`) · 관계 기억 삭제.
OFF 이면 새 기억을 저장하지 않고, 저장된 기억도 대화에 사용하지 않습니다.

---

## RAG Architecture

User Memory 와 Character Knowledge 는 **테이블부터 완전히 분리**되어 있습니다.

```
agora_character_documents  ──chunk(900자, 문단 우선, 120자 overlap)──►  embedding  ──►  agora_character_document_chunks
```

### 문서 유형 (`source_type`)

| 유형 | 인용 | 예 |
|---|---|---|
| `primary_text` + `metadata.verbatim = true` | ✅ 출처와 함께 인용 가능 | 『명상록』 4.3, Faust I v.317, Apology 38a |
| `work_summary` / `thought_summary` / `biography` | ❌ 해석으로만 사용 | 『파우스트』 요약, 스토아 철학 정리 |
| `misattribution` | 경고 | 인터넷에 퍼진 가짜 명언 목록 |

`primary_text` 의 metadata 에는 `source_location`, `speaker`, `original_text`, `translated_text`, `translator` 가 들어 있습니다.
Prompt Builder 는 각 청크를 `[VERBATIM]` 또는 `[요약·해석 — 인용 불가]` 로 표시하고, `QUOTATION POLICY` 가 VERBATIM 외의 직접 인용과 출처 조작을 금지합니다.
극 중 인물의 대사(예: 메피스토펠레스)는 `speaker` 로 구분해 작가 자신의 신념처럼 인용하지 않습니다.

영어 번역은 퍼블릭 도메인(George Long 1862, Benjamin Jowett 1871)만 사용했고, 한국어 번역은 AGORA 번역입니다.

### 문서 추가

1. `agora_character_documents` 에 행 추가 (실제 인용이면 `source_type='primary_text'`, `metadata.verbatim=true` 와 출처 정보)
2. `npm run embed:docs` (새 문서만) 또는 `npm run embed:docs -- --force`

---

## Safety Layer

AGORA 는 의료·심리치료 서비스가 아닙니다. 그러나 위험 상황에서 인물 연기만 이어가서는 안 됩니다.

- **우선순위: Safety Policy > Character Persona.** Safety 프롬프트(`_shared/prompts/safety.ts`)는 Persona 와 분리되어 항상 맨 앞에 위치합니다.
- **1차 탐지** (`_shared/safety/risk-detector.ts`): 자살·자해·삶을 끝내려는 표현 등 규칙 기반 탐지 → `crisis` 이면 현재 메시지 직전에 **SAFETY MODE OVERRIDE** 를 삽입해 안전 확인 질문과 도움 창구(109, 1577-0199, 119/112) 안내를 강제합니다. 직전 대화에 위기 신호가 있었다면 `elevated` 로 유지합니다.
- **2차 판단**: 규칙이 놓친 표현도 항상 포함된 Safety Policy 로 모델이 판단합니다.
- **UI**: `crisis` 가 감지되면 대화 상단에 도움 창구 안내가 고정되고, 회고는 철학적 경구 대신 안전 문구로 대체됩니다.
- 위험 표현의 구체적 내용은 장기 기억으로 저장하지 않습니다.

---

## Security

- React 는 AI API 를 직접 호출하지 않습니다. 모든 AI 호출은 Edge Function 에서만 일어납니다.
- `OPENAI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY` 는 Edge Function Secret 에만 존재합니다.
- **모든 테이블에 RLS 활성화**
  - 사용자 데이터: `auth.uid() = user_id` 인 행만 조회/수정/삭제
  - `agora_chat_messages`, `agora_user_memories` 등의 **INSERT 는 Edge Function 전용** (클라이언트 INSERT 정책 없음 → 대화 위조 불가)
  - `agora_chat_sessions` UPDATE 정책 없음 (회고/종료는 서버에서만)
  - 공용 콘텐츠(`agora_characters`, `agora_character_documents`, `agora_character_document_chunks`)는 읽기 전용
  - `agora_character_personas` 는 정책 없음 → 클라이언트에서 전혀 읽을 수 없음
- 검색 RPC(`agora_match_*`, `agora_touch_*`)는 `service_role` 에만 실행 권한. 클라이언트는 `agora_delete_all_my_memories()` 만 실행 가능
- Edge Function 은 service role 클라이언트를 쓰지만 **모든 쿼리에 `user_id` 필터를 명시**합니다.
- `embed-document` 는 service role key 로만 호출 가능
- 로그인 `next` 파라미터는 내부 경로만 허용 (open redirect 방지)
- 로그아웃 시 TanStack Query 캐시 전체 삭제

---

## Deployment

### Vercel

1. 저장소를 Vercel 에 Import (Framework: Vite)
2. Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`
3. Build command `npm run build`, Output `dist` (자동 감지)
4. `vercel.json` 의 rewrite 로 SPA 라우팅 처리
5. Supabase Auth 의 Site URL / Redirect URLs 에 Vercel 도메인 추가
6. Edge Function Secret `ALLOWED_ORIGINS` 에 Vercel 도메인 추가

### Supabase

1. [공유 운영 DB 에 적용](#공유-운영-db-에-적용) 의 SQL 파일 5개를 순서대로 실행
2. 아래 명령 실행

```bash
npx supabase secrets set --env-file supabase/functions/.env
npx supabase functions deploy   # 전체 함수 배포
npm run embed:docs              # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY 필요
```

> 공유 프로젝트에서는 Edge Function 이름과 Secret 도 프로젝트 단위로 공유됩니다. 배포 전에 Dashboard 에서 같은 이름의 함수(`chat` 등)와 Secret(`OPENAI_API_KEY`, `ALLOWED_ORIGINS` 등)이 있는지 확인하세요. 같은 이름이 있으면 덮어씁니다.

---

## 테스트

```bash
npm run build                                  # 프론트엔드 타입 체크 + 빌드
npx deno test supabase/functions/tests/        # Safety / Chunker / Prompt Builder 단위 테스트
npx deno check supabase/functions/*/index.ts   # Edge Function 타입 체크
```

---

## Roadmap

- **Phase 1** ✅ Supabase · Auth · 인물 · Persona · AI Chat · Streaming · 대화 기록 · Working Memory · Memory Extraction · pgvector 검색 · Character RAG · 기억 관리 화면
- **Phase 2** ✅ Relationship Memory · Memory Consolidation · Conversation Reflection · 관계 변화 추적
- **Phase 3** Agora Room — 여러 인물이 한 질문에 각자의 관점으로 답하고, 특정 인물을 골라 1:1 로 이어가기
  - 설계 메모: `agora_chat_sessions` 에 `mode ('single'|'room')`, `agora_chat_messages` 에 `character_id` 추가.
    `chat` 함수에서 인물별 `gatherContext` + `buildChatMessages` 를 병렬 실행하고, SSE 이벤트에 `characterId` 를 실어 보낸다.
    GLOBAL 기억은 공유하고 CHARACTER/Relationship 기억은 인물별로 유지하는 현재 구조를 그대로 재사용할 수 있다.
