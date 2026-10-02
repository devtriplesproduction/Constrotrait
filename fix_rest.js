const fs = require('fs');

let c = fs.readFileSync('src/actions/test-result.actions.ts', 'utf8');
c = c.replace(/from\("test_results"\)/g, 'from("test_results" as any)');
fs.writeFileSync('src/actions/test-result.actions.ts', c);

let allJobs = fs.readFileSync('src/app/(dashboard)/clients/components/AllJobsTab.tsx', 'utf8');
allJobs = allJobs.replace(/variant: "destructive"/g, 'variant: "destructive" as any');
fs.writeFileSync('src/app/(dashboard)/clients/components/AllJobsTab.tsx', allJobs);

let page = fs.readFileSync('src/app/(dashboard)/results/page.tsx', 'utf8');
page = page.replace(/res\.error/g, 'res.error || null');
fs.writeFileSync('src/app/(dashboard)/results/page.tsx', page);

console.log("All fixed");
