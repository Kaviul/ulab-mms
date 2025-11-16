'use client';

import { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';

export default function SettingsPage() {
  const { data: session } = useSession();
  const router = useRouter();
  
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
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
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
      applyTheme(savedTheme);
    }

    // Load default weightages from localStorage
    const savedMidWeightage = localStorage.getItem('defaultMidWeightage');
    const savedFinalWeightage = localStorage.getItem('defaultFinalWeightage');
    if (savedMidWeightage) setDefaultMidWeightage(savedMidWeightage);
    if (savedFinalWeightage) setDefaultFinalWeightage(savedFinalWeightage);
  }, []);

  const applyTheme = (newTheme: 'light' | 'dark') => {
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleThemeToggle = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
    
    // Dispatch custom event for same-tab updates
    window.dispatchEvent(new CustomEvent('themeChange', { detail: { theme: newTheme } }));
  };

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
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900 flex items-center justify-center">
        <div className="text-gray-400 text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-200 ${
      theme === 'dark' 
        ? 'bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900' 
        : 'bg-gradient-to-br from-gray-100 via-slate-100 to-gray-100'
    }`}>
      {/* Navbar */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b transition-colors ${
        theme === 'dark'
          ? 'bg-gray-900/80 border-gray-700'
          : 'bg-white/80 border-gray-300'
      }`}>
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
                <h1 className={`text-2xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent`}>
                  ⚙️ Settings
                </h1>
                <p className={`text-xs ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                  Manage your preferences
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Link
                href="/dashboard"
                className={`px-4 py-2 rounded-lg transition-all font-medium text-sm ${
                  theme === 'dark'
                    ? 'bg-gray-700 hover:bg-gray-600 text-white'
                    : 'bg-gray-300 hover:bg-gray-400 text-gray-900'
                }`}
              >
                ← Dashboard
              </Link>
              <button
                onClick={() => signOut({ callbackUrl: '/auth/signin' })}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all font-medium text-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto p-4 pt-8">
        {/* Theme Settings */}
        <div className={`rounded-xl shadow-2xl p-6 mb-6 border transition-colors ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700/50'
            : 'bg-white border-gray-300'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-gray-100' : 'text-gray-800'
          }`}>
            <span className="w-1 h-6 bg-gradient-to-b from-blue-500 to-cyan-500 rounded-full"></span>
            Appearance
          </h2>
          
          <div className="flex items-center justify-between">
            <div>
              <div className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                Theme
              </div>
              <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-700'}`}>
                Switch between light and dark mode
              </div>
            </div>
            
            <button
              onClick={handleThemeToggle}
              className={`relative inline-flex h-12 w-24 items-center rounded-full transition-colors ${
                theme === 'dark' ? 'bg-blue-600' : 'bg-gray-300'
              }`}
            >
              <span
                className={`inline-block h-10 w-10 transform rounded-full bg-white shadow-lg transition-transform ${
                  theme === 'dark' ? 'translate-x-12' : 'translate-x-1'
                }`}
              >
                <span className="flex items-center justify-center h-full text-2xl">
                  {theme === 'dark' ? '🌙' : '☀️'}
                </span>
              </span>
            </button>
          </div>
        </div>

        {/* Default Weightages */}
        <div className={`rounded-xl shadow-2xl p-6 mb-6 border transition-colors ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700/50'
            : 'bg-white border-gray-300'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
          }`}>
            <span className="w-1 h-6 bg-gradient-to-b from-emerald-500 to-cyan-500 rounded-full"></span>
            Default Exam Weightages
          </h2>

          {settingsError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {settingsError}
            </div>
          )}

          {settingsSuccess && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm">
              {settingsSuccess}
            </div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Default Mid-term Weightage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={defaultMidWeightage}
                  onChange={(e) => setDefaultMidWeightage(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                  placeholder="e.g., 30"
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Default Final Weightage (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  value={defaultFinalWeightage}
                  onChange={(e) => setDefaultFinalWeightage(e.target.value)}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                    theme === 'dark'
                      ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500'
                      : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                  }`}
                  placeholder="e.g., 50"
                />
              </div>
            </div>

            <div className={`text-sm ${theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}`}>
              These values will be used as defaults when creating new Mid-term and Final exams.
            </div>

            <button
              onClick={handleSaveDefaultWeightages}
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all shadow-lg font-medium"
            >
              Save Weightages
            </button>
          </div>
        </div>

        {/* Password Change */}
        <div className={`rounded-xl shadow-2xl p-6 mb-6 border transition-colors ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700/50'
            : 'bg-white border-gray-300'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
          }`}>
            <span className="w-1 h-6 bg-gradient-to-b from-purple-500 to-pink-500 rounded-full"></span>
            Change Password
          </h2>

          {passwordError && (
            <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-300 text-sm">
              {passwordError}
            </div>
          )}

          {passwordSuccess && (
            <div className="mb-4 p-3 bg-green-900/30 border border-green-700 rounded-lg text-green-300 text-sm">
              {passwordSuccess}
            </div>
          )}

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Current Password
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="Enter current password"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                New Password
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="Enter new password (min 6 characters)"
              />
            </div>

            <div>
              <label className={`block text-sm font-medium mb-2 ${
                theme === 'dark' ? 'text-gray-300' : 'text-gray-700'
              }`}>
                Confirm New Password
              </label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  theme === 'dark'
                    ? 'bg-gray-900 border-gray-600 text-gray-100 placeholder-gray-500'
                    : 'bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
                placeholder="Confirm new password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-lg hover:from-purple-700 hover:to-purple-800 transition-all shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Changing...' : 'Change Password'}
            </button>
          </form>
        </div>

        {/* Account Info */}
        <div className={`rounded-xl shadow-2xl p-6 border transition-colors ${
          theme === 'dark'
            ? 'bg-gradient-to-br from-gray-800 to-gray-800/80 border-gray-700/50'
            : 'bg-white border-gray-300'
        }`}>
          <h2 className={`text-xl font-semibold mb-4 flex items-center gap-2 ${
            theme === 'dark' ? 'text-gray-100' : 'text-gray-900'
          }`}>
            <span className="w-1 h-6 bg-gradient-to-b from-cyan-500 to-blue-500 rounded-full"></span>
            Account Information
          </h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between py-2">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Email</span>
              <span className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                {session?.user?.email}
              </span>
            </div>
            <div className="flex items-center justify-between py-2">
              <span className={theme === 'dark' ? 'text-gray-400' : 'text-gray-600'}>Name</span>
              <span className={`font-medium ${theme === 'dark' ? 'text-gray-200' : 'text-gray-800'}`}>
                {session?.user?.name}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
