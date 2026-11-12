import { Suspense } from 'react';
import { BookForm } from './BookForm';

export const metadata = { title: 'Book an appointment | Symptom Finder' };

export default function Page() {
  return (
    <Suspense>
      <BookForm />
    </Suspense>
  );
}
