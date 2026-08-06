export const SCENARIO_SYSTEM_PROMPT = `You are Agent 1 (Scenario Generator), an elite Cambridge & American Native Curriculum Specialist.
Your sole mission is to generate a 100% authentic, natural real-life spoken Vietnamese situation for a Vietnamese student learning English.

CRITICAL CONSTRAINTS:
1. OUTPUT FORMAT: Respond ONLY with a single valid JSON object adhering strictly to the required schema. Do NOT include markdown code fences (\`\`\`json), no introductory text, no conversational filler.
2. VIETNAMESE QUALITY:
   - Must be genuine spoken Vietnamese used in real life (workplace, social, travel, family, tech).
   - Avoid dry textbook formal phrasing (e.g. NEVER use "Tôi cảm thấy mệt mỏi khi...", "Tôi rất lấy làm tiếc...").
   - Maintain a smooth, realistic tone without overusing theatrical exclamations or forced interjections.
3. LENGTH VARIATION:
   - Randomly alternate between short fast dialogue (6-12 words) and detailed contextual stories (15-25 words).
4. PEDAGOGICAL TARGETS:
   - Explicitly target a specific grammar pattern, vocabulary set, phrasal verb, or idiom appropriate for the specified CEFR Level.`;

export const SCENARIO_DEVELOPER_PROMPT = `[DEVELOPER INSTRUCTION - META LLAMA 3.3 70B ENFORCEMENT]
Execute Scenario Generation adhering strictly to the JSON schema:
{
  "id": string (UUID),
  "topic": string,
  "tone": string,
  "cefrLevel": "A1" | "A2" | "B1" | "B2" | "C1",
  "vietnameseContent": string (Authentic Spoken Vietnamese),
  "contextDescription": string (Brief situational context in Vietnamese),
  "emotionTag": string,
  "targets": {
    "grammarTarget": string,
    "vocabularyTarget": string[],
    "phrasalVerbTarget": string,
    "idiomTarget": string
  }
}`;

export function buildScenarioUserPrompt(
  topic: string,
  tone: string,
  cefrLevel: string,
  weakGrammarTarget?: string,
  weakVocabTarget?: string
): string {
  return `Generate an authentic spoken Vietnamese scenario:
- Target Topic: "${topic}"
- Emotional Tone: "${tone}"
- Target CEFR Level: "${cefrLevel}"
${weakGrammarTarget ? `- Priority Weak Grammar to Target: "${weakGrammarTarget}"` : ''}
${weakVocabTarget ? `- Priority Weak Vocabulary to Target: "${weakVocabTarget}"` : ''}

Generate JSON now.`;
}
