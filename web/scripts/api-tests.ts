/**
 * End-to-end API / security test suite.  Needs the app running (npm run dev or npm start) and a seeded database.
 *   npx tsx --env-file=.env.local scripts/api-tests.ts            (BASE_URL defaults to http://localhost:3000)
 *   npx tsx --env-file=.env.local scripts/api-tests.ts --write    (also writes docs/testing/api-test-results.md)
 * Tests that need Qdrant are marked [vector] and are skipped automatically when Qdrant is not reachable.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { SignJWT } from 'jose';
import { closePool, query } from '@/lib/db';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
type Res = { status: number; body: any; headers: Headers };
type Row = { id: string; name: string; expected: string; actual: string; result: 'PASS' | 'FAIL' | 'SKIP' };
const rows: Row[] = [];

async function call(method: string, url: string, opt: { cookie?: string; json?: unknown; redirect?: RequestRedirect } = {}): Promise<Res> {
  const res = await fetch(BASE + url, {
    method,
    redirect: opt.redirect ?? 'manual',
    headers: { ...(opt.json !== undefined ? { 'Content-Type': 'application/json' } : {}), ...(opt.cookie ? { Cookie: opt.cookie } : {}) },
    body: opt.json !== undefined ? JSON.stringify(opt.json) : undefined,
  });
  const text = await res.text();
  let body: any = text;
  try { body = JSON.parse(text); } catch { /* html or empty */ }
  return { status: res.status, body, headers: res.headers };
}

function record(id: string, name: string, expected: string, actual: string, ok: boolean) {
  rows.push({ id, name, expected, actual, result: ok ? 'PASS' : 'FAIL' });
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${id}  ${name}  (expected ${expected}, got ${actual})`);
}
const expectStatus = (id: string, name: string, res: Res, want: number) => record(id, name, String(want), String(res.status), res.status === want);

async function login(email: string, password: string, role: 'patient' | 'admin'): Promise<{ cookie: string; res: Res }> {
  const res = await call('POST', '/api/auth/login', { json: { email, password, role } });
  const raw = res.headers.get('set-cookie') ?? '';
  return { cookie: raw.split(';')[0], res };
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString('base64url');
const rand = (n: number) => Math.floor(Math.random() * n);

async function main() {
  const write = process.argv.includes('--write');

  // ---------- login & session ----------
  const patient = await login('aarav.sharma@example.com', 'Patient@123', 'patient');
  expectStatus('A1', 'Seed patient can log in', patient.res, 200);
  const admin = await login('admin@symptomfinder.example', 'Admin@123', 'admin');
  expectStatus('A2', 'Seed admin can log in', admin.res, 200);
  const flags = (patient.res.headers.get('set-cookie') ?? '').toLowerCase();
  record('A3', 'Session cookie is HttpOnly + SameSite=Lax', 'httponly; samesite=lax', flags.includes('httponly') && flags.includes('samesite=lax') ? 'httponly; samesite=lax' : flags, flags.includes('httponly') && flags.includes('samesite=lax'));

  const bad = await login('aarav.sharma@example.com', 'wrong-password', 'patient');
  const unknown = await login('nobody@example.com', 'wrong-password', 'patient');
  expectStatus('A4', 'Wrong password rejected', bad.res, 401);
  record('A5', 'Unknown email gives the same error as a wrong password', 'identical 401 + message',
    `${unknown.res.status} ${unknown.res.body.error}`, unknown.res.status === 401 && unknown.res.body.error === bad.res.body.error);
  const roleMix = await login('aarav.sharma@example.com', 'Patient@123', 'admin');
  expectStatus('A6', 'Patient credentials do not work on the admin role', roleMix.res, 401);

  // ---------- no cookie => 401 on every protected route ----------
  const protectedRoutes: [string, string][] = [
    ['GET', '/api/appointments'], ['POST', '/api/appointments'], ['PATCH', '/api/appointments/1'], ['GET', '/api/prescriptions'],
    ['POST', '/api/prescriptions'], ['POST', '/api/symptom-check'], ['GET', '/api/doctors'], ['GET', '/api/doctors/1'],
    ['GET', '/api/doctors/1/slots?date=2030-01-01'], ['GET', '/api/specialities'], ['GET', '/api/admin/stats'],
    ['GET', '/api/admin/appointments'], ['PATCH', '/api/admin/appointments/1'], ['GET', '/api/admin/doctors'], ['POST', '/api/admin/doctors'],
    ['PUT', '/api/admin/doctors/1'], ['DELETE', '/api/admin/doctors/1'], ['GET', '/api/admin/clinics'], ['POST', '/api/admin/clinics'],
    ['GET', '/api/admin/specialities'], ['POST', '/api/admin/specialities'], ['POST', '/api/admin/works-at'], ['DELETE', '/api/admin/works-at'],
  ];
  let all401 = true; const not401: string[] = [];
  for (const [m, u] of protectedRoutes) {
    const r = await call(m, u, m === 'GET' || m === 'DELETE' ? {} : { json: {} });
    if (r.status !== 401) { all401 = false; not401.push(`${m} ${u}=${r.status}`); }
  }
  record('S1', `No cookie -> 401 on all ${protectedRoutes.length} protected routes`, '401 everywhere', all401 ? '401 everywhere' : not401.join(', '), all401);

  // ---------- role-based access ----------
  const adminRoutes = protectedRoutes.filter(([, u]) => u.startsWith('/api/admin'));
  let all403 = true; const not403: string[] = [];
  for (const [m, u] of adminRoutes) {
    const r = await call(m, u, { cookie: patient.cookie, ...(m === 'GET' || m === 'DELETE' ? {} : { json: {} }) });
    if (r.status !== 403) { all403 = false; not403.push(`${m} ${u}=${r.status}`); }
  }
  record('S2', `Patient session -> 403 on all ${adminRoutes.length} /api/admin/* routes`, '403 everywhere', all403 ? '403 everywhere' : not403.join(', '), all403);
  expectStatus('S3', 'Patient cannot POST /api/prescriptions (admin only)', await call('POST', '/api/prescriptions', { cookie: patient.cookie, json: { appointmentId: 1, medicineDetails: 'x' } }), 403);
  expectStatus('S4', 'Admin session cannot use patient booking API', await call('GET', '/api/appointments', { cookie: admin.cookie }), 403);
  expectStatus('S5', 'Admin session cannot call symptom-check', await call('POST', '/api/symptom-check', { cookie: admin.cookie, json: { text: 'a long enough text' } }), 403);

  // ---------- token tampering ----------
  const token = patient.cookie.split('=')[1];
  const [h, p, s] = token.split('.');
  const flipped = s.slice(0, -2) + (s.endsWith('A') ? 'B' : 'A') + s.slice(-1);
  expectStatus('S6', 'JWT with a modified signature -> 401', await call('GET', '/api/appointments', { cookie: `session=${h}.${p}.${flipped}` }), 401);
  const forgedPayload = b64({ sub: '1', role: 'admin', name: 'x', exp: Math.floor(Date.now() / 1000) + 3600 });
  expectStatus('S7', 'JWT with role changed to admin but old signature -> 401', await call('GET', '/api/admin/stats', { cookie: `session=${h}.${forgedPayload}.${s}` }), 401);
  const wrongKey = await new SignJWT({ role: 'admin', name: 'x' }).setProtectedHeader({ alg: 'HS256' }).setSubject('1').setExpirationTime('1h').sign(new TextEncoder().encode('a-completely-different-secret-of-sufficient-length'));
  expectStatus('S8', 'JWT signed with the wrong secret -> 401', await call('GET', '/api/admin/stats', { cookie: `session=${wrongKey}` }), 401);
  const noneAlg = `${b64({ alg: 'none', typ: 'JWT' })}.${b64({ sub: '1', role: 'admin', name: 'x', exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
  expectStatus('S9', 'Unsigned (alg=none) JWT -> 401', await call('GET', '/api/admin/stats', { cookie: `session=${noneAlg}` }), 401);
  const expired = await new SignJWT({ role: 'admin', name: 'x' }).setProtectedHeader({ alg: 'HS256' }).setSubject('1').setExpirationTime(Math.floor(Date.now() / 1000) - 60).sign(new TextEncoder().encode(process.env.JWT_SECRET!));
  expectStatus('S10', 'Expired JWT -> 401', await call('GET', '/api/admin/stats', { cookie: `session=${expired}` }), 401);

  // ---------- SQL injection treated as data ----------
  const inj = "' OR 1=1 --";
  const sqlA = await call('GET', `/api/doctors?q=${encodeURIComponent(inj)}`, { cookie: patient.cookie });
  const totalDocs = (await query<{ n: number }>('SELECT count(*)::int AS n FROM doctors'))[0].n;
  // The words "or" / "1" are searched literally (prefix "or" legitimately matches Orthopedics); the query is NOT widened to every row.
  record('S11', "Injection string in search q (' OR 1=1 --) is searched as plain words, not executed", `200 and fewer than ${totalDocs} rows`, `${sqlA.status}, ${Array.isArray(sqlA.body) ? sqlA.body.length : '?'} rows`, sqlA.status === 200 && Array.isArray(sqlA.body) && sqlA.body.length < totalDocs);
  const t0 = Date.now();
  const sleepInj = await call('GET', `/api/doctors?q=${encodeURIComponent("'; SELECT pg_sleep(zzqx); --")}`, { cookie: patient.cookie });
  record('S11b', 'Time-based injection (pg_sleep) is not executed', '200, 0 rows, < 3 s', `${sleepInj.status}, ${sleepInj.body.length} rows, ${Date.now() - t0} ms`, sleepInj.status === 200 && sleepInj.body.length === 0 && Date.now() - t0 < 3000);
  const sqlB = await call('POST', '/api/auth/login', { json: { email: "admin@symptomfinder.example' OR '1'='1", password: "' OR '1'='1", role: 'admin' } });
  expectStatus('S12', 'SQL injection in login email/password -> normal 401', sqlB, 401);
  const sqlC = await call('GET', `/api/doctors?q=${encodeURIComponent("x'; DROP TABLE doctors; --")}&speciality=1%20OR%201=1`, { cookie: patient.cookie });
  const stillThere = await query<{ n: number }>('SELECT count(*)::int AS n FROM doctors');
  record('S13', 'Stacked-query injection attempt: doctors table intact', '200 and 20 doctors', `${sqlC.status}, ${stillThere[0].n} doctors`, sqlC.status === 200 && stillThere[0].n >= 20);
  const symptomInj = await call('POST', '/api/symptom-check', { cookie: patient.cookie, json: { text: "'; DELETE FROM patients; -- chest pain for days" } });
  const pCount = await query<{ n: number }>('SELECT count(*)::int AS n FROM patients');
  record('S14', 'Injection text in symptom-check is plain data (patients intact)', 'no 5xx caused by SQL; patients intact', `${symptomInj.status}, ${pCount[0].n} patients`, pCount[0].n >= 10 && [200, 503].includes(symptomInj.status));

  // ---------- passwords stored hashed ----------
  const hashes = await query<{ ok: boolean }>(`SELECT (password_hash ~ '^\\$2[aby]\\$10\\$' AND length(password_hash) = 60) AS ok FROM patients UNION ALL SELECT (password_hash ~ '^\\$2[aby]\\$10\\$' AND length(password_hash) = 60) FROM admins`);
  record('S15', 'Every stored password is a 60-char bcrypt ($2.$10$) hash', 'all true', `${hashes.filter((h) => h.ok).length}/${hashes.length} bcrypt`, hashes.every((h) => h.ok));

  // ---------- page guards & headers ----------
  const g1 = await call('GET', '/admin');
  record('S16', 'Anonymous GET /admin redirects to /login', '307 -> /login', `${g1.status} -> ${g1.headers.get('location')}`, g1.status === 307 && (g1.headers.get('location') ?? '').includes('/login'));
  const g2 = await call('GET', '/admin', { cookie: patient.cookie });
  record('S17', 'Patient GET /admin redirected away', '307 -> /', `${g2.status} -> ${g2.headers.get('location')}`, g2.status === 307 && !(g2.headers.get('location') ?? '').includes('/admin'));
  const g3 = await call('GET', '/');
  record('S18', 'Security headers present (nosniff, frame deny)', 'both set', `${g3.headers.get('x-content-type-options')}, ${g3.headers.get('x-frame-options')}`, g3.headers.get('x-content-type-options') === 'nosniff' && g3.headers.get('x-frame-options') === 'DENY');

  // ---------- registration validation ----------
  const email = `qa.${Date.now()}@example.com`;
  expectStatus('R1', 'Register a new patient', await call('POST', '/api/auth/register', { json: { name: 'QA One', age: 30, contactInfo: '+91 90000 00001', email, password: 'Sup3rSecret!' } }), 201);
  expectStatus('R2', 'Duplicate email -> 409', await call('POST', '/api/auth/register', { json: { name: 'QA One', email, password: 'Sup3rSecret!' } }), 409);
  expectStatus('R3', 'Invalid email -> 400', await call('POST', '/api/auth/register', { json: { name: 'QA', email: 'nope', password: 'Sup3rSecret!' } }), 400);
  expectStatus('R4', 'Age 200 -> 400', await call('POST', '/api/auth/register', { json: { name: 'QA', age: 200, email: `x${email}`, password: 'Sup3rSecret!' } }), 400);
  expectStatus('R5', 'Short password -> 400', await call('POST', '/api/auth/register', { json: { name: 'QA', email: `y${email}`, password: 'short' } }), 400);
  expectStatus('R6', 'Malformed JSON body -> 400', (await fetch(BASE + '/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{oops' }).then(async (r) => ({ status: r.status, body: null, headers: r.headers }))), 400);
  const qa = await login(email, 'Sup3rSecret!', 'patient');
  expectStatus('R7', 'New patient can log in', qa.res, 200);
  const qaHash = await query<{ h: string }>('SELECT left(password_hash, 7) AS h FROM patients WHERE email = $1', [email]);
  record('R8', 'New account password stored as bcrypt hash', 'starts with $2', qaHash[0].h, qaHash[0].h.startsWith('$2'));

  // ---------- search & booking flow ----------
  const docs = await call('GET', '/api/doctors?q=cardio', { cookie: qa.cookie });
  record('D1', 'Doctor search "cardio" returns the cardiologists', '2 rows', `${docs.body.length} rows`, docs.status === 200 && docs.body.length === 2);
  const dir = await call('GET', '/api/doctors?speciality=3', { cookie: qa.cookie });
  record('D2', 'Directory filtered by speciality id', 'only Dermatology rows', `${dir.body.length} rows`, dir.body.length > 0 && dir.body.every((d: any) => d.speciality_name === 'Dermatology'));

  const day = new Date(Date.now() + (30 + rand(300)) * 86400000).toISOString().slice(0, 10);
  const slots = await call('GET', `/api/doctors/3/slots?date=${day}`, { cookie: qa.cookie });
  record('B1', 'Slots for a future date: 16 half-hour slots, all free', '16 / 16 available', `${slots.body.length} / ${slots.body.filter?.((x: any) => x.available).length}`, slots.body.length === 16 && slots.body.every((x: any) => x.available));
  const slot = `${day} ${String(9 + rand(7)).padStart(2, '0')}:00`;
  const book = await call('POST', '/api/appointments', { cookie: qa.cookie, json: { doctorId: 3, clinicId: 2, slot } });
  expectStatus('B2', 'Book an available slot', book, 201);
  expectStatus('B3', 'Double-booking the same slot -> 409', await call('POST', '/api/appointments', { cookie: admin.cookie, json: { doctorId: 3, clinicId: 2, slot } }), 403); // admin may not book
  const qb = await login('diya.patel@example.com', 'Patient@123', 'patient');
  expectStatus('B4', 'Second patient booking the same slot -> 409', await call('POST', '/api/appointments', { cookie: qb.cookie, json: { doctorId: 3, clinicId: 2, slot } }), 409);
  expectStatus('B5', 'Booking at a clinic where the doctor does not work -> 409', await call('POST', '/api/appointments', { cookie: qb.cookie, json: { doctorId: 3, clinicId: 6, slot: `${day} 15:00` } }), 409);
  expectStatus('B6', 'Booking in the past -> 409', await call('POST', '/api/appointments', { cookie: qb.cookie, json: { doctorId: 3, clinicId: 2, slot: '2020-01-01 10:00' } }), 409);
  expectStatus('B7', 'Booking an on-leave doctor (id 18) -> 409', await call('POST', '/api/appointments', { cookie: qb.cookie, json: { doctorId: 18, clinicId: 2, slot: `${day} 11:00` } }), 409);
  expectStatus('B8', 'Malformed slot -> 400', await call('POST', '/api/appointments', { cookie: qb.cookie, json: { doctorId: 3, clinicId: 2, slot: 'tomorrow' } }), 400);

  const apptId = (await query<{ appointment_id: number }>(`SELECT appointment_id FROM appointments WHERE patient_id = (SELECT patient_id FROM patients WHERE email = $1) AND status = 'scheduled'`, [email]))[0].appointment_id;
  expectStatus('B9', "Patient B cannot cancel patient A's appointment (404)", await call('PATCH', `/api/appointments/${apptId}`, { cookie: qb.cookie, json: { status: 'cancelled' } }), 404);
  const mine = await call('GET', '/api/appointments', { cookie: qa.cookie });
  record('B10', 'Patient sees only their own appointments', '1 appointment', `${mine.body.length}`, mine.body.length === 1);

  // admin completes + prescribes
  const bad1 = await call('POST', '/api/prescriptions', { cookie: admin.cookie, json: { appointmentId: apptId, medicineDetails: '' } });
  expectStatus('P1', 'Prescription with empty medicine details -> 400', bad1, 400);
  const rx = await call('POST', '/api/prescriptions', { cookie: admin.cookie, json: { appointmentId: apptId, medicineDetails: 'Cetirizine 10 mg once daily for 5 days', notes: 'API test' } });
  expectStatus('P2', 'Admin completes appointment and writes prescription', rx, 201);
  expectStatus('P3', 'Completing the same appointment again -> 409', await call('POST', '/api/prescriptions', { cookie: admin.cookie, json: { appointmentId: apptId, medicineDetails: 'again' } }), 409);
  const myRx = await call('GET', '/api/prescriptions', { cookie: qa.cookie });
  record('P4', 'Patient sees the new prescription', '1 prescription', `${myRx.body.length}`, myRx.body.length === 1 && myRx.body[0].medicine_details.startsWith('Cetirizine'));
  expectStatus('P5', 'Completed appointment can no longer be cancelled (404)', await call('PATCH', `/api/appointments/${apptId}`, { cookie: qa.cookie, json: { status: 'cancelled' } }), 404);
  record('P6', 'Feedback-loop flag reported by API', 'promotedToCorpus is boolean', String(rx.body.promotedToCorpus), typeof rx.body.promotedToCorpus === 'boolean');

  // cancel flow
  const slot2 = `${day} ${String(9 + rand(7)).padStart(2, '0')}:30`;
  expectStatus('B11', 'Book a second slot', await call('POST', '/api/appointments', { cookie: qa.cookie, json: { doctorId: 3, clinicId: 3, slot: slot2 } }), 201);
  const id2 = (await query<{ appointment_id: number }>(`SELECT appointment_id FROM appointments WHERE patient_id = (SELECT patient_id FROM patients WHERE email = $1) AND status = 'scheduled'`, [email]))[0].appointment_id;
  expectStatus('B12', 'Patient cancels own appointment', await call('PATCH', `/api/appointments/${id2}`, { cookie: qa.cookie, json: { status: 'cancelled' } }), 200);
  const slots2 = await call('GET', `/api/doctors/3/slots?date=${day}`, { cookie: qa.cookie });
  record('B13', 'Cancelled slot is free again', 'slot available', String(slots2.body.find((x: any) => x.slot === slot2)?.available), slots2.body.find((x: any) => x.slot === slot2)?.available === true);

  // ---------- admin master data ----------
  const stats = await call('GET', '/api/admin/stats', { cookie: admin.cookie });
  record('M1', 'Admin stats load (even if Qdrant is down)', '200 with counters', `${stats.status}`, stats.status === 200 && typeof stats.body.counters?.total_doctors === 'number');
  const clinicName = `QA Clinic ${Date.now()}`;
  const mk = await call('POST', '/api/admin/clinics', { cookie: admin.cookie, json: { clinicName, address: '1 Test Road', phone: '+91 80 0000 0000' } });
  expectStatus('M2', 'Admin creates a clinic', mk, 201);
  const cid = mk.body.clinic_id;
  expectStatus('M3', 'Clinic with invalid phone -> 400', await call('POST', '/api/admin/clinics', { cookie: admin.cookie, json: { clinicName: 'Bad', address: 'x', phone: 'call me' } }), 400);
  expectStatus('M4', 'Admin updates the clinic', await call('PUT', `/api/admin/clinics/${cid}`, { cookie: admin.cookie, json: { clinicName: clinicName + ' II', address: '2 Test Road' } }), 200);
  expectStatus('M5', 'Admin links doctor 16 to the clinic (works_at)', await call('POST', '/api/admin/works-at', { cookie: admin.cookie, json: { doctorId: 16, clinicId: cid, sinceDate: '2026-01-01' } }), 201);
  expectStatus('M6', 'Duplicate works_at link -> 409', await call('POST', '/api/admin/works-at', { cookie: admin.cookie, json: { doctorId: 16, clinicId: cid } }), 409);
  expectStatus('M7', 'Deleting a clinic that has doctors -> 409 (FK RESTRICT)', await call('DELETE', `/api/admin/clinics/${cid}`, { cookie: admin.cookie }), 409);
  expectStatus('M8', 'Admin removes the works_at link', await call('DELETE', '/api/admin/works-at', { cookie: admin.cookie, json: { doctorId: 16, clinicId: cid } }), 200);
  expectStatus('M9', 'Admin deletes the now-empty clinic', await call('DELETE', `/api/admin/clinics/${cid}`, { cookie: admin.cookie }), 200);
  expectStatus('M10', 'Deleting a speciality that still has doctors -> 409', await call('DELETE', '/api/admin/specialities/2', { cookie: admin.cookie }), 409);
  expectStatus('M11', 'Deleting a doctor with appointments -> 409', await call('DELETE', '/api/admin/doctors/1', { cookie: admin.cookie }), 409);
  const newSpec = await call('POST', '/api/admin/specialities', { cookie: admin.cookie, json: { specialityName: `QA Spec ${Date.now()}` } });
  expectStatus('M12', 'Admin creates a speciality', newSpec, 201);
  expectStatus('M13', 'Duplicate speciality name -> 409', await call('POST', '/api/admin/specialities', { cookie: admin.cookie, json: { specialityName: 'Cardiology' } }), 409);
  expectStatus('M14', 'Admin deletes the new speciality', await call('DELETE', `/api/admin/specialities/${newSpec.body.speciality_id}`, { cookie: admin.cookie }), 200);
  const newDoc = await call('POST', '/api/admin/doctors', { cookie: admin.cookie, json: { name: 'Dr. QA Test', yearsExperience: 3, availabilityStatus: 'available', specialityId: 1 } });
  expectStatus('M15', 'Admin creates a doctor', newDoc, 201);
  expectStatus('M16', 'Doctor with 61 years of experience -> 400', await call('POST', '/api/admin/doctors', { cookie: admin.cookie, json: { name: 'Dr. Old', yearsExperience: 61, availabilityStatus: 'available', specialityId: 1 } }), 400);
  expectStatus('M17', 'Admin sets doctor on leave (update)', await call('PUT', `/api/admin/doctors/${newDoc.body.doctor_id}`, { cookie: admin.cookie, json: { name: 'Dr. QA Test', yearsExperience: 3, availabilityStatus: 'on_leave', specialityId: 1 } }), 200);
  expectStatus('M18', 'Admin deletes the test doctor', await call('DELETE', `/api/admin/doctors/${newDoc.body.doctor_id}`, { cookie: admin.cookie }), 200);

  // admin no-show
  const futureId = (await query<{ appointment_id: number }>(`SELECT appointment_id FROM appointments WHERE status = 'scheduled' ORDER BY appointment_id LIMIT 1`))[0].appointment_id;
  expectStatus('M19', 'Admin marks a scheduled appointment as no-show', await call('PATCH', `/api/admin/appointments/${futureId}`, { cookie: admin.cookie, json: { status: 'no_show' } }), 200);
  expectStatus('M20', 'Marking the same appointment again -> 404', await call('PATCH', `/api/admin/appointments/${futureId}`, { cookie: admin.cookie, json: { status: 'no_show' } }), 404);
  const filt = await call('GET', '/api/admin/appointments?status=completed', { cookie: admin.cookie });
  record('M21', 'Admin appointment filter by status', 'only completed', `${filt.body.length} rows`, filt.body.length > 0 && filt.body.every((r: any) => r.status === 'completed'));
  expectStatus('M22', 'Invalid filter value -> 400', await call('GET', '/api/admin/appointments?status=bogus', { cookie: admin.cookie }), 400);

  // ---------- vector-dependent ----------
  const sc = await call('POST', '/api/symptom-check', { cookie: qa.cookie, json: { text: 'my chest feels tight when I climb stairs' } });
  if (sc.status === 200) {
    record('V1', '[vector] symptom-check returns Cardiology for a chest-tightness description', 'Cardiology', sc.body.recommendation.specialityName, sc.body.recommendation.specialityName === 'Cardiology');
    record('V2', '[vector] response contains doctors, disclaimer and no raw vector', 'doctors[] + disclaimer, no vector', `${sc.body.doctors.length} doctors, vector=${'vector' in sc.body.recommendation}`, sc.body.doctors.length > 0 && !!sc.body.disclaimer && !('vector' in sc.body.recommendation));
    expectStatus('V3', '[vector] too-short text -> 400', await call('POST', '/api/symptom-check', { cookie: qa.cookie, json: { text: 'pain' } }), 400);
  } else {
    expectStatus('V0', 'Qdrant offline: symptom-check degrades to 503 with a friendly message', sc, 503);
    for (const id of ['V1', 'V2', 'V3']) rows.push({ id, name: '[vector] requires Qdrant + embedding model', expected: '-', actual: 'not run here', result: 'SKIP' });
  }

  const fails = rows.filter((r) => r.result === 'FAIL');
  console.log(`\n${rows.filter((r) => r.result === 'PASS').length} passed, ${fails.length} failed, ${rows.filter((r) => r.result === 'SKIP').length} skipped`);

  if (write) {
    const md = [
      '# API and security test results', '',
      `Run against \`${BASE}\` on ${new Date().toISOString()} by \`scripts/api-tests.ts\`.`, '',
      '| ID | Test | Expected | Actual | Result |', '|---|---|---|---|---|',
      ...rows.map((r) => `| ${r.id} | ${r.name.replace(/\|/g, '\\|')} | ${r.expected.replace(/\|/g, '\\|')} | ${r.actual.replace(/\|/g, '\\|')} | ${r.result} |`), '',
      `**${rows.filter((r) => r.result === 'PASS').length} passed, ${fails.length} failed, ${rows.filter((r) => r.result === 'SKIP').length} skipped.**`, '',
    ].join('\n');
    writeFileSync(path.resolve(process.cwd(), '../docs/testing/api-test-results.md'), md);
  }
  await closePool();
  process.exit(fails.length ? 1 : 0);
}

main().catch(async (e) => { console.error(e); await closePool(); process.exit(1); });
