import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useRunningTimer } from '@/hooks/useRunningTimer';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Clock, DollarSign, Timer, TrendingUp, Users, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const { user } = useAuth();
  const { timer } = useRunningTimer();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalHours: 0, billableHours: 0, uninvoicedHours: 0, totalRevenue: 0 });
  const [topClients, setTopClients] = useState<{ name: string; hours: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    const fetchStats = async () => {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      // This week entries
      const { data: weekEntries } = await supabase
        .from('time_entries')
        .select('duration_seconds, billable, hourly_rate_used')
        .eq('user_id', user.id)
        .gte('start_time', weekStart.toISOString());

      const totalHours = (weekEntries || []).reduce((sum, e) => sum + e.duration_seconds, 0) / 3600;
      const billableHours = (weekEntries || []).filter(e => e.billable).reduce((sum, e) => sum + e.duration_seconds, 0) / 3600;

      // Uninvoiced last 30 days
      const { data: uninvoiced } = await supabase
        .from('time_entries')
        .select('duration_seconds, hourly_rate_used')
        .eq('user_id', user.id)
        .eq('billable', true)
        .is('invoice_id', null)
        .gte('start_time', thirtyDaysAgo.toISOString());

      const uninvoicedHours = (uninvoiced || []).reduce((sum, e) => sum + e.duration_seconds, 0) / 3600;
      const totalRevenue = (uninvoiced || []).reduce((sum, e) => sum + (e.duration_seconds / 3600) * Number(e.hourly_rate_used), 0);

      setStats({ totalHours: Math.round(totalHours * 100) / 100, billableHours: Math.round(billableHours * 100) / 100, uninvoicedHours: Math.round(uninvoicedHours * 100) / 100, totalRevenue: Math.round(totalRevenue * 100) / 100 });

      // Top clients
      const { data: clientEntries } = await supabase
        .from('time_entries')
        .select('client_id, duration_seconds, clients(name)')
        .eq('user_id', user.id)
        .gte('start_time', thirtyDaysAgo.toISOString());

      const clientMap = new Map<string, { name: string; hours: number }>();
      (clientEntries || []).forEach((e: any) => {
        const existing = clientMap.get(e.client_id) || { name: e.clients?.name || 'Unknown', hours: 0 };
        existing.hours += e.duration_seconds / 3600;
        clientMap.set(e.client_id, existing);
      });
      setTopClients(Array.from(clientMap.values()).sort((a, b) => b.hours - a.hours).slice(0, 5));
      setLoading(false);
    };
    fetchStats();
  }, [user]);

  const formatHours = (h: number) => h.toFixed(1) + 'h';

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Your week at a glance</p>
        </div>
        <Button onClick={() => navigate('/timer')}>
          <Timer className="mr-2 h-4 w-4" />
          {timer ? 'View Timer' : 'Start Timer'}
        </Button>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[1,2,3,4].map(i => <div key={i} className="stat-card h-28 animate-pulse bg-muted" />)}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Clock className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">This Week</p>
                  <p className="text-2xl font-bold text-foreground">{formatHours(stats.totalHours)}</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                  <TrendingUp className="h-5 w-5 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Billable</p>
                  <p className="text-2xl font-bold text-foreground">{formatHours(stats.billableHours)}</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <AlertCircle className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Uninvoiced</p>
                  <p className="text-2xl font-bold text-foreground">{formatHours(stats.uninvoicedHours)}</p>
                </div>
              </div>
            </div>
            <div className="stat-card">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <DollarSign className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Uninvoiced Rev.</p>
                  <p className="text-2xl font-bold text-foreground">${stats.totalRevenue.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="h-4 w-4" />
                Top Clients (30 days)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {topClients.length === 0 ? (
                <p className="text-sm text-muted-foreground">No time logged yet. Start tracking to see data here.</p>
              ) : (
                <div className="space-y-3">
                  {topClients.map((c, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{c.name}</span>
                      <span className="text-sm text-muted-foreground">{formatHours(Math.round(c.hours * 100) / 100)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
