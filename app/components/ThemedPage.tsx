'use client';

import { useEffect, useState } from 'react';

export default function ThemedPage({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // Listen for storage changes to sync theme across tabs and updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const newTheme = e.newValue as 'light' | 'dark' | null;
        setTheme(newTheme || 'dark');
      }
    };

    // Listen for custom theme change event (for same-tab updates)
    const handleThemeChange = (e: CustomEvent) => {
      setTheme(e.detail.theme);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('themeChange' as any, handleThemeChange as any);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('themeChange' as any, handleThemeChange as any);
    };
  }, []);

  return (
    <div className={theme === 'dark' ? 'dark' : ''}>
      {children}
    </div>
  );
}
