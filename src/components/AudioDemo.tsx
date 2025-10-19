'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, RotateCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import Image from 'next/image';

let audioContext: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let pannerNode: PannerNode | null = null;
let gainNode: GainNode | null = null;

export default function AudioDemo() {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [activePlayer, setActivePlayer] = useState<'before' | 'after' | null>(null);
  const buffer = useRef<AudioBuffer | null>(null);
  const animationFrameRef = useRef<number>();
  const { toast } = useToast();
  const demoImage = PlaceHolderImages.find(p => p.id === 'demo-cover');

  useEffect(() => {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error('Web Audio API is not supported in this browser.');
      }
    }

    return () => {
      stopPreview();
      audioContext?.close();
      audioContext = null;
    };
  }, []);

  const loadDemoFile = async () => {
    if (buffer.current || isLoading) return;

    setIsLoading(true);
    toast({ title: 'Loading Demo Track...' });

    try {
      const response = await fetch('/demo-track.mp3');
      if (!response.ok) {
        throw new Error('Demo track not found. Please add a `demo-track.mp3` file to the `public` folder.');
      }
      const arrayBuffer = await response.arrayBuffer();
      if (audioContext) {
        buffer.current = await audioContext.decodeAudioData(arrayBuffer);
        setIsReady(true);
        toast({ title: 'Demo Ready!', description: 'Press play to hear the difference.' });
      }
    } catch (e: any) {
      console.error('Failed to load demo audio:', e);
      toast({
        title: 'Error Loading Demo',
        description: e.message || 'Could not load the demo audio file.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getAnimationPath = (time: number) => {
    const radius = 3;
    const duration = 8;
    const angle8d = (time / duration) * 2 * Math.PI;
    const x = Math.sin(angle8d) * radius;
    const z = Math.cos(angle8d) * radius;
    const distance = Math.sqrt(x * x + z * z);
    const gain = 1 - distance / (radius * 2);
    return { x, y: 0, z, gain };
  };

  const startSpatialAnimation = () => {
    if (!audioContext || !pannerNode || !gainNode) return;

    const p = pannerNode;
    const g = gainNode;
    p.connect(audioContext.destination);
    gainNode.connect(p);

    const startTime = audioContext.currentTime;

    const animate = () => {
      if (!audioContext || !p.positionX || !g.gain) {
        animationFrameRef.current = undefined;
        return;
      }

      const time = audioContext.currentTime - startTime;
      const { x, y, z, gain: newGain } = getAnimationPath(time);

      p.positionX.linearRampToValueAtTime(x, audioContext.currentTime + 0.05);
      p.positionY.linearRampToValueAtTime(y, audioContext.currentTime + 0.05);
      p.positionZ.linearRampToValueAtTime(z, audioContext.currentTime + 0.05);
      g.gain.linearRampToValueAtTime(newGain, audioContext.currentTime + 0.05);

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  const playPreview = async (type: 'before' | 'after') => {
    if (!buffer.current || !audioContext) return;

    stopPreview();
    setActivePlayer(type);
    await audioContext.resume();

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = buffer.current;
    sourceNode.loop = true;

    gainNode = audioContext.createGain();
    sourceNode.connect(gainNode);

    if (type === 'after') {
      pannerNode = audioContext.createPanner();
      pannerNode.panningModel = 'HRTF';
      pannerNode.distanceModel = 'inverse';
      if (audioContext.listener.positionX) {
        audioContext.listener.positionX.value = 0;
        audioContext.listener.positionY.value = 0;
        audioContext.listener.positionZ.value = 0;
      } else {
        audioContext.listener.setPosition(0, 0, 0);
      }
      startSpatialAnimation();
    } else {
      gainNode.connect(audioContext.destination);
    }

    sourceNode.start(0);
    setIsPlaying(true);
  };

  const stopPreview = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    if (sourceNode) {
      try {
        sourceNode.stop(0);
        sourceNode.disconnect();
      } catch (e) { /* Already stopped */ }
      sourceNode = null;
    }
    gainNode?.disconnect();
    pannerNode?.disconnect();
    setIsPlaying(false);
    setActivePlayer(null);
  };

  const togglePlay = (type: 'before' | 'after') => {
    if (!isReady) {
      loadDemoFile();
      return;
    }
    if (isPlaying && activePlayer === type) {
      stopPreview();
    } else {
      playPreview(type);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
      <DemoPlayerCard
        title="Before"
        description="Original Stereo Audio"
        isPlaying={isPlaying && activePlayer === 'before'}
        isReady={isReady}
        isLoading={isLoading}
        onTogglePlay={() => togglePlay('before')}
        coverImage={demoImage}
      />
      <DemoPlayerCard
        title="After"
        description="With 8D Spatial Effect"
        isPlaying={isPlaying && activePlayer === 'after'}
        isReady={isReady}
        isLoading={isLoading}
        onTogglePlay={() => togglePlay('after')}
        isEnhanced
        coverImage={demoImage}
      />
    </div>
  );
}

interface DemoPlayerCardProps {
  title: string;
  description: string;
  isPlaying: boolean;
  isReady: boolean;
  isLoading: boolean;
  onTogglePlay: () => void;
  isEnhanced?: boolean;
  coverImage?: { imageUrl: string; description: string; imageHint: string };
}

function DemoPlayerCard({
  title,
  description,
  isPlaying,
  isReady,
  isLoading,
  onTogglePlay,
  isEnhanced,
  coverImage,
}: DemoPlayerCardProps) {
  const Icon = isPlaying ? Pause : Play;
  return (
    <Card className="shadow-lg bg-card/50 backdrop-blur-sm border-primary/20 shadow-primary/10 overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="font-headline text-2xl tracking-tight">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-4 pt-4">
        <div className="relative w-48 h-48">
            {coverImage && (
                <Image 
                    src={coverImage.imageUrl}
                    alt={coverImage.description}
                    fill
                    className="rounded-lg object-cover"
                    data-ai-hint={coverImage.imageHint}
                />
            )}
            <div className={`absolute inset-0 rounded-lg ${isEnhanced ? 'border-4 border-primary' : 'border-2 border-input'}`}></div>
        </div>
        <Button onClick={onTogglePlay} size="lg" variant={isEnhanced ? 'default' : 'outline'} className="w-48">
          {isLoading ? (
            <RotateCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Icon className="mr-2 h-5 w-5" />
          )}
          {isLoading ? 'Loading...' : isPlaying ? 'Pause' : isReady ? 'Play' : 'Load Demo'}
        </Button>
      </CardContent>
    </Card>
  );
}
