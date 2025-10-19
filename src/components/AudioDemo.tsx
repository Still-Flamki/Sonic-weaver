'use client';

import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pause, Volume2, VolumeX } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { cn } from '@/lib/utils';

let audioContext: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let pannerNode: PannerNode | null = null;
let gainNode: GainNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let convolverNode: ConvolverNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;

export default function AudioDemo() {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEnhanced, setIsEnhanced] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const buffer = useRef<AudioBuffer | null>(null);
  const animationFrameRef = useRef<number>();
  const { toast } = useToast();

  const initializeAudio = () => {
    if (isInitialized) return;
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
        setIsInitialized(true);
      } catch (e) {
        console.error('Web Audio API is not supported in this browser.');
        toast({
            title: 'Audio Not Supported',
            description: 'Your browser does not support the Web Audio API.',
            variant: 'destructive',
        });
      }
    }
  }

  useEffect(() => {
    return () => {
      stopPreview();
    };
  }, []);

  useEffect(() => {
    if (isPlaying) {
      // Effect change during playback, re-initialize animation
      stopPreview();
      setTimeout(() => playPreview(isEnhanced), 50);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEnhanced]);

  const createDemoBuffer = (context: AudioContext) => {
    const sampleRate = context.sampleRate;
    const tempo = 140; 
    const noteDuration = 60 / tempo / 2; // 16th notes
    const totalDuration = noteDuration * 16; 
    
    const frameCount = sampleRate * totalDuration;
    const newBuffer = context.createBuffer(1, frameCount, sampleRate);
    const data = newBuffer.getChannelData(0);

    const CMinorScale = [261.63, 293.66, 311.13, 349.23, 392.00, 415.30, 466.16];
    const arpeggio = [
        CMinorScale[0], CMinorScale[2], CMinorScale[4], CMinorScale[6],
        CMinorScale[5], CMinorScale[3], CMinorScale[1], CMinorScale[0],
        CMinorScale[1], CMinorScale[3], CMinorScale[5], CMinorScale[2],
        CMinorScale[4], CMinorScale[6], CMinorScale[3], CMinorScale[0],
    ];

    for (let i = 0; i < arpeggio.length; i++) {
      const freq = arpeggio[i];
      const startSample = Math.floor(i * noteDuration * sampleRate);
      const endSample = Math.floor((i + 0.9) * noteDuration * sampleRate); // Add slight gap
      for (let j = startSample; j < endSample; j++) {
        const time = (j - startSample) / sampleRate;
        const envelope = 1 - (time / noteDuration); // Simple decay
        const sine = Math.sin(2 * Math.PI * freq * time);
        const overtone = Math.sin(2 * Math.PI * freq * 2 * time) * 0.3; // Add a harmonic
        data[j] = (sine + overtone) * 0.25 * envelope;
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
    const duration = 8;
    
    const x = radius * Math.sin((2 * Math.PI / duration) * time);
    const z = radius * Math.cos((2 * Math.PI / duration) * time);
    const y = Math.cos((4 * Math.PI / duration) * time) * 0.5; 
    const path = { x, y, z };
    
    const distance = Math.sqrt(x * x + y * y + z * z);
    
    // Non-linear gain reduction for proximity
    const proximityThreshold = 1.5; // How close before volume reduction starts
    const steepness = 2.0; // How sharply the volume drops
    let proximityGain = 1.0;
    if (distance < proximityThreshold) {
        proximityGain = Math.pow(distance / proximityThreshold, steepness);
    }
    
    const baseGain = 0.7;
    const gain = baseGain * proximityGain;
    
    const baseFreq = 2500;
    const freqRange = 15000;
    const zNormalized = (z + radius) / (2 * radius);
    const freq = baseFreq + (zNormalized * freqRange);
    
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

  const playPreview = async (enhanced: boolean) => {
    if (!buffer.current || !audioContext || !compressorNode) return;

    stopPreview();
    await audioContext.resume();

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = buffer.current;
    sourceNode.loop = true;

    gainNode = audioContext.createGain();
    sourceNode.connect(gainNode);

    if (enhanced) {
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
  };

  const handleTogglePlay = () => {
    if (!isInitialized) {
      initializeAudio();
      // Wait a moment for context to be ready, then play
      setTimeout(() => {
        playPreview(isEnhanced);
      }, 100);
    } else if (isPlaying) {
      stopPreview();
    } else {
      playPreview(isEnhanced);
    }
  };


  return (
    <div className="max-w-2xl mx-auto">
      <Card className={cn(
        "shadow-lg bg-card/50 backdrop-blur-sm border-primary/20 shadow-primary/10 transition-all",
        isEnhanced && isPlaying && "shadow-accent/20 border-accent/30"
      )}>
        <CardHeader>
          <CardTitle className="font-headline text-2xl tracking-tight">
            {isEnhanced ? "11D Effect with Reverb" : "Original Mono Audio"}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            A simple generative melody to demonstrate the effect.
          </p>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-6 pt-4 pb-8">
            <div className="flex items-center space-x-4">
                <div className="flex items-center gap-2 text-muted-foreground">
                    <VolumeX />
                    <span>Mono</span>
                </div>
                <Switch
                    id="effect-toggle"
                    checked={isEnhanced}
                    onCheckedChange={setIsEnhanced}
                    aria-label="Toggle between Mono and 11D audio"
                />
                <div className={cn("flex items-center gap-2 text-muted-foreground transition-colors", isEnhanced && "text-accent")}>
                    <Volume2 />
                    <span>11D</span>
                </div>
            </div>
            <Button onClick={handleTogglePlay} size="lg" variant="outline" className="w-48">
              {isPlaying ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
              {isPlaying ? 'Pause' : 'Play Demo'}
            </Button>
        </CardContent>
      </Card>
    </div>
  );
}
