const fs = require('fs');
const path = require('path');

function encodeRef(ref) {
  // percent encoding leaving only A-Z a-z 0-9 - . _ ~
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
    canonical_refs: {
      surface,
      boundary,
      subsystem,
      attack_class: attackClass
    },
    surface,
    boundary,
    subsystem,
    attack_class: attackClass.split('#')[1] || attackClass,
    starting_paths: paths,
    ordinary_attack_class_block: attackClass,
    selected_companion_blocks: [
      "FILE.md#Core discipline",
      "FILE.md#Universal moves",
      "FILE.md#Validation rules",
      attackClass
    ],
    excluded_blocks: [],
    prior_status: "new",
    attempts: [],
    wave: 1,
    status: "planned",
    agent_id: null,
    reviewed_paths: [],
    local_checks: [],
    result_fingerprints: [],
    unresolved: []
  };
}

const units = [
  createUnit(
    "src/app/api/cron/expire-comp-off/route.ts#GET",
    "src/app/api/cron/expire-comp-off/route.ts#API_Authorization",
    "profile/quick/all-in-scope-subsystems",
    "ATTACK-CLASSES.md#Access control",
    ["src/app/api/cron/expire-comp-off/route.ts"]
  ),
  createUnit(
    "src/actions/admin.actions.ts#ServerActions",
    "src/actions/admin.actions.ts#requireSuperAdmin",
    "profile/quick/all-in-scope-subsystems",
    "ATTACK-CLASSES.md#Access control",
    ["src/actions/admin.actions.ts"]
  ),
  createUnit(
    "supabase/migrations#RLS",
    "supabase/migrations#Row_Level_Security",
    "profile/quick/all-in-scope-subsystems",
    "ATTACK-CLASSES.md#Data isolation",
    ["supabase/migrations"]
  )
];

units.sort((a, b) => a.coverage_id.localeCompare(b.coverage_id));

const outDir = path.join(__dirname, '..', 'audit-reports');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

fs.writeFileSync(path.join(outDir, 'coverage-ledger.json'), JSON.stringify(units, null, 2));
console.log('Created coverage-ledger.json');
