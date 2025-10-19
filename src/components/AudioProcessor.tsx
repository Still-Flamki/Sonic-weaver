'use client';

import { useState, useRef, useEffect, Dispatch, SetStateAction, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UploadCloud, Download, FileAudio, RotateCw, Play, Pause, XCircle } from 'lucide-react';
import type { EffectType } from './SonicWeaverApp';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { cn } from '@/lib/utils';

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
let compressorNode: DynamicsCompressorNode | null = null;

export default function AudioProcessor({
  effectType,
  setEffectType,
  audioFile,
  setAudioFile,
}: AudioProcessorProps) {
  const [isDecoding, setIsDecoding] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [decodedBuffer, setDecodedBuffer] = useState<AudioBuffer | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const animationFrameRef = useRef<number>();
  
  const { toast } = useToast();

  useEffect(() => {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Set up a mastering compressor at the end of the chain
        compressorNode = audioContext.createDynamicsCompressor();
        compressorNode.threshold.value = -25; // Don't compress too much
        compressorNode.knee.value = 30;      // Soft knee for smooth compression
        compressorNode.ratio.value = 12;      // Standard compression ratio
        compressorNode.attack.value = 0.003;  // Fast attack
        compressorNode.release.value = 0.25;  // Medium release
        compressorNode.connect(audioContext.destination);
      } catch (e) {
        setError('Web Audio API is not supported in this browser.');
        console.error(e);
      }
    }
    return () => {
      stopPreview();
    };
  }, []);

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        handleReset(false);
        setAudioFile(file);
        await processFile(file);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a valid audio file.',
          variant: 'destructive',
        });
      }
    }
  };
  
  const processFile = async (file: File) => {
    if (!file || !audioContext) {
      toast({
        title: 'Prerequisites not met',
        description: 'Please upload an audio file first. Audio context might not be available.',
        variant: 'destructive',
      });
      return;
    }

    setIsDecoding(true);
    setError(null);
    setDecodedBuffer(null);
    stopPreview();

    try {
      const arrayBuffer = await file.arrayBuffer();
      const buffer = await audioContext.decodeAudioData(arrayBuffer);
      setDecodedBuffer(buffer);
      toast({
        title: 'Audio Ready!',
        description: `Your track is ready for preview and download.`,
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
      setIsDecoding(false);
    }
  };

  const createReverbImpulseResponse = async (context: BaseAudioContext): Promise<AudioBuffer> => {
    const rate = context.sampleRate;
    const duration = 2.5; 
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

    switch (effectType) {
      case '4D': {
        // Smooth semi-circle sweep in front of the listener
        const duration = 4;
        const angle = (Math.PI / duration) * time; // Sweep 180 degrees
        path = {
          x: radius * Math.cos(angle - Math.PI / 2),
          y: 0,
          z: -radius * Math.sin(angle) * 0.8, // Keep it in front
        };
        break;
      }
      case '8D': {
        // Perfect circular path around the listener
        const duration = 8;
        const angle = (2 * Math.PI / duration) * time;
        path = { x: radius * Math.sin(angle), y: 0, z: radius * Math.cos(angle) };
        break;
      }
      case '11D': {
        // Smooth figure-eight pattern with subtle reverb and filtering
        const duration = 8;
        const zRadius = 2;
        const x = radius * Math.sin((2 * Math.PI / duration) * time);
        const z = zRadius * Math.sin((4 * Math.PI / duration) * time);
        const y = 0; 
        path = { x, y, z };
        
        const distance = Math.sqrt(x * x + y * y + z * z);
        const maxDistance = radius * 1.2;
        gain = 1.0 - (distance / maxDistance);
        gain = Math.max(0.4, Math.min(1.0, gain)); // Clamp gain

        freq = 4000 + (z * 600); // Dynamic lowpass filter
        break;
      }
      default:
        path = { x: 0, y: 0, z: 0 };
    }
    
    return { ...path, gain, freq };
  };

  const startSpatialAnimation = async () => {
    if (!audioContext || !pannerNode || !filterNode || !gainNode || !compressorNode) return;
  
    const p = pannerNode;
    const f = filterNode;
    const g = gainNode;
    const c = compressorNode;
    
    // Clear previous connections
    g.disconnect();
    if (convolverNode) convolverNode.disconnect();
    
    if (effectType === '11D') {
        if (!convolverNode) {
            convolverNode = audioContext.createConvolver();
            convolverNode.buffer = await createReverbImpulseResponse(audioContext);
        }
        
        const dryNode = audioContext.createGain();
        dryNode.gain.value = 0.75; // More dry signal for clarity
        const wetNode = audioContext.createGain();
        wetNode.gain.value = 0.25; // Reverb is more subtle

        gainNode.connect(dryNode);
        gainNode.connect(wetNode);
        wetNode.connect(convolverNode);
        convolverNode.connect(p); // Reverb is also spatialized
        dryNode.connect(f);
        f.connect(p);
    } else {
        // For 4D and 8D, no reverb
        gainNode.connect(f);
        f.connect(p);
    }
    
    p.connect(c); // Connect effect chain to the compressor

    const startTime = audioContext.currentTime;

    const animate = () => {
      if (!audioContext || !p.positionX || !f.frequency || !g.gain) {
        animationFrameRef.current = undefined;
        return;
      };

      const time = audioContext.currentTime - startTime;
      const { x, y, z, gain: newGain, freq } = getAnimationPath(time);
      
      const rampTime = audioContext.currentTime + 0.1; // Use a smooth ramp to avoid clicks
      p.positionX.linearRampToValueAtTime(x, rampTime);
      p.positionY.linearRampToValueAtTime(y, rampTime);
      p.positionZ.linearRampToValueAtTime(z, rampTime);
      f.frequency.linearRampToValueAtTime(freq, rampTime);
      g.gain.linearRampToValueAtTime(newGain, rampTime);
      
      animationFrameRef.current = requestAnimationFrame(animate);
    };
    animate();
  };

  const playPreview = async () => {
    if (!decodedBuffer || !audioContext || !compressorNode) return;
    
    stopPreview();

    await audioContext.resume();

    sourceNode = audioContext.createBufferSource();
    sourceNode.buffer = decodedBuffer;
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
      // Don't set isPlaying to false here, as it can be a loop
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
      try {
        sourceNode.stop(0);
        sourceNode.disconnect();
      } catch(e) {
        // Source may already be stopped
      }
      sourceNode = null;
    }
    gainNode?.disconnect();
    filterNode?.disconnect();
    pannerNode?.disconnect();
    convolverNode?.disconnect();
    
    setIsPlaying(false);
  };

  const togglePreview = () => {
    if (isPlaying) {
      stopPreview();
    } else {
      playPreview();
    }
  };

  const handleReset = (showToast = true) => {
    setAudioFile(null);
    setDecodedBuffer(null);
    stopPreview();
    setError(null);
    const fileInput = document.getElementById('audio-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
    if (showToast) {
      toast({ title: 'Ready for a new track!' });
    }
  };
  
  const bufferToWav = (buffer: AudioBuffer): Blob => {
    const numOfChan = buffer.numberOfChannels;
    const length = buffer.length * numOfChan * 2 + 44;
    const bufferArray = new ArrayBuffer(length);
    const view = new DataView(bufferArray);
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

    // RIFF header
    setUint32(0x46464952); // "RIFF"
    setUint32(length - 8); 
    setUint32(0x45564157); // "WAVE"

    // "fmt " sub-chunk
    setUint32(0x20746d66); // "fmt "
    setUint32(16); // 16 for PCM
    setUint16(1); // PCM
    setUint16(numOfChan);
    setUint32(buffer.sampleRate);
    setUint32(buffer.sampleRate * 2 * numOfChan); // byte rate
    setUint16(numOfChan * 2); // block align
    setUint16(16); // 16-bit samples

    // "data" sub-chunk
    setUint32(0x61746164); // "data"
    setUint32(length - pos - 4);

    const channels = [];
    for (i = 0; i < buffer.numberOfChannels; i++) {
        channels.push(buffer.getChannelData(i));
    }

    while (pos < length) {
        for (i = 0; i < numOfChan; i++) {
            sample = Math.max(-1, Math.min(1, channels[i][offset]));
            sample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
            view.setInt16(pos, sample, true);
            pos += 2;
        }
        offset++;
    }

    return new Blob([bufferArray], { type: 'audio/wav' });
  }

  const handleDownload = async () => {
    if (!decodedBuffer) {
        toast({
            title: 'No audio to download',
            description: 'Please upload and process an audio file first.',
            variant: 'destructive',
        });
        return;
    }
    
    setIsRendering(true);
    const wasPlaying = isPlaying;
    stopPreview();
    toast({
        title: 'Rendering Audio...',
        description: 'Preparing your file for download. This may take a moment.',
    });

    try {
        const offlineCtx = new OfflineAudioContext(
            decodedBuffer.numberOfChannels,
            decodedBuffer.length,
            decodedBuffer.sampleRate
        );

        // Re-create the full audio graph for the offline context
        const offlineSource = offlineCtx.createBufferSource();
        offlineSource.buffer = decodedBuffer;

        const offlinePanner = offlineCtx.createPanner();
        offlinePanner.panningModel = 'HRTF';
        offlinePanner.distanceModel = 'inverse';

        const offlineFilter = offlineCtx.createBiquadFilter();
        offlineFilter.type = 'lowpass';
        offlineFilter.Q.value = 1;
        
        const offlineGain = offlineCtx.createGain();

        const offlineCompressor = offlineCtx.createDynamicsCompressor();
        offlineCompressor.threshold.value = -25;
        offlineCompressor.knee.value = 30;
        offlineCompressor.ratio.value = 12;
        offlineCompressor.attack.value = 0.003;
        offlineCompressor.release.value = 0.25;
        offlineCompressor.connect(offlineCtx.destination);
        

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
            dryNode.gain.value = 0.75;
            const wetNode = offlineCtx.createGain();
            wetNode.gain.value = 0.25;
            offlineGain.connect(dryNode);
            offlineGain.connect(wetNode);
            wetNode.connect(offlineConvolver);
            offlineConvolver.connect(offlinePanner);
            dryNode.connect(offlineFilter);
            offlineFilter.connect(offlinePanner);
        } else {
            offlineGain.connect(offlineFilter);
            offlineFilter.connect(offlinePanner);
        }
        offlinePanner.connect(offlineCompressor);
        
        const timeStep = 0.05;
        for (let time = 0; time < decodedBuffer.duration; time += timeStep) {
            const { x, y, z, gain, freq } = getAnimationPath(time);
            const rampTime = time + timeStep;
            offlinePanner.positionX.linearRampToValueAtTime(x, rampTime);
            offlinePanner.positionY.linearRampToValueAtTime(y, rampTime);
            offlinePanner.positionZ.linearRampToValueAtTime(z, rampTime);
            offlineFilter.frequency.linearRampToValueAtTime(freq, rampTime);
            offlineGain.gain.linearRampToValueAtTime(gain, rampTime);
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
        if (wasPlaying) {
          playPreview();
        }
    }
  };

  const isBusy = isDecoding || isRendering;

  return (
    <Card className="w-full shadow-lg bg-card/50 backdrop-blur-sm border-primary/20 shadow-primary/10">
      <CardHeader>
        <CardTitle className="font-headline text-3xl tracking-tight">Audio Converter</CardTitle>
        <CardDescription>Upload a track, select an effect, and experience real spatial audio.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="audio-upload">1. Upload Audio File</Label>
          <div
            className={cn(
                "relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-background/50 p-8 transition-colors hover:border-primary/50 hover:bg-accent/10",
                isBusy && "cursor-not-allowed opacity-50"
            )}
            onClick={() => !isBusy && document.getElementById('audio-upload')?.click()}
          >
            <Input
              id="audio-upload"
              type="file"
              className="sr-only"
              accept="audio/*"
              onChange={handleFileChange}
              disabled={isBusy}
            />
            {audioFile && !isBusy ? (
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
            {isBusy && (
               <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm">
                  <RotateCw className="mb-4 h-12 w-12 animate-spin text-primary" />
                  <p className="font-semibold text-foreground">{isDecoding ? "Decoding..." : "Rendering..."}</p>
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
                if (decodedBuffer && !isBusy) {
                   playPreview();
                }
              }, 50);
            }}
            className="grid grid-cols-3 gap-4"
            disabled={isBusy}
          >
            {['4D', '8D', '11D'].map(effect => (
              <Label
                key={effect}
                htmlFor={`effect-${effect}`}
                className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 transition-all hover:bg-accent/20 hover:border-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:shadow-primary/20 peer-data-[state=checked]:shadow-md [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value={effect as EffectType} id={`effect-${effect}`} className="sr-only" />
                <span className="text-lg font-semibold font-headline">{effect}</span>
                <span className="text-xs text-muted-foreground">Audio</span>
              </Label>
            ))}
          </RadioGroup>
        </div>
        
        {error && (
            <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>An Error Occurred</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button onClick={togglePreview} disabled={!decodedBuffer || isBusy} className="w-full sm:w-auto" variant="outline">
          {isPlaying ? <Pause className="mr-2 h-4 w-4 text-primary" /> : <Play className="mr-2 h-4 w-4 text-primary" />}
          {isPlaying ? 'Pause Preview' : 'Play Preview'}
        </Button>
        <Button onClick={handleDownload} disabled={!decodedBuffer || isBusy} className="w-full sm:w-auto">
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
        <Button onClick={() => handleReset()} variant="ghost" className="w-full sm:w-auto sm:ml-auto" disabled={isBusy}>
            Reset
        </Button>
      </CardFooter>
    </Card>
  );
}
