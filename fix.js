const fs = require('fs');
const path = require('path');

function getFiles(dir, filesList = []) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      getFiles(fullPath, filesList);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      filesList.push(fullPath);
    }
  }
  return filesList;
}

const files = getFiles('src');
let changedFiles = 0;

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  content = content.replace(/t\.job_entries\?\.uid_label \|\| t\.job_entries\?\.uid \|\| ""/g, 't.uid_label || "UID missing"');
  
  content = content.replace(/j\?\.uid_label \|\| j\?\.uid \|\| ""/g, 'j?.uid_label || "UID missing"');
  content = content.replace(/j\?\.uid_label \|\| j\?\.uid \|\| assignment\?\.job_entry_tests\?\.uid \|\| ""/g, 'j?.uid_label || "UID missing"');
  content = content.replace(/\{job\?\.uid_label \|\| ''\}/g, '{job?.uid_label || "UID missing"}');
  
  content = content.replace(/UID queued \(test date: \$\{.*?\}\)/g, 'UID missing');
  content = content.replace(/`UID queued`/g, '"UID missing"');
  
  // MyAssignmentsTab / AllJobsTab specific uid resolution function
  content = content.replace(/if \(t\?\.uid_label\) return `UID: \$\{t\.uid_label\}`;[\s\S]*?return `UID queued \(test date: \$\{testDate\}\}`;/g, 'if (t?.uid_label) return `UID: ${t.uid_label}`;\n  return "UID missing";');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log('Updated', file);
    changedFiles++;
  }
}
console.log('Changed', changedFiles, 'files');
