import { Suspense } from 'react';
import { DoctorSearch } from './DoctorSearch';

export const metadata = { title: 'Find a doctor | Symptom Finder' };

export default function Page() {
  return (
    <Suspense>
      <DoctorSearch />
    </Suspense>
  );
}
