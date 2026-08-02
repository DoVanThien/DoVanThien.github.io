import { LearningMemory } from '../schemas/memory.schema';
import { buildMemoryContextPrompt } from '../prompts/memory.prompt';
import { buildScenarioUserPrompt, SCENARIO_SYSTEM_PROMPT } from '../prompts/scenario.prompt';

export class PromptBuilder {
  static buildScenarioGenerationPayload(
    topic: string,
    tone: string,
    memory: LearningMemory
  ) {
    const memoryContext = buildMemoryContextPrompt(memory);
    const primaryWeakGrammar = memory.weakGrammar[0]?.category;
    const primaryWeakVocab = memory.weakVocabulary[0]?.wordOrPhrase;

    const userPrompt = buildScenarioUserPrompt(
      topic,
      tone,
      memory.currentLevel,
      primaryWeakGrammar,
      primaryWeakVocab
    );

    return {
      systemPrompt: `${SCENARIO_SYSTEM_PROMPT}\n\n${memoryContext}`,
      userPrompt
    };
  }
}
