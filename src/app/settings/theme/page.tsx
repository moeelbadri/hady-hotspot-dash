'use client';

import React from 'react';
import { ThemeDemo } from '@/components/theme-demo';
import { ThemeToggle } from '@/components/theme-toggle';
import { LanguageSelector } from '@/components/language-selector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export default function ThemeSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-foreground">Theme & Language Settings</h1>
            </div>
            <div className="flex items-center space-x-4">
              <LanguageSelector />
              <ThemeToggle />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground mb-2">Theme & Language Configuration</h2>
            <p className="text-muted-foreground">
              Configure your preferred theme and language settings. These preferences are stored in your browser's local storage.
            </p>
          </div>

          <ThemeDemo />

          <Card>
            <CardHeader>
              <CardTitle>Quick Controls</CardTitle>
              <CardDescription>
                Use these controls to quickly change your theme and language preferences
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">Theme:</span>
                    <ThemeToggle />
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">Language:</span>
                    <LanguageSelector />
                  </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Browser Storage Information</CardTitle>
              <CardDescription>
                Information about how your preferences are stored
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <p><strong>Storage Type:</strong> localStorage</p>
                <p><strong>Theme Key:</strong> 'theme'</p>
                <p><strong>Language Key:</strong> 'language'</p>
                <p><strong>Persistence:</strong> Settings persist across browser sessions</p>
                <p><strong>Scope:</strong> Settings are per-domain</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

