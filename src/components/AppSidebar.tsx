import { LayoutDashboard, Timer, List, Users, FolderOpen, FileText, BarChart3, Settings, LogOut, Sun, Moon } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useRunningTimer } from '@/hooks/useRunningTimer';
import { useTheme } from '@/hooks/useTheme';

const navItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Timer', url: '/timer', icon: Timer },
  { title: 'Time Entries', url: '/time-entries', icon: List },
  { title: 'Clients', url: '/clients', icon: Users },
  { title: 'Projects', url: '/projects', icon: FolderOpen },
  { title: 'Invoices', url: '/invoices', icon: FileText },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function AppSidebar() {
  const { signOut, user } = useAuth();
  const { timer } = useRunningTimer();
  const { theme, toggle } = useTheme();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-60 bg-sidebar border-r border-sidebar-border">
      <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
        {/* Wordmark: slash-style typographic mark */}
        <div className="flex items-baseline gap-0.5 select-none">
          <span className="text-xl font-black tracking-tighter text-sidebar-accent-foreground leading-none">bill</span>
          <span className="text-xl font-black tracking-tighter text-primary leading-none">/</span>
          <span className="text-xl font-black tracking-tighter text-sidebar-accent-foreground leading-none">able</span>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.url}
            to={item.url}
            end={item.url === '/dashboard'}
            className="sidebar-item sidebar-item-inactive"
            activeClassName="sidebar-item-active"
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            <span>{item.title}</span>
            {item.url === '/timer' && timer && (
              <span className="ml-auto h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
            )}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-1">
        <button
          onClick={toggle}
          className="sidebar-item sidebar-item-inactive w-full"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
        </button>
        <div className="mb-1 px-3 py-1">
          <p className="text-xs text-sidebar-foreground truncate">{user?.email}</p>
        </div>
        <button
          onClick={signOut}
          className="sidebar-item sidebar-item-inactive w-full"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
}
