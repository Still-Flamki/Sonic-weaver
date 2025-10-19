import { Info, Music4 } from 'lucide-react';
import Link from 'next/link';
import { InfoModal } from '../InfoModal';
import { Button } from '../ui/button';

export function Header() {
  return (
    <header className="py-6 px-4 md:px-6">
      <div className="container mx-auto flex items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-4">
          <div className="p-2 bg-primary/20 border border-primary/50 rounded-lg">
            <Music4 className="text-primary h-6 w-6" />
          </div>
          <h1 className="text-2xl md:text-3xl font-headline font-bold text-foreground">
            Sonic Weaver
          </h1>
        </Link>
        <InfoModal>
           <Button variant="outline" size="icon">
                <Info className="h-5 w-5" />
                <span className="sr-only">About Effects</span>
            </Button>
        </InfoModal>
      </div>
    </header>
  );
}
