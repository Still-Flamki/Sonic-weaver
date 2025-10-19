import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import Image from 'next/image';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import dynamic from 'next/dynamic';

const SonicWeaverApp = dynamic(() => import('@/components/SonicWeaverApp'), {
  ssr: false,
  loading: () => <div className="flex-1 flex items-center justify-center"><p>Loading App...</p></div>
});


export default function AppPage() {
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
