export interface QuestRequestItems {
  ID: number;
  EmoteOnComplete: number;
  EmoteOnCompleteDelay: number;
  EmoteOnIncomplete: number;
  EmoteOnIncompleteDelay: number;
  CompletionText: string | null;
  VerifiedBuild?: number;
}
