import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import AudioDemo from '@/components/AudioDemo';

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover opacity-[0.03]"
          priority
          data-ai-hint={heroImage.imageHint}
        />
      )}
      <div className="relative z-10 flex flex-1 flex-col">
        <Header />
        <main className="flex-1">
          <div className="container mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
            <h2 className="text-4xl md:text-6xl font-bold font-headline tracking-tight text-foreground">
              Experience Sound in a New Dimension
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
              Our AI-powered tools transform your flat audio into an immersive spatial experience. Hear the difference for yourself.
            </p>
            <div className="mt-8">
              <AudioDemo />
            </div>
            <div className="mt-12">
              <Button asChild size="lg" className="group">
                <Link href="/app">
                  Launch App
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
