import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

interface RunningTimerData {
  id: string;
  start_time: string;
  client_id: string;
  project_id: string;
  task_id: string | null;
  description: string | null;
}

interface RunningTimerContextType {
  timer: RunningTimerData | null;
  loading: boolean;
  startTimer: (clientId: string, projectId: string, taskId: string | null, description: string) => Promise<void>;
  stopTimer: () => Promise<string | null>;
  splitTimer: (newDescription: string) => Promise<void>;
  refreshTimer: () => Promise<void>;
}

const RunningTimerContext = createContext<RunningTimerContextType | undefined>(undefined);

export function RunningTimerProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [timer, setTimer] = useState<RunningTimerData | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshTimer = useCallback(async () => {
    if (!user) { setTimer(null); setLoading(false); return; }
    const { data } = await supabase
      .from('running_timer')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();
    setTimer(data as RunningTimerData | null);
    setLoading(false);
  }, [user]);

  useEffect(() => { refreshTimer(); }, [refreshTimer]);

  const startTimer = async (clientId: string, projectId: string, taskId: string | null, description: string) => {
    if (!user) return;
    // Delete existing timer first
    await supabase.from('running_timer').delete().eq('user_id', user.id);
    const { data } = await supabase.from('running_timer').insert({
      user_id: user.id,
      client_id: clientId,
      project_id: projectId,
      task_id: taskId,
      description: description || null,
      start_time: new Date().toISOString(),
    }).select().single();
    setTimer(data as RunningTimerData | null);
  };

  const stopTimer = async (): Promise<string | null> => {
    if (!user || !timer) return null;
    const endTime = new Date();
    const startTime = new Date(timer.start_time);
    let durationSeconds = Math.round((endTime.getTime() - startTime.getTime()) / 1000);

    // Apply timer rounding (ceiling)
    const { data: settings } = await supabase.from('user_settings').select('timer_rounding_minutes').eq('user_id', user.id).single();
    const roundingMinutes = (settings as any)?.timer_rounding_minutes || 0;
    if (roundingMinutes > 0) {
      const roundingSeconds = roundingMinutes * 60;
      durationSeconds = Math.ceil(durationSeconds / roundingSeconds) * roundingSeconds;
    }

    // Get hourly rate
    const { data: project } = await supabase.from('projects').select('hourly_rate_override, client_id').eq('id', timer.project_id).single();
    let rate = 0;
    if (project?.hourly_rate_override) {
      rate = Number(project.hourly_rate_override);
    } else {
      const { data: client } = await supabase.from('clients').select('default_hourly_rate').eq('id', timer.client_id).single();
      rate = Number(client?.default_hourly_rate || 0);
    }

    // Get task billable default
    let billable = true;
    if (timer.task_id) {
      const { data: task } = await supabase.from('tasks').select('default_billable').eq('id', timer.task_id).single();
      billable = task?.default_billable ?? true;
    }

    const { data: entry } = await supabase.from('time_entries').insert({
      user_id: user.id,
      client_id: timer.client_id,
      project_id: timer.project_id,
      task_id: timer.task_id,
      start_time: timer.start_time,
      end_time: endTime.toISOString(),
      duration_seconds: durationSeconds,
      billable,
      hourly_rate_used: rate,
      description: timer.description,
      source: 'timer',
    }).select().single();

    await supabase.from('running_timer').delete().eq('user_id', user.id);
    setTimer(null);
    return entry?.id || null;
  };

  const splitTimer = async (newDescription: string): Promise<void> => {
    if (!user || !timer) return;
    const splitTime = new Date();
    const startTime = new Date(timer.start_time);
    let durationSeconds = Math.round((splitTime.getTime() - startTime.getTime()) / 1000);

    // Apply rounding
    const { data: settings } = await supabase.from('user_settings').select('timer_rounding_minutes').eq('user_id', user.id).single();
    const roundingMinutes = (settings as any)?.timer_rounding_minutes || 0;
    if (roundingMinutes > 0) {
      const roundingSeconds = roundingMinutes * 60;
      durationSeconds = Math.ceil(durationSeconds / roundingSeconds) * roundingSeconds;
    }

    // Get rate
    const { data: project } = await supabase.from('projects').select('hourly_rate_override, client_id').eq('id', timer.project_id).single();
    let rate = 0;
    if (project?.hourly_rate_override) {
      rate = Number(project.hourly_rate_override);
    } else {
      const { data: client } = await supabase.from('clients').select('default_hourly_rate').eq('id', timer.client_id).single();
      rate = Number(client?.default_hourly_rate || 0);
    }

    // Get task billable default
    let billable = true;
    if (timer.task_id) {
      const { data: task } = await supabase.from('tasks').select('default_billable').eq('id', timer.task_id).single();
      billable = task?.default_billable ?? true;
    }

    // Save completed segment
    await supabase.from('time_entries').insert({
      user_id: user.id,
      client_id: timer.client_id,
      project_id: timer.project_id,
      task_id: timer.task_id,
      start_time: timer.start_time,
      end_time: splitTime.toISOString(),
      duration_seconds: durationSeconds,
      billable,
      hourly_rate_used: rate,
      description: timer.description,
      source: 'timer',
    });

    // Restart timer from now with new description
    await supabase.from('running_timer').update({
      start_time: splitTime.toISOString(),
      description: newDescription || null,
    }).eq('user_id', user.id);

    await refreshTimer();
  };

  return (
    <RunningTimerContext.Provider value={{ timer, loading, startTimer, stopTimer, splitTimer, refreshTimer }}>
      {children}
    </RunningTimerContext.Provider>
  );
}

export function useRunningTimer() {
  const context = useContext(RunningTimerContext);
  if (!context) throw new Error('useRunningTimer must be used within RunningTimerProvider');
  return context;
}
