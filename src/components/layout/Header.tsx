import { Info, Music4 } from 'lucide-react';
import Link from 'next/link';
import { InfoModal } from '../InfoModal';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';

export function Header() {
  return (
    <header className="py-6 px-4 md:px-6">
      <div className="container mx-auto flex flex-col items-center justify-between gap-6">
        <div className="flex w-full items-center justify-between">
          <Link href="/" className="flex items-center gap-4 group">
            <div className="p-2 bg-primary/20 border border-primary/50 rounded-lg group-hover:bg-primary/30 transition-colors">
              <Music4 className="text-primary h-6 w-6" />
            </div>
            <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground">
              Sonic Weaver
            </h1>
          </Link>
          <div className="flex items-center gap-2">
              <InfoModal>
                 <Button variant="outline" size="icon">
                      <Info className="h-5 w-5" />
                      <span className="sr-only">About Effects</span>
                  </Button>
              </InfoModal>
          </div>
        </div>
        <Separator />
      </div>
    </header>
  );
}
