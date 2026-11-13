import { recommendMinConfidence, recommendTopK } from '../config';
import { AppError } from '../errors';
import { CASES, qdrant } from './client';
import { embed } from './embed';

export type SimilarCase = { text: string; specialityId: number; specialityName: string; score: number; source: string };
export type Alternative = { specialityId: number; specialityName: string; score: number; share: number };
export type Recommendation = {
  specialityId: number;
  specialityName: string;
  confidence: number;      // winner's share of the total similarity mass (0..1)
  lowConfidence: boolean;  // confidence < RECOMMEND_MIN_CONFIDENCE
  alternatives: Alternative[]; // top 3 specialities
  similarCases: SimilarCase[]; // top 3 nearest cases
  vector: number[];        // the query embedding (re-used for logging, never sent to the browser)
};

/**
 * Retrieval algorithm:
 *  1. embed the patient's text
 *  2. top-K nearest cases in `symptom_cases` (cosine similarity)
 *  3. score-weighted vote: sum similarity per speciality; highest total wins
 *  4. confidence = winner total / all totals; below the threshold we flag lowConfidence
 */
export async function recommendSpeciality(text: string, precomputedVector?: number[]): Promise<Recommendation> {
  let vector: number[];
  let res;
  try {
    vector = precomputedVector ?? (await embed(text));
    res = await qdrant().query(CASES, { query: vector, limit: recommendTopK(), with_payload: true });
  } catch (e) {
    console.error('Embedding or Qdrant query failed', e);
    throw new AppError(503, 'Symptom search is temporarily unavailable. Please try again shortly, or search doctors directly.');
  }
  if (res.points.length === 0) {
    throw new AppError(503, 'The symptom index is empty. Run `npm run qdrant:setup && npm run qdrant:ingest`.');
  }

  const totals = new Map<number, { name: string; score: number }>();
  const hits: SimilarCase[] = res.points.map((p) => {
    const payload = (p.payload ?? {}) as Record<string, unknown>;
    const specialityId = Number(payload.speciality_id);
    const specialityName = String(payload.speciality_name ?? '');
    const score = Math.max(p.score, 0);
    const cur = totals.get(specialityId) ?? { name: specialityName, score: 0 };
    cur.score += score;
    totals.set(specialityId, cur);
    return { text: String(payload.text ?? ''), specialityId, specialityName, score: p.score, source: String(payload.source ?? 'seed') };
  });

  const sum = [...totals.values()].reduce((a, b) => a + b.score, 0) || 1;
  const ranked: Alternative[] = [...totals.entries()]
    .map(([specialityId, v]) => ({ specialityId, specialityName: v.name, score: v.score, share: v.score / sum }))
    .sort((a, b) => b.score - a.score);

  const winner = ranked[0];
  return {
    specialityId: winner.specialityId,
    specialityName: winner.specialityName,
    confidence: winner.share,
    lowConfidence: winner.share < recommendMinConfidence(),
    alternatives: ranked.slice(0, 3),
    similarCases: hits.slice(0, 3),
    vector,
  };
}
