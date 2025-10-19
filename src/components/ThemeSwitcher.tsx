'use client';

import { useTheme } from 'next-themes';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const themes = [
  { name: 'Default', value: 'dark' },
  { name: 'Light', value: 'light' },
  { name: 'Fire & Gold', value: 'theme-fire-gold' },
  { name: 'Ocean & Sky', value: 'theme-ocean-sky' },
  { name: 'Earth & Sky', value: 'theme-earth-sky' },
  { name: 'Hell & Heaven', value: 'theme-hell-heaven' },
  { name: 'Silver', value: 'theme-silver' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {themes.map((t) => (
        <Button
          key={t.value}
          variant={theme === t.value ? 'default' : 'outline'}
          size="sm"
          onClick={() => setTheme(t.value)}
          className="transition-all"
        >
          {t.name}
        </Button>
      ))}
    </div>
  );
}
