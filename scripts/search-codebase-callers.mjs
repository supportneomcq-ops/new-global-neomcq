import fs from 'fs';
import path from 'path';

const keywords = [
  'ai_discovered_exams',
  'user_exam_selections',
  'user_study_topics',
  'ai_tutor_tts_cache',
  'active_recall_batches',
  'credit_adjust',
  'credit_consume',
  'credit_release',
  'credit_reserve',
  'execute_exam_switch_atomic',
  'acquire_topic_refresh_lock',
  'promote_ugc_to_canonical',
  'resolve_exam_alias',
  'get_admin_analytics_summary',
  'submit_mcq_answer_atomic',
  'get_public_mcq_by_slug',
  'record_payment_event',
  'is_admin',
  'has_permission'
];

function searchFiles(dir, fileList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === '.next' || file === '.git' || file === 'dist') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchFiles(fullPath, fileList);
    } else if (file.endsWith('.ts') || file.endsWith('.tsx') || file.endsWith('.js') || file.endsWith('.mjs') || file.endsWith('.sql')) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const allFiles = searchFiles('.');
const matches = {};
for (const kw of keywords) {
  matches[kw] = [];
  for (const f of allFiles) {
    if (f.startsWith('scripts/analyze') || f.startsWith('scripts/batch1') || f.startsWith('scripts/inspection')) continue;
    const content = fs.readFileSync(f, 'utf8');
    if (content.includes(kw)) {
      matches[kw].push(f);
    }
  }
}

console.log("=== CODEBASE USAGE OF TARGET TABLES & FUNCTIONS ===");
for (const [kw, files] of Object.entries(matches)) {
  console.log(`\n[${kw}] found in ${files.length} files:`);
  for (const f of files) {
    console.log(`  - ${f}`);
  }
}
