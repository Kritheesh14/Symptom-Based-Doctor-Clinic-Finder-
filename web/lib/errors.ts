import { ZodError } from 'zod';

/** Error with an HTTP status that route handlers turn into a JSON response. */
export class AppError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

type PgLikeError = { code?: string; constraint?: string; message?: string };

const CONSTRAINT_MESSAGES: Record<string, string> = {
  patients_email_key: 'An account with this email already exists.',
  admins_email_key: 'An admin with this email already exists.',
  specialities_speciality_name_key: 'A speciality with this name already exists.',
  uq_doctor_slot_scheduled: 'That time slot has just been taken. Please pick another.',
  prescriptions_appointment_id_key: 'This appointment already has a prescription.',
  works_at_pkey: 'This doctor already works at that clinic.',
  fk_appt_works_at: 'The doctor does not work at the selected clinic.',
};

/** Translate PostgreSQL errors (SQLSTATE codes) into friendly AppErrors. Returns null if not a DB error we know. */
export function fromPgError(e: unknown): AppError | null {
  const err = e as PgLikeError;
  if (!err || typeof err.code !== 'string') return null;
  const known = err.constraint ? CONSTRAINT_MESSAGES[err.constraint] : undefined;
  switch (err.code) {
    case '23505':
      return new AppError(409, known ?? 'That value already exists.');
    case '23503':
      return new AppError(409, known ?? 'This record is still referenced by other records (or refers to something that does not exist).');
    case '23514':
      return new AppError(400, `A database rule rejected this value${err.constraint ? ` (${err.constraint})` : ''}.`);
    case '23502':
      return new AppError(400, 'A required field is missing.');
    case '22P02':
    case '22007':
    case '22008':
    case '22001':
      return new AppError(400, 'One of the values has an invalid format or is too long.');
    case 'P0001': // RAISE EXCEPTION from our triggers / functions: message is user-safe
      return new AppError(409, err.message ?? 'Request rejected by a database rule.');
    default:
      return null;
  }
}

export function errorResponse(e: unknown): Response {
  if (e instanceof AppError) return Response.json({ error: e.message }, { status: e.status });
  if (e instanceof ZodError) {
    const first = e.issues[0];
    const where = first?.path.length ? `${first.path.join('.')}: ` : '';
    return Response.json({ error: `${where}${first?.message ?? 'Invalid input'}` }, { status: 400 });
  }
  const pg = fromPgError(e);
  if (pg) return Response.json({ error: pg.message }, { status: pg.status });
  console.error(e);
  return Response.json({ error: 'Internal server error' }, { status: 500 });
}

/** Wrap a route handler so thrown errors become JSON responses. */
export function api<Args extends unknown[]>(handler: (...args: Args) => Promise<Response>) {
  return async (...args: Args): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (e) {
      return errorResponse(e);
    }
  };
}

/** Parse a JSON body, turning malformed JSON into a 400. */
export async function readJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    throw new AppError(400, 'Request body must be valid JSON.');
  }
}

export function intParam(value: string, name = 'id'): number {
  const n = Number(value);
  if (!Number.isInteger(n) || n <= 0) throw new AppError(400, `Invalid ${name}.`);
  return n;
}
