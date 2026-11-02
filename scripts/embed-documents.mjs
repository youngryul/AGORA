#!/usr/bin/env node
// Character Knowledge Base 임베딩 생성
//
//   SUPABASE_URL=https://xxx.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run embed:docs
//   npm run embed:docs -- --force               # 이미 임베딩된 문서도 다시
//   npm run embed:docs -- --character goethe    # 특정 인물만
//
// ⚠ Service Role Key 는 이 스크립트를 실행하는 터미널 환경 변수로만 전달하세요.
//   .env.local 이나 VITE_ 접두사 변수에 넣으면 안 됩니다.

const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error('SUPABASE_URL 과 SUPABASE_SERVICE_ROLE_KEY 환경 변수가 필요합니다.');
  process.exit(1);
}

const args = process.argv.slice(2);
const force = args.includes('--force');
const characterIdx = args.indexOf('--character');
const character = characterIdx >= 0 ? args[characterIdx + 1] : null;

const body = character ? { character_code: character, force } : { all: true, force };

console.log(`→ embed-document ${JSON.stringify(body)}`);
const res = await fetch(`${url.replace(/\/$/, '')}/functions/v1/embed-document`, {
  method: 'POST',
  headers: {
    Authorization: `Bearer ${serviceKey}`,
    apikey: serviceKey,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(body),
});

const text = await res.text();
if (!res.ok) {
  console.error(`✗ ${res.status}: ${text}`);
  process.exit(1);
}

const result = JSON.parse(text);
for (const r of result.results ?? []) console.log(`  ✓ ${r.title} (${r.chunks} chunks)`);
console.log(`완료: 문서 ${result.documents}개, 청크 ${result.chunks}개`);
if (result.documents === 0 && !force) console.log('(새로 임베딩할 문서가 없습니다. 다시 하려면 --force)');
