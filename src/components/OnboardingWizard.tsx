import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

const DISMISSED_KEY = 'billable_onboarding_dismissed';

export function OnboardingWizard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(1);

  // Business info
  const [businessName, setBusinessName] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');

  // First client
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientRate, setClientRate] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (localStorage.getItem(DISMISSED_KEY)) return;
    supabase.from('clients').select('id', { count: 'exact', head: true }).eq('user_id', user.id).then(({ count }) => {
      if (count === 0) setOpen(true);
    });
  }, [user]);

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setOpen(false);
  };

  const saveBusinessInfo = async () => {
    if (!user) return;
    setSaving(true);
    await supabase.from('user_settings').update({
      business_name: businessName || null,
      business_address: businessAddress || null,
    } as any).eq('user_id', user.id);
    setSaving(false);
    setStep(2);
  };

  const saveClient = async () => {
    if (!user || !clientName.trim()) return;
    setSaving(true);
    const { error } = await supabase.from('clients').insert({
      user_id: user.id,
      name: clientName.trim(),
      billing_email: clientEmail || null,
      default_hourly_rate: parseFloat(clientRate) || null,
      status: 'active',
    });
    setSaving(false);
    if (error) { toast.error('Failed to create client'); return; }
    setStep(3);
  };

  const finish = () => {
    localStorage.setItem(DISMISSED_KEY, '1');
    setOpen(false);
    navigate('/timer');
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={e => e.preventDefault()}>
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex gap-1.5 mb-2">
              {[1, 2, 3].map(i => (
                <div key={i} className={`h-1.5 w-8 rounded-full transition-colors ${i <= step ? 'bg-primary' : 'bg-muted'}`} />
              ))}
            </div>
          </div>
          <DialogTitle>
            {step === 1 && 'Welcome to Billable!'}
            {step === 2 && 'Add your first client'}
            {step === 3 && "You're all set!"}
          </DialogTitle>
          <DialogDescription>
            {step === 1 && "Let's set up your business info. This appears on your invoices."}
            {step === 2 && 'Who do you bill? You can add more clients later.'}
            {step === 3 && 'Start tracking time and create your first invoice.'}
          </DialogDescription>
        </DialogHeader>

        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Business Name</Label>
              <Input value={businessName} onChange={e => setBusinessName(e.target.value)} placeholder="Acme Studio" />
            </div>
            <div className="space-y-2">
              <Label>Business Address <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Textarea value={businessAddress} onChange={e => setBusinessAddress(e.target.value)} placeholder={"123 Main St\nNew York, NY 10001"} rows={3} />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={dismiss}>Skip setup</Button>
              <Button className="flex-1" onClick={saveBusinessInfo} disabled={saving}>
                {saving ? 'Saving...' : 'Continue'}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Client Name <span className="text-destructive">*</span></Label>
              <Input value={clientName} onChange={e => setClientName(e.target.value)} placeholder="Acme Corp" autoFocus />
            </div>
            <div className="space-y-2">
              <Label>Billing Email <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input type="email" value={clientEmail} onChange={e => setClientEmail(e.target.value)} placeholder="billing@acmecorp.com" />
            </div>
            <div className="space-y-2">
              <Label>Hourly Rate <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input type="number" value={clientRate} onChange={e => setClientRate(e.target.value)} placeholder="150" />
            </div>
            <div className="flex gap-2 pt-2">
              <Button variant="ghost" className="flex-1" onClick={() => setStep(1)}>Back</Button>
              <Button className="flex-1" onClick={saveClient} disabled={saving || !clientName.trim()}>
                {saving ? 'Saving...' : 'Add Client'}
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <div className="rounded-lg bg-accent p-4 text-sm text-accent-foreground space-y-1">
              <p>✓ Business info saved</p>
              <p>✓ First client added</p>
            </div>
            <p className="text-sm text-muted-foreground">Head to the timer to start tracking your first billable hour.</p>
            <Button className="w-full" onClick={finish}>Start Timer →</Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
