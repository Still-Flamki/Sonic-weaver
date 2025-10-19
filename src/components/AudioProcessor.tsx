'use client';

import { useState, useRef, useEffect, Dispatch, SetStateAction, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UploadCloud, Download, FileAudio, RotateCw, CheckCircle2, Play, Pause, XCircle } from 'lucide-react';
import type { EffectType } from './SonicWeaverApp';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Terminal } from 'lucide-react';

interface AudioProcessorProps {
  effectType: EffectType;
  setEffectType: Dispatch<SetStateAction<EffectType>>;
  audioFile: File | null;
  setAudioFile: Dispatch<SetStateAction<File | null>>;
}

let audioContext: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let pannerNode: PannerNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let gainNode: GainNode | null = null;
let convolverNode: ConvolverNode | null = null;

export default function AudioProcessor({
  effectType,
  setEffectType,
  audioFile,
  setAudioFile,
}: AudioProcessorProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedBuffer, setProcessedBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();
  
  const { toast } = useToast();

  useEffect(() => {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        setError('Web Audio API is not supported in this browser.');
        console.error(e);
      }
    }
    return () => {
      stopPreview();
    };
  }, []);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioFile(file);
        setProcessedBuffer(null);
        stopPreview();
        setError(null);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a valid audio file.',
          variant: 'destructive',
        });
      }
    }
  };
  
  const handleProcess = async () => {
    if (!audioFile || !audioContext) {
      toast({
        title: 'Prerequisites not met',
        description: 'Please upload an audio file first. Audio context might not be available.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setError(null);
    setProcessedBuffer(null);
    stopPreview();

    try {
      const arrayBuffer = await audioFile.arrayBuffer();
      const decodedBuffer = await audioContext.decodeAudioData(arrayBuffer);
      setProcessedBuffer(decodedBuffer);
      toast({
        title: 'Processing Complete!',
        description: `Your ${effectType} audio is ready for preview.`,
      });
    } catch (e) {
      console.error('Audio processing error:', e);
      setError('Failed to decode the audio file. It might be corrupted or in an unsupported format.');
      toast({
        title: 'Processing Failed',
        description: 'Could not process the audio file.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const createReverbImpulseResponse = async (context: AudioContext): Promise<AudioBuffer> => {
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


  const startSpatialAnimation = async () => {
    if (!audioContext || !pannerNode || !filterNode || !gainNode) return;
  
    const p = pannerNode;
    const f = filterNode;
    const g = gainNode;
    const radius = 3;

    if (effectType === '11D') {
      convolverNode = audioContext.createConvolver();
      convolverNode.buffer = await createReverbImpulseResponse(audioContext);
      
      const dryNode = audioContext.createGain();
      dryNode.gain.value = 0.6; // Main signal (lowered)
      const wetNode = audioContext.createGain();
      wetNode.gain.value = 0.25; // Reverb signal (lowered)

      gainNode.connect(dryNode);
      gainNode.connect(wetNode);
      wetNode.connect(convolverNode);
      dryNode.connect(pannerNode);
      convolverNode.connect(pannerNode);
    } else {
        gainNode.connect(filterNode);
        filterNode.connect(pannerNode);
    }


    let duration: number;
    let path: (time: number) => { x: number; y: number; z: number };

    switch (effectType) {
      case '4D':
        duration = 4; // Clean right-to-left sweep
        path = (time) => {
          const angle = (time / duration) * Math.PI;
          return { x: Math.cos(angle) * radius, y: 0, z: -1 };
        };
        break;
      case '8D':
        duration = 8; // Professional circular path
        path = (time) => {
          const angle = (time / duration) * 2 * Math.PI;
          return { x: Math.sin(angle) * radius, y: 0, z: Math.cos(angle) * radius };
        };
        break;
      case '11D':
        duration = 6; // Complex figure-eight for large room
        path = (time) => {
          const angle = (time / duration) * 2 * Math.PI;
          return { x: Math.sin(angle) * radius, y: Math.cos(angle * 2) * 1.5, z: Math.sin(angle) * Math.cos(angle) * radius };
        };
        break;
      default:
        return;
    }

    const startTime = audioContext.currentTime;

    const animate = () => {
      if (!audioContext || !p.positionX || !f.frequency || !g.gain) {
        animationFrameRef.current = undefined;
        return;
      };

      const time = audioContext.currentTime - startTime;
      const { x, y, z } = path(time);
      
      p.positionX.linearRampToValueAtTime(x, audioContext.currentTime + 0.05);
      p.positionY.linearRampToValueAtTime(y, audioContext.currentTime + 0.05);
      p.positionZ.linearRampToValueAtTime(z, audioContext.currentTime + 0.05);
      
      const freq = 5000 + (z + radius) / (2 * radius) * 10000;
      f.frequency.linearRampToValueAtTime(freq, audioContext.currentTime + 0.05);

      const distance = Math.sqrt(x*x + y*y + z*z);
      const newGain = 1 - (distance / (radius * 2));
      g.gain.linearRampToValueAtTime(Math.max(0.7, newGain), audioContext.currentTime + 0.05);


      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  const playPreview = async () => {
    if (!processedBuffer || !audioContext) return;
    
    stopPreview();

    audioContext.resume();

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = processedBuffer;
    sourceNode.loop = true;

    pannerNode = audioContext.createPanner();
    pannerNode.panningModel = 'HRTF';
    pannerNode.distanceModel = 'inverse';
    
    filterNode = audioContext.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.Q.value = 1;

    gainNode = audioContext.createGain();

    if(audioContext.listener.positionX) {
      audioContext.listener.positionX.value = 0;
      audioContext.listener.positionY.value = 0;
      audioContext.listener.positionZ.value = 0;
    } else {
       audioContext.listener.setPosition(0,0,0);
    }
    
    pannerNode.connect(audioContext.destination);
    sourceNode.connect(gainNode);

    
    sourceNode.onended = () => {
      stopPreview();
    };
    
    sourceNode.start(0);
    setIsPlaying(true);
    await startSpatialAnimation();
  };

  const stopPreview = () => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = undefined;
    }
    if (sourceNode) {
      sourceNode.stop(0);
      sourceNode.disconnect();
      sourceNode = null;
    }
    if (gainNode) gainNode.disconnect();
    if (filterNode) filterNode.disconnect();
    if (pannerNode) pannerNode.disconnect();
    if (convolverNode) convolverNode.disconnect();
    
    setIsPlaying(false);
  };

  const togglePreview = () => {
    if (isPlaying) {
      stopPreview();
    } else {
      playPreview();
    }
  };

  const handleReset = () => {
    setAudioFile(null);
    setProcessedBuffer(null);
    stopPreview();
    setError(null);
    const fileInput = document.getElementById('audio-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleDownload = () => {
    toast({
      title: 'Download Not Implemented',
      description: 'Offline rendering is a complex feature not yet implemented.',
      variant: 'default',
    });
  };

  return (
    <Card className="w-full shadow-lg border-border/50">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Audio Converter</CardTitle>
        <CardDescription>Upload a track, select an AI effect, and hear real spatial audio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="audio-upload">1. Upload Audio File</Label>
          <div
            className="relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-background/50 p-8 transition-colors hover:bg-accent/20"
            onClick={() => document.getElementById('audio-upload')?.click()}
          >
            <Input
              id="audio-upload"
              type="file"
              className="sr-only"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={isProcessing}
            />
            {audioFile ? (
              <div className="flex flex-col items-center text-center">
                <FileAudio className="mb-4 h-12 w-12 text-primary" />
                <p className="font-semibold text-foreground">{audioFile.name}</p>
                <p className="text-sm text-muted-foreground">
                  ({(audioFile.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              </div>
            ) : (
              <div className="flex flex-col items-center text-center text-muted-foreground">
                <UploadCloud className="mb-4 h-12 w-12" />
                <p className="font-semibold">Click to upload or drag & drop</p>
                <p className="text-sm">Any standard audio format</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>2. Select Effect Type</Label>
          <RadioGroup
            value={effectType}
            onValueChange={(value: EffectType) => {
              setEffectType(value);
              if (isPlaying) {
                playPreview();
              }
            }}
            className="grid grid-cols-3 gap-4"
            disabled={isProcessing}
          >
            {['4D', '8D', '11D'].map(effect => (
              <Label
                key={effect}
                htmlFor={`effect-${effect}`}
                className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value={effect as EffectType} id={`effect-${effect}`} className="sr-only" />
                <span className="text-lg font-semibold">{effect}</span>
                <span className="text-xs text-muted-foreground">Audio</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        {isProcessing && (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Decoding Audio</AlertTitle>
            <AlertDescription>
              Preparing your audio file. This should be quick...
            </AlertDescription>
          </Alert>
        )}
        
        {error && (
            <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>An Error Occurred</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleProcess} disabled={isProcessing || !audioFile} className="w-full sm:w-auto">
          {isProcessing ? (
            <>
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
              Preparing...
            </>
          ) : processedBuffer ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Ready
            </>
          ) : (
            'Process Audio'
          )}
        </Button>
        <Button onClick={togglePreview} disabled={!processedBuffer || isProcessing} className="w-full sm:w-auto" variant="secondary">
          {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
          {isPlaying ? 'Pause' : 'Preview'}
        </Button>
        <Button onClick={handleDownload} disabled={!processedBuffer || isProcessing} className="w-full sm:w-auto">
          <Download className="mr-2 h-4 w-4" />
          Download
        </Button>
        <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto sm:ml-auto" disabled={isProcessing}>
            Reset
        </Button>
      </CardFooter>
    </Card>
  );
}
