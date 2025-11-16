'use client';

import { useEffect, useState } from 'react';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    
    // Load theme from localStorage on mount
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const theme = savedTheme || 'dark'; // Default to dark if not set
    
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.body.classList.remove('bg-gray-100');
      document.body.classList.add('bg-gray-900');
    } else {
      document.documentElement.classList.remove('dark');
      document.body.classList.remove('bg-gray-900');
      document.body.classList.add('bg-gray-100');
    }

    // Listen for storage changes to sync theme across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'theme') {
        const newTheme = e.newValue as 'light' | 'dark' | null;
        if (newTheme === 'dark') {
          document.documentElement.classList.add('dark');
          document.body.classList.remove('bg-gray-100');
          document.body.classList.add('bg-gray-900');
        } else {
          document.documentElement.classList.remove('dark');
          document.body.classList.remove('bg-gray-900');
          document.body.classList.add('bg-gray-100');
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // Prevent flash of unstyled content
  if (!mounted) {
    return <>{children}</>;
  }

  return <>{children}</>;
}
