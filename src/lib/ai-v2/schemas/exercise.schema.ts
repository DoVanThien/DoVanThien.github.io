export type CEFRLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';

export interface ExerciseTarget {
  grammarTarget: string;
  vocabularyTarget: string[];
  phrasalVerbTarget?: string;
  idiomTarget?: string;
}

export interface ScenarioOutput {
  id: string;
  topic: string;
  tone: string;
  cefrLevel: CEFRLevel;
  vietnameseContent: string;
  contextDescription: string;
  emotionTag: string;
  targets: ExerciseTarget;
}

export interface ReferenceTranslation {
  id: string;
  text: string;
  variant: 'Native US' | 'Native UK' | 'Business' | 'Casual' | 'Friendly' | 'Short' | 'Natural';
  naturalnessRank: number; // 1 to 10
  explanation: string;
}

export interface PracticeExercise {
  id: string;
  vietnamesePrompt: string;
  targetFocus: string; // The exact grammar/vocab mistake targeted
  difficulty: CEFRLevel;
  hint?: string;
}
