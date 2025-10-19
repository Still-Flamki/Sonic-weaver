'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { PlaceHolderImages } from '@/lib/placeholder-images';

let audioContext: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let pannerNode: PannerNode | null = null;
let gainNode: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let convolverNode: ConvolverNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;

export default function AudioDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [activePlayer, setActivePlayer] = useState<'before' | 'after' | null>(null);
  const buffer = useRef<AudioBuffer | null>(null);
  const animationFrameRef = useRef<number>();
  const { toast } = useToast();

  useEffect(() => {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        compressorNode = audioContext.createDynamicsCompressor();
        compressorNode.threshold.value = -18; 
        compressorNode.knee.value = 20;
        compressorNode.ratio.value = 8;
        compressorNode.attack.value = 0.005; 
        compressorNode.release.value = 0.25; 
        compressorNode.connect(audioContext.destination);

        createDemoBuffer(audioContext);
      } catch (e) {
        console.error('Web Audio API is not supported in this browser.');
        toast({
            title: 'Audio Not Supported',
            description: 'Your browser does not support the Web Audio API.',
            variant: 'destructive',
        });
      }
    }

    return () => {
      stopPreview();
    };
  }, [toast]);

  const createDemoBuffer = (context: AudioContext) => {
    const sampleRate = context.sampleRate;
    const tempo = 140; 
    const noteDuration = 60 / tempo; 
    const totalDuration = noteDuration * 8; 
    
    const frameCount = sampleRate * totalDuration;
    const newBuffer = context.createBuffer(1, frameCount, sampleRate);
    const data = newBuffer.getChannelData(0);

    const notes = [
      261.63, 329.63, 392.00, 523.25, 392.00, 329.63, 261.63, 196.00
    ];

    for (let i = 0; i < notes.length; i++) {
      const freq = notes[i];
      const startSample = Math.floor(i * noteDuration * sampleRate);
      const endSample = Math.floor((i + 1) * noteDuration * sampleRate);
      for (let j = startSample; j < endSample; j++) {
        const time = (j - startSample) / sampleRate;
        const envelope = 1 - (j - startSample) / (endSample - startSample);
        data[j] = Math.sin(2 * Math.PI * freq * time) * 0.4 * envelope;
      }
    }
    
    buffer.current = newBuffer;
  };

  const createReverbImpulseResponse = async (context: BaseAudioContext): Promise<AudioBuffer> => {
    const rate = context.sampleRate;
    const duration = 2.5;
    const decay = 3;
    const impulse = context.createBuffer(2, duration * rate, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    for (let i = 0; i < impulse.length; i++) {
        const t = i / rate;
        const noise = Math.random() * 2 - 1;
        const envelope = Math.pow(1 - t / duration, decay) * (1 - 0.5 * Math.sin(t * 10));
        left[i] = noise * envelope;
        right[i] = noise * envelope;
    }
    return impulse;
};

  const getAnimationPath = (time: number) => {
    const radius = 3;
    let path: { x: number; y: number; z: number };
    let freq = 22050; 
    let gain = 1.0;

    const duration = 8;
    const x = radius * Math.sin((2 * Math.PI / duration) * time);
    const z = radius * Math.cos((2 * Math.PI / duration) * time);
    const y = Math.cos((4 * Math.PI / duration) * time) * 0.5; 
    path = { x, y, z };
    
    const distance = Math.sqrt(x * x + y * y + z * z);
    const minGain = 0.4;
    const maxGain = 0.8;
    const proximityThreshold = 1.2;
    const steepness = 2; 

    if (distance < proximityThreshold) {
        const proximityFactor = Math.pow(distance / proximityThreshold, steepness);
        gain = minGain + (maxGain - minGain) * proximityFactor;
    } else {
        gain = maxGain;
    }

    const baseFreq = 2500;
    const freqRange = 15000;
    const zNormalized = (z + radius) / (2 * radius);
    freq = baseFreq + (zNormalized * freqRange);
    
    return { ...path, gain, freq };
  };

  const startSpatialAnimation = async () => {
    if (!audioContext || !pannerNode || !filterNode || !gainNode || !compressorNode) return;

    const p = pannerNode;
    const f = filterNode;
    const g = gainNode;

    g.disconnect();
    
    if (!convolverNode) {
        convolverNode = audioContext.createConvolver();
        convolverNode.buffer = await createReverbImpulseResponse(audioContext);
    }
    
    const dryNode = audioContext.createGain();
    dryNode.gain.value = 0.75; 
    const wetNode = audioContext.createGain();
    wetNode.gain.value = 0.25; 

    gainNode.connect(dryNode);
    gainNode.connect(wetNode);
    
    dryNode.connect(f);
    f.connect(p);
    
    wetNode.connect(convolverNode);
    convolverNode.connect(p);
    
    p.connect(compressorNode);

    const startTime = audioContext.currentTime;

    const animate = () => {
      if (!audioContext || !p.positionX || !f.frequency || !g.gain) {
        animationFrameRef.current = undefined;
        return;
      }

      const time = audioContext.currentTime - startTime;
      const { x, y, z, gain: newGain, freq } = getAnimationPath(time);

      const rampTime = audioContext.currentTime + 0.1;
      p.positionX.linearRampToValueAtTime(x, rampTime);
      p.positionY.linearRampToValueAtTime(y, rampTime);
      p.positionZ.linearRampToValueAtTime(z, rampTime);
      f.frequency.linearRampToValueAtTime(freq, rampTime);
      g.gain.linearRampToValueAtTime(newGain, rampTime);

      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  const playPreview = async (type: 'before' | 'after') => {
    if (!buffer.current || !audioContext || !compressorNode) return;

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

      filterNode = audioContext.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.Q.value = 0.7;
      
      if (audioContext.listener.positionX) {
        audioContext.listener.positionX.value = 0;
        audioContext.listener.positionY.value = 0;
        audioContext.listener.positionZ.value = 0;
      } else {
        audioContext.listener.setPosition(0, 0, 0);
      }
      await startSpatialAnimation();
    } else {
      gainNode.connect(compressorNode);
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
    filterNode?.disconnect();
    convolverNode?.disconnect();
    
    setIsPlaying(false);
    setActivePlayer(null);
  };

  const togglePlay = (type: 'before' | 'after') => {
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
        description="Original Mono Audio"
        isPlaying={isPlaying && activePlayer === 'before'}
        onTogglePlay={() => togglePlay('before')}
      />
      <DemoPlayerCard
        title="After"
        description="11D Effect with Reverb"
        isPlaying={isPlaying && activePlayer === 'after'}
        onTogglePlay={() => togglePlay('after')}
        isEnhanced
      />
    </div>
  );
}

interface DemoPlayerCardProps {
  title: string;
  description: string;
  isPlaying: boolean;
  onTogglePlay: () => void;
  isEnhanced?: boolean;
}

function DemoPlayerCard({
  title,
  description,
  isPlaying,
  onTogglePlay,
  isEnhanced,
}: DemoPlayerCardProps) {
  const Icon = isPlaying ? Pause : Play;
  return (
    <Card className="shadow-lg bg-card/50 backdrop-blur-sm border-primary/20 shadow-primary/10 overflow-hidden">
      <CardHeader>
        <CardTitle className="font-headline text-2xl tracking-tight">{title}</CardTitle>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="flex flex-col items-center justify-center gap-6 pt-6 pb-8">
        <Button onClick={onTogglePlay} size="lg" variant={isEnhanced ? 'default' : 'outline'} className="w-48">
          <Icon className="mr-2 h-5 w-5" />
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
      </CardContent>
    </Card>
  );
}
