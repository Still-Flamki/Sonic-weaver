'use client';

import { useState, useEffect } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const themes = [
  { name: 'Dark', value: 'dark' },
  { name: 'Light', value: 'light' },
  { name: 'Fire & Gold', value: 'theme-fire-gold' },
  { name: 'Ocean & Sky', value: 'theme-ocean-sky' },
  { name: 'Earth & Sky', value: 'theme-earth-sky' },
  { name: 'Hell & Heaven', value: 'theme-hell-heaven' },
  { name: 'Silver', value: 'theme-silver' },
];

export function ThemeSwitcher() {
  const [mounted, setMounted] = useState(false);
  const { theme, setTheme, resolvedTheme } = useTheme();

  // useEffect only runs on the client, so now we can safely show the UI
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    // Return a placeholder or null to avoid hydration mismatch
    return <div className="h-6 w-full max-w-[200px] animate-pulse rounded-full bg-muted/50" />;
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex items-center gap-2">
        {themes.map((t) => {
           const isActive = resolvedTheme === t.value;
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
                  '--theme-bg': `var(--${t.value}-bg, hsl(var(--background)))`,
                  '--theme-fg': `var(--${t.value}-fg, hsl(var(--foreground)))`,
                  '--theme-primary': `var(--${t.value}-primary, hsl(var(--primary)))`,
                  background: `hsl(var(--${t.value === 'dark' || t.value === 'light' ? 'background' : t.value + '-bg'}))`,
                  borderColor: isActive ? `hsl(var(--${t.value === 'dark' || t.value === 'light' ? 'primary' : t.value + '-primary'}))` : 'transparent'
                }}
                aria-label={`Switch to ${t.name} theme`}
              >
                 <div className={cn("h-full w-full rounded-full", !isActive && "border-2 border-background/50")}/>
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
