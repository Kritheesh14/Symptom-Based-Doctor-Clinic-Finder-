import { QdrantClient } from '@qdrant/js-client-rest';
import { required } from '../config';
 
export const CASES = 'symptom_cases';      // labelled symptom -> speciality examples (seed + confirmed)
export const QUERIES = 'patient_queries';  // what real patients typed (feedback-loop source)
export const VECTOR_SIZE = 384;            // all-MiniLM-L6-v2
 
const g = globalThis as unknown as { __qdrant?: QdrantClient };
 
export function qdrant(): QdrantClient {
  if (!g.__qdrant) {
    g.__qdrant = new QdrantClient({
      url: required('QDRANT_URL'),
      apiKey: process.env.QDRANT_API_KEY || undefined,
      checkCompatibility: false,
    });
  }
  return g.__qdrant;
}
 
