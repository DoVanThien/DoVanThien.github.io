export interface ScoringRubric {
  meaning: number;       // 0 - 100 (Weight: 25%)
  grammar: number;       // 0 - 100 (Weight: 20%)
  vocabulary: number;    // 0 - 100 (Weight: 15%)
  naturalness: number;   // 0 - 100 (Weight: 20%)
  fluency: number;       // 0 - 100 (Weight: 10%)
  collocation: number;   // 0 - 100 (Weight: 5%)
  nativeUsage: number;   // 0 - 100 (Weight: 5%)
  overall: number;       // Weighted calculated overall score 0 - 100
}

export interface GrammarErrorDetail {
  category: 'Tense' | 'Article' | 'Preposition' | 'Word Order' | 'Subject-Verb Agreement' | 'Passive' | 'Conditionals' | 'Modal Verbs' | 'Collocation' | 'Punctuation';
  studentText: string;
  correction: string;
  ruleExplanation: string;
  severity: 'minor' | 'major' | 'critical';
}

export interface FluencyDetail {
  isWordByWordTranslation: boolean;
  isBookish: boolean;
  isAwkward: boolean;
  awkwardPhrases: string[];
  nativeAlternatives: string[];
  naturalnessScore: number;
}

export interface AlternativeTranslation {
  best: string;
  nativeUS: string;
  nativeUK: string;
  formalBusiness: string;
  casualFriendly: string;
}

export interface TeacherFeedback {
  title: string;
  praise: string;
  constructiveCritique: string;
  pedagogicalExplanation: string;
  whyNativeDoNotSayThis?: string;
  memoryTip?: string;
  whenToUse: string;
  whenNotToUse: string;
  additionalExamples: string[];
}

export interface FullEvaluationResult {
  rubric: ScoringRubric;
  grammarErrors: GrammarErrorDetail[];
  fluencyDetail: FluencyDetail;
  teacherFeedback: TeacherFeedback;
  betterTranslations: AlternativeTranslation;
  targetedPracticeExercises: Array<{
    vietnamesePrompt: string;
    targetFocus: string;
    hint: string;
  }>;
}
