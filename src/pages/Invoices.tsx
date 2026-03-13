import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, FileText, Download, Check, Send, XCircle, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export default function Invoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [sendingEmail, setSendingEmail] = useState(false);

  // Create form
  const [formClientId, setFormClientId] = useState('');
  const [formStart, setFormStart] = useState('');
  const [formEnd, setFormEnd] = useState('');
  const [formTaxRate, setFormTaxRate] = useState('0');
  const [previewEntries, setPreviewEntries] = useState<any[]>([]);
  const [generating, setGenerating] = useState(false);
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  const fetchInvoices = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('invoices')
      .select('*, clients(name, billing_email)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
    setInvoices(data || []);
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    fetchInvoices();
    supabase.from('clients').select('*').eq('user_id', user.id).eq('status', 'active').order('name').then(({ data }) => setClients(data || []));
    supabase.from('user_settings').select('business_name, business_address').eq('user_id', user.id).single().then(({ data }) => {
      setBusinessName((data as any)?.business_name || '');
      setBusinessAddress((data as any)?.business_address || '');
    });
  }, [user]);

  const fetchPreview = async () => {
    if (!formClientId || !formStart || !formEnd) return;
    const { data } = await supabase
      .from('time_entries')
      .select('*, projects(name), tasks(name)')
      .eq('user_id', user!.id)
      .eq('client_id', formClientId)
      .eq('billable', true)
      .is('invoice_id', null)
      .gte('start_time', formStart)
      .lte('start_time', formEnd + 'T23:59:59')
      .order('start_time');
    setPreviewEntries(data || []);
  };

  useEffect(() => { fetchPreview(); }, [formClientId, formStart, formEnd]);

  const generateInvoice = async () => {
    if (!user || !formClientId || previewEntries.length === 0) { toast.error('No entries to invoice'); return; }
    setGenerating(true);

    // Get next invoice number
    const { data: settings } = await supabase.from('user_settings').select('invoice_prefix').eq('user_id', user.id).single();
    const prefix = settings?.invoice_prefix || 'INV';
    const { count } = await supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('user_id', user.id);
    const invoiceNumber = `${prefix}-${String((count || 0) + 1).padStart(4, '0')}`;

    const taxRate = parseFloat(formTaxRate) || 0;

    // Group entries by project + date
    const grouped = new Map<string, { date: string; projectName: string; taskName: string; hours: number; rate: number; entryIds: string[]; description: string }>();
    previewEntries.forEach((e: any) => {
      const key = `${e.project_id}-${format(new Date(e.start_time), 'yyyy-MM-dd')}`;
      const existing = grouped.get(key);
      const hours = e.duration_seconds / 3600;
      if (existing) {
        existing.hours += hours;
        existing.entryIds.push(e.id);
        if (e.description) existing.description += '; ' + e.description;
      } else {
        grouped.set(key, {
          date: format(new Date(e.start_time), 'yyyy-MM-dd'),
          projectName: e.projects?.name || '',
          taskName: e.tasks?.name || '',
          hours,
          rate: Number(e.hourly_rate_used),
          entryIds: [e.id],
          description: e.description || '',
        });
      }
    });

    const items = Array.from(grouped.values());
    const subtotal = items.reduce((s, i) => s + Math.round(i.hours * i.rate * 100) / 100, 0);
    const taxAmount = Math.round(subtotal * taxRate / 100 * 100) / 100;
    const total = subtotal + taxAmount;

    const { data: invoice } = await supabase.from('invoices').insert({
      user_id: user.id,
      client_id: formClientId,
      invoice_number: invoiceNumber,
      period_start: formStart,
      period_end: formEnd,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      total,
    }).select().single();

    if (!invoice) { toast.error('Failed to create invoice'); setGenerating(false); return; }

    // Insert line items
    const lineItemPayloads = items.map(item => ({
      user_id: user.id,
      invoice_id: invoice.id,
      date: item.date,
      project_name: item.projectName,
      task_name: item.taskName || null,
      description: item.description || null,
      hours: Math.round(item.hours * 100) / 100,
      rate: item.rate,
      amount: Math.round(item.hours * item.rate * 100) / 100,
      time_entry_ids: item.entryIds,
    }));
    await supabase.from('invoice_line_items').insert(lineItemPayloads);

    // Mark entries as invoiced
    const allEntryIds = previewEntries.map((e: any) => e.id);
    await supabase.from('time_entries').update({ invoice_id: invoice.id }).in('id', allEntryIds);

    toast.success(`Invoice ${invoiceNumber} created!`);
    setCreateDialogOpen(false);
    setGenerating(false);
    fetchInvoices();
  };

  const viewInvoice = async (invoice: any) => {
    setSelectedInvoice(invoice);
    const { data } = await supabase.from('invoice_line_items').select('*').eq('invoice_id', invoice.id).order('date');
    setLineItems(data || []);
    setDetailDialogOpen(true);
  };

  const sendInvoiceEmail = async (invoice: any) => {
    if (!invoice.clients?.billing_email) {
      toast.error('No billing email set for this client');
      return;
    }
    setSendingEmail(true);
    const res = await supabase.functions.invoke('send-invoice', {
      body: { invoice_id: invoice.id },
    });
    setSendingEmail(false);
    if (res.error) {
      let msg = res.error.message || 'Failed to send email';
      try { const text = await res.error.context.text(); console.error('invoke error body:', text); const body = JSON.parse(text); msg = body.error || msg; } catch (e) { console.error('parse error:', e); }
      toast.error(msg);
    } else if (res.data?.error) {
      toast.error(res.data.error);
    } else {
      toast.success(`Invoice emailed to ${invoice.clients.billing_email}`);
      fetchInvoices();
      setSelectedInvoice({ ...invoice, status: 'sent' });
    }
  };

  const updateStatus = async (invoiceId: string, status: string) => {
    await supabase.from('invoices').update({ status }).eq('id', invoiceId);
    toast.success(`Invoice marked as ${status}`);
    fetchInvoices();
    if (selectedInvoice?.id === invoiceId) setSelectedInvoice({ ...selectedInvoice, status });
  };

  const exportPDF = (invoice: any, items: any[]) => {
    const doc = new jsPDF();

    // Business info (top left)
    let y = 14;
    if (businessName) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(businessName, 14, y);
      y += 7;
    }
    if (businessAddress) {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      businessAddress.split('\n').forEach(line => { doc.text(line, 14, y); y += 5; });
      doc.setTextColor(0);
    }

    // Invoice number (top right)
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(invoice.invoice_number, 196, 14, { align: 'right' });

    y = Math.max(y, 28) + 6;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Client: ${invoice.clients?.name || ''}`, 14, y); y += 6;
    doc.text(`Date: ${format(new Date(invoice.issue_date), 'MMM d, yyyy')}`, 14, y); y += 6;
    doc.text(`Period: ${format(new Date(invoice.period_start), 'MMM d')} – ${format(new Date(invoice.period_end), 'MMM d, yyyy')}`, 14, y); y += 8;

    autoTable(doc, {
      startY: y,
      head: [['Date', 'Project', 'Task', 'Description', 'Hours', 'Rate', 'Amount']],
      body: items.map(item => [
        format(new Date(item.date), 'MM/dd'),
        item.project_name,
        item.task_name || '',
        item.description || '',
        Number(item.hours).toFixed(2),
        `$${Number(item.rate).toFixed(2)}`,
        `$${Number(item.amount).toFixed(2)}`,
      ]),
    });

    const finalY = (doc as any).lastAutoTable?.finalY || 100;
    doc.text(`Subtotal: $${Number(invoice.subtotal).toFixed(2)}`, 140, finalY + 10);
    if (Number(invoice.tax_rate) > 0) {
      doc.text(`Tax (${invoice.tax_rate}%): $${Number(invoice.tax_amount).toFixed(2)}`, 140, finalY + 16);
    }
    doc.setFontSize(12);
    doc.text(`Total: $${Number(invoice.total).toFixed(2)}`, 140, finalY + 24);

    doc.save(`${invoice.invoice_number}.pdf`);
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'draft': return 'secondary';
      case 'sent': return 'default';
      case 'paid': return 'default';
      case 'void': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Invoices</h1>
        <Button onClick={() => { setFormClientId(''); setFormStart(''); setFormEnd(''); setFormTaxRate('0'); setPreviewEntries([]); setCreateDialogOpen(true); }}>
          <Plus className="mr-2 h-4 w-4" />Create Invoice
        </Button>
      </div>

      {loading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
      ) : invoices.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center">
          <p className="text-muted-foreground">No invoices yet. Track time and create your first invoice.</p>
        </div>
      ) : (
        <div className="rounded-xl border bg-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Invoice #</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Period</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.map(inv => (
                <TableRow key={inv.id}>
                  <TableCell className="font-mono font-medium">{inv.invoice_number}</TableCell>
                  <TableCell>{inv.clients?.name}</TableCell>
                  <TableCell className="text-sm">{format(new Date(inv.period_start), 'MMM d')} – {format(new Date(inv.period_end), 'MMM d, yyyy')}</TableCell>
                  <TableCell className="font-mono">${Number(inv.total).toFixed(2)}</TableCell>
                  <TableCell><Badge variant={statusColor(inv.status)}>{inv.status}</Badge></TableCell>
                  <TableCell>
                    <Button size="sm" variant="ghost" onClick={() => viewInvoice(inv)}><Eye className="h-3 w-3" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create Invoice Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Create Invoice</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Client</Label>
                <Select value={formClientId} onValueChange={setFormClientId}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>{clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2"><Label>From</Label><Input type="date" value={formStart} onChange={e => setFormStart(e.target.value)} /></div>
              <div className="space-y-2"><Label>To</Label><Input type="date" value={formEnd} onChange={e => setFormEnd(e.target.value)} /></div>
            </div>
            <div className="space-y-2"><Label>Tax Rate (%)</Label><Input type="number" value={formTaxRate} onChange={e => setFormTaxRate(e.target.value)} /></div>

            {previewEntries.length > 0 ? (
              <div className="rounded-lg border p-3 max-h-60 overflow-auto">
                <p className="text-sm font-medium mb-2">{previewEntries.length} billable entries found</p>
                <p className="text-lg font-bold text-foreground">
                  Subtotal: ${previewEntries.reduce((s, e) => s + (e.duration_seconds / 3600) * Number(e.hourly_rate_used), 0).toFixed(2)}
                </p>
              </div>
            ) : formClientId && formStart && formEnd ? (
              <p className="text-sm text-muted-foreground">No uninvoiced billable entries found for this period.</p>
            ) : null}

            <Button onClick={generateInvoice} className="w-full" disabled={generating || previewEntries.length === 0}>
              {generating ? 'Generating...' : 'Generate Invoice'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invoice Detail Dialog */}
      <Dialog open={detailDialogOpen} onOpenChange={setDetailDialogOpen}>
        <DialogContent className="max-w-3xl">
          <DialogHeader><DialogTitle>{selectedInvoice?.invoice_number}</DialogTitle></DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="flex justify-between text-sm">
                <div>
                  <p><strong>Client:</strong> {selectedInvoice.clients?.name}</p>
                  <p><strong>Period:</strong> {format(new Date(selectedInvoice.period_start), 'MMM d')} – {format(new Date(selectedInvoice.period_end), 'MMM d, yyyy')}</p>
                </div>
                <div className="text-right">
                  <Badge variant={statusColor(selectedInvoice.status)}>{selectedInvoice.status}</Badge>
                  <p className="text-xl font-bold mt-1">${Number(selectedInvoice.total).toFixed(2)}</p>
                </div>
              </div>

              <div className="rounded-lg border overflow-hidden max-h-60 overflow-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Rate</TableHead>
                      <TableHead>Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map(item => (
                      <TableRow key={item.id}>
                        <TableCell>{format(new Date(item.date), 'MM/dd')}</TableCell>
                        <TableCell>{item.project_name}</TableCell>
                        <TableCell className="font-mono">{Number(item.hours).toFixed(2)}</TableCell>
                        <TableCell className="font-mono">${Number(item.rate).toFixed(2)}</TableCell>
                        <TableCell className="font-mono">${Number(item.amount).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Button size="sm" variant="outline" onClick={() => exportPDF(selectedInvoice, lineItems)}>
                  <Download className="h-3 w-3 mr-1" />Export PDF
                </Button>
                {(selectedInvoice.status === 'draft' || selectedInvoice.status === 'sent') && (
                  <Button size="sm" variant="outline" onClick={() => sendInvoiceEmail(selectedInvoice)} disabled={sendingEmail}>
                    <Send className="h-3 w-3 mr-1" />{sendingEmail ? 'Sending...' : 'Send Email'}
                  </Button>
                )}
                {selectedInvoice.status === 'draft' && (
                  <Button size="sm" variant="outline" onClick={() => updateStatus(selectedInvoice.id, 'sent')}>
                    Mark Sent
                  </Button>
                )}
                {(selectedInvoice.status === 'draft' || selectedInvoice.status === 'sent') && (
                  <Button size="sm" onClick={() => updateStatus(selectedInvoice.id, 'paid')}>
                    <Check className="h-3 w-3 mr-1" />Mark Paid
                  </Button>
                )}
                {selectedInvoice.status !== 'void' && (
                  <Button size="sm" variant="destructive" onClick={() => updateStatus(selectedInvoice.id, 'void')}>
                    <XCircle className="h-3 w-3 mr-1" />Void
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
