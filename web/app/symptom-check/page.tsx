import { Suspense } from 'react';
import { SymptomCheck } from './SymptomCheck';

export const metadata = { title: 'Check symptoms | Symptom Finder' };

export default function Page() {
  return (
    <Suspense>
      <SymptomCheck />
    </Suspense>
  );
}
