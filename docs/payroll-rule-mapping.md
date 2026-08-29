# Payroll Rule Mapping

| Rule | MaleeHouse Evidence | ConstroTrait Evidence | Decision |
|---|---|---|---|
| Salary basis | `calculateMonthlyPayrollAction` in `payroll.actions.ts` (uses `salary_increments` or `profiles.salary`) | `salary_hikes` and `profiles.salary` in `database.types.ts` | implementation |
| Working days | Hardcoded `const workingDaysLimit = 26;` in `payroll.actions.ts` | N/A (Does not define payroll limit) | implementation |
| Paid leave | `attendanceLogs.filter(l => l.status === "paid_leave")` | `leave_requests` where `status = 'Approved'` and `is_paid = true` | integration |
| Unpaid leave | `attendanceLogs.filter(l => l.status === "unpaid_leave")` | `leave_requests` where `status = 'Approved'` and `is_paid = false` | integration |
| Holiday | `holidays` queried for start-end of month. `effectiveHolidays` formula. | `holidays` table + `isWorkingDayForEmployee` | integration |
| Weekend | Ignored in MaleeHouse payroll calculation (fixed 26 days) | `isWorkingDayForEmployee` logic identifies weekends | integration |
| Half day | Not explicitly handled in MH calculation | `is_half_day` boolean in `leave_requests` | integration |
| Field assignment | `eodLogs` or `attendance_logs` | `attendance` table `status = 'Field Assignment'` | integration |
| LOP | Absent days = `Math.max(0, 26 - accounted_days)` | N/A | implementation |
| Overtime | Draft application logic from `payroll_adjustment_applications` | Not currently in ConstroTrait | implementation |
| Bonus | `employee_financial_ledger` or `payroll_adjustment_applications` | Not currently in ConstroTrait | implementation |
| Deductions | `employee_financial_ledger` (recoverable) | Not currently in ConstroTrait | implementation |
| Salary hike | `salary_increments` | `salary_hikes` | implementation |
| Finalization | `payroll_cycles` locked status and `payroll_snapshots` | Not currently in ConstroTrait | implementation |
