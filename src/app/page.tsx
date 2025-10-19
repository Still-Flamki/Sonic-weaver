import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Ear } from 'lucide-react';
import AudioDemo from '@/components/AudioDemo';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
          <section className="container mx-auto px-4 md:px-6 py-12 md:py-20 text-center">
            <h2 className="text-4xl md:text-6xl font-bold font-headline tracking-tight text-foreground">
              Experience Sound in a New Dimension
            </h2>
            <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
              Our AI-powered tools transform your flat audio into an immersive spatial experience. Hear the difference for yourself.
            </p>
             <div className="mt-12">
              <Button asChild size="lg" className="group">
                <Link href="/app">
                  Launch App
                  <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>
          </section>

          <section className="container mx-auto px-4 md:px-6 py-12">
             <div className="text-center mb-12">
                <Badge variant="outline" className="text-lg py-2 px-4 border-primary/50">
                    <Ear className="mr-2 h-5 w-5 text-primary" />
                    Interactive Audio Demo
                </Badge>
                <h3 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-foreground mt-4">
                    From Flat to Full Immersion
                </h3>
                <p className="mt-2 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Use headphones for the best experience. Click play on both cards to instantly compare the original mono sound with the processed 11D audio.
                </p>
            </div>
            <AudioDemo />
          </section>

          <section className="container mx-auto px-4 md:px-6 py-20">
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-4">
                    <h3 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-foreground">
                        Your Audio, Your Space
                    </h3>
                    <p className="text-lg text-muted-foreground">
                        Upload any audio file and apply our unique spatial effects. Choose from presets like 4D, 8D, and 11D, or dive deep with the 'Custom' mode to create your own signature sound.
                    </p>
                    <ul className="space-y-2 text-muted-foreground">
                        <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> Fine-tune movement, speed, and width.</li>
                        <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> Adjust a 3-band EQ for tonal balance.</li>
                         <li className="flex items-center gap-2"><ArrowRight className="h-4 w-4 text-primary" /> Control the amount of lush reverb.</li>
                    </ul>
                     <div className="pt-4">
                        <Button asChild size="lg" className="group">
                            <Link href="/app">
                            Start Creating
                            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    </div>
                </div>
                 <div>
                    {/* This space is intentionally left blank to balance the layout, as requested. */}
                </div>
            </div>
          </section>

        </main>
        <Footer />
      </div>
    </div>
  );
}
