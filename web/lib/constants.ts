/** The 13 specialities seeded in db/seed/seed.sql. The symptom corpus must use exactly these names. */
export const SPECIALITY_NAMES = [
  'General Medicine', 'Cardiology', 'Dermatology', 'Neurology', 'Orthopedics', 'Pulmonology',
  'Gastroenterology', 'ENT', 'Ophthalmology', 'Psychiatry', 'Gynecology', 'Pediatrics', 'Urology',
] as const;

export const DISCLAIMER = 'This is a suggestion, not a diagnosis. If you have severe symptoms, seek emergency care.';
