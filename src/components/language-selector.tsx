'use client';

import React from 'react';
import { useLanguage, supportedLanguages } from '@/lib/language-provider';
import { Button } from '@/components/ui/button';
import { 
  Languages,
  Check
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export function LanguageSelector() {
  const { language, setLanguage } = useLanguage();

  // Safety check for language
  const currentLanguage = supportedLanguages[language] || supportedLanguages['en'];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon">
          <Languages className="h-4 w-4" />
          <span className="sr-only">Select language</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {Object.entries(supportedLanguages).map(([code, lang]) => (
          <DropdownMenuItem
            key={code}
            onClick={() => setLanguage(code as keyof typeof supportedLanguages)}
            className="flex items-center gap-2"
          >
            <span className="text-lg">{lang.flag}</span>
            <span>{lang.nativeName}</span>
            {language === code && <Check className="h-4 w-4 ml-auto" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Simple language display for showing current language
export function LanguageDisplay() {
  const { language } = useLanguage();
  const currentLanguage = supportedLanguages[language] || supportedLanguages['en'];

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <span className="text-lg">{currentLanguage.flag}</span>
      <span>{currentLanguage.nativeName}</span>
    </div>
  );
}
