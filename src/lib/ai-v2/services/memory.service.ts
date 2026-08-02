import { LearningMemory } from '../schemas/memory.schema';
import { CEFRLevel } from '../schemas/exercise.schema';
import { GrammarErrorDetail } from '../schemas/evaluation.schema';

const CEFR_ORDER: CEFRLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export class MemoryService {
  static createDefaultMemory(userId: string = 'default_user', profileName: string = 'Default Profile'): LearningMemory {
    return {
      userId,
      profileName,
      currentLevel: 'A2',
      consecutiveSuccessCount: 0,
      consecutiveFailureCount: 0,
      learningHistoryCount: 0,
      weakGrammar: [],
      weakVocabulary: [],
      masteredGrammar: [],
      masteredVocabulary: [],
      favoriteTopics: ['Small Talk', 'Workplace', 'Travel'],
      ignoredTopics: [],
      recentScores: [],
      reviewSchedule: {
        nextReviewDate: new Date().toISOString(),
        itemsToReview: []
      },
      streak: 1,
      learningStylePreference: 'Balanced Spoken',
      updatedAt: new Date().toISOString()
    };
  }

  static updateMemoryAfterExercise(
    memory: LearningMemory,
    score: number,
    grammarErrors: GrammarErrorDetail[]
  ): LearningMemory {
    const updated = { ...memory };
    updated.learningHistoryCount += 1;
    updated.recentScores = [score, ...updated.recentScores.slice(0, 9)];

    // Adaptive CEFR Level Adjustment
    if (score >= 85) {
      updated.consecutiveSuccessCount += 1;
      updated.consecutiveFailureCount = 0;
      if (updated.consecutiveSuccessCount >= 3) {
        const currentIndex = CEFR_ORDER.indexOf(updated.currentLevel);
        if (currentIndex < CEFR_ORDER.length - 1) {
          updated.currentLevel = CEFR_ORDER[currentIndex + 1];
          updated.consecutiveSuccessCount = 0;
        }
      }
    } else if (score < 60) {
      updated.consecutiveFailureCount += 1;
      updated.consecutiveSuccessCount = 0;
      if (updated.consecutiveFailureCount >= 2) {
        const currentIndex = CEFR_ORDER.indexOf(updated.currentLevel);
        if (currentIndex > 0) {
          updated.currentLevel = CEFR_ORDER[currentIndex - 1];
          updated.consecutiveFailureCount = 0;
        }
      }
    } else {
      updated.consecutiveSuccessCount = 0;
      updated.consecutiveFailureCount = 0;
    }

    // Record Weak Grammar Points
    grammarErrors.forEach(err => {
      const existing = updated.weakGrammar.find(g => g.category === err.category);
      if (existing) {
        existing.count += 1;
        existing.lastEncountered = new Date().toISOString();
        if (!existing.examples.includes(err.studentText)) {
          existing.examples.push(err.studentText);
        }
      } else {
        updated.weakGrammar.push({
          category: err.category,
          count: 1,
          lastEncountered: new Date().toISOString(),
          examples: [err.studentText]
        });
      }
    });

    updated.updatedAt = new Date().toISOString();
    return updated;
  }
}
