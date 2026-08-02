import { LearningMemory } from '../schemas/memory.schema';

export const buildMemoryContextPrompt = (memory: LearningMemory): string => {
  const weakGrammarList = memory.weakGrammar.map(g => `${g.category} (${g.count} errors)`).join(', ') || 'None';
  const weakVocabList = memory.weakVocabulary.map(v => v.wordOrPhrase).join(', ') || 'None';

  return `[STUDENT LEARNING MEMORY CONTEXT]
- Current CEFR Level: ${memory.currentLevel}
- Consecutive Streak: ${memory.streak} days
- Weak Grammar Targets: ${weakGrammarList}
- Weak Vocabulary Targets: ${weakVocabList}
- Preferred Style: ${memory.learningStylePreference}
- Favorite Topics: ${memory.favoriteTopics.join(', ') || 'General'}
- Recent Average Score: ${
    memory.recentScores.length > 0
      ? (memory.recentScores.reduce((a, b) => a + b, 0) / memory.recentScores.length).toFixed(1)
      : 'N/A'
  }`;
};
