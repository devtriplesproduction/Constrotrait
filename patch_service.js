const fs = require('fs');
let content = fs.readFileSync('src/services/payroll.service.ts', 'utf8');

// 1. Update addManualLedgerEntry signature and insert
const oldAdd = `export async function addManualLedgerEntry(
  employeeId: string,
  type: string,
  amount: number,
  description?: string,
  createdBy?: string
) {`;

const newAdd = `export async function addManualLedgerEntry(
  employeeId: string,
  type: string,
  amount: number,
  description?: string,
  createdBy?: string,
  kilometers?: number,
  vehicle_type?: string,
  tds_applied?: boolean,
  tds_rate?: number
) {`;
content = content.replace(oldAdd, newAdd);

const oldInsert = `      original_amount: amount,
      remaining_amount: amount,
      description,
      status: "pending",
      created_by: createdBy,`;

const newInsert = `      original_amount: amount,
      remaining_amount: amount,
      description,
      status: "pending",
      created_by: createdBy,
      kilometers,
      vehicle_type,
      tds_applied,
      tds_rate,`;
content = content.replace(oldInsert, newInsert);


// 2. Update calculateMonthlyPayroll

const oldSelect = `    .select('id, employee_id, adjustment_type, adjustment_category, remaining_amount')`;
const newSelect = `    .select('id, employee_id, adjustment_type, adjustment_category, remaining_amount, tds_applied, tds_rate')`;
content = content.replace(oldSelect, newSelect);


const oldLedgerInit = `    let calculated_bonus = 0;
    let calculated_other_deductions = 0;
    let calculated_salary_advance_recovery = 0;
    let calculated_damage_recovery = 0;`;
const newLedgerInit = `    let calculated_bonus = 0;
    let calculated_other_deductions = 0;
    let calculated_salary_advance_recovery = 0;
    let calculated_damage_recovery = 0;
    let calculated_medical_allowance = 0;
    let calculated_travel_expense = 0;
    let calculated_performance_incentive = 0;
    let calculated_food_allowance = 0;
    let is_tds_applied = false;
    let tds_rate_val = 0;
    let tds_ledger_id = '';`;
content = content.replace(oldLedgerInit, newLedgerInit);


const oldLoop = `        if (entry.adjustment_type.toLowerCase().includes('bonus')) {
            calculated_bonus += amount;
        } else if (entry.adjustment_type.toLowerCase().includes('advance')) {
            calculated_salary_advance_recovery += amount;
        } else if (entry.adjustment_type.toLowerCase().includes('damage')) {
            calculated_damage_recovery += amount;
        } else {
            calculated_other_deductions += amount;
        }`;
const newLoop = `        const typeLower = entry.adjustment_type.toLowerCase();
        if (typeLower.includes('bonus')) {
            calculated_bonus += amount;
        } else if (typeLower === 'medical allowance') {
            calculated_medical_allowance += amount;
        } else if (typeLower === 'travel expense') {
            calculated_travel_expense += amount;
        } else if (typeLower === 'performance incentive') {
            calculated_performance_incentive += amount;
        } else if (typeLower === 'food allowance') {
            calculated_food_allowance += amount;
        } else if (typeLower === 'tds') {
            is_tds_applied = !!entry.tds_applied;
            tds_rate_val = entry.tds_rate || 0;
            tds_ledger_id = entry.id;
        } else if (typeLower.includes('advance')) {
            calculated_salary_advance_recovery += amount;
        } else if (typeLower.includes('damage')) {
            calculated_damage_recovery += amount;
        } else {
            calculated_other_deductions += amount;
        }`;
content = content.replace(oldLoop, newLoop);

const oldGross = `    const gross_salary = basic_salary + hra + allowance + bonus + overtime_pay;`;
const newGross = `    const gross_salary = basic_salary + hra + allowance + bonus + overtime_pay + calculated_medical_allowance + calculated_travel_expense + calculated_performance_incentive + calculated_food_allowance;`;
content = content.replace(oldGross, newGross);

const oldDeds = `    const other_deductions = calculated_other_deductions;
    const salary_advance_recovery = calculated_salary_advance_recovery;
    const damage_recovery = calculated_damage_recovery;
    const total_deductions = pf + esi + professional_tax + income_tax + other_deductions + salary_advance_recovery + damage_recovery;`;
const newDeds = `    const other_deductions = calculated_other_deductions;
    const salary_advance_recovery = calculated_salary_advance_recovery;
    const damage_recovery = calculated_damage_recovery;
    let calculated_tds = 0;
    if (is_tds_applied) {
        calculated_tds = Math.round(gross_salary * (tds_rate_val / 100));
    }
    const total_deductions = pf + esi + professional_tax + income_tax + other_deductions + salary_advance_recovery + damage_recovery + calculated_tds;`;
content = content.replace(oldDeds, newDeds);

const oldAppliedUpdate = `        appliedAdjustments.push({
            ledger_id: entry.id,
            adjustment_type: entry.adjustment_type,
            adjustment_category: entry.adjustment_category,
            amount: amount
        });`;
const newAppliedUpdate = `        // Don't push TDS here, push it after TDS calculation
        if (entry.adjustment_type.toLowerCase() !== 'tds') {
            appliedAdjustments.push({
                ledger_id: entry.id,
                adjustment_type: entry.adjustment_type,
                adjustment_category: entry.adjustment_category,
                amount: amount
            });
        }`;
content = content.replace(oldAppliedUpdate, newAppliedUpdate);

const pushTdsStr = `    const net_salary = gross_salary - total_deductions;`;
const pushTdsNew = `    if (is_tds_applied && tds_ledger_id) {
        appliedAdjustments.push({
            ledger_id: tds_ledger_id,
            adjustment_type: 'TDS',
            adjustment_category: 'one_time',
            amount: calculated_tds
        });
    }
    const net_salary = gross_salary - total_deductions;`;
content = content.replace(pushTdsStr, pushTdsNew);

const oldDraft = `      bonus,
      gross_salary,`;
const newDraft = `      bonus,
      medical_allowance: calculated_medical_allowance,
      travel_expense: calculated_travel_expense,
      performance_incentive: calculated_performance_incentive,
      food_allowance: calculated_food_allowance,
      tds: calculated_tds,
      gross_salary,`;
content = content.replace(oldDraft, newDraft);

fs.writeFileSync('src/services/payroll.service.ts', content);
