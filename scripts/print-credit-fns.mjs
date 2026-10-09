import fs from 'fs';

const report = JSON.parse(fs.readFileSync('scripts/inspection_report.json', 'utf8'));

const names = [
  'acquire_topic_refresh_lock',
  'credit_adjust',
  'credit_consume',
  'credit_release',
  'credit_reserve',
];

for (const fn of report.security_definer_functions) {
  if (names.includes(fn.function_name)) {
    console.log(`\n======================================================`);
    console.log(`FUNCTION: ${fn.function_name}(${fn.arguments})`);
    console.log(`Config/Search Path: ${JSON.stringify(fn.config)}`);
    console.log(`Definition:\n${fn.definition}`);
  }
}
