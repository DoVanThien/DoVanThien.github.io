import { ScoringRubric } from '../schemas/evaluation.schema';

export class EvaluationService {
  /**
   * Calculates the weighted overall score based on individual subscores.
   * Rubric Weights:
   * - Meaning: 25%
   * - Grammar: 20%
   * - Vocabulary: 15%
   * - Naturalness: 20%
   * - Fluency: 10%
   * - Collocation: 5%
   * - Native Usage: 5%
   */
  static calculateOverallScore(rubric: Omit<ScoringRubric, 'overall'>): number {
    const overall =
      rubric.meaning * 0.25 +
      rubric.grammar * 0.20 +
      rubric.vocabulary * 0.15 +
      rubric.naturalness * 0.20 +
      rubric.fluency * 0.10 +
      rubric.collocation * 0.05 +
      rubric.nativeUsage * 0.05;

    return Math.min(100, Math.max(0, Math.round(overall)));
  }

  static sanitizeRubric(rubric: ScoringRubric): ScoringRubric {
    const meaning = Math.min(100, Math.max(0, rubric.meaning || 70));
    const grammar = Math.min(100, Math.max(0, rubric.grammar || 70));
    const vocabulary = Math.min(100, Math.max(0, rubric.vocabulary || 70));
    const naturalness = Math.min(100, Math.max(0, rubric.naturalness || 70));
    const fluency = Math.min(100, Math.max(0, rubric.fluency || 70));
    const collocation = Math.min(100, Math.max(0, rubric.collocation || 70));
    const nativeUsage = Math.min(100, Math.max(0, rubric.nativeUsage || 70));

    const overall = this.calculateOverallScore({
      meaning,
      grammar,
      vocabulary,
      naturalness,
      fluency,
      collocation,
      nativeUsage
    });

    return {
      meaning,
      grammar,
      vocabulary,
      naturalness,
      fluency,
      collocation,
      nativeUsage,
      overall
    };
  }
}
