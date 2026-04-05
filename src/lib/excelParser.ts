import * as XLSX from 'xlsx';

export interface WorkLogEntry {
  weekNumber: number;
  dayOfWeek: string;
  hoursWorked: number;
  workDone: string;
}

const VALID_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export const parseExcelFile = async (file: File): Promise<WorkLogEntry[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const data = event.target?.result;
        if (!data) {
          reject(new Error('Failed to read file'));
          return;
        }

        const workbook = XLSX.read(data, { type: 'binary' });
        const sheetName = workbook.SheetNames[0];

        if (!sheetName) {
          reject(new Error('Excel file is empty'));
          return;
        }

        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        const entries: WorkLogEntry[] = [];

        for (const row of jsonData) {
          const weekNumber = parseInt(String(row['Week no'] || row['Week No'] || row['week'] || '').trim());
          const dayOfWeek = String(row['Day of the week'] || row['Day of Week'] || row['day'] || '').trim();
          const hoursWorked = parseFloat(String(row['Hours'] || row['Hours Worked'] || row['hours'] || '0').trim());
          const workDone = String(row['Work Done'] || row['work done'] || row['Work'] || '').trim();

          if (!weekNumber || !dayOfWeek || !hoursWorked) {
            continue;
          }

          const normalizedDay = dayOfWeek.charAt(0).toUpperCase() + dayOfWeek.slice(1).toLowerCase();
          if (!VALID_DAYS.includes(normalizedDay)) {
            reject(new Error(`Invalid day of week: ${dayOfWeek}. Must be Monday-Sunday.`));
            return;
          }

          if (hoursWorked < 0 || hoursWorked > 24) {
            reject(new Error(`Invalid hours: ${hoursWorked}. Must be between 0 and 24.`));
            return;
          }

          entries.push({
            weekNumber,
            dayOfWeek: normalizedDay,
            hoursWorked,
            workDone,
          });
        }

        if (entries.length === 0) {
          reject(new Error('No valid entries found in Excel file'));
          return;
        }

        resolve(entries);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsBinaryString(file);
  });
};
