'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

let audioContext: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let pannerNode: PannerNode | null = null;
let gainNode: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let convolverNode: ConvolverNode | null = null;

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
    const tempo = 140; // BPM
    const noteDuration = 60 / tempo; // Duration of one beat in seconds
    const totalDuration = noteDuration * 8; // 8 notes
    
    const frameCount = sampleRate * totalDuration;
    const newBuffer = context.createBuffer(1, frameCount, sampleRate);
    const data = newBuffer.getChannelData(0);

    const notes = [
      261.63, // C4
      329.63, // E4
      392.00, // G4
      523.25, // C5
      392.00, // G4
      329.63, // E4
      261.63, // C4
      196.00  // G3
    ];

    for (let i = 0; i < notes.length; i++) {
      const freq = notes[i];
      const startSample = Math.floor(i * noteDuration * sampleRate);
      const endSample = Math.floor((i + 1) * noteDuration * sampleRate);
      for (let j = startSample; j < endSample; j++) {
        const time = (j - startSample) / sampleRate;
        const envelope = 1 - (j - startSample) / (endSample - startSample); // simple decay
        data[j] = Math.sin(2 * Math.PI * freq * time) * 0.3 * envelope;
      }
    }
    
    buffer.current = newBuffer;
  };

  const createReverbImpulseResponse = async (context: BaseAudioContext): Promise<AudioBuffer> => {
    const rate = context.sampleRate;
    const duration = 2; // seconds
    const decay = 3;
    const impulse = context.createBuffer(2, duration * rate, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < impulse.length; i++) {
      const n = i / impulse.length;
      left[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
      right[i] = (Math.random() * 2 - 1) * Math.pow(1 - n, decay);
    }
    return impulse;
  };

  const getAnimationPath = (time: number) => {
    const radius = 3;
    const zRadius = radius * 1.5;
    const duration = 8; // Right -> Front -> Left -> Back -> Loop
    const segmentDuration = duration / 4;
    const segment = Math.floor((time % duration) / segmentDuration);
    const segmentTime = (time % duration) - (segment * segmentDuration);
    const progress = segmentTime / segmentDuration;

    let x = 0, y = 0, z = 0;
    
    switch(segment) {
      case 0: // Right to Front
        x = radius * (1 - progress);
        z = -zRadius * progress;
        break;
      case 1: // Front to Left
        x = -radius * progress;
        z = -zRadius * (1 - progress);
        break;
      case 2: // Left to Back
        x = -radius * (1 - progress);
        z = zRadius * progress;
        break;
      case 3: // Back to Right
        x = radius * progress;
        z = zRadius * (1 - progress);
        break;
    }
    const path = { x, y, z };
    const gain = 1;
    const freq = 1000;

    return { ...path, gain, freq };
  };

  const startSpatialAnimation = async () => {
    if (!audioContext || !pannerNode || !filterNode || !gainNode) return;

    const p = pannerNode;
    const f = filterNode;
    const g = gainNode;

    // Disconnect previous connections to be safe
    g.disconnect();
    f.disconnect();
    p.disconnect();
    if (convolverNode) convolverNode.disconnect();

    if (!convolverNode) {
        convolverNode = audioContext.createConvolver();
        convolverNode.buffer = await createReverbImpulseResponse(audioContext);
    }
    
    const dryNode = audioContext.createGain();
    dryNode.gain.value = 0.6;
    const wetNode = audioContext.createGain();
    wetNode.gain.value = 0.4;

    gainNode.connect(dryNode);
    gainNode.connect(wetNode);
    wetNode.connect(convolverNode);
    convolverNode.connect(audioContext.destination);
    dryNode.connect(f);
    f.connect(p);
    
    p.connect(audioContext.destination);

    const startTime = audioContext.currentTime;

    const animate = () => {
      if (!audioContext || !p.positionX || !f.frequency || !g.gain) {
        animationFrameRef.current = undefined;
        return;
      }

      const time = audioContext.currentTime - startTime;
      const { x, y, z, gain: newGain, freq } = getAnimationPath(time);

      p.positionX.linearRampToValueAtTime(x, audioContext.currentTime + 0.05);
      p.positionY.linearRampToValueAtTime(y, audioContext.currentTime + 0.05);
      p.positionZ.linearRampToValueAtTime(z, audioContext.currentTime + 0.05);
      f.frequency.linearRampToValueAtTime(freq, audioContext.currentTime + 0.05);
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

      filterNode = audioContext.createBiquadFilter();
      filterNode.type = 'lowpass';
      filterNode.Q.value = 1;
      
      if (audioContext.listener.positionX) {
        audioContext.listener.positionX.value = 0;
        audioContext.listener.positionY.value = 0;
        audioContext.listener.positionZ.value = 0;
      } else {
        audioContext.listener.setPosition(0, 0, 0);
      }
      await startSpatialAnimation();
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
    filterNode?.disconnect();
    if(convolverNode) convolverNode.disconnect();
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
      <CardContent className="flex flex-col items-center justify-center gap-4 pt-8 pb-8">
        <div className={`relative w-48 h-24 flex items-center justify-center rounded-lg ${isEnhanced ? 'bg-primary/10 border-2 border-primary' : 'bg-muted/50 border-2 border-input'}`}>
            <p className="text-muted-foreground text-sm font-mono">{isEnhanced ? '< 11D Processed >' : '< Mono Source >'}</p>
        </div>
        <Button onClick={onTogglePlay} size="lg" variant={isEnhanced ? 'default' : 'outline'} className="w-48">
          <Icon className="mr-2 h-5 w-5" />
          {isPlaying ? 'Pause' : 'Play'}
        </Button>
      </CardContent>
    </Card>
  );
}
