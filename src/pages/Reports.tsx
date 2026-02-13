import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Download } from 'lucide-react';
import { format, subWeeks, startOfWeek, endOfWeek } from 'date-fns';

const CHART_COLORS = [
  'hsl(38, 92%, 50%)',
  'hsl(199, 89%, 48%)',
  'hsl(142, 71%, 45%)',
  'hsl(262, 83%, 58%)',
  'hsl(0, 72%, 51%)',
];

export default function Reports() {
  const { user } = useAuth();
  const [weeklyData, setWeeklyData] = useState<{ week: string; hours: number; revenue: number }[]>([]);
  const [clientBreakdown, setClientBreakdown] = useState<{ name: string; hours: number }[]>([]);
  const [period, setPeriod] = useState('12');

  useEffect(() => {
    if (!user) return;
    const weeks = parseInt(period);
    const fetchData = async () => {
      const startDate = subWeeks(new Date(), weeks);
      const { data: entries } = await supabase
        .from('time_entries')
        .select('start_time, duration_seconds, hourly_rate_used, billable, client_id, clients(name)')
        .eq('user_id', user.id)
        .gte('start_time', startDate.toISOString())
        .order('start_time');

      // Weekly aggregation
      const weekMap = new Map<string, { hours: number; revenue: number }>();
      const clientMap = new Map<string, { name: string; hours: number }>();

      (entries || []).forEach((e: any) => {
        const weekStart = startOfWeek(new Date(e.start_time));
        const weekKey = format(weekStart, 'MMM d');
        const hours = e.duration_seconds / 3600;

        const existing = weekMap.get(weekKey) || { hours: 0, revenue: 0 };
        existing.hours += hours;
        if (e.billable) existing.revenue += hours * Number(e.hourly_rate_used);
        weekMap.set(weekKey, existing);

        const ce = clientMap.get(e.client_id) || { name: e.clients?.name || 'Unknown', hours: 0 };
        ce.hours += hours;
        clientMap.set(e.client_id, ce);
      });

      setWeeklyData(Array.from(weekMap.entries()).map(([week, data]) => ({ week, hours: Math.round(data.hours * 100) / 100, revenue: Math.round(data.revenue * 100) / 100 })));
      setClientBreakdown(Array.from(clientMap.values()).sort((a, b) => b.hours - a.hours));
    };
    fetchData();
  }, [user, period]);

  const exportCSV = async () => {
    if (!user) return;
    const { data } = await supabase
      .from('time_entries')
      .select('start_time, end_time, duration_seconds, billable, hourly_rate_used, description, clients(name), projects(name), tasks(name)')
      .eq('user_id', user.id)
      .order('start_time', { ascending: false });

    if (!data?.length) return;
    const csv = [
      'Date,Client,Project,Task,Start,End,Duration (h),Billable,Rate,Amount,Description',
      ...data.map((e: any) => [
        format(new Date(e.start_time), 'yyyy-MM-dd'),
        e.clients?.name || '',
        e.projects?.name || '',
        e.tasks?.name || '',
        format(new Date(e.start_time), 'HH:mm'),
        format(new Date(e.end_time), 'HH:mm'),
        (e.duration_seconds / 3600).toFixed(2),
        e.billable ? 'Yes' : 'No',
        e.hourly_rate_used,
        ((e.duration_seconds / 3600) * Number(e.hourly_rate_used)).toFixed(2),
        `"${(e.description || '').replace(/"/g, '""')}"`,
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-entries-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
  };

  return (
    <div className="space-y-6 animate-slide-in">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <div className="flex gap-2">
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="4">Last 4 weeks</SelectItem>
              <SelectItem value="12">Last 12 weeks</SelectItem>
              <SelectItem value="26">Last 26 weeks</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportCSV}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Hours per Week</CardTitle></CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} />
                  <Bar dataKey="hours" fill="hsl(38, 92%, 50%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Revenue per Week</CardTitle></CardHeader>
          <CardContent>
            {weeklyData.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="week" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }} formatter={(v: number) => `$${v.toFixed(2)}`} />
                  <Bar dataKey="revenue" fill="hsl(142, 71%, 45%)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Hours by Client</CardTitle></CardHeader>
          <CardContent>
            {clientBreakdown.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No data yet</p>
            ) : (
              <div className="flex items-center gap-8 flex-wrap">
                <ResponsiveContainer width={200} height={200}>
                  <PieChart>
                    <Pie data={clientBreakdown} dataKey="hours" nameKey="name" cx="50%" cy="50%" outerRadius={80} strokeWidth={2}>
                      {clientBreakdown.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => `${v.toFixed(1)}h`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="space-y-2">
                  {clientBreakdown.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                      <span className="text-sm">{c.name}</span>
                      <span className="text-sm text-muted-foreground">{c.hours.toFixed(1)}h</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
