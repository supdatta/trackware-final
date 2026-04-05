import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { WorkLogEntry } from '@/lib/excelParser';

interface UploadProgress {
  isLoading: boolean;
  error: string | null;
  success: boolean;
}

export const useWorkLogs = () => {
  const [progress, setProgress] = useState<UploadProgress>({
    isLoading: false,
    error: null,
    success: false,
  });

  const uploadWorkLogs = async (projectId: string, userId: string, entries: WorkLogEntry[]) => {
    setProgress({ isLoading: true, error: null, success: false });

    try {
      const workLogs = entries.map((entry) => ({
        project_id: projectId,
        user_id: userId,
        week_number: entry.weekNumber,
        day_of_week: entry.dayOfWeek,
        hours_worked: entry.hoursWorked,
        work_done: entry.workDone,
      }));

      const { error } = await supabase
        .from('work_logs')
        .insert(workLogs);

      if (error) {
        throw error;
      }

      setProgress({ isLoading: false, error: null, success: true });
      return { success: true, count: entries.length };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to upload work logs';
      setProgress({ isLoading: false, error: errorMessage, success: false });
      return { success: false, error: errorMessage };
    }
  };

  const getWorkLogs = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('work_logs')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      return { data: data || [], error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch work logs';
      return { data: [], error: errorMessage };
    }
  };

  const getProjectWorkStats = async (projectId: string) => {
    try {
      const { data, error } = await supabase
        .from('work_logs')
        .select('hours_worked, week_number')
        .eq('project_id', projectId);

      if (error) throw error;

      const stats = {
        totalHours: 0,
        averageHoursPerDay: 0,
        weeksWithData: new Set<number>(),
        entriesCount: 0,
      };

      if (data && data.length > 0) {
        stats.totalHours = data.reduce((sum, log) => sum + (log.hours_worked || 0), 0);
        stats.entriesCount = data.length;
        stats.averageHoursPerDay = stats.totalHours / stats.entriesCount;

        data.forEach((log) => {
          stats.weeksWithData.add(log.week_number);
        });
      }

      return { stats, error: null };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch work stats';
      return { stats: null, error: errorMessage };
    }
  };

  return {
    uploadWorkLogs,
    getWorkLogs,
    getProjectWorkStats,
    progress,
  };
};
