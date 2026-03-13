import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState('0');
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [promptMinutes, setPromptMinutes] = useState('30');
  const [timerRounding, setTimerRounding] = useState('0');
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_settings').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setCurrency(data.default_currency || 'USD');
        setTaxRate(String(data.default_tax_rate || 0));
        setInvoicePrefix(data.invoice_prefix || 'INV');
        setPromptMinutes(String(data.activity_prompt_minutes || 30));
        setTimerRounding(String((data as any).timer_rounding_minutes || 0));
        setBusinessName((data as any).business_name || '');
        setBusinessAddress((data as any).business_address || '');
      }
      setLoading(false);
    });
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    await supabase.from('user_settings').update({
      default_currency: currency,
      default_tax_rate: parseFloat(taxRate) || 0,
      invoice_prefix: invoicePrefix,
      activity_prompt_minutes: parseInt(promptMinutes) || 30,
      timer_rounding_minutes: parseInt(timerRounding) || 0,
      business_name: businessName || null,
      business_address: businessAddress || null,
    } as any).eq('user_id', user.id);
    toast.success('Settings saved');
  };

  if (loading) return <div className="h-48 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-slide-in">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

      <Card>
        <CardHeader><CardTitle className="text-base">Business Info</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Acme Studio" />
          </div>
          <div className="space-y-2">
            <Label>Business Address</Label>
            <Textarea value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder={"123 Main St\nNew York, NY 10001"} rows={3} />
            <p className="text-xs text-muted-foreground">Appears on invoices and emails sent to clients.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Billing Defaults</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Default Currency</Label><Input value={currency} onChange={e => setCurrency(e.target.value)} /></div>
            <div className="space-y-2"><Label>Default Tax Rate (%)</Label><Input type="number" value={taxRate} onChange={e => setTaxRate(e.target.value)} /></div>
          </div>
          <div className="space-y-2"><Label>Invoice Number Prefix</Label><Input value={invoicePrefix} onChange={e => setInvoicePrefix(e.target.value)} placeholder="INV" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Timer</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Round up timer to nearest</Label>
            <Select value={timerRounding} onValueChange={setTimerRounding}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="0">No rounding</SelectItem>
                <SelectItem value="6">6 minutes</SelectItem>
                <SelectItem value="10">10 minutes</SelectItem>
                <SelectItem value="15">15 minutes</SelectItem>
                <SelectItem value="30">30 minutes</SelectItem>
                <SelectItem value="60">60 minutes</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Duration is always rounded up to the next interval when you stop the timer.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Activity Tracking</CardTitle></CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label>Prompt interval (minutes)</Label>
            <Input type="number" value={promptMinutes} onChange={e => setPromptMinutes(e.target.value)} />
            <p className="text-xs text-muted-foreground">How often to prompt "What are you working on?" while timer is running.</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </CardContent>
      </Card>

      <Button onClick={handleSave} className="w-full">Save Settings</Button>
    </div>
  );
}
