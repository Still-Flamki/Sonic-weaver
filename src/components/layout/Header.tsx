import { Music4 } from 'lucide-react';

export function Header() {
  return (
    <header className="py-6 px-4 md:px-6">
      <div className="container mx-auto flex items-center gap-4">
        <div className="p-2 bg-primary/20 border border-primary/50 rounded-lg">
          <Music4 className="text-primary h-6 w-6" />
        </div>
        <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground">
          Sonic Weaver
        </h1>
      </div>
    </header>
  );
}
