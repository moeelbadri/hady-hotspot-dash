'use client';

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/lib/theme-provider';
import { useLanguage } from '@/lib/language-provider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function ThemeDemo() {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
        <Card>
          <CardHeader>
            <CardTitle>Theme Settings</CardTitle>
            <CardDescription>
              Loading theme configuration...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Language Settings</CardTitle>
            <CardDescription>
              Loading language configuration...
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="animate-pulse">
              <div className="h-4 bg-muted rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-muted rounded w-1/3"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Theme Settings</CardTitle>
          <CardDescription>
            Current theme configuration and browser storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Theme:</p>
            <p className="font-medium">{theme}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Resolved Theme:</p>
            <p className="font-medium">{resolvedTheme}</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`px-3 py-1 rounded text-sm ${
                theme === 'light' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`px-3 py-1 rounded text-sm ${
                theme === 'dark' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              Dark
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`px-3 py-1 rounded text-sm ${
                theme === 'system' ? 'bg-primary text-primary-foreground' : 'bg-secondary'
              }`}
            >
              System
            </button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Language Settings</CardTitle>
          <CardDescription>
            Current language configuration and browser storage
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Current Language:</p>
            <p className="font-medium">{language}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Browser Storage:</p>
            <p className="text-xs text-muted-foreground">
              Theme: {localStorage.getItem('theme') || 'system'}
            </p>
            <p className="text-xs text-muted-foreground">
              Language: {localStorage.getItem('language') || 'en'}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
