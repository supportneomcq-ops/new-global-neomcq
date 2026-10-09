import fs from 'fs';

const report = JSON.parse(fs.readFileSync('scripts/inspection_report.json', 'utf8'));

console.log("=== TARGET TABLES DETAILS ===");
for (const [name, info] of Object.entries(report.target_tables)) {
  console.log(`\n--- TABLE: ${name} (Row count: ${info.rowCount}) ---`);
  console.log("Columns:");
  for (const c of info.columns) {
    console.log(`  - ${c.column_name}: ${c.data_type} (nullable: ${c.is_nullable}, default: ${c.column_default})`);
  }
}

console.log("\n=== SECURITY DEFINER FUNCTIONS DETAILS ===");
for (const fn of report.security_definer_functions) {
  console.log(`\n======================================================`);
  console.log(`FUNCTION: ${fn.function_name}(${fn.arguments})`);
  console.log(`Config/Search Path: ${JSON.stringify(fn.config)}`);
  console.log(`Definition:\n${fn.definition}`);
}
