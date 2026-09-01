export interface QuestRequestItems {
  ID: number;
  EmoteOnComplete: number;
  EmoteOnIncomplete: number;
  CompletionText: string | null;
  VerifiedBuild?: number;
}
