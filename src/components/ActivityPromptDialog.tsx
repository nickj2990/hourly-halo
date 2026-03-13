import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRunningTimer } from '@/hooks/useRunningTimer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

export function ActivityPromptDialog() {
  const { user } = useAuth();
  const { timer } = useRunningTimer();
  const [open, setOpen] = useState(false);
  const [description, setDescription] = useState('');
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const promptMinutesRef = useRef<number>(30);

  // Fetch prompt interval from settings
  useEffect(() => {
    if (!user) return;
    supabase.from('user_settings').select('activity_prompt_minutes').eq('user_id', user.id).single().then(({ data }) => {
      if (data?.activity_prompt_minutes) {
        promptMinutesRef.current = data.activity_prompt_minutes;
      }
    });
  }, [user]);

  // Set up interval while timer is running
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!timer) return;

    intervalRef.current = setInterval(() => {
      setDescription(timer.description || '');
      setOpen(true);
    }, promptMinutesRef.current * 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [timer]);

  const handleSave = async () => {
    if (!user || !timer) return;
    await supabase.from('running_timer').update({ description: description || null }).eq('user_id', user.id);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>What are you working on?</DialogTitle>
        </DialogHeader>
        <Textarea
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Describe what you're working on..."
          rows={3}
          autoFocus
        />
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Dismiss</Button>
          <Button onClick={handleSave}>Update</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
