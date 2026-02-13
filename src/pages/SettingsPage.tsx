import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { user } = useAuth();
  const [currency, setCurrency] = useState('USD');
  const [taxRate, setTaxRate] = useState('0');
  const [invoicePrefix, setInvoicePrefix] = useState('INV');
  const [promptMinutes, setPromptMinutes] = useState('30');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    supabase.from('user_settings').select('*').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setCurrency(data.default_currency || 'USD');
        setTaxRate(String(data.default_tax_rate || 0));
        setInvoicePrefix(data.invoice_prefix || 'INV');
        setPromptMinutes(String(data.activity_prompt_minutes || 30));
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
    }).eq('user_id', user.id);
    toast.success('Settings saved');
  };

  if (loading) return <div className="h-48 animate-pulse rounded-xl bg-muted" />;

  return (
    <div className="mx-auto max-w-xl space-y-6 animate-slide-in">
      <h1 className="text-2xl font-bold text-foreground">Settings</h1>

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
