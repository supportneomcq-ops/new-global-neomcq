import fs from 'fs';

const report = JSON.parse(fs.readFileSync('scripts/inspection_report.json', 'utf8'));

const sampleTables = [
  'user_exams',
  'user_sticky_notes',
  'user_a4_annotations',
  'bookmarks',
  'notes',
  'exams',
  'profiles',
  'mcqs',
  'study_plans'
];

for (const t of sampleTables) {
  console.log(`\n=== Table: ${t} ===`);
  const pols = report.policies_by_table[t] || [];
  for (const p of pols) {
    console.log(`- [${p.policyname}] (${p.cmd}) roles: ${JSON.stringify(p.roles)}`);
    console.log(`    qual: ${p.qual}`);
    console.log(`    with_check: ${p.with_check}`);
  }
}
