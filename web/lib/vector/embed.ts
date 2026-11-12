import { pipeline, type FeatureExtractionPipeline } from '@xenova/transformers';
import { VECTOR_SIZE } from './client';
 
const MODEL = 'Xenova/all-MiniLM-L6-v2';
const g = globalThis as unknown as { __extractor?: Promise<FeatureExtractionPipeline> };
 
function extractor(): Promise<FeatureExtractionPipeline> {
  // Loaded once per process (first call downloads ~25 MB, then it is cached on disk).
  g.__extractor ??= pipeline('feature-extraction', MODEL) as Promise<FeatureExtractionPipeline>;
  return g.__extractor;
}
 
/** 384-dimensional, L2-normalised sentence embedding (so cosine similarity == dot product). */
export async function embed(text: string): Promise<number[]> {
  const ex = await extractor();
  const out = await ex(text, { pooling: 'mean', normalize: true });
  const v = Array.from(out.data as Float32Array);
  if (v.length !== VECTOR_SIZE) throw new Error(`Unexpected embedding size ${v.length}`);
  return v;
}
