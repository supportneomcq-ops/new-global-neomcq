import fs from 'fs';

const report = JSON.parse(fs.readFileSync('scripts/inspection_report.json', 'utf8'));

for (const [name, info] of Object.entries(report.target_tables)) {
  console.log(`\n========================================`);
  console.log(`TABLE: ${name}`);
  console.log(`Row count: ${info.rowCount}`);
  console.log(`Existing policies (${info.existing_policies.length}):`);
  for (const p of info.existing_policies) {
    console.log(`  - ${p.policyname} (${p.cmd}) roles: ${JSON.stringify(p.roles)} qual: ${p.qual} with_check: ${p.with_check}`);
  }
  console.log("Columns:");
  for (const c of info.columns) {
    console.log(`  ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable}, default: ${c.column_default})`);
  }
}
