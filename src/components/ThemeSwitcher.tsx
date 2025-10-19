'use client';

import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const themes = [
  { name: 'Default', value: 'dark', style: { background: 'linear-gradient(to right, hsl(224 71.4% 4.1%), hsl(217 91% 60%))' } },
  { name: 'Light', value: 'light', style: { background: 'linear-gradient(to right, hsl(0 0% 100%), hsl(222.2 47.4% 11.2%))' } },
  { name: 'Fire & Gold', value: 'theme-fire-gold', style: { background: 'linear-gradient(to right, hsl(35 95% 55%), hsl(5 80% 50%))' } },
  { name: 'Ocean & Sky', value: 'theme-ocean-sky', style: { background: 'linear-gradient(to right, hsl(195 90% 50%), hsl(180 80% 40%))' } },
  { name: 'Earth & Sky', value: 'theme-earth-sky', style: { background: 'linear-gradient(to right, hsl(95 60% 45%), hsl(180 40% 70%))' } },
  { name: 'Hell & Heaven', value: 'theme-hell-heaven', style: { background: 'linear-gradient(to right, hsl(0 90% 55%), hsl(45 100% 90%))' } },
  { name: 'Silver', value: 'theme-silver', style: { background: 'linear-gradient(to right, hsl(220 15% 75%), hsl(220 10% 25%))' } },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  return (
    <TooltipProvider>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {themes.map((t) => (
          <Tooltip key={t.value}>
            <TooltipTrigger asChild>
              <button
                onClick={() => setTheme(t.value)}
                className={cn(
                  "h-6 w-6 rounded-full border-2 transition-all hover:scale-110",
                  theme === t.value ? 'border-primary' : 'border-transparent'
                )}
                style={t.style}
                aria-label={`Switch to ${t.name} theme`}
              />
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
