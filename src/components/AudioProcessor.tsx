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
  const [isRendering, setIsRendering] = useState(false);
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
    let duration: number;
    let path: { x: number; y: number; z: number };

    switch (effectType) {
      case '4D':
        duration = 4; // Clean right-to-left sweep
        const angle4d = (time / duration) * Math.PI;
        path = { x: Math.cos(angle4d) * radius, y: 0, z: -1 };
        break;
      case '8D':
        duration = 8; // Professional circular path
        const angle8d = (time / duration) * 2 * Math.PI;
        path = { x: Math.sin(angle8d) * radius, y: 0, z: Math.cos(angle8d) * radius };
        break;
      case '11D':
        duration = 8; // Right -> Front -> Left -> Back -> Loop
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
        path = { x, y, z };
        break;
      default:
        path = { x: 0, y: 0, z: 0 };
    }
    
    const distance = Math.sqrt(path.x*path.x + path.y*path.y + path.z*path.z);
    const gain = 1 - (distance / (radius * 2));
    const freq = path.z > 0 ? 3000 + (path.z / zRadius) * 2000 : 5000 + (path.z + zRadius) / (2 * zRadius) * 10000;
    
    return { ...path, gain, freq };
  };

  const startSpatialAnimation = async () => {
    if (!audioContext || !pannerNode || !filterNode || !gainNode) return;
  
    const p = pannerNode;
    const f = filterNode;
    const g = gainNode;

    if (effectType === '11D') {
      if (!convolverNode) {
        convolverNode = audioContext.createConvolver();
        convolverNode.buffer = await createReverbImpulseResponse(audioContext);
      }
      
      const dryNode = audioContext.createGain();
      dryNode.gain.value = 0.7; 
      const wetNode = audioContext.createGain();
      wetNode.gain.value = 0.3; 

      gainNode.connect(dryNode);
      gainNode.connect(wetNode);
      wetNode.connect(convolverNode);
      convolverNode.connect(p.context.destination);
      dryNode.connect(f);
      f.connect(p);

    } else {
        gainNode.connect(f);
        f.connect(p);
    }
    
    p.connect(audioContext.destination);

    const startTime = audioContext.currentTime;

    const animate = () => {
      if (!audioContext || !p.positionX || !f.frequency || !g.gain) {
        animationFrameRef.current = undefined;
        return;
      };

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
    if (convolverNode) {
      convolverNode.disconnect();
    }
    
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
  
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
    const channels = [];
    let i, sample;
    let offset = 0;
    let pos = 0;

    const setUint16 = (data: number) => {
        view.setUint16(pos, data, true);
        pos += 2;
    }

    const setUint32 = (data: number) => {
        view.setUint32(pos, data, true);
        pos += 4;
    }

    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); // file length - 8
    setUint32(0x45564157); // "WAVE"

    setUint32(0x20746d66); // "fmt " chunk
    setUint32(16); // length of format data
    setUint16(1); // PCM - integer samples
    setUint16(numOfChan); // two channels
    setUint32(buffer.sampleRate); // sample rate
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // bits per sample

    setUint32(0x61746164); // "data" - chunk
    setUint32(length - pos - 4); // chunk length

    for (i = 0; i < buffer.numberOfChannels; i++)
        channels.push(buffer.getChannelData(i));

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = (0.5 + sample < 0 ? sample * 32768 : sample * 32767) | 0;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([bufferArray], { type: 'audio/wav' });
  }

  const handleDownload = async () => {
    if (!processedBuffer) {
        toast({
            title: 'No audio to download',
            description: 'Please process an audio file first.',
            variant: 'destructive',
        });
        return;
    }
    
    setIsRendering(true);
    stopPreview();
    toast({
        title: 'Rendering Audio...',
        description: 'Preparing your file for download. This may take a moment.',
    });

    try {
        const offlineCtx = new OfflineAudioContext(
            processedBuffer.numberOfChannels,
            processedBuffer.length,
            processedBuffer.sampleRate
        );

        const offlineSource = offlineCtx.createBufferSource();
        offlineSource.buffer = processedBuffer;

        const offlinePanner = offlineCtx.createPanner();
        offlinePanner.panningModel = 'HRTF';
        offlinePanner.distanceModel = 'inverse';

        const offlineFilter = offlineCtx.createBiquadFilter();
        offlineFilter.type = 'lowpass';
        offlineFilter.Q.value = 1;
        
        const offlineGain = offlineCtx.createGain();

        if(offlineCtx.listener.positionX) {
            offlineCtx.listener.positionX.value = 0;
            offlineCtx.listener.positionY.value = 0;
            offlineCtx.listener.positionZ.value = 0;
        } else {
            offlineCtx.listener.setPosition(0,0,0);
        }

        offlineSource.connect(offlineGain);

        let offlineConvolver: ConvolverNode | null = null;
        if (effectType === '11D') {
            offlineConvolver = offlineCtx.createConvolver();
            offlineConvolver.buffer = await createReverbImpulseResponse(offlineCtx);
            const dryNode = offlineCtx.createGain();
            dryNode.gain.value = 0.7;
            const wetNode = offlineCtx.createGain();
            wetNode.gain.value = 0.3;
            offlineGain.connect(dryNode);
            offlineGain.connect(wetNode);
            wetNode.connect(offlineConvolver);
            offlineConvolver.connect(offlineCtx.destination);
            dryNode.connect(offlineFilter);
            offlineFilter.connect(offlinePanner);
        } else {
            offlineGain.connect(offlineFilter);
            offlineFilter.connect(offlinePanner);
        }
        offlinePanner.connect(offlineCtx.destination);
        
        const timeStep = 0.05;
        for (let time = 0; time < processedBuffer.duration; time += timeStep) {
            const { x, y, z, gain, freq } = getAnimationPath(time);
            offlinePanner.positionX.linearRampToValueAtTime(x, time);
            offlinePanner.positionY.linearRampToValueAtTime(y, time);
            offlinePanner.positionZ.linearRampToValueAtTime(z, time);
            offlineFilter.frequency.linearRampToValueAtTime(freq, time);
            offlineGain.gain.linearRampToValueAtTime(gain, time);
        }

        offlineSource.start(0);
        const renderedBuffer = await offlineCtx.startRendering();
        
        const wavBlob = bufferToWav(renderedBuffer);
        const url = URL.createObjectURL(wavBlob);
        
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `sonic-weaver-${effectType}-${audioFile?.name.replace(/\.[^/.]+$/, "") || 'track'}.wav`;
        document.body.appendChild(a);
        a.click();
        URL.revokeObjectURL(url);
        a.remove();
        
        toast({
            title: 'Download Ready!',
            description: 'Your processed audio has been downloaded.',
        });
    } catch (e) {
        console.error('Offline rendering error:', e);
        setError('Failed to render the audio for download.');
        toast({
            title: 'Download Failed',
            description: 'Could not render the audio file.',
            variant: 'destructive',
        });
    } finally {
        setIsRendering(false);
    }
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
              disabled={isProcessing || isRendering}
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
              stopPreview();
              setEffectType(value);
              setTimeout(() => {
                if (isPlaying || (processedBuffer && audioFile)) {
                   playPreview();
                }
              }, 50);
            }}
            className="grid grid-cols-3 gap-4"
            disabled={isProcessing || isRendering}
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

        {(isProcessing || isRendering) && (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>{isRendering ? 'Rendering Audio' : 'Decoding Audio'}</AlertTitle>
            <AlertDescription>
              {isRendering ? 'Preparing your file for download...' : 'Preparing your audio file. This should be quick...'}
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
        <Button onClick={handleProcess} disabled={isProcessing || isRendering || !audioFile} className="w-full sm:w-auto">
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
        <Button onClick={togglePreview} disabled={!processedBuffer || isProcessing || isRendering} className="w-full sm:w-auto" variant="secondary">
          {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
          {isPlaying ? 'Pause' : 'Preview'}
        </Button>
        <Button onClick={handleDownload} disabled={!processedBuffer || isProcessing || isRendering} className="w-full sm:w-auto">
          {isRendering ? (
            <>
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
              Rendering...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download
            </>
          )}
        </Button>
        <Button onClick={handleReset} variant="outline" className="w-full sm:w-auto sm:ml-auto" disabled={isProcessing || isRendering}>
            Reset
        </Button>
      </CardFooter>
    </Card>
  );
}
