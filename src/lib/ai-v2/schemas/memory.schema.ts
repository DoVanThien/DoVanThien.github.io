import { CEFRLevel } from './exercise.schema';

export interface GrammarMistakeRecord {
  category: string;
  count: number;
  lastEncountered: string;
  examples: string[];
}

export interface VocabMistakeRecord {
  wordOrPhrase: string;
  count: number;
  lastEncountered: string;
}

export interface LearningMemory {
  userId: string;
  profileName: string;
  currentLevel: CEFRLevel;
  consecutiveSuccessCount: number; // For level-up tracking
  consecutiveFailureCount: number; // For level-down tracking
  learningHistoryCount: number;
  weakGrammar: GrammarMistakeRecord[];
  weakVocabulary: VocabMistakeRecord[];
  masteredGrammar: string[];
  masteredVocabulary: string[];
  favoriteTopics: string[];
  ignoredTopics: string[];
  recentScores: number[]; // Last 10 scores
  reviewSchedule: {
    nextReviewDate: string;
    itemsToReview: string[];
  };
  streak: number;
  learningStylePreference: 'Casual & Conversational' | 'Business & Workplace' | 'Balanced Spoken';
  updatedAt: string;
}
