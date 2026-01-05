import { useEffect, useState } from 'react';
import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { api, UserWithStats } from '@/services/api';
import { Users, Settings as SettingsIcon, RotateCcw, Loader2, AlertTriangle } from 'lucide-react';
import { useAuth } from '@/context';

export function SettingsPage() {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [loading, setLoading] = useState(false);
    const [configLoading, setConfigLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Config State
    const [config, setConfig] = useState<Record<string, string>>({
        enable_alerts: 'true',
        data_sync: 'false'
    });

    useEffect(() => {
        const fetchData = async () => {
            // Fetch config for everyone, though update is restricted
            setConfigLoading(true);
            try {
                const configData = await api.getConfig();
                setConfig(prev => ({ ...prev, ...configData }));
            } catch (err) {
                console.error('Failed to load config:', err);
            } finally {
                setConfigLoading(false);
            }

            // Fetch users only if admin
            if (currentUser?.role === 'admin') {
                setLoading(true);
                try {
                    const usersData = await api.getUsers();
                    setUsers(usersData);
                    setError(null);
                } catch (err) {
                    console.error('Failed to load users:', err);
                    setError('Failed to load users');
                } finally {
                    setLoading(false);
                }
            }
        };

        fetchData();
    }, [currentUser]);

    const handleToggle = async (key: string) => {
        const newValue = config[key] === 'true' ? 'false' : 'true';
        // Optimistic update
        setConfig(prev => ({ ...prev, [key]: newValue }));

        try {
            await api.updateConfig(key, newValue);
        } catch (err) {
            console.error('Failed to update config:', err);
            // Revert on failure
            setConfig(prev => ({ ...prev, [key]: config[key] }));
            // Could add toast notification here
        }
    };

    return (
        <MainLayout>
            <div className="mb-6">
                <h1 className="text-3xl font-bold mb-2">Settings</h1>
                <p className="text-[hsl(var(--muted-foreground))]">
                    Manage users and application configuration
                </p>
            </div>

            <div className="grid gap-6">
                {/* Users Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            <CardTitle>User Management</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {currentUser?.role !== 'admin' ? (
                            <div className="text-center py-6 text-[hsl(var(--muted-foreground))]">
                                <AlertTriangle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                <p>Only administrators can view user management.</p>
                            </div>
                        ) : loading ? (
                            <div className="flex justify-center py-8">
                                <Loader2 className="w-6 h-6 animate-spin text-[hsl(var(--primary))]" />
                            </div>
                        ) : error ? (
                            <div className="flex items-center gap-2 text-red-500 p-4 bg-red-50/50 rounded-lg">
                                <AlertTriangle className="w-4 h-4" />
                                {error}
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                                    Registered users in the system:
                                </p>

                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b">
                                                <th className="text-left py-3 px-4">Name</th>
                                                <th className="text-left py-3 px-4">Email</th>
                                                <th className="text-left py-3 px-4">Role</th>
                                                <th className="text-left py-3 px-4">Assigned Patients</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((user) => (
                                                <tr key={user.id} className="border-b hover:bg-[hsl(var(--accent))]">
                                                    <td className="py-3 px-4 font-medium">
                                                        {user.name}
                                                        {user.id === currentUser.id && (
                                                            <Badge variant="outline" className="ml-2 text-[10px]">You</Badge>
                                                        )}
                                                    </td>
                                                    <td className="py-3 px-4 text-[hsl(var(--muted-foreground))]">{user.email}</td>
                                                    <td className="py-3 px-4">
                                                        <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                                            {user.role}
                                                        </Badge>
                                                    </td>
                                                    <td className="py-3 px-4 text-[hsl(var(--muted-foreground))]">
                                                        {user.role === 'admin' ? 'All patients' : user.patient_count}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* Configuration Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <SettingsIcon className="w-5 h-5" />
                            <CardTitle>Configuration</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {configLoading ? (
                            <div className="flex justify-center py-4">
                                <Loader2 className="w-4 h-4 animate-spin text-[hsl(var(--primary))]" />
                            </div>
                        ) : (
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-[hsl(var(--secondary))] rounded-lg">
                                    <div>
                                        <p className="font-medium">Enable Alerts</p>
                                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                            Show real-time risk alerts in the dashboard
                                        </p>
                                    </div>
                                    <div
                                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${config.enable_alerts === 'true' ? 'bg-[hsl(var(--primary))]' : 'bg-gray-300'}`}
                                        onClick={() => handleToggle('enable_alerts')}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${config.enable_alerts === 'true' ? 'right-1' : 'left-1'}`} />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-[hsl(var(--secondary))] rounded-lg">
                                    <div>
                                        <p className="font-medium">Data Sync</p>
                                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                            Automatically sync patient data (demo mode)
                                        </p>
                                    </div>
                                    <div
                                        className={`w-12 h-6 rounded-full relative cursor-pointer transition-colors ${config.data_sync === 'true' ? 'bg-[hsl(var(--primary))]' : 'bg-gray-300'}`}
                                        onClick={() => handleToggle('data_sync')}
                                    >
                                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-200 ${config.data_sync === 'true' ? 'right-1' : 'left-1'}`} />
                                    </div>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-[hsl(var(--secondary))] rounded-lg">
                                    <div>
                                        <p className="font-medium">Reset Session</p>
                                        <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                            Clear your session storage and reload the application. This will log you out.
                                        </p>
                                    </div>
                                    <Button
                                        variant="destructive"
                                        onClick={() => {
                                            sessionStorage.clear();
                                            window.location.reload();
                                        }}
                                    >
                                        <RotateCcw className="w-4 h-4 mr-2" />
                                        Reset All Data
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
