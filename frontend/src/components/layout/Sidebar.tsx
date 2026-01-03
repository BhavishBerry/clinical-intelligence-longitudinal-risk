import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '@/context';
import {
    LayoutDashboard,
    Bell,
    Upload,
    Settings,
    LogOut,
    Activity,
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { Button } from '@/components/ui';

interface NavItem {
    label: string;
    path: string;
    icon: React.ReactNode;
    adminOnly?: boolean;
}

const navItems: NavItem[] = [
    { label: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
    { label: 'Alerts', path: '/alerts', icon: <Bell className="w-5 h-5" /> },
    { label: 'Data Upload', path: '/upload', icon: <Upload className="w-5 h-5" />, adminOnly: true },
    { label: 'Settings', path: '/settings', icon: <Settings className="w-5 h-5" />, adminOnly: true },
];

export function Sidebar() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const filteredItems = navItems.filter(
        (item) => !item.adminOnly || user?.role === 'admin'
    );

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-[hsl(var(--card))] border-r border-[hsl(var(--border))] flex flex-col">
            {/* Logo */}
            <div className="p-6 border-b border-[hsl(var(--border))]">
                <div className="flex items-center gap-3">
                    <Activity className="w-8 h-8 text-[hsl(var(--primary))]" />
                    <div>
                        <h1 className="font-bold text-lg">Clinical Intel</h1>
                        <p className="text-xs text-[hsl(var(--muted-foreground))]">Risk Monitoring</p>
                    </div>
                </div>
            </div>

            {/* Nav Items */}
            <nav className="flex-1 p-4 space-y-2">
                {filteredItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            cn(
                                'flex items-center gap-3 px-4 py-3 rounded-lg transition-colors',
                                isActive
                                    ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]'
                                    : 'hover:bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]'
                            )
                        }
                    >
                        {item.icon}
                        <span>{item.label}</span>
                    </NavLink>
                ))}
            </nav>

            {/* User Info & Logout */}
            <div className="p-4 border-t border-[hsl(var(--border))]">
                {user && (
                    <div className="mb-3 px-4">
                        <p className="font-medium text-sm">{user.name}</p>
                        <p className="text-xs text-[hsl(var(--muted-foreground))] capitalize">{user.role}</p>
                    </div>
                )}
                <Button
                    variant="ghost"
                    className="w-full justify-start gap-3"
                    onClick={handleLogout}
                >
                    <LogOut className="w-5 h-5" />
                    Logout
                </Button>
            </div>
        </aside>
    );
}
