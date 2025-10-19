'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const themes = [
  { name: 'Dark', value: 'dark', bg: 'hsl(224 71.4% 4.1%)' },
  { name: 'Light', value: 'light', bg: 'hsl(0 0% 100%)' },
  { name: 'Fire & Gold', value: 'theme-fire-gold', bg: 'linear-gradient(135deg, hsl(35, 95%, 55%), hsl(5, 80%, 50%))' },
  { name: 'Ocean & Sky', value: 'theme-ocean-sky', bg: 'linear-gradient(135deg, hsl(195, 90%, 50%), hsl(220, 40%, 25%))' },
  { name: 'Earth & Sky', value: 'theme-earth-sky', bg: 'linear-gradient(135deg, hsl(95, 60%, 45%), hsl(30, 30%, 30%))' },
  { name: 'Hell & Heaven', value: 'theme-hell-heaven', bg: 'linear-gradient(135deg, hsl(0, 90%, 55%), hsl(45, 100%, 90%))' },
  { name: 'Silver', value: 'theme-silver', bg: 'linear-gradient(135deg, hsl(220, 15%, 75%), hsl(220, 10%, 25%))' },
];

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { setTheme, resolvedTheme } = useTheme();

  // useEffect only runs on the client, so we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // On the server or during hydration, render a placeholder to avoid layout shift
    return <div className="h-6 w-full max-w-[200px] animate-pulse rounded-full bg-muted/50" />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-2">
        {themes.map((t) => (
          <Tooltip key={t.value}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(t.value)}
                className={cn(
                  'h-6 w-6 rounded-full border-2 transition-all hover:scale-110',
                  resolvedTheme === t.value ? 'scale-110 border-primary' : 'border-transparent'
                )}
                style={{
                  background: t.bg
                }}
                aria-label={`Switch to ${t.name} theme`}
              >
                 <div className={cn("h-full w-full rounded-full", (t.value === 'dark' || t.value === 'light') ? 'border border-foreground/30' : '')}/>
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{t.name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </TooltipProvider>
  );
}
