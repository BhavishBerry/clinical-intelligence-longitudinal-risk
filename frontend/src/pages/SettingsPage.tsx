import { MainLayout } from '@/components/layout';
import { Card, CardContent, CardHeader, CardTitle, Badge, Button } from '@/components/ui';
import { mockUsers } from '@/mocks/mockUsers';
import { Users, Settings as SettingsIcon, RotateCcw } from 'lucide-react';

export function SettingsPage() {
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
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                            Demo users with hardcoded credentials for testing:
                        </p>

                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4">Name</th>
                                        <th className="text-left py-3 px-4">Email</th>
                                        <th className="text-left py-3 px-4">Password</th>
                                        <th className="text-left py-3 px-4">Role</th>
                                        <th className="text-left py-3 px-4">Assigned Patients</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {mockUsers.map((user) => (
                                        <tr key={user.id} className="border-b hover:bg-[hsl(var(--accent))]">
                                            <td className="py-3 px-4 font-medium">{user.name}</td>
                                            <td className="py-3 px-4 text-[hsl(var(--muted-foreground))]">{user.email}</td>
                                            <td className="py-3 px-4">
                                                <code className="px-2 py-1 bg-[hsl(var(--secondary))] rounded text-xs">
                                                    {user.password}
                                                </code>
                                            </td>
                                            <td className="py-3 px-4">
                                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                                    {user.role}
                                                </Badge>
                                            </td>
                                            <td className="py-3 px-4 text-[hsl(var(--muted-foreground))]">
                                                {user.role === 'admin' ? 'All patients' : user.assignedPatientIds.length}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
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
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-[hsl(var(--secondary))] rounded-lg">
                                <div>
                                    <p className="font-medium">Enable Alerts</p>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                        Show real-time risk alerts in the dashboard
                                    </p>
                                </div>
                                <div className="w-12 h-6 bg-[hsl(var(--primary))] rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[hsl(var(--secondary))] rounded-lg">
                                <div>
                                    <p className="font-medium">Data Sync</p>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                        Automatically sync patient data (demo mode)
                                    </p>
                                </div>
                                <div className="w-12 h-6 bg-[hsl(var(--primary))] rounded-full relative cursor-pointer">
                                    <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-[hsl(var(--secondary))] rounded-lg">
                                <div>
                                    <p className="font-medium">High Risk Threshold</p>
                                    <p className="text-sm text-[hsl(var(--muted-foreground))]">
                                        Risk score above which alerts are triggered
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        defaultValue={70}
                                        className="w-16 px-2 py-1 border rounded text-center"
                                        min={0}
                                        max={100}
                                    />
                                    <span className="text-sm text-[hsl(var(--muted-foreground))]">/ 100</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                {/* Reset Section */}
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-2">
                            <RotateCcw className="w-5 h-5" />
                            <CardTitle>Reset Demo Data</CardTitle>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                            Reset all mock data to its initial state. This will clear any acknowledged alerts and feedback.
                        </p>
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
                    </CardContent>
                </Card>
            </div>
        </MainLayout>
    );
}
