const fs = require('fs');
const glob = require('glob');

const files = glob.sync('src/**/*.tsx');
let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/t\.job_entries\?\.uid_label \|\| t\.job_entries\?\.uid \|\| \"\"/g, 't.uid_label || "UID missing"');
  
  content = content.replace(/j\?\.uid_label \|\| j\?\.uid \|\| \"\"/g, 'j?.uid_label || "UID missing"');
  content = content.replace(/j\?\.uid_label \|\| j\?\.uid \|\| assignment\?\.job_entry_tests\?\.uid \|\| \"\"/g, 'j?.uid_label || "UID missing"');
  content = content.replace(/\{job\?\.uid_label \|\| ''\}/g, '{job?.uid_label || "UID missing"}');
  
  content = content.replace(/UID queued \(test date: \$\{.*?\}\)/g, 'UID missing');
  content = content.replace(/UID queued/g, 'UID missing');

  // AllJobsTab and MyAssignmentsTab uid fallback
  content = content.replace(/if \(t\?\.uid_label\) return `UID: \$\{t\.uid_label\}`;[\s\S]*?return `UID missing \(test date: \$\{testDate\}\}`;/g, 'if (t?.uid_label) return `UID: ${t.uid_label}`;\n  return "UID missing";');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
    changedFiles++;
  }
}
console.log('Changed', changedFiles, 'files');
