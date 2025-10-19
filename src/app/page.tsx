import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowRight, Ear, Gamepad2, Headphones, Info, SlidersHorizontal } from 'lucide-react';
import AudioDemo from '@/components/AudioDemo';
import { Badge } from '@/components/ui/badge';
import AudioGame from '@/components/AudioGame';

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');
  const headphonesImage = PlaceHolderImages.find(p => p.id === 'large-headphones');
  
  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover opacity-[0.03]"
          priority
        />
      )}
      <div className="relative z-10 flex flex-1 flex-col">
        <Header />
        <main className="flex-1">
          <section className="relative container mx-auto px-4 md:px-6 py-12 md:py-20 text-center overflow-hidden">
             {headphonesImage && (
              <Image 
                src={headphonesImage.imageUrl}
                alt={headphonesImage.description}
                fill
                data-ai-hint={headphonesImage.imageHint}
                className="object-contain object-center opacity-10"
              />
            )}
            <div className="relative z-10 max-w-4xl mx-auto">
                <Badge variant="outline" className="text-sm py-1 px-3 border-primary/50 mb-4 backdrop-blur-sm">
                    <SlidersHorizontal className="mr-2 h-4 w-4 text-primary" />
                    Advanced Spatial Audio
                </Badge>
                <h2 className="text-4xl md:text-6xl font-bold font-headline tracking-tight text-foreground">
                Experience Sound in a New Dimension
                </h2>
                <p className="mt-4 max-w-2xl mx-auto text-lg md:text-xl text-muted-foreground">
                Our tools transform your flat audio into an immersive spatial experience. Hear the difference for yourself.
                </p>
                <div className="mt-10 flex flex-col items-center justify-center">
                    <p className="font-semibold text-primary/90 text-xl backdrop-blur-sm p-2 rounded-lg">
                        <Headphones className="inline-block mr-2 h-6 w-6" />
                        Plug in your headphones for the best experience
                    </p>
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
          </section>

          <section className="container mx-auto px-4 md:px-6 py-12">
             <div className="text-center mb-12 max-w-4xl mx-auto">
                <Badge variant="outline" className="text-lg py-2 px-4 border-primary/50">
                    <Ear className="mr-2 h-5 w-5 text-primary" />
                    Interactive Audio Demo
                </Badge>
                <h3 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-foreground mt-4">
                    From Flat to Full Immersion
                </h3>
                <p className="mt-2 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Use headphones for the best experience. Click play and toggle the switch to instantly compare the original sound with the processed 11D audio.
                </p>
            </div>
            <AudioDemo />
          </section>

          <section id="game" className="container mx-auto px-4 md:px-6 py-12 md:py-20">
             <div className="text-center mb-12 max-w-4xl mx-auto">
                <Badge variant="outline" className="text-lg py-2 px-4 border-accent/50">
                    <Gamepad2 className="mr-2 h-5 w-5 text-accent" />
                    Test Your Ears
                </Badge>
                <h3 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-foreground mt-4">
                    The Spatial Sound Game
                </h3>
                <p className="mt-2 max-w-2xl mx-auto text-lg text-muted-foreground">
                    Can you pinpoint the location of the sound? Put your headphones on, start a round, and click where you think the sound is coming from.
                </p>
            </div>
            <AudioGame />
          </section>

          <section className="container mx-auto px-4 md:px-6 py-20 text-center">
            <div className="max-w-3xl mx-auto">
                <div className="space-y-4">
                    <h3 className="text-3xl md:text-4xl font-bold font-headline tracking-tight text-foreground">
                        Your Audio, Your Space
                    </h3>
                    <p className="text-lg text-muted-foreground">
                        Upload any audio file and apply our unique spatial effects. Choose from presets like 4D, 8D, and 11D, or dive deep with the 'Custom' mode to create your own signature sound.
                    </p>
                    <ul className="inline-grid sm:grid-cols-3 gap-x-8 gap-y-2 text-muted-foreground">
                        <li className="flex items-center justify-center sm:justify-start gap-2"><ArrowRight className="h-4 w-4 text-primary" /> Fine-tune movement</li>
                        <li className="flex items-center justify-center sm:justify-start gap-2"><ArrowRight className="h-4 w-4 text-primary" /> Adjust a 3-band EQ</li>
                         <li className="flex items-center justify-center sm:justify-start gap-2"><ArrowRight className="h-4 w-4 text-primary" /> Control lush reverb</li>
                    </ul>
                     <div className="pt-6">
                        <Button asChild size="lg" className="group">
                            <Link href="/app">
                            Start Creating
                            <ArrowRight className="ml-2 h-5 w-5 transition-transform group-hover:translate-x-1" />
                            </Link>
                        </Button>
                    </div>
                </div>
                 <div className="mt-12 space-y-4 rounded-lg bg-card/20 p-8 border border-accent/20 backdrop-blur-sm max-w-xl mx-auto">
                    <div className='flex items-center justify-center gap-3'>
                      <Info className="h-6 w-6 text-accent" />
                      <h4 className="font-headline text-xl font-bold text-foreground">Pro-Tip: Genre Presets</h4>
                    </div>
                    <p className="text-muted-foreground">
                        Check out the info tab in the header for custom preset suggestions tailored for genres like Hip Hop, Rock, Classical, and Electronic music to get the perfect starting point for your track.
                    </p>
                </div>
            </div>
          </section>

        </main>
        <Footer />
      </div>
    </div>
  );
}
