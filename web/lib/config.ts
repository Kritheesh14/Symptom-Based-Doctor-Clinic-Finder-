export function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable ${name} (see .env.example)`);
  return v;
}

export const recommendTopK = () => Math.max(1, Number(process.env.RECOMMEND_TOP_K ?? 5) || 5);
export const recommendMinConfidence = () => Number(process.env.RECOMMEND_MIN_CONFIDENCE ?? 0.4) || 0.4;
