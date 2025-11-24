'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, LogOut, Save, User, Mail } from 'lucide-react';

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [defaultMidWeightage, setDefaultMidWeightage] = useState('25');
  const [defaultFinalWeightage, setDefaultFinalWeightage] = useState('40');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Load default weightages from localStorage
    const savedMidWeightage = localStorage.getItem('defaultMidWeightage');
    const savedFinalWeightage = localStorage.getItem('defaultFinalWeightage');
    if (savedMidWeightage) setDefaultMidWeightage(savedMidWeightage);
    if (savedFinalWeightage) setDefaultFinalWeightage(savedFinalWeightage);
  }, []);

  const handleSaveDefaultWeightages = () => {
    const mid = parseFloat(defaultMidWeightage);
    const final = parseFloat(defaultFinalWeightage);

    if (isNaN(mid) || isNaN(final)) {
      setSettingsError('Please enter valid numbers');
      return;
    }

    if (mid < 0 || final < 0 || mid > 100 || final > 100) {
      setSettingsError('Weightages must be between 0 and 100');
      return;
    }

    localStorage.setItem('defaultMidWeightage', defaultMidWeightage);
    localStorage.setItem('defaultFinalWeightage', defaultFinalWeightage);
    setSettingsSuccess('Default weightages saved successfully!');
    setSettingsError('');

    setTimeout(() => setSettingsSuccess(''), 3000);
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setPasswordSuccess('Password changed successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setTimeout(() => setPasswordSuccess(''), 3000);
      } else {
        setPasswordError(data.error || 'Failed to change password');
      }
    } catch (err) {
      setPasswordError('An error occurred while changing password');
    } finally {
      setLoading(false);
    }
  };

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 backdrop-blur-md border-b bg-background/80">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Image
                  src="/ulab.svg"
                  alt="ULAB Logo"
                  width={50}
                  height={50}
                  className="drop-shadow-lg cursor-pointer"
                />
              </Link>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                  ⚙️ Settings
                </h1>
                <p className="text-xs text-muted-foreground">
                  Manage your preferences
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" asChild>
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Dashboard
                </Link>
              </Button>
              <Button
                variant="destructive"
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4 pt-8">

        {/* Default Weightages */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Default Exam Weightages</CardTitle>
            <CardDescription>
              These values will be used as defaults when creating new Mid-term and Final exams
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {settingsError && (
              <Alert variant="destructive">
                <AlertDescription>{settingsError}</AlertDescription>
              </Alert>
            )}

            {settingsSuccess && (
              <Alert className="border-green-500 bg-green-500/10">
                <AlertDescription className="text-green-600 dark:text-green-400">
                  {settingsSuccess}
                </AlertDescription>
              </Alert>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="mid-weightage">Default Mid-term Weightage (%)</Label>
                <Input
                  id="mid-weightage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={defaultMidWeightage}
                  onChange={(e) => setDefaultMidWeightage(e.target.value)}
                  placeholder="e.g., 30"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="final-weightage">Default Final Weightage (%)</Label>
                <Input
                  id="final-weightage"
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={defaultFinalWeightage}
                  onChange={(e) => setDefaultFinalWeightage(e.target.value)}
                  placeholder="e.g., 50"
                />
              </div>
            </div>

            <Button onClick={handleSaveDefaultWeightages}>
              <Save className="h-4 w-4 mr-2" />
              Save Weightages
            </Button>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Change Password</CardTitle>
            <CardDescription>
              Update your account password
            </CardDescription>
          </CardHeader>
          <CardContent>
            {passwordError && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{passwordError}</AlertDescription>
              </Alert>
            )}

            {passwordSuccess && (
              <Alert className="mb-4 border-green-500 bg-green-500/10">
                <AlertDescription className="text-green-600 dark:text-green-400">
                  {passwordSuccess}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="current-password">Current Password</Label>
                <Input
                  id="current-password"
                  type="password"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">New Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password (min 6 characters)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Confirm New Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                />
              </div>

              <Button type="submit" disabled={loading}>
                {loading ? 'Changing...' : 'Change Password'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>
              Your account details
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="font-medium">{session?.user?.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <User className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="font-medium">{session?.user?.name}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
