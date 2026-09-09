const fs = require('fs');
let content = fs.readFileSync('src/types/database.ts', 'utf8');

const oldLedger = `          id: string
          employee_id: string
          adjustment_type: string
          adjustment_category: string
          original_amount: number
          remaining_amount: number
          suggested_installment_amount: number | null
          effective_date: string
          description: string | null
          status: string
          created_by: string | null
          updated_by: string | null
          created_at: string | null
          updated_at: string | null`;

const newLedger = `          id: string
          employee_id: string
          adjustment_type: string
          adjustment_category: string
          original_amount: number
          remaining_amount: number
          suggested_installment_amount: number | null
          effective_date: string
          description: string | null
          status: string
          created_by: string | null
          updated_by: string | null
          created_at: string | null
          updated_at: string | null
          kilometers: number | null
          vehicle_type: string | null
          tds_applied: boolean | null
          tds_rate: number | null`;

content = content.replaceAll(oldLedger, newLedger);

const oldInsert = `          status?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string | null
          updated_at?: string | null`;

const newInsert = `          status?: string
          created_by?: string | null
          updated_by?: string | null
          created_at?: string | null
          updated_at?: string | null
          kilometers?: number | null
          vehicle_type?: string | null
          tds_applied?: boolean | null
          tds_rate?: number | null`;

content = content.replaceAll(oldInsert, newInsert);

const oldSnap = `          net_salary: number | null
          overtime_hours: number | null
          overtime_pay: number | null`;

const newSnap = `          net_salary: number | null
          overtime_hours: number | null
          overtime_pay: number | null
          medical_allowance: number | null
          travel_expense: number | null
          performance_incentive: number | null
          food_allowance: number | null
          tds: number | null`;

content = content.replaceAll(oldSnap, newSnap);

const oldSnapInsert = `          net_salary?: number | null
          overtime_hours?: number | null
          overtime_pay?: number | null`;

const newSnapInsert = `          net_salary?: number | null
          overtime_hours?: number | null
          overtime_pay?: number | null
          medical_allowance?: number | null
          travel_expense?: number | null
          performance_incentive?: number | null
          food_allowance?: number | null
          tds?: number | null`;

content = content.replaceAll(oldSnapInsert, newSnapInsert);

fs.writeFileSync('src/types/database.ts', content);
