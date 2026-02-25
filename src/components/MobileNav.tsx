import { useState } from 'react';
import { Clock, LayoutDashboard, Timer, List, Users, FolderOpen, FileText, BarChart3, Settings, LogOut, Menu, X, Sun, Moon } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';

const navItems = [
  { title: 'Dashboard', url: '/', icon: LayoutDashboard },
  { title: 'Timer', url: '/timer', icon: Timer },
  { title: 'Time Entries', url: '/time-entries', icon: List },
  { title: 'Clients', url: '/clients', icon: Users },
  { title: 'Projects', url: '/projects', icon: FolderOpen },
  { title: 'Invoices', url: '/invoices', icon: FileText },
  { title: 'Reports', url: '/reports', icon: BarChart3 },
  { title: 'Settings', url: '/settings', icon: Settings },
];

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const { signOut, user } = useAuth();
  const { theme, toggle } = useTheme();

  return (
    <div className="lg:hidden">
      <div className="flex items-center justify-between border-b bg-card px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary">
            <Clock className="h-3.5 w-3.5 text-primary-foreground" />
          </div>
          <span className="font-bold text-foreground">TimeTracker</span>
        </div>
        <button onClick={() => setOpen(!open)} className="text-muted-foreground">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="absolute inset-x-0 top-[53px] z-50 border-b bg-card shadow-lg">
          <nav className="p-3 space-y-1">
            {navItems.map((item) => (
              <NavLink
                key={item.url}
                to={item.url}
                end={item.url === '/'}
                className="sidebar-item sidebar-item-inactive"
                activeClassName="sidebar-item-active"
                onClick={() => setOpen(false)}
              >
                <item.icon className="h-4 w-4" />
                <span>{item.title}</span>
              </NavLink>
            ))}
          </nav>
          <div className="border-t p-3 space-y-1">
            <button onClick={toggle} className="sidebar-item sidebar-item-inactive w-full">
              {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
            </button>
            <p className="px-3 py-1 text-xs text-muted-foreground truncate">{user?.email}</p>
            <button onClick={signOut} className="sidebar-item sidebar-item-inactive w-full">
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
