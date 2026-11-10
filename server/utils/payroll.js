import { round2 } from "./helpers.js";

const nonNeg = (v) => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : 0;
};

// Hours between check in and check out. Open or invalid records count as zero.
export const workedHours = (checkIn, checkOut) => {
  if (!checkIn || !checkOut) return 0;
  const ms = new Date(checkOut).getTime() - new Date(checkIn).getTime();
  return ms > 0 ? ms / 36e5 : 0;
};

// Monthly payroll for one employee.
// structure: { monthlyBase, workingDays (default 26), dailyHours (default 8), overtimeMultiplier (default 1.5) }
// records:   [{ checkIn, checkOut }]  attendance for the month
// extras:    { unpaidLeaveDays, bonuses, deductions }
export const calculatePayroll = (structure = {}, records = [], extras = {}) => {
  const base = nonNeg(structure.monthlyBase);
  const workingDays = nonNeg(structure.workingDays) || 26;
  const dailyHours = nonNeg(structure.dailyHours) || 8;
  const otMultiplier = nonNeg(structure.overtimeMultiplier) || 1.5;

  const hourlyRate = base / (workingDays * dailyHours);
  const dailyRate = base / workingDays;

  let totalHours = 0;
  let overtimeHours = 0;
  let daysWorked = 0;
  for (const r of records) {
    const h = workedHours(r.checkIn, r.checkOut);
    if (h <= 0) continue;
    daysWorked += 1;
    totalHours += h;
    overtimeHours += Math.max(0, h - dailyHours);
  }

  const overtimePay = overtimeHours * hourlyRate * otMultiplier;
  const unpaidLeaveDeduction = nonNeg(extras.unpaidLeaveDays) * dailyRate;
  const bonuses = nonNeg(extras.bonuses);
  const otherDeductions = nonNeg(extras.deductions);

  const gross = base + overtimePay + bonuses;
  const net = Math.max(0, gross - unpaidLeaveDeduction - otherDeductions);

  return {
    baseSalary: round2(base),
    daysWorked,
    totalHours: round2(totalHours),
    overtimeHours: round2(overtimeHours),
    overtimePay: round2(overtimePay),
    bonuses: round2(bonuses),
    unpaidLeaveDeduction: round2(unpaidLeaveDeduction),
    otherDeductions: round2(otherDeductions),
    grossPay: round2(gross),
    netPay: round2(net),
  };
};

// Start and end (exclusive) of a month, as UTC dates. month is 1-12.
export const monthRange = (year, month) => ({
  start: new Date(Date.UTC(year, month - 1, 1)),
  end: new Date(Date.UTC(year, month, 1)),
});

// Indian Standard Time calendar day as YYYY-MM-DD.
export const istDateString = (date = new Date()) => new Date(new Date(date).getTime() + 5.5 * 36e5).toISOString().slice(0, 10);

// Number of leave days that fall inside the given month. Dates are YYYY-MM-DD. Weekends count as leave days.
export const leaveDaysInMonth = (from, to, year, month) => {
  const start = Date.UTC(year, month - 1, 1);
  const end = Date.UTC(year, month, 0);
  const a = Date.parse(`${from}T00:00:00Z`);
  const b = Date.parse(`${to}T00:00:00Z`);
  if (Number.isNaN(a) || Number.isNaN(b) || b < a) return 0;
  const lo = Math.max(a, start);
  const hi = Math.min(b, end);
  return hi < lo ? 0 : Math.round((hi - lo) / 864e5) + 1;
};
