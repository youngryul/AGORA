export const queryKeys = {
  characters: ['characters'] as const,
  character: (code: string) => ['characters', code] as const,
  session: (id: string) => ['sessions', id] as const,
  sessions: ['sessions'] as const,
  messages: (sessionId: string) => ['messages', sessionId] as const,
  profile: ['profile'] as const,
  aiProfile: ['ai-profile'] as const,
  memories: ['memories'] as const,
  relationships: ['relationships'] as const,
};
