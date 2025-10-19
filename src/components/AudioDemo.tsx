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
        // Set up mastering compressor
        compressorNode = audioContext.createDynamicsCompressor();
        compressorNode.threshold.value = -25; // Good starting point
        compressorNode.knee.value = 30;
        compressorNode.ratio.value = 12;
        compressorNode.attack.value = 0.003;
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
        data[j] = Math.sin(2 * Math.PI * freq * time) * 0.5 * envelope; // Reduced gain to avoid clipping
      }
    }
    
    buffer.current = newBuffer;
  };

  const createReverbImpulseResponse = async (context: BaseAudioContext): Promise<AudioBuffer> => {
    const rate = context.sampleRate;
    const duration = 3.5;
    const decay = 2.5;
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
    let path: { x: number; y: number; z: number };
    let freq = 22050; // Default: no filter
    let gain = 1.0;

    // 11D: Figure-eight path with pronounced dynamics and filtering
    const duration = 8;
    const x = radius * Math.sin((2 * Math.PI / duration) * time);
    const z = radius * Math.sin((4 * Math.PI / duration) * time); // Make z movement more pronounced
    const y = Math.cos((2 * Math.PI / (duration * 2)) * time) * 0.5;
    path = { x, y, z };
    
    // Gain automation based on distance from center.
    const distance = Math.sqrt(x * x + y * y + z * z);
    const maxDistance = radius * 1.2;
    gain = 1.0 - (distance / maxDistance) * 0.5;
    gain = Math.max(0.5, Math.min(1.0, gain));

    // Filter automation based on Z position (front/back)
    // Sound is brighter in front, darker behind.
    const baseFreq = 2500; // Lower base for more dramatic effect
    const freqRange = 15000;
    const zNormalized = (z + radius) / (2 * radius); // Normalize Z to 0-1
    freq = baseFreq + (zNormalized * freqRange);
    
    return { ...path, gain, freq };
  };

  const startSpatialAnimation = async () => {
    if (!audioContext || !pannerNode || !filterNode || !gainNode || !compressorNode) return;

    const p = pannerNode;
    const f = filterNode;
    const g = gainNode;

    // Disconnect previous connections to be safe
    g.disconnect();
    
    if (!convolverNode) {
        convolverNode = audioContext.createConvolver();
        convolverNode.buffer = await createReverbImpulseResponse(audioContext);
    }
    
    const dryNode = audioContext.createGain();
    dryNode.gain.value = 0.75; // a bit more dry signal for clarity
    const wetNode = audioContext.createGain();
    wetNode.gain.value = 0.25; // a bit more reverb

    // Route audio through the effect chain
    gainNode.connect(dryNode);
    gainNode.connect(wetNode);
    
    dryNode.connect(f);
    f.connect(p);
    
    wetNode.connect(convolverNode);
    convolverNode.connect(p);
    
    // Everything routes to the panner, then to the master compressor
    p.connect(compressorNode);

    const startTime = audioContext.currentTime;

    const animate = () => {
      if (!audioContext || !p.positionX || !f.frequency || !g.gain) {
        animationFrameRef.current = undefined;
        return;
      }

      const time = audioContext.currentTime - startTime;
      const { x, y, z, gain: newGain, freq } = getAnimationPath(time);

      const rampTime = audioContext.currentTime + 0.1; // Smoother ramp
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
      // "Before" sound also goes through compressor for fair A/B test
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
    // Do not disconnect the compressor from the destination
    
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
      <CardContent className="flex flex-col items-center justify-center gap-4 pt-4 pb-8">
        <div className={`relative w-48 h-48 flex items-center justify-center rounded-lg overflow-hidden ${isEnhanced ? 'bg-primary/10' : 'bg-muted/50'}`}>
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
