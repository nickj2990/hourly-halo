import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, Pencil, Archive, RotateCcw, DollarSign, FolderOpen, Clock } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';

export default function Clients() {
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [name, setName] = useState('');
  const [billingEmail, setBillingEmail] = useState('');
  const [hourlyRate, setHourlyRate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [notes, setNotes] = useState('');
  const [showArchived, setShowArchived] = useState(false);

  const fetchClients = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('clients')
      .select('*, projects(count)')
      .eq('user_id', user.id)
      .order('name');
    setClients(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchClients(); }, [user]);

  const openAdd = () => {
    setEditing(null);
    setName(''); setBillingEmail(''); setHourlyRate(''); setCurrency('USD'); setNotes('');
    setDialogOpen(true);
  };

  const openEdit = (client: any) => {
    setEditing(client);
    setName(client.name);
    setBillingEmail(client.billing_email || '');
    setHourlyRate(String(client.default_hourly_rate || ''));
    setCurrency(client.currency || 'USD');
    setNotes(client.notes || '');
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!user || !name.trim()) { toast.error('Name is required'); return; }
    const payload = {
      user_id: user.id,
      name: name.trim(),
      billing_email: billingEmail || null,
      default_hourly_rate: parseFloat(hourlyRate) || 0,
      currency,
      notes: notes || null,
    };

    if (editing) {
      await supabase.from('clients').update(payload).eq('id', editing.id);
      toast.success('Client updated');
    } else {
      await supabase.from('clients').insert(payload);
      toast.success('Client created');
    }
    setDialogOpen(false);
    fetchClients();
  };

  const toggleArchive = async (client: any) => {
    const newStatus = client.status === 'active' ? 'archived' : 'active';
    await supabase.from('clients').update({ status: newStatus }).eq('id', client.id);
    toast.success(newStatus === 'archived' ? 'Client archived' : 'Client restored');
    fetchClients();
  };

  const visibleClients = clients.filter(c => showArchived ? c.status === 'archived' : c.status === 'active');

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Clients</h1>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Show Active' : 'Show Archived'}
          </Button>
          <Button onClick={openAdd}><Plus className="mr-2 h-4 w-4" />Add Client</Button>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <div key={i} className="h-40 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : visibleClients.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">{showArchived ? 'No archived clients.' : 'No clients yet. Add your first client to get started.'}</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {visibleClients.map(client => (
            <Card key={client.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-foreground">{client.name}</h3>
                    {client.billing_email && <p className="text-xs text-muted-foreground mt-0.5">{client.billing_email}</p>}
                  </div>
                  <Badge variant={client.status === 'active' ? 'default' : 'secondary'}>{client.status}</Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />${client.default_hourly_rate}/hr</span>
                  <span className="flex items-center gap-1"><FolderOpen className="h-3 w-3" />{client.projects?.[0]?.count || 0} projects</span>
                </div>
                <div className="flex gap-1">
                  <Button size="sm" variant="outline" onClick={() => openEdit(client)}><Pencil className="h-3 w-3 mr-1" />Edit</Button>
                  <Button size="sm" variant="ghost" onClick={() => toggleArchive(client)}>
                    {client.status === 'active' ? <Archive className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editing ? 'Edit Client' : 'Add Client'}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Name</Label><Input value={name} onChange={e => setName(e.target.value)} placeholder="Client name" /></div>
            <div className="space-y-2"><Label>Billing Email</Label><Input type="email" value={billingEmail} onChange={e => setBillingEmail(e.target.value)} placeholder="billing@example.com" /></div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Hourly Rate</Label><Input type="number" value={hourlyRate} onChange={e => setHourlyRate(e.target.value)} placeholder="0.00" /></div>
              <div className="space-y-2"><Label>Currency</Label><Input value={currency} onChange={e => setCurrency(e.target.value)} placeholder="USD" /></div>
            </div>
            <div className="space-y-2"><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} /></div>
            <Button onClick={handleSave} className="w-full">Save</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
