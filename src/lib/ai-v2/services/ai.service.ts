import { ScenarioOutput, ReferenceTranslation } from '../schemas/exercise.schema';
import { FullEvaluationResult } from '../schemas/evaluation.schema';
import { LearningMemory } from '../schemas/memory.schema';
import { PromptBuilder } from './promptBuilder';
import { REFERENCE_SYSTEM_PROMPT, buildReferenceUserPrompt } from '../prompts/reference.prompt';
import { EVALUATION_SYSTEM_PROMPT, buildEvaluationUserPrompt } from '../prompts/evaluation.prompt';
import { TEACHER_SYSTEM_PROMPT, buildTeacherUserPrompt } from '../prompts/teacher.prompt';
import { ReflectionService } from './reflection.service';
import { MemoryService } from './memory.service';

export class AIServiceV2 {
  private static async callGroqLlama(systemPrompt: string, userPrompt: string): Promise<string> {
    const apiKey = (process.env.GEMINI_API_KEY || '').trim();
    if (!apiKey) {
      throw new Error('API Key missing. Please set GEMINI_API_KEY in .env.local');
    }

    // Determine API Endpoint (Groq if gsk_, Google Gemini if AIzaSy_)
    if (apiKey.startsWith('gsk_')) {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.7,
          response_format: { type: 'json_object' }
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Groq API Error status ${response.status}`);
      }

      const data = await response.json();
      return data.choices?.[0]?.message?.content || '{}';
    } else {
      // Fallback to Gemini 2.0 Flash API format if key is Google AI key
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text: userPrompt }] }],
          generationConfig: { responseMimeType: 'application/json', temperature: 0.7 }
        })
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error?.message || `Google API Error status ${response.status}`);
      }

      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
    }
  }

  /**
   * Agent 1: Scenario Generator
   */
  static async generateScenario(
    topic: string,
    tone: string,
    memory: LearningMemory
  ): Promise<ScenarioOutput> {
    const { systemPrompt, userPrompt } = PromptBuilder.buildScenarioGenerationPayload(topic, tone, memory);
    const rawJson = await this.callGroqLlama(systemPrompt, userPrompt);
    
    try {
      const parsed = JSON.parse(rawJson);
      return {
        id: parsed.id || `scen_${Date.now()}`,
        topic: parsed.topic || topic,
        tone: parsed.tone || tone,
        cefrLevel: parsed.cefrLevel || memory.currentLevel,
        vietnameseContent: parsed.vietnameseContent || 'Trời ơi kẹt xe cứng ngắc rồi, chắc trễ họp quá!',
        contextDescription: parsed.contextDescription || 'Nói chuyện khi đang đi đường',
        emotionTag: parsed.emotionTag || tone,
        targets: parsed.targets || {
          grammarTarget: 'Present Continuous for Immediate Action',
          vocabularyTarget: ['traffic', 'stuck', 'late']
        }
      };
    } catch {
      return {
        id: `scen_${Date.now()}`,
        topic,
        tone,
        cefrLevel: memory.currentLevel,
        vietnameseContent: 'Trời ơi kẹt xe cứng ngắc rồi, chắc trễ họp quá!',
        contextDescription: 'Nói chuyện khi đang kẹt xe',
        emotionTag: tone,
        targets: {
          grammarTarget: 'Present Continuous for Immediate Action',
          vocabularyTarget: ['traffic', 'stuck', 'late']
        }
      };
    }
  }

  /**
   * Agent 2: Reference Generator
   */
  static async generateReferences(vietnameseContent: string, contextDescription: string): Promise<ReferenceTranslation[]> {
    const userPrompt = buildReferenceUserPrompt(vietnameseContent, contextDescription);
    const rawJson = await this.callGroqLlama(REFERENCE_SYSTEM_PROMPT, userPrompt);

    try {
      const parsed = JSON.parse(rawJson);
      if (Array.isArray(parsed)) return parsed;
      if (parsed.references && Array.isArray(parsed.references)) return parsed.references;
      return [];
    } catch {
      return [
        {
          id: 'ref_1',
          text: "I'm stuck in bumper-to-bumper traffic, I'm gonna be late for the meeting!",
          variant: 'Native US',
          naturalnessRank: 1,
          explanation: 'Standard colloquial American spoken English for traffic delays.'
        }
      ];
    }
  }

  /**
   * Execute Full Pipeline (Agents 3 - 8 + Reflection + Memory update)
   */
  static async evaluateStudentTranslation(
    vietnameseContent: string,
    contextDescription: string,
    studentTranslation: string,
    currentMemory?: LearningMemory
  ): Promise<{ evaluation: FullEvaluationResult; updatedMemory: LearningMemory }> {
    const memory = currentMemory || MemoryService.createDefaultMemory();

    // Step 1: Generate Reference Translations (Agent 2)
    const references = await this.generateReferences(vietnameseContent, contextDescription);
    const refJsonString = JSON.stringify(references);

    // Step 2: Evaluate Semantic, Grammar, Fluency (Agents 3, 4, 5)
    const evalUserPrompt = buildEvaluationUserPrompt(vietnameseContent, studentTranslation, refJsonString);
    const rawEvalJson = await this.callGroqLlama(EVALUATION_SYSTEM_PROMPT, evalUserPrompt);

    // Step 3: Teacher Feedback & Practice Generation (Agents 6, 7, 8)
    const teacherUserPrompt = buildTeacherUserPrompt(vietnameseContent, studentTranslation, rawEvalJson);
    const rawTeacherJson = await this.callGroqLlama(TEACHER_SYSTEM_PROMPT, teacherUserPrompt);

    // Merge outputs into unified raw payload
    let mergedPayloadRaw = '{}';
    try {
      const evalObj = JSON.parse(rawEvalJson);
      const teacherObj = JSON.parse(rawTeacherJson);
      mergedPayloadRaw = JSON.stringify({ ...evalObj, ...teacherObj });
    } catch {
      mergedPayloadRaw = rawEvalJson;
    }

    // Step 4: Reflection Agent (Self-Correction & Sanitization)
    const sanitizedEvaluation = ReflectionService.auditAndSanitizeEvaluationPayload(mergedPayloadRaw);

    // Step 5: Update Learning Memory
    const updatedMemory = MemoryService.updateMemoryAfterExercise(
      memory,
      sanitizedEvaluation.rubric.overall,
      sanitizedEvaluation.grammarErrors
    );

    return {
      evaluation: sanitizedEvaluation,
      updatedMemory
    };
  }
}
