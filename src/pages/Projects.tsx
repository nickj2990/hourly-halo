import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, FolderOpen } from 'lucide-react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function Projects() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [expandedProject, setExpandedProject] = useState<string | null>(null);

  // Project form
  const [formClientId, setFormClientId] = useState('');
  const [formName, setFormName] = useState('');
  const [formRate, setFormRate] = useState('');
  const [formDescription, setFormDescription] = useState('');

  // Task form
  const [taskProjectId, setTaskProjectId] = useState('');
  const [taskName, setTaskName] = useState('');
  const [taskBillable, setTaskBillable] = useState(true);

  const fetchData = async () => {
    if (!user) return;
    const [{ data: c }, { data: p }, { data: t }] = await Promise.all([
      supabase.from('clients').select('*').eq('user_id', user.id).eq('status', 'active').order('name'),
      supabase.from('projects').select('*, clients(name)').eq('user_id', user.id).order('name'),
      supabase.from('tasks').select('*').eq('user_id', user.id).order('name'),
    ]);
    setClients(c || []);
    setProjects(p || []);
    setTasks(t || []);
    setLoading(false);
  };

  useEffect(() => { fetchData(); }, [user]);

  const openAddProject = () => {
    setEditing(null);
    setFormClientId(''); setFormName(''); setFormRate(''); setFormDescription('');
    setDialogOpen(true);
  };

  const openEditProject = (p: any) => {
    setEditing(p);
    setFormClientId(p.client_id);
    setFormName(p.name);
    setFormRate(p.hourly_rate_override ? String(p.hourly_rate_override) : '');
    setFormDescription(p.description || '');
    setDialogOpen(true);
  };

  const handleSaveProject = async () => {
    if (!user || !formClientId || !formName.trim()) { toast.error('Client and name required'); return; }
    const payload = {
      user_id: user.id,
      client_id: formClientId,
      name: formName.trim(),
      hourly_rate_override: formRate ? parseFloat(formRate) : null,
      description: formDescription || null,
    };
    if (editing) {
      await supabase.from('projects').update(payload).eq('id', editing.id);
      toast.success('Project updated');
    } else {
      await supabase.from('projects').insert(payload);
      toast.success('Project created');
    }
    setDialogOpen(false);
    fetchData();
  };

  const openAddTask = (projectId: string) => {
    setTaskProjectId(projectId);
    setTaskName('');
    setTaskBillable(true);
    setTaskDialogOpen(true);
  };

  const handleSaveTask = async () => {
    if (!user || !taskName.trim()) { toast.error('Task name required'); return; }
    await supabase.from('tasks').insert({
      user_id: user.id,
      project_id: taskProjectId,
      name: taskName.trim(),
      default_billable: taskBillable,
    });
    toast.success('Task added');
    setTaskDialogOpen(false);
    fetchData();
  };

  const deleteTask = async (id: string) => {
    await supabase.from('tasks').delete().eq('id', id);
    toast.success('Task deleted');
    fetchData();
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Projects</h1>
        <Button onClick={openAddProject}><Plus className="mr-2 h-4 w-4" />Add Project</Button>
      </div>

      {loading ? (
        <div className="space-y-4">{[1,2,3].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : projects.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center space-y-4">
          <div className="flex justify-center">
            <div className="rounded-full bg-muted p-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="font-medium text-foreground">No projects yet</p>
            <p className="text-sm text-muted-foreground mt-1">
              {clients.length === 0
                ? <>Add a <Link to="/clients" className="text-primary underline">client</Link> first, then create a project.</>
                : 'Organise your work into projects to track time by client.'}
            </p>
          </div>
          {clients.length > 0 && <Button onClick={openAddProject}><Plus className="mr-2 h-4 w-4" />Add Project</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {projects.map(project => {
            const projectTasks = tasks.filter(t => t.project_id === project.id);
            const expanded = expandedProject === project.id;
            return (
              <Card key={project.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <button onClick={() => setExpandedProject(expanded ? null : project.id)} className="text-muted-foreground">
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                      <div>
                        <h3 className="font-semibold text-foreground">{project.name}</h3>
                        <p className="text-xs text-muted-foreground">{project.clients?.name}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {project.hourly_rate_override && (
                        <span className="text-xs text-muted-foreground">${project.hourly_rate_override}/hr</span>
                      )}
                      <Badge variant={project.status === 'active' ? 'default' : 'secondary'}>{project.status}</Badge>
                      <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => openEditProject(project)}><Pencil className="h-3 w-3" /></Button>
                    </div>
                  </div>
                  {expanded && (
                    <div className="mt-4 ml-7 space-y-2">
                      {project.description && <p className="text-sm text-muted-foreground mb-3">{project.description}</p>}
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-sm font-medium text-foreground">Tasks</h4>
                        <Button size="sm" variant="outline" onClick={() => openAddTask(project.id)}>
                          <Plus className="h-3 w-3 mr-1" />Add Task
                        </Button>
                      </div>
                      {projectTasks.length === 0 ? (
                        <p className="text-xs text-muted-foreground">No tasks yet.</p>
                      ) : (
                        <div className="space-y-1">
                          {projectTasks.map(task => (
                            <div key={task.id} className="flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-sm">{task.name}</span>
                                <Badge variant="outline" className="text-xs">{task.default_billable ? 'Billable' : 'Non-billable'}</Badge>
                              </div>
                              <Button size="icon" variant="ghost" className="h-6 w-6 text-destructive" onClick={() => deleteTask(task.id)}>
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Project' : 'Add Project'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client</Label>
              <Select value={formClientId} onValueChange={setFormClientId}>
                <SelectTrigger><SelectValue placeholder="Select client" /></SelectTrigger>
                <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Name</Label><Input value={formName} onChange={e => setFormName(e.target.value)} /></div>
            <div className="space-y-2"><Label>Rate Override (optional)</Label><Input type="number" value={formRate} onChange={e => setFormRate(e.target.value)} placeholder="Leave blank to use client rate" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={formDescription} onChange={e => setFormDescription(e.target.value)} rows={2} /></div>
            <Button onClick={handleSaveProject} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={taskDialogOpen} onOpenChange={setTaskDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Task</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={taskName} onChange={e => setTaskName(e.target.value)} /></div>
            <div className="flex items-center gap-2">
              <Checkbox id="taskBillable" checked={taskBillable} onCheckedChange={c => setTaskBillable(c === true)} />
              <Label htmlFor="taskBillable">Billable by default</Label>
            </div>
            <Button onClick={handleSaveTask} className="w-full">Add Task</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
