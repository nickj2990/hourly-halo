import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRunningTimer } from '@/hooks/useRunningTimer';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Square } from 'lucide-react';
import { toast } from 'sonner';

export default function TimerPage() {
  const { user } = useAuth();
  const { timer, startTimer, stopTimer } = useRunningTimer();
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [clientId, setClientId] = useState('');
  const [projectId, setProjectId] = useState('');
  const [taskId, setTaskId] = useState('');
  const [description, setDescription] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [loadingClients, setLoadingClients] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('clients').select('*').eq('user_id', user.id).eq('status', 'active').order('name').then(({ data }) => {
      setClients(data || []);
      setLoadingClients(false);
    });
  }, [user]);

  useEffect(() => {
    if (!clientId) { setProjects([]); return; }
    supabase.from('projects').select('*').eq('client_id', clientId).eq('status', 'active').order('name').then(({ data }) => setProjects(data || []));
    setProjectId('');
    setTaskId('');
  }, [clientId]);

  useEffect(() => {
    if (!projectId) { setTasks([]); return; }
    supabase.from('tasks').select('*').eq('project_id', projectId).order('name').then(({ data }) => setTasks(data || []));
    setTaskId('');
  }, [projectId]);

  // Sync form with running timer
  useEffect(() => {
    if (timer) {
      setClientId(timer.client_id);
      setDescription(timer.description || '');
    }
  }, [timer]);

  useEffect(() => {
    if (timer) {
      supabase.from('projects').select('*').eq('client_id', timer.client_id).eq('status', 'active').order('name').then(({ data }) => {
        setProjects(data || []);
        setProjectId(timer.project_id);
      });
    }
  }, [timer?.client_id]);

  useEffect(() => {
    if (timer) {
      supabase.from('tasks').select('*').eq('project_id', timer.project_id).order('name').then(({ data }) => {
        setTasks(data || []);
        setTaskId(timer.task_id || '');
      });
    }
  }, [timer?.project_id]);

  // Elapsed time
  useEffect(() => {
    if (timer) {
      const tick = () => setElapsed(Math.round((Date.now() - new Date(timer.start_time).getTime()) / 1000));
      tick();
      intervalRef.current = setInterval(tick, 1000);
    } else {
      setElapsed(0);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timer]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const handleStart = async () => {
    if (!clientId || !projectId) { toast.error('Select a client and project'); return; }
    await startTimer(clientId, projectId, taskId || null, description);
    toast.success('Timer started');
  };

  const handleStop = async () => {
    await stopTimer();
    toast.success('Timer stopped — time entry created');
  };

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-slide-in">
      <h1 className="text-2xl font-bold text-foreground">Timer</h1>

      <Card className={timer ? 'border-primary timer-glow' : ''}>
        <CardContent className="p-8">
          <div className="text-center">
            <p className="font-mono text-6xl font-bold tabular-nums text-foreground mb-6">
              {formatTime(elapsed)}
            </p>

            {!timer ? (
              loadingClients ? (
                <div className="space-y-4 text-left">
                  {[1, 2, 3].map(i => <div key={i} className="h-10 animate-pulse rounded-md bg-muted" />)}
                </div>
              ) : clients.length === 0 ? (
                <p className="py-4 text-sm text-muted-foreground">No clients yet. <a href="/clients" className="underline text-primary">Add a client</a> to start tracking.</p>
              ) : (
              <div className="space-y-4 text-left">
                <div className="space-y-2">
                  <Label>Client</Label>
                  <Select value={clientId} onValueChange={setClientId}>
                    <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                    <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Project</Label>
                  <Select value={projectId} onValueChange={setProjectId} disabled={!clientId}>
                    <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                    <SelectContent>{projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                {tasks.length > 0 && (
                  <div className="space-y-2">
                    <Label>Task (optional)</Label>
                    <Select value={taskId} onValueChange={setTaskId}>
                      <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                      <SelectContent>{tasks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="What are you working on?" rows={2} />
                </div>
              </div>
              )
            ) : (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>Timer running...</p>
                {description && <p className="italic">"{description}"</p>}
              </div>
            )}

            <div className="mt-6">
              {timer ? (
                <Button size="lg" variant="destructive" className="w-full text-lg py-6" onClick={handleStop}>
                  <Square className="mr-2 h-5 w-5" /> Stop Timer
                </Button>
              ) : (
                <Button size="lg" className="w-full text-lg py-6" onClick={handleStart} disabled={!clientId || !projectId}>
                  <Play className="mr-2 h-5 w-5" /> Start Timer
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
