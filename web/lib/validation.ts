import { z } from 'zod';

// These mirror the CHECK constraints in db/ddl (the database stays the final authority).
const email = z.string().trim().toLowerCase().max(150).regex(/^[^@\s]+@[^@\s]+\.[^@\s]+$/, 'Enter a valid email address');
const phone = z.string().trim().regex(/^[0-9+\- ]{7,20}$/, 'Use 7-20 digits, spaces, + or -');

export const registerSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  age: z.coerce.number().int().min(1, 'Age must be between 1 and 129').max(129, 'Age must be between 1 and 129').optional(),
  contactInfo: phone.optional().or(z.literal('').transform(() => undefined)),
  email,
  password: z.string().min(8, 'Password must be at least 8 characters').max(72, 'Password can be at most 72 characters'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().max(150),
  password: z.string().min(1).max(72),
  role: z.enum(['patient', 'admin']),
});

export const symptomSchema = z.object({
  text: z.string().trim().min(10, 'Please describe your symptoms in at least 10 characters').max(1000, 'Please keep it under 1000 characters'),
});

export const bookSchema = z.object({
  doctorId: z.number().int().positive(),
  clinicId: z.number().int().positive(),
  slot: z.string().regex(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/, 'Slot must look like 2026-11-20 10:30'),
  queryId: z.string().uuid().optional(),
});

export const cancelSchema = z.object({ status: z.literal('cancelled') });
export const adminStatusSchema = z.object({ status: z.enum(['no_show', 'cancelled']) });

export const prescriptionSchema = z.object({
  appointmentId: z.number().int().positive(),
  medicineDetails: z.string().trim().min(1, 'Medicine details are required').max(2000),
  notes: z.string().trim().max(2000).optional(),
});

export const doctorSchema = z.object({
  name: z.string().trim().min(1).max(100),
  yearsExperience: z.coerce.number().int().min(0).max(60),
  availabilityStatus: z.enum(['available', 'on_leave', 'unavailable']),
  specialityId: z.number().int().positive(),
});

export const clinicSchema = z.object({
  clinicName: z.string().trim().min(1).max(150),
  address: z.string().trim().min(1).max(255),
  phone: phone.optional().or(z.literal('').transform(() => undefined)),
});

export const specialitySchema = z.object({ specialityName: z.string().trim().min(1).max(100) });

export const worksAtSchema = z.object({
  doctorId: z.number().int().positive(),
  clinicId: z.number().int().positive(),
  sinceDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must look like 2026-01-31').optional(),
});

export const dateParam = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date must look like 2026-11-20');
