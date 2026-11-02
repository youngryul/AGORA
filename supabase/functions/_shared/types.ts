// Edge Function 공용 도메인 타입

export interface PersonaSpeechExample {
  user: string;
  character: string;
  note?: string;
}

export interface PersonaSourceDocument {
  title: string;
  year?: number;
  type?: string;
}

/** character_personas.persona (jsonb) 구조 */
export interface Persona {
  identity: string;
  historical_context: string[];
  worldview: string[];
  philosophy: string[];
  values: string[];
  conversational_style: string[];
  questioning_style: string[];
  preferred_topics: string[];
  signature_concepts?: string[];
  avoid_behavior: string[];
  language_notes?: string;
  speech_examples?: PersonaSpeechExample[];
  source_documents: PersonaSourceDocument[];
}

export interface CharacterRecord {
  id: string;
  code: string;
  name: string;
  name_en: string;
  lifetime_label: string | null;
  short_philosophy: string;
}

export interface CharacterWithPersona extends CharacterRecord {
  persona: Persona;
  persona_prompt: string | null;
}

export interface SessionRecord {
  id: string;
  user_id: string;
  character_id: string;
  topic: string | null;
  reflection: string | null;
  message_count: number;
  memory_extracted_count: number;
  last_memory_extraction_at: string | null;
  started_at: string;
  ended_at: string | null;
}

export interface StoredMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: string;
}

export interface RetrievedMemory {
  id: string;
  character_id: string | null;
  memory_type: 'episodic' | 'semantic';
  content: string;
  importance: number;
  confidence: number;
  created_at: string;
  similarity: number;
  score: number;
}

export interface RetrievedRelationshipMemory {
  id: string;
  content: string;
  importance: number;
  confidence: number;
  created_at: string;
  similarity: number;
  score: number;
}

export interface KnowledgeChunk {
  chunk_id: string;
  document_id: string;
  content: string;
  metadata: {
    verbatim?: boolean;
    speaker?: string;
    source_location?: string;
    original_text?: string;
    translated_text?: string;
    translator?: string;
    [key: string]: unknown;
  };
  title: string;
  source: string | null;
  source_type: string;
  author: string | null;
  published_year: number | null;
  similarity: number;
}

export interface UserAIProfile {
  summary: string | null;
  values: string[];
  goals: string[];
  preferences: string[];
}

export interface RelationshipProfile {
  summary: string | null;
  recent_change: string | null;
  themes: string[];
}

export type RiskLevel = 'none' | 'elevated' | 'crisis';

export interface RiskAssessment {
  level: RiskLevel;
  matched: string[];
}
