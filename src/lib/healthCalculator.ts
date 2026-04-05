interface WorkLogData {
  hours_worked: number;
  week_number: number;
  day_of_week: string;
  work_done: string;
}

export interface CalculatedHealth {
  productivity: number;
  schedule: number;
  quality: number;
  cost: number;
  risk: number;
  overall: number;
}

export const calculateHealthFromWorkLogs = (
  workLogs: WorkLogData[],
  teamSize: number,
  totalScheduleWeeks: number,
  currentWeek: number
): CalculatedHealth => {
  if (!workLogs || workLogs.length === 0) {
    return {
      productivity: 50,
      schedule: 50,
      quality: 50,
      cost: 50,
      risk: 50,
      overall: 50,
    };
  }

  const totalHours = workLogs.reduce((sum, log) => sum + log.hours_worked, 0);
  const avgHoursPerDay = totalHours / workLogs.length;
  const expectedHoursPerDay = 8;

  const uniqueWeeks = new Set(workLogs.map((log) => log.week_number));
  const entriesWithWorkDone = workLogs.filter((log) => log.work_done && log.work_done.trim().length > 0);

  const productivity = Math.min(100, Math.max(10, Math.round((avgHoursPerDay / expectedHoursPerDay) * 100)));

  const scheduleAdherence = Math.min(100, Math.max(10, Math.round((uniqueWeeks.size / totalScheduleWeeks) * 100)));
  const schedule = Math.max(50, scheduleAdherence);

  const workQualityRatio = entriesWithWorkDone.length / workLogs.length;
  const quality = Math.min(100, Math.max(10, Math.round(50 + workQualityRatio * 50)));

  const costBase = 60;
  const costVariation = Math.min(30, Math.abs(avgHoursPerDay - expectedHoursPerDay) / expectedHoursPerDay * 20);
  const cost = Math.max(30, costBase - costVariation);

  const riskBase = 50;
  const consistencyFactor = workLogs.length > 0
    ? Math.min(30, (Math.max(...workLogs.map((w) => w.hours_worked)) - Math.min(...workLogs.map((w) => w.hours_worked))) / 24 * 30)
    : 0;
  const risk = Math.max(20, riskBase + consistencyFactor);

  const overall = Math.round((productivity + schedule + quality + cost + (100 - risk)) / 5);

  return {
    productivity,
    schedule,
    quality,
    cost,
    risk: Math.min(100, risk),
    overall: Math.min(100, Math.max(0, overall)),
  };
};
