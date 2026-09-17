export interface HolidayScope {
  date?: string;
  branch_id?: string | null;
  department?: string | null;
}

export interface EmployeeScope {
  branch_id?: string | null;
  department?: string | null;
}

export function isHolidayForEmployee(
  datePart: string,
  employee: EmployeeScope,
  activeHolidays: HolidayScope[]
): boolean {
  const holidaysOnDate = activeHolidays.filter((h) => {
    if (!h.date) return false;
    return h.date.split('T')[0] === datePart;
  });

  if (holidaysOnDate.length === 0) {
    return false;
  }

  for (const holiday of holidaysOnDate) {
    let applies = false;

    if (!holiday.branch_id && !holiday.department) {
      // Global holiday
      applies = true;
    } else {
      const matchesBranch = holiday.branch_id === employee.branch_id;
      const matchesDepartment =
        holiday.department === 'ALL' ||
        (holiday.department && employee.department
          ? holiday.department.split(',').map((d) => d.trim()).includes(employee.department)
          : false);

      if (holiday.branch_id && holiday.department) {
        if (matchesBranch && matchesDepartment) applies = true;
      } else if (holiday.branch_id && !holiday.department) {
        if (matchesBranch) applies = true;
      } else if (!holiday.branch_id && holiday.department) {
        if (matchesDepartment) applies = true;
      }
    }

    if (applies) {
      return true; // Applicable holiday found
    }
  }

  return false;
}

/**
 * Reusable function to determine if a specific date is a working day for an employee.
 * Returns true if it's a working day (Mon-Fri and no applicable holiday).
 * Returns false if it's a weekend (Sat-Sun) or an applicable holiday exists.
 */
export function resolveWorkingDay(
  dateStr: string,
  employee: EmployeeScope,
  activeHolidays: HolidayScope[]
): boolean {
  const datePart = dateStr.split('T')[0];
  const targetDate = new Date(`${datePart}T00:00:00Z`);

  if (isNaN(targetDate.getTime())) {
    throw new Error("Invalid date format");
  }

  const dayOfWeek = targetDate.getUTCDay(); // 0 is Sunday, 6 is Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return false; // Weekend
  }

  return !isHolidayForEmployee(datePart, employee, activeHolidays);
}
