import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import SonicWeaverApp from '@/components/SonicWeaverApp';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function Home() {
  const heroImage = PlaceHolderImages.find(p => p.id === 'hero-background');

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {heroImage && (
        <Image
          src={heroImage.imageUrl}
          alt={heroImage.description}
          fill
          className="object-cover opacity-5 dark:opacity-[0.03]"
          priority
          data-ai-hint={heroImage.imageHint}
        />
      )}
      <div className="relative z-10 flex flex-1 flex-col">
        <Header />
        <main className="flex-1">
          <SonicWeaverApp />
        </main>
        <Footer />
      </div>
    </div>
  );
}
