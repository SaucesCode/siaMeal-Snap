// Runs supabase/schema.sql against an in-memory Postgres (PGlite) with stubbed Supabase
// `auth` and `storage` schemas, then tests the database functions the app relies on.
//
//   npm run test:sql
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PGlite } from '@electric-sql/pglite';

const USER_A = '11111111-1111-1111-1111-111111111111';
const USER_B = '22222222-2222-2222-2222-222222222222';

const db = new PGlite();
await db.exec(`
  CREATE SCHEMA auth;
  CREATE TABLE auth.users (id uuid PRIMARY KEY);
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true), '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'authenticated' $$;
  CREATE ROLE anon; CREATE ROLE authenticated;
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
  CREATE TABLE storage.objects (bucket_id text, name text);
  CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql AS $$
    SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1] $$;
  INSERT INTO auth.users VALUES ('${USER_A}'), ('${USER_B}');
`);
await db.exec(readFileSync(fileURLToPath(new URL('../supabase/schema.sql', import.meta.url)), 'utf8'));

let failures = 0;
function check(name, ok, info) {
  console.log(`${ok ? 'PASS' : 'FAIL'} ${name}${ok ? '' : ` ${JSON.stringify(info)}`}`);
  if (!ok) failures += 1;
}
const asUser = (uid) => db.exec(`SET test.uid = '${uid ?? ''}'`);

// ── consume_ai_quota ────────────────────────────────────────────────────────
async function quota(kind, limit) {
  return (await db.query('SELECT public.consume_ai_quota($1, $2, 3600) AS ok', [kind, limit])).rows[0].ok;
}
await asUser(USER_A);
const calls = [];
for (let i = 0; i < 4; i += 1) calls.push(await quota('analyze', 3));
check('quota: 4th call over a limit of 3 is refused', calls.join() === 'true,true,true,false', calls);
check('quota: chat is counted separately', (await quota('chat', 3)) === true);
await asUser(USER_B);
check('quota: other users are unaffected', (await quota('analyze', 3)) === true);
await asUser(null);
try {
  await quota('chat', 3);
  check('quota: anonymous callers are rejected', false);
} catch (err) {
  check('quota: anonymous callers are rejected', String(err.message).includes('Not authenticated'), err.message);
}

// ── get_logging_streak ──────────────────────────────────────────────────────
/** A timestamp N local days ago at hh:mm in the given zone. */
async function localTime(tz, daysAgo, hhmm) {
  const sql = `SELECT ((((now() AT TIME ZONE $1)::date - $2::int) + $3::time) AT TIME ZONE $1) AS ts`;
  return (await db.query(sql, [tz, daysAgo, hhmm])).rows[0].ts;
}
async function logMeal(uid, ts) {
  await db.query(
    "INSERT INTO public.meals (user_id, name, calories, protein_g, carbs_g, fat_g, logged_at) VALUES ($1, 'meal', 300, 10, 10, 10, $2)",
    [uid, ts]
  );
}
async function streak(tz) {
  return (await db.query('SELECT * FROM public.get_logging_streak($1)', [tz])).rows[0];
}
async function resetMeals() {
  await db.exec('DELETE FROM public.meals');
}

const TZ = 'Asia/Manila';
await asUser(USER_A);

await resetMeals();
for (const d of [0, 1, 2]) await logMeal(USER_A, await localTime(TZ, d, '12:00'));
let s = await streak(TZ);
check('streak: three consecutive local days → 3, including today', s.streak === 3 && s.includes_today === true, s);

await resetMeals();
for (const d of [0, 1, 3]) await logMeal(USER_A, await localTime(TZ, d, '12:00'));
s = await streak(TZ);
check('streak: a missed day breaks it', s.streak === 2, s);

await resetMeals();
for (const d of [1, 2]) await logMeal(USER_A, await localTime(TZ, d, '12:00'));
s = await streak(TZ);
check('streak: nothing yet today keeps yesterday\'s run alive', s.streak === 2 && s.includes_today === false, s);

await resetMeals();
await logMeal(USER_A, await localTime(TZ, 0, '00:30'));
const utcDate = (await db.query("SELECT ((now() AT TIME ZONE 'Asia/Manila')::date - 0 + time '00:30') AT TIME ZONE 'Asia/Manila' AT TIME ZONE 'UTC' AS d")).rows[0].d;
s = await streak(TZ);
check(`streak: 00:30 Manila (UTC ${String(utcDate).slice(0, 16)}) counts as today in Manila`, s.streak === 1 && s.includes_today === true, s);

await resetMeals();
for (const d of [0, 1]) await logMeal(USER_B, await localTime(TZ, d, '12:00'));
s = await streak(TZ);
check("streak: other users' meals are ignored", s.streak === 0 && s.includes_today === false, s);

await asUser(null);
try {
  await streak(TZ);
  check('streak: anonymous callers are rejected', false);
} catch (err) {
  check('streak: anonymous callers are rejected', String(err.message).includes('Not authenticated'), err.message);
}

await db.close();
if (failures > 0) {
  console.error(`${failures} SQL test(s) failed`);
  process.exit(1);
}
console.log('All SQL tests passed');
