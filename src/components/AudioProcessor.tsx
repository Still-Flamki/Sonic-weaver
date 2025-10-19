'use client';

import { useState, useRef, useEffect, Dispatch, SetStateAction, ChangeEvent } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { UploadCloud, Download, FileAudio, RotateCw, Play, Pause, XCircle, Video, Music } from 'lucide-react';
import type { EffectType } from './SonicWeaverApp';
import { useToast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { cn } from '@/lib/utils';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import AudioVisualizer, { VisualizationType } from './AudioVisualizer';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

interface AudioProcessorProps {
  effectType: EffectType;
  setEffectType: Dispatch<SetStateAction<EffectType>>;
  audioFile: File | null;
  setAudioFile: Dispatch<SetStateAction<File | null>>;
}

type MovementPath = 'Circle' | 'Wide Arc' | 'Figure-8';

let audioContext: AudioContext | null = null;
let sourceNode: AudioBufferSourceNode | null = null;
let pannerNode: PannerNode | null = null;
let filterNode: BiquadFilterNode | null = null;
let gainNode: GainNode | null = null;
let convolverNode: ConvolverNode | null = null;
let compressorNode: DynamicsCompressorNode | null = null;
let dryNode: GainNode | null = null;
let wetNode: GainNode | null = null;

let lowShelfFilter: BiquadFilterNode | null = null;
let midPeakingFilter: BiquadFilterNode | null = null;
let highShelfFilter: BiquadFilterNode | null = null;
let analyserNode: AnalyserNode | null = null;


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
  const visualizerCanvasRef = useRef<HTMLCanvasElement>(null);
  
  const [customSpeed, setCustomSpeed] = useState(8);
  const [customWidth, setCustomWidth] = useState(3);
  const [customReverb, setCustomReverb] = useState(0.25);
  const [customBass, setCustomBass] = useState(0);
  const [customMid, setCustomMid] = useState(0);
  const [customTreble, setCustomTreble] = useState(0);
  const [customMovement, setCustomMovement] = useState<MovementPath>('Figure-8');
  const [visualizationType, setVisualizationType] = useState<VisualizationType>('fabric');


  const { toast } = useToast();

  useEffect(() => {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        // Set up a mastering compressor at the end of the chain
        compressorNode = audioContext.createDynamicsCompressor();
        compressorNode.threshold.value = -18; 
        compressorNode.knee.value = 20;      
        compressorNode.ratio.value = 8;     
        compressorNode.attack.value = 0.005; 
        compressorNode.release.value = 0.25;  
        compressorNode.connect(audioContext.destination);

        analyserNode = audioContext.createAnalyser();
        analyserNode.fftSize = 512;
      } catch (e) {
        setError('Web Audio API is not supported in this browser.');
        console.error(e);
      }
    }
    return () => {
      stopPreview();
    };
  }, []);
  
  useEffect(() => {
    if (isPlaying && effectType === 'Custom' && audioContext) {
        const rampTime = audioContext.currentTime + 0.1;
        if(wetNode?.gain) wetNode.gain.linearRampToValueAtTime(customReverb, rampTime);
        if(dryNode?.gain) dryNode.gain.linearRampToValueAtTime(1 - customReverb, rampTime);
        if(lowShelfFilter?.gain) lowShelfFilter.gain.linearRampToValueAtTime(customBass, rampTime);
        if(midPeakingFilter?.gain) midPeakingFilter.gain.linearRampToValueAtTime(customMid, rampTime);
        if(highShelfFilter?.gain) highShelfFilter.gain.linearRampToValueAtTime(customTreble, rampTime);
    }
  }, [customReverb, customBass, customMid, customTreble, isPlaying, effectType]);

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
    const decay = 3;
    const impulse = context.createBuffer(2, duration * rate, rate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);
    const len = impulse.length;
    for (let i = 0; i < len; i++) {
        const t = i / rate;
        // Use a decaying noise, but modulate it slightly for a more natural tail
        const noise = Math.random() * 2 - 1;
        const envelope = Math.pow(1 - t / duration, decay) * (1 - 0.5 * Math.sin(t * 10));
        left[i] = noise * envelope;
        right[i] = noise * envelope;
    }
    return impulse;
  };

  const getAnimationPath = (time: number) => {
    let radius = 3;
    let duration = 8;
    let path: { x: number; y: number; z: number };
    let freq = 22050; // Default: no filter
    let gain = 1.0;
    
    let currentEffect: EffectType | MovementPath = effectType;
    if (effectType === 'Custom') {
        currentEffect = customMovement;
        radius = customWidth;
        duration = 16 - customSpeed; // Inverse relationship: higher speed value means shorter duration
    }

    switch (currentEffect) {
      case '4D':
      case 'Wide Arc': {
        const angle = time * (Math.PI / duration); // Slower, wider arc
        path = {
          x: radius * Math.sin(angle),
          y: 0,
          z: radius * (Math.cos(angle) * 2 - 1),
        };
        gain = 0.9;
        freq = 22050;
        break;
      }
      case '8D':
      case 'Circle': {
        const angle = (2 * Math.PI / duration) * time;
        path = { x: radius * Math.sin(angle), y: 0, z: radius * Math.cos(angle) };
        gain = 0.9; // Constant gain for 8D
        freq = 22050;
        break;
      }
      case '11D':
      case 'Figure-8': {
        const x = radius * Math.sin((2 * Math.PI / duration) * time);
        const z = radius * Math.cos((2 * Math.PI / duration) * time);
        const y = Math.cos((4 * Math.PI / duration) * time) * 0.5; // Vertical component
        path = { x, y, z };
        
        const distance = Math.sqrt(x * x + y * y + z * z);
        const minGain = 0.4;
        const maxGain = 0.8;
        
        const proximityThreshold = 1.2;
        if (distance < proximityThreshold) {
            const proximityFactor = Math.pow(distance / proximityThreshold, 1.5);
            gain = minGain * proximityFactor;
        } else {
            const distanceFactor = Math.min(1, (distance - proximityThreshold) / (radius - proximityThreshold));
            gain = minGain + (maxGain - minGain) * distanceFactor;
        }
        gain = Math.max(0, Math.min(maxGain, gain));

        const baseFreq = 2500;
        const freqRange = 15000;
        const zNormalized = (z + radius) / (2 * radius);
        freq = baseFreq + (zNormalized * freqRange);
        break;
      }
      default:
        path = { x: 0, y: 0, z: 0 };
    }
    
    return { ...path, gain, freq };
  };

  const setupAudioGraph = async (context: AudioContext | OfflineAudioContext, destination: AudioNode) => {
    // Universal nodes
    gainNode = context.createGain();
    pannerNode = context.createPanner();
    pannerNode.panningModel = 'HRTF';
    pannerNode.distanceModel = 'inverse';
    
    filterNode = context.createBiquadFilter(); // This is the dynamic low-pass filter for spatial effects
    filterNode.type = 'lowpass';
    filterNode.Q.value = 0.7; // Smoother Q value

    // EQ Nodes (for Custom mode)
    lowShelfFilter = context.createBiquadFilter();
    lowShelfFilter.type = 'lowshelf';
    lowShelfFilter.frequency.value = 320; // Bass frequencies
    lowShelfFilter.gain.value = effectType === 'Custom' ? customBass : 0;

    midPeakingFilter = context.createBiquadFilter();
    midPeakingFilter.type = 'peaking';
    midPeakingFilter.frequency.value = 1000; // Mid frequencies
    midPeakingFilter.Q.value = 0.8; // Wider Q to be more musical
    midPeakingFilter.gain.value = effectType === 'Custom' ? customMid : 0;

    highShelfFilter = context.createBiquadFilter();
    highShelfFilter.type = 'highshelf';
    highShelfFilter.frequency.value = 3200; // Treble frequencies
    highShelfFilter.gain.value = effectType === 'Custom' ? customTreble : 0;


    const shouldUseReverb = effectType === '11D' || (effectType === 'Custom' && customReverb > 0);
    const reverbAmount = effectType === 'Custom' ? customReverb : 0.25;

    // Connect EQ chain: gain -> low -> mid -> high
    if (gainNode && lowShelfFilter && midPeakingFilter && highShelfFilter) {
      gainNode.connect(lowShelfFilter);
      lowShelfFilter.connect(midPeakingFilter);
      midPeakingFilter.connect(highShelfFilter);
    }
    
    let lastNodeInChain: AudioNode | null = highShelfFilter;

    if (shouldUseReverb && lastNodeInChain) {
        convolverNode = context.createConvolver();
        const impulse = await createReverbImpulseResponse(context as BaseAudioContext);
        if (impulse) convolverNode.buffer = impulse;

        dryNode = context.createGain();
        wetNode = context.createGain();
        
        dryNode.gain.value = 1 - reverbAmount;
        wetNode.gain.value = reverbAmount;

        lastNodeInChain.connect(dryNode);
        lastNodeInChain.connect(wetNode);

        wetNode.connect(convolverNode);

        if (filterNode && pannerNode) {
          dryNode.connect(filterNode);
          convolverNode.connect(pannerNode);
          filterNode.connect(pannerNode);
        }
    } else if (lastNodeInChain && filterNode && pannerNode) {
        lastNodeInChain.connect(filterNode);
        filterNode.connect(pannerNode);
    }

    if(pannerNode && destination) {
        if(analyserNode && context instanceof AudioContext) {
            pannerNode.connect(analyserNode);
            analyserNode.connect(destination);
        } else {
             pannerNode.connect(destination);
        }
    }
};

  const startSpatialAnimation = async () => {
    if (!audioContext || !compressorNode) return;
  
    await setupAudioGraph(audioContext, compressorNode);

    if (!pannerNode || !filterNode || !gainNode) return;

    const p = pannerNode;
    const f = filterNode;
    const g = gainNode;
    
    const startTime = audioContext.currentTime;

    const animate = () => {
      if (!audioContext || !p?.positionX || !f?.frequency || !g?.gain) {
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

    if(audioContext.listener.positionX) {
      audioContext.listener.positionX.value = 0;
      audioContext.listener.positionY.value = 0;
      audioContext.listener.positionZ.value = 0;
    } else {
       audioContext.listener.setPosition(0,0,0);
    }
    
    await startSpatialAnimation();
    
    if (gainNode && sourceNode) {
       sourceNode.connect(gainNode);
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
      } catch(e) {
        // Source may already be stopped
      }
      sourceNode = null;
    }
    // Disconnect all nodes in the chain to be safe
    gainNode?.disconnect();
    filterNode?.disconnect();
    pannerNode?.disconnect();
    convolverNode?.disconnect();
    dryNode?.disconnect();
    wetNode?.disconnect();
    lowShelfFilter?.disconnect();
    midPeakingFilter?.disconnect();
    highShelfFilter?.disconnect();
    analyserNode?.disconnect();
    
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

  const downloadFile = (blob: Blob, fileType: 'audio' | 'video') => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.style.display = 'none';
    a.href = url;
    const extension = fileType === 'audio' ? 'wav' : 'webm';
    a.download = `sonic-weaver-${effectType}-${audioFile?.name.replace(/\.[^/.]+$/, "") || 'track'}.${extension}`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
a.remove();

     toast({
        title: 'Download Ready!',
        description: `Your processed ${fileType} has been downloaded.`,
    });
  }

  const handleDownload = async (fileType: 'audio' | 'video') => {
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
        title: `Rendering ${fileType}...`,
        description: 'Preparing your file for download. This may take a moment.',
    });

    try {
        const offlineCtx = new OfflineAudioContext(
            decodedBuffer.numberOfChannels,
            decodedBuffer.length,
            decodedBuffer.sampleRate
        );

        const mediaStreamDestination = offlineCtx.createMediaStreamDestination();
        
        await setupAudioGraph(offlineCtx, mediaStreamDestination);

        if(offlineCtx.listener.positionX) {
            offlineCtx.listener.positionX.value = 0;
            offlineCtx.listener.positionY.value = 0;
            offlineCtx.listener.positionZ.value = 0;
        } else {
            offlineCtx.listener.setPosition(0,0,0);
        }
        
        const offlineSource = offlineCtx.createBufferSource();
        offlineSource.buffer = decodedBuffer;
        if(gainNode) {
            offlineSource.connect(gainNode);
        }
        
        // Manual animation for offline rendering
        const graphPannerNode = pannerNode;
        const graphFilterNode = filterNode;
        const graphGainNode = gainNode;

        const timeStep = 1 / 60; // Render at 60fps
        for (let time = 0; time < decodedBuffer.duration; time += timeStep) {
            const { x, y, z, gain, freq } = getAnimationPath(time);
            const rampTime = time;
            graphPannerNode?.positionX.setValueAtTime(x, rampTime);
            graphPannerNode?.positionY.setValueAtTime(y, rampTime);
            graphPannerNode?.positionZ.setValueAtTime(z, rampTime);
            graphFilterNode?.frequency.setValueAtTime(freq, rampTime);
            graphGainNode?.gain.setValueAtTime(gain, rampTime);
        }

        offlineSource.start(0);

        if (fileType === 'video') {
            const canvas = visualizerCanvasRef.current;
            if (!canvas) throw new Error("Visualizer canvas not found");

            const videoStream = canvas.captureStream(60); 
            const audioStream = mediaStreamDestination.stream;

            const combinedStream = new MediaStream([
                videoStream.getVideoTracks()[0],
                audioStream.getAudioTracks()[0],
            ]);

            const recorder = new MediaRecorder(combinedStream, { mimeType: 'video/webm' });
            const chunks: Blob[] = [];
            recorder.ondataavailable = (event) => chunks.push(event.data);

            recorder.onstop = () => {
                const videoBlob = new Blob(chunks, { type: 'video/webm' });
                downloadFile(videoBlob, 'video');
            };

            recorder.start();
            await offlineCtx.startRendering();
            recorder.stop();

        } else {
            const renderedBuffer = await offlineCtx.startRendering();
            const wavBlob = bufferToWav(renderedBuffer);
            downloadFile(wavBlob, 'audio');
        }

    } catch (e) {
        console.error('Offline rendering error:', e);
        const message = e instanceof Error ? e.message : 'Could not render the file.';
        setError(`Failed to render the ${fileType}. ${message}`);
        toast({
            title: 'Download Failed',
            description: `Could not render the ${fileType}.`,
            variant: 'destructive',
        });
    } finally {
        setIsRendering(false);
        if (wasPlaying && decodedBuffer) {
          playPreview();
        }
    }
  };

  const isBusy = isDecoding || isRendering;

  const handleEffectChange = (value: EffectType) => {
      setEffectType(value);
      if (isPlaying) {
        // Effect change during playback, re-initialize animation
        stopPreview();
        setTimeout(() => playPreview(), 50);
      }
  }

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
                "relative flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-input bg-background/50 p-8 transition-colors hover:border-primary/50 hover:bg-primary/10",
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {(['4D', '8D', '11D', 'Custom'] as const).map(effect => (
                <button
                  key={effect}
                  onClick={() => handleEffectChange(effect)}
                  disabled={isBusy}
                  className={cn(
                    "rounded-md border-2 p-4 font-headline text-lg font-semibold transition-all",
                    "border-input bg-background/50 hover:border-primary/50 hover:bg-primary/10",
                    effectType === effect ? "border-primary/80 bg-primary/20 text-primary-foreground shadow-lg shadow-primary/10" : "text-muted-foreground",
                    isBusy && "cursor-not-allowed opacity-50"
                  )}
                >
                  {effect}
                </button>
            ))}
          </div>
        </div>

        {effectType === 'Custom' && (
          <Card className="bg-background/30 border-primary/20">
            <CardHeader>
                <CardTitle className="font-headline text-xl tracking-tight">Custom Controls</CardTitle>
                <CardDescription>Fine-tune the audio effect parameters in real-time.</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6 pt-2">
                 <div className="grid gap-2">
                    <Label htmlFor="movement-path-select">Movement Path</Label>
                     <Select value={customMovement} onValueChange={(val: MovementPath) => setCustomMovement(val)} disabled={isBusy}>
                        <SelectTrigger id="movement-path-select">
                            <SelectValue placeholder="Select a path" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Figure-8">Figure-8</SelectItem>
                            <SelectItem value="Circle">Circle</SelectItem>
                            <SelectItem value="Wide Arc">Wide Arc</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="speed-slider">Speed</Label>
                    <Slider
                        id="speed-slider"
                        min={1} max={15}
                        value={[customSpeed]}
                        onValueChange={(val) => setCustomSpeed(val[0])}
                        disabled={isBusy}
                    />
                     <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Slow</span>
                        <span>Fast</span>
                    </div>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="width-slider">Width</Label>
                    <Slider
                        id="width-slider"
                        min={1} max={10}
                        value={[customWidth]}
                        onValueChange={(val) => setCustomWidth(val[0])}
                        disabled={isBusy}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Narrow</span>
                        <span>Wide</span>
                    </div>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="reverb-slider">Reverb</Label>
                    <Slider
                        id="reverb-slider"
                        min={0} max={1} step={0.05}
                        value={[customReverb]}
                        onValueChange={(val) => setCustomReverb(val[0])}
                        disabled={isBusy}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>Dry</span>
                        <span>Wet</span>
                    </div>
                </div>
                <div className="grid gap-2">
                    <Label htmlFor="bass-slider">Bass</Label>
                    <Slider
                        id="bass-slider"
                        min={-10} max={10} step={1}
                        value={[customBass]}
                        onValueChange={(val) => setCustomBass(val[0])}
                        disabled={isBusy}
                    />
                     <div className="flex justify-between text-xs text-muted-foreground">
                        <span>-10dB</span>
                        <span>+10dB</span>
                    </div>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="mid-slider">Mids</Label>
                    <Slider
                        id="mid-slider"
                        min={-10} max={10} step={1}
                        value={[customMid]}
                        onValueChange={(val) => setCustomMid(val[0])}
                        disabled={isBusy}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>-10dB</span>
                        <span>+10dB</span>
                    </div>
                </div>
                 <div className="grid gap-2">
                    <Label htmlFor="treble-slider">Treble</Label>                    <Slider
                        id="treble-slider"
                        min={-10} max={10} step={1}
                        value={[customTreble]}
                        onValueChange={(val) => setCustomTreble(val[0])}
                        disabled={isBusy}
                    />
                    <div className="flex justify-between text-xs text-muted-foreground">
                        <span>-10dB</span>
                        <span>+10dB</span>
                    </div>
                </div>
            </CardContent>
          </Card>
        )}
        
        {decodedBuffer && (
          <div className="pt-4 space-y-4">
            <div className="grid gap-2">
                <Label htmlFor="viz-select">3. Select Visualization</Label>
                <Select value={visualizationType} onValueChange={(val: VisualizationType) => setVisualizationType(val)} disabled={isBusy}>
                    <SelectTrigger id="viz-select" className="w-full md:w-[240px]">
                        <SelectValue placeholder="Select a visualization" />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="fabric">Aether Weaver</SelectItem>
                        <SelectItem value="bloom">Fractal Bloom</SelectItem>
                        <SelectItem value="chromatic">Chromatic Aberration</SelectItem>
                        <SelectItem value="skyline">Neon Skyline</SelectItem>
                        <SelectItem value="tunnel">Warp Tunnel</SelectItem>
                        <SelectItem value="orb">Waveform Orb</SelectItem>
                        <SelectItem value="bars">Frequency Bars</SelectItem>
                    </SelectContent>
                </Select>
            </div>
            <AudioVisualizer 
                ref={visualizerCanvasRef}
                analyserNode={analyserNode} 
                isPlaying={isPlaying}
                visualizationType={visualizationType} 
            />
          </div>
        )}

        {error && (
            <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertTitle>An Error Occurred</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
            </Alert>
        )}

      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-4">
        <Button onClick={togglePreview} disabled={!decodedBuffer || isBusy} className="w-full sm:w-auto" variant="outline">
          {isPlaying ? <Pause className="mr-2 h-4 w-4 text-primary" /> : <Play className="mr-2 h-4 w-4 text-primary" />}
          {isPlaying ? 'Pause Preview' : 'Play Preview'}
        </Button>
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button disabled={!decodedBuffer || isBusy} className="w-full sm:w-auto">
                    {isRendering ? (
                        <RotateCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <Download className="mr-2 h-4 w-4" />
                    )}
                    Download
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem onClick={() => handleDownload('audio')}>
                    <Music className="mr-2 h-4 w-4" />
                    <span>Audio Only (.wav)</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleDownload('video')}>
                    <Video className="mr-2 h-4 w-4" />
                    <span>Video (.webm)</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <Button onClick={() => handleReset()} variant="ghost" className="w-full sm:w-auto sm:ml-auto" disabled={isBusy}>
            Reset
        </Button>
      </CardFooter>
    </Card>
  );
}
