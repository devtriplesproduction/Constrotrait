function testWorkingDayDateParsing(targetDateStr) {
  const datePart = targetDateStr.split('T')[0];
  const targetDate = new Date(`${datePart}T00:00:00Z`);
  
  if (isNaN(targetDate.getTime())) {
    throw new Error("Invalid date format");
  }

  const dayOfWeek = targetDate.getUTCDay();
  const dateStr = datePart;
  
  return { dateStr, dayOfWeek };
}

const tests = [
  "2026-08-24", // Monday (1)
  "2026-08-28", // Friday (5)
  "2026-08-29", // Saturday (6)
  "2026-08-30", // Sunday (0)
  "2026-08-26T22:00:00.000Z", // Wednesday (3) - shouldn't leak to Thursday due to local timezone
];

for (const t of tests) {
  const result = testWorkingDayDateParsing(t);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  console.log(`${t} -> ${result.dateStr} is ${days[result.dayOfWeek]} (${result.dayOfWeek})`);
}
