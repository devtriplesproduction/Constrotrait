const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function encodeRef(ref) {
  return encodeURIComponent(ref).replace(/[!'()*]/g, function(c) {
    return '%' + c.charCodeAt(0).toString(16).toUpperCase();
  });
}

function createUnit(surface, boundary, subsystem, attackClass, paths) {
  const encSurface = encodeRef(surface);
  const encBoundary = encodeRef(boundary);
  const encSubsystem = encodeRef(subsystem);
  const encAttack = encodeRef(attackClass);
  const coverage_id = `${encSurface}::${encBoundary}::${encSubsystem}::${encAttack}`;

  return {
    coverage_id,
    canonical_refs: { surface, boundary, subsystem, attack_class: attackClass },
    surface, boundary, subsystem,
    attack_class: attackClass.split('#')[1] || attackClass,
    starting_paths: paths,
    ordinary_attack_class_block: attackClass,
    selected_companion_blocks: [
      'FILE.md#Core discipline', 'FILE.md#Universal moves', 'FILE.md#Validation rules', attackClass
    ],
    excluded_blocks: [], prior_status: 'new', attempts: [], wave: 1, status: 'planned',
    agent_id: null, reviewed_paths: [], local_checks: [], result_fingerprints: [], unresolved: []
  };
}

const units = [];

// 1. Actions
const actionsDir = 'src/actions';
if (fs.existsSync(actionsDir)) {
  const files = fs.readdirSync(actionsDir).filter(f => f.endsWith('.ts'));
  for (const file of files) {
    units.push(createUnit(
      `src/actions/${file}#ServerActions`,
      `src/actions/${file}#Authorization`,
      'subsystem/nextjs-actions',
      'ATTACK-CLASSES.md#Access control',
      [`src/actions/${file}`]
    ));
    units.push(createUnit(
      `src/actions/${file}#ServerActions`,
      `src/actions/${file}#InputValidation`,
      'subsystem/nextjs-actions',
      'ATTACK-CLASSES.md#Data isolation',
      [`src/actions/${file}`]
    ));
  }
}

// 2. API Routes
const apiDir = 'src/app/api';
if (fs.existsSync(apiDir)) {
  units.push(createUnit(
    'src/app/api/cron/expire-comp-off/route.ts#GET',
    'src/app/api/cron/expire-comp-off/route.ts#API_Authorization',
    'subsystem/nextjs-api',
    'ATTACK-CLASSES.md#Access control',
    ['src/app/api/cron/expire-comp-off/route.ts']
  ));
}

// 3. Supabase Migrations
const migrationsDir = 'supabase/migrations';
if (fs.existsSync(migrationsDir)) {
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'));
  for (const file of files) {
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
    if (content.includes('CREATE POLICY') || content.includes('CREATE UNIQUE INDEX')) {
      units.push(createUnit(
        `supabase/migrations/${file}#RLS`,
        `supabase/migrations/${file}#Row_Level_Security`,
        'subsystem/supabase',
        'ATTACK-CLASSES.md#Data isolation',
        [`supabase/migrations/${file}`]
      ));
    }
    if (content.includes('CREATE OR REPLACE FUNCTION')) {
       units.push(createUnit(
        `supabase/migrations/${file}#RPC`,
        `supabase/migrations/${file}#Function_Security`,
        'subsystem/supabase',
        'ATTACK-CLASSES.md#Access control',
        [`supabase/migrations/${file}`]
      ));
    }
  }
}

units.sort((a, b) => a.coverage_id < b.coverage_id ? -1 : (a.coverage_id > b.coverage_id ? 1 : 0));

const outDir = 'audit-reports';
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
fs.writeFileSync(path.join(outDir, 'coverage-ledger.json'), JSON.stringify(units, null, 2));
console.log('Created ' + units.length + ' units in coverage-ledger.json');
