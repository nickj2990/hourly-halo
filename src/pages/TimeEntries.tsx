import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Search, Pencil, Trash2, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { format } from 'date-fns';

export default function TimeEntries() {
  const { user } = useAuth();
  const [entries, setEntries] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClient, setFilterClient] = useState('all');
  const [filterProject, setFilterProject] = useState('all');
  const [searchText, setSearchText] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<any>(null);

  // Form state
  const [formClientId, setFormClientId] = useState('');
  const [formProjectId, setFormProjectId] = useState('');
  const [formTaskId, setFormTaskId] = useState('');
  const [formDate, setFormDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [formStartTime, setFormStartTime] = useState('09:00');
  const [formEndTime, setFormEndTime] = useState('10:00');
  const [formBillable, setFormBillable] = useState(true);
  const [formDescription, setFormDescription] = useState('');
  const [formProjects, setFormProjects] = useState<any[]>([]);
  const [formTasks, setFormTasks] = useState<any[]>([]);

  const fetchEntries = async () => {
    if (!user) return;
    let query = supabase
      .from('time_entries')
      .select('*, clients(name), projects(name), tasks(name)')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false })
      .limit(200);

    if (filterClient !== 'all') query = query.eq('client_id', filterClient);
    if (filterProject !== 'all') query = query.eq('project_id', filterProject);

    const { data } = await query;
    let filtered = data || [];
    if (searchText) {
      filtered = filtered.filter(e => e.description?.toLowerCase().includes(searchText.toLowerCase()));
    }
    setEntries(filtered);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    supabase.from('clients').select('*').eq('user_id', user.id).order('name').then(({ data }) => setClients(data || []));
    supabase.from('projects').select('*').eq('user_id', user.id).order('name').then(({ data }) => setProjects(data || []));
  }, [user]);

  useEffect(() => { fetchEntries(); }, [user, filterClient, filterProject, searchText]);

  useEffect(() => {
    if (!formClientId) { setFormProjects([]); return; }
    supabase.from('projects').select('*').eq('client_id', formClientId).order('name').then(({ data }) => setFormProjects(data || []));
    if (!editingEntry) { setFormProjectId(''); setFormTaskId(''); }
  }, [formClientId]);

  useEffect(() => {
    if (!formProjectId) { setFormTasks([]); return; }
    supabase.from('tasks').select('*').eq('project_id', formProjectId).order('name').then(({ data }) => setFormTasks(data || []));
    if (!editingEntry) setFormTaskId('');
  }, [formProjectId]);

  const openAdd = () => {
    setEditingEntry(null);
    setFormClientId('');
    setFormProjectId('');
    setFormTaskId('');
    setFormDate(format(new Date(), 'yyyy-MM-dd'));
    setFormStartTime('09:00');
    setFormEndTime('10:00');
    setFormBillable(true);
    setFormDescription('');
    setDialogOpen(true);
  };

  const openEdit = (entry: any) => {
    setEditingEntry(entry);
    setFormClientId(entry.client_id);
    setFormProjectId(entry.project_id);
    setFormTaskId(entry.task_id || '');
    setFormDate(format(new Date(entry.start_time), 'yyyy-MM-dd'));
    setFormStartTime(format(new Date(entry.start_time), 'HH:mm'));
    setFormEndTime(format(new Date(entry.end_time), 'HH:mm'));
    setFormBillable(entry.billable);
    setFormDescription(entry.description || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !formClientId || !formProjectId) { toast.error('Select client and project'); return; }

    const startDt = new Date(`${formDate}T${formStartTime}:00`);
    const endDt = new Date(`${formDate}T${formEndTime}:00`);
    if (endDt <= startDt) { toast.error('End time must be after start time'); return; }

    const durationSeconds = Math.round((endDt.getTime() - startDt.getTime()) / 1000);

    // Get rate
    const { data: project } = await supabase.from('projects').select('hourly_rate_override').eq('id', formProjectId).single();
    let rate = 0;
    if (project?.hourly_rate_override) {
      rate = Number(project.hourly_rate_override);
    } else {
      const { data: client } = await supabase.from('clients').select('default_hourly_rate').eq('id', formClientId).single();
      rate = Number(client?.default_hourly_rate || 0);
    }

    const payload = {
      user_id: user.id,
      client_id: formClientId,
      project_id: formProjectId,
      task_id: formTaskId || null,
      start_time: startDt.toISOString(),
      end_time: endDt.toISOString(),
      duration_seconds: durationSeconds,
      billable: formBillable,
      hourly_rate_used: rate,
      description: formDescription || null,
      source: 'manual' as const,
    };

    if (editingEntry) {
      await supabase.from('time_entries').update(payload).eq('id', editingEntry.id);
      toast.success('Entry updated');
    } else {
      await supabase.from('time_entries').insert(payload);
      toast.success('Entry created');
    }

    setDialogOpen(false);
    fetchEntries();
  };

  const handleDelete = async (id: string) => {
    await supabase.from('time_entries').delete().eq('id', id);
    toast.success('Entry deleted');
    fetchEntries();
  };

  const formatDuration = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };

  // Group by date
  const grouped: Record<string, any[]> = {};
  entries.forEach(entry => {
    const date = format(new Date(entry.start_time), 'yyyy-MM-dd');
    if (!grouped[date]) grouped[date] = [];
    grouped[date].push(entry);
  });

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Time Entries</h1>
        <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Entry</Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search..." value={searchText} onChange={e => setSearchText(e.target.value)} />
        </div>
        <Select value={filterClient} onValueChange={setFilterClient}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Clients" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Clients</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterProject} onValueChange={setFilterProject}>
          <SelectTrigger className="w-[180px]"><SelectValue placeholder="All Projects" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Projects</SelectItem>
            {projects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />)}</div>
      ) : entries.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="font-medium text-foreground">No time entries yet</p>
            <p className="text-sm text-muted-foreground mt-1">Start the timer or add a manual entry to begin tracking.</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Link to="/timer"><Button>Go to Timer</Button></Link>
            <Button variant="outline" onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Manually</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([date, dateEntries]) => {
            const totalSeconds = dateEntries.reduce((s: number, e: any) => s + e.duration_seconds, 0);
            return (
              <div key={date}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-foreground">{format(new Date(`${date}T12:00:00`), 'EEEE, MMM d, yyyy')}</h3>
                  <span className="text-sm font-medium text-muted-foreground">{formatDuration(totalSeconds)}</span>
                </div>
                <div className="rounded-xl border bg-card overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Client / Project</TableHead>
                        <TableHead>Task</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Time</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Billable</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead className="w-20"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {dateEntries.map((entry: any) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <div className="text-sm font-medium">{entry.clients?.name}</div>
                            <div className="text-xs text-muted-foreground">{entry.projects?.name}</div>
                          </TableCell>
                          <TableCell className="text-sm">{entry.tasks?.name || '—'}</TableCell>
                          <TableCell className="text-sm max-w-[200px] truncate">{entry.description || '—'}</TableCell>
                          <TableCell className="text-sm font-mono">{format(new Date(entry.start_time), 'HH:mm')} – {format(new Date(entry.end_time), 'HH:mm')}</TableCell>
                          <TableCell className="text-sm font-mono">{formatDuration(entry.duration_seconds)}</TableCell>
                          <TableCell>{entry.billable ? <span className="text-xs font-medium text-success">Yes</span> : <span className="text-xs text-muted-foreground">No</span>}</TableCell>
                          <TableCell className="text-sm font-mono">${((entry.duration_seconds / 3600) * Number(entry.hourly_rate_used)).toFixed(2)}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEdit(entry)}><Pencil className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => handleDelete(entry.id)}><Trash2 className="h-3 w-3" /></Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Time Entry' : 'Add Time Entry'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={formClientId} onValueChange={setFormClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Project</Label>
              <Select value={formProjectId} onValueChange={setFormProjectId} disabled={!formClientId}>
                <SelectTrigger><SelectValue placeholder="Select project" /></SelectTrigger>
                <SelectContent>{formProjects.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {formTasks.length > 0 && (
              <div className="space-y-2">
                <Label>Task</Label>
                <Select value={formTaskId} onValueChange={setFormTaskId}>
                  <SelectTrigger><SelectValue placeholder="Select task" /></SelectTrigger>
                  <SelectContent>{formTasks.map(t => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={formDate} onChange={e => setFormDate(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Start</Label>
                <Input type="time" value={formStartTime} onChange={e => setFormStartTime(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>End</Label>
                <Input type="time" value={formEndTime} onChange={e => setFormEndTime(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} />
            </div>
            <div className="flex items-center gap-2">
              <Checkbox id="billable" checked={formBillable} onCheckedChange={c => setFormBillable(c === true)} />
              <Label htmlFor="billable">Billable</Label>
            </div>
            <Button onClick={handleSave} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
