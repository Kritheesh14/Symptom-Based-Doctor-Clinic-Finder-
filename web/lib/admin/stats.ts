import { query, queryOne } from '../db';
import { listSpecialities } from '../data/doctors';
import { specialityDemand } from '../vector/queries';
import { countCases } from '../vector/queries';

export async function adminStats() {
  const counters = await queryOne('SELECT * FROM v_admin_stats');

  // GROUP BY + HAVING: doctors with at least 2 completed appointments
  const busiestDoctors = await query(
    `SELECT d.doctor_id, d.name, s.speciality_name, count(*) AS completed
     FROM appointments a
     JOIN doctors d ON d.doctor_id = a.doctor_id
     JOIN specialities s ON s.speciality_id = d.speciality_id
     WHERE a.status = 'completed'
     GROUP BY d.doctor_id, d.name, s.speciality_name
     HAVING count(*) >= 2
     ORDER BY completed DESC, d.name
     LIMIT 5`,
  );

  const perSpeciality = await query(
    `SELECT s.speciality_name, count(*) AS appointments
     FROM appointments a
     JOIN doctors d ON d.doctor_id = a.doctor_id
     JOIN specialities s ON s.speciality_id = d.speciality_id
     WHERE a.appointment_time >= now() - interval '30 days' AND a.appointment_time < now()
     GROUP BY s.speciality_name
     ORDER BY appointments DESC, s.speciality_name`,
  );

  // The vector side may be offline; the dashboard must still load.
  let demand: { specialityId: number; specialityName: string; count: number }[] = [];
  let vector: { available: boolean; seedCases?: number; confirmedCases?: number } = { available: false };
  try {
    demand = (await specialityDemand(await listSpecialities())).filter((d) => d.count > 0);
    vector = { available: true, seedCases: await countCases('seed'), confirmedCases: await countCases('confirmed') };
  } catch {
    vector = { available: false };
  }

  return { counters, busiestDoctors, perSpeciality, demand, vector };
}
