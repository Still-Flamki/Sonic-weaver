'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const themes = [
  { name: 'Dark', value: 'dark', bg: 'hsl(var(--background))' },
  { name: 'Light', value: 'light', bg: 'hsl(var(--background))' },
  { name: 'Fire & Gold', value: 'theme-fire-gold', bg: 'linear-gradient(135deg, hsl(35, 95%, 55%), hsl(5, 80%, 50%))' },
  { name: 'Ocean & Sky', value: 'theme-ocean-sky', bg: 'linear-gradient(135deg, hsl(195, 90%, 50%), hsl(220, 40%, 25%))' },
  { name: 'Earth & Sky', value: 'theme-earth-sky', bg: 'linear-gradient(135deg, hsl(95, 60%, 45%), hsl(30, 30%, 30%))' },
  { name: 'Hell & Heaven', value: 'theme-hell-heaven', bg: 'linear-gradient(135deg, hsl(0, 90%, 55%), hsl(45, 100%, 90%))' },
  { name: 'Silver', value: 'theme-silver', bg: 'linear-gradient(135deg, hsl(220, 15%, 75%), hsl(220, 10%, 25%))' },
];

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Render a placeholder on the server and during hydration to avoid mismatch
    return <div className="h-6 w-full max-w-[200px] animate-pulse rounded-full bg-muted/50" />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-2">
        {themes.map((t) => {
           const isActive = theme === t.value || resolvedTheme === t.value;
          return (
          <Tooltip key={t.value}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(t.value)}
                className={cn(
                  'h-6 w-6 rounded-full border-2 transition-all hover:scale-110',
                  isActive ? 'scale-110 border-primary' : 'border-transparent'
                )}
                style={{
                  background: t.value === 'dark' || t.value === 'light' ? (t.bg) : t.bg,
                }}
                aria-label={`Switch to ${t.name} theme`}
              >
                 <div className={cn("h-full w-full rounded-full", t.value === 'dark' || t.value === 'light' ? 'border-2 border-foreground/30' : '')}/>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t.name}</p>
            </TooltipContent>
          </Tooltip>
        )})}
      </div>
    </TooltipProvider>
  );
}
