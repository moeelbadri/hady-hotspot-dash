'use client';

import React from 'react';
import { ThemeProvider } from '@/lib/theme-provider';
import { LanguageProvider } from '@/lib/language-provider';
import { QueryProvider } from '@/components/QueryProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

export function Providers({ children }: ProvidersProps) {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <QueryProvider>
          {children}
        </QueryProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

