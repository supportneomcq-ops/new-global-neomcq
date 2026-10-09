import fs from 'fs';

const report = JSON.parse(fs.readFileSync('scripts/inspection_report.json', 'utf8'));

console.log(`Total functions: ${report.total_functions}`);
console.log(`Security Definer functions (${report.security_definer_functions.length}):`);
for (const f of report.security_definer_functions) {
  console.log(`  - [SEC DEFINER] ${f.function_name}(${f.arguments}) [config: ${JSON.stringify(f.config)}]`);
}

console.log(`\nSecurity Invoker functions (${report.security_invoker_functions.length}):`);
for (const f of report.security_invoker_functions) {
  console.log(`  - [SEC INVOKER] ${f.function_name}(${f.arguments}) [config: ${JSON.stringify(f.config)}]`);
}
