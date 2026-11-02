// DB Row 타입 (supabase/migrations 과 1:1 대응). Persona 는 클라이언트에 노출되지 않는다.

export interface Profile {
  id: string;
  nickname: string | null;
  avatar_url: string | null;
  memory_enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface Character {
  id: string;
  code: string;
  name: string;
  name_en: string;
  birth_year: number | null;
  death_year: number | null;
  lifetime_label: string | null;
  description: string;
  short_philosophy: string;
  tagline: string | null;
  topics: string[];
  portrait_url: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  character_id: string;
  topic: string | null;
  reflection: string | null;
  message_count: number;
  started_at: string;
  ended_at: string | null;
}

export type MessageRole = 'user' | 'assistant' | 'system';

export interface ChatMessage {
  id: string;
  session_id: string;
  role: MessageRole;
  content: string;
  metadata: {
    safety?: 'none' | 'elevated' | 'crisis';
    knowledge?: { title: string; source: string | null; verbatim: boolean }[];
    [key: string]: unknown;
  };
  created_at: string;
}

export type MemoryType = 'episodic' | 'semantic';

export interface UserMemory {
  id: string;
  user_id: string;
  character_id: string | null;
  memory_type: MemoryType;
  content: string;
  importance: number;
  confidence: number;
  source_session_id: string | null;
  archived: boolean;
  created_at: string;
  updated_at: string;
  last_accessed_at: string | null;
  access_count: number;
}

export interface RelationshipMemory {
  id: string;
  user_id: string;
  character_id: string;
  content: string;
  importance: number;
  confidence: number;
  created_at: string;
  updated_at: string;
}

export interface RelationshipProfile {
  user_id: string;
  character_id: string;
  summary: string | null;
  recent_change: string | null;
  themes: string[];
  updated_at: string;
}

export interface UserProfileAI {
  id: string;
  user_id: string;
  summary: string | null;
  values: string[];
  goals: string[];
  preferences: string[];
  updated_at: string;
}
