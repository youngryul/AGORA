// POST /functions/v1/embed-document   (Service Role Key 전용)
//
// body (하나를 선택):
//   { document_id: string }                       특정 문서
//   { character_code: string, force?: boolean }   특정 인물의 문서
//   { all: true, force?: boolean }                전체 문서 (force=false 면 아직 임베딩되지 않은 문서만)
//
// Document → Chunking → Embedding → character_document_chunks

import { handlePreflight } from '../_shared/cors.ts';
import { errorResponse, HttpError, json, readJson } from '../_shared/http.ts';
import { requireServiceRole } from '../_shared/auth.ts';
import { getAdminClient, type AdminClient } from '../_shared/supabase.ts';
import { getEmbedder } from '../_shared/ai/index.ts';
import { chunkText } from '../_shared/rag/chunker.ts';
import { toPgVector } from '../_shared/vector.ts';

interface EmbedRequest {
  document_id?: string;
  character_code?: string;
  all?: boolean;
  force?: boolean;
}

interface DocumentRow {
  id: string;
  character_id: string;
  title: string;
  source: string | null;
  source_type: string;
  author: string | null;
  published_year: number | null;
  content: string;
  metadata: Record<string, unknown>;
}

const EMBED_BATCH = 64;

async function embedDocument(db: AdminClient, doc: DocumentRow): Promise<number> {
  const chunks = chunkText(doc.content);
  // 검색 품질을 위해 각 청크 앞에 문서 제목/출처를 붙여 임베딩한다 (저장되는 content 는 원문 청크)
  const inputs = chunks.map((c) => `${doc.title}\n${doc.source ?? ''}\n\n${c}`);

  const vectors: number[][] = [];
  for (let i = 0; i < inputs.length; i += EMBED_BATCH) {
    vectors.push(...(await getEmbedder().embed(inputs.slice(i, i + EMBED_BATCH))));
  }

  const { error: deleteError } = await db.from('agora_character_document_chunks').delete().eq('document_id', doc.id);
  if (deleteError) throw deleteError;

  const rows = chunks.map((content, index) => ({
    document_id: doc.id,
    character_id: doc.character_id,
    chunk_index: index,
    content,
    embedding: toPgVector(vectors[index]),
    metadata: {
      ...doc.metadata,
      title: doc.title,
      source: doc.source,
      source_type: doc.source_type,
      author: doc.author,
      published_year: doc.published_year,
      chunk_count: chunks.length,
    },
  }));
  const { error: insertError } = await db.from('agora_character_document_chunks').insert(rows);
  if (insertError) throw insertError;

  const { error: updateError } = await db
    .from('agora_character_documents')
    .update({ embedded_at: new Date().toISOString() })
    .eq('id', doc.id);
  if (updateError) throw updateError;

  return chunks.length;
}

Deno.serve(async (req) => {
  const preflight = handlePreflight(req);
  if (preflight) return preflight;

  try {
    if (req.method !== 'POST') throw new HttpError(405, 'Method not allowed');
    requireServiceRole(req);
    const body = await readJson<EmbedRequest>(req);
    const db = getAdminClient();

    let query = db
      .from('agora_character_documents')
      .select('id, character_id, title, source, source_type, author, published_year, content, metadata');

    if (body.document_id) {
      query = query.eq('id', body.document_id);
    } else if (body.character_code) {
      const { data: character, error } = await db
        .from('agora_characters')
        .select('id')
        .eq('code', body.character_code)
        .maybeSingle();
      if (error) throw error;
      if (!character) throw new HttpError(404, 'Character not found');
      query = query.eq('character_id', character.id);
      if (!body.force) query = query.is('embedded_at', null);
    } else if (body.all) {
      if (!body.force) query = query.is('embedded_at', null);
    } else {
      throw new HttpError(400, 'document_id, character_code, or all is required');
    }

    const { data: documents, error } = await query;
    if (error) throw error;

    const results: { id: string; title: string; chunks: number }[] = [];
    for (const doc of (documents ?? []) as DocumentRow[]) {
      results.push({ id: doc.id, title: doc.title, chunks: await embedDocument(db, doc) });
    }

    return json(req, {
      documents: results.length,
      chunks: results.reduce((sum, r) => sum + r.chunks, 0),
      results,
    });
  } catch (error) {
    return errorResponse(req, error);
  }
});
