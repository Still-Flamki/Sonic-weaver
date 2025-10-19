'use client';

import { useState, useTransition, ChangeEvent, Dispatch, SetStateAction, useRef } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UploadCloud, Download, FileAudio, RotateCw, CheckCircle2, Play, Pause } from 'lucide-react';
import type { EffectType } from './SonicWeaverApp';
import { useToast } from '@/hooks/use-toast';
import { processAudio } from '@/app/actions/processAudio';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { Terminal } from 'lucide-react';

interface AudioProcessorProps {
  effectType: EffectType;
  setEffectType: Dispatch<SetStateAction<EffectType>>;
  audioFile: File | null;
  setAudioFile: Dispatch<SetStateAction<File | null>>;
}

export default function AudioProcessor({
  effectType,
  setEffectType,
  audioFile,
  setAudioFile,
}: AudioProcessorProps) {
  const [isProcessing, startProcessing] = useTransition();
  const [processedAudio, setProcessedAudio] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setAudioFile(file);
        setProcessedAudio(null);
        if (audioRef.current) {
          audioRef.current.pause();
          setIsPlaying(false);
        }
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload a valid audio file.',
          variant: 'destructive',
        });
      }
    }
  };

  const handleConvert = () => {
    if (!audioFile) {
      toast({
        title: 'No File Selected',
        description: 'Please upload an audio file first.',
        variant: 'destructive',
      });
      return;
    }

    startProcessing(async () => {
      setProcessedAudio(null);
      try {
        const reader = new FileReader();
        reader.readAsDataURL(audioFile);
        reader.onload = async () => {
          const base64Audio = reader.result as string;
          try {
            const result = await processAudio({
              audio: base64Audio,
              effect: effectType,
            });
            setProcessedAudio(result.processedAudio);
            toast({
              title: 'Processing Complete!',
              description: `Your ${effectType} audio is ready.`,
            });
          } catch (error) {
            console.error('Processing error:', error);
            toast({
              title: 'Processing Failed',
              description: 'Something went wrong while processing the audio.',
              variant: 'destructive',
            });
          }
        };
      } catch (error) {
        console.error('File reading error:', error);
        toast({
          title: 'File Error',
          description: 'Could not read the audio file.',
          variant: 'destructive',
        });
      }
    });
  };

  const handleDownload = () => {
    if (processedAudio) {
      const a = document.createElement('a');
      a.href = processedAudio;
      a.download = `sonic-weaver-${effectType}-${audioFile?.name || 'audio.wav'}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }
  };
  
  const handleReset = () => {
    setAudioFile(null);
    setProcessedAudio(null);
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  };

  const togglePreview = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  };

  return (
    <Card className="w-full shadow-lg border-border/50">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Audio Converter</CardTitle>
        <CardDescription>Upload your track, select an AI effect, and preview the result.</CardDescription>
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
                <p className="text-sm">Any audio format supported</p>
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <Label>2. Select Effect Type</Label>
          <RadioGroup
            value={effectType}
            onValueChange={(value: EffectType) => setEffectType(value)}
            className="grid grid-cols-3 gap-4"
            disabled={isProcessing}
          >
            {['4D', '8D', '11D'].map(effect => (
              <Label
                key={effect}
                htmlFor={`effect-${effect}`}
                className="flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
              >
                <RadioGroupItem value={effect} id={`effect-${effect}`} className="sr-only" />
                <span className="text-lg font-semibold">{effect}</span>
                <span className="text-xs text-muted-foreground">Audio</span>
              </Label>
            ))}
          </RadioGroup>
        </div>

        {isProcessing && (
          <Alert>
            <Terminal className="h-4 w-4" />
            <AlertTitle>Processing Audio</AlertTitle>
            <AlertDescription>
              The AI is weaving its magic. This may take a moment...
            </AlertDescription>
          </Alert>
        )}

        {processedAudio && (
          <audio
            ref={audioRef}
            src={processedAudio}
            onPlay={() => setIsPlaying(true)}
            onPause={() => setIsPlaying(false)}
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleConvert} disabled={isProcessing || !audioFile} className="w-full sm:w-auto">
          {isProcessing ? (
            <>
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : processedAudio ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Process Again
            </>
          ) : (
            'Process Audio'
          )}
        </Button>
        <Button onClick={togglePreview} disabled={!processedAudio || isProcessing} className="w-full sm:w-auto" variant="secondary">
          {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
          {isPlaying ? 'Pause' : 'Preview'}
        </Button>
        <Button onClick={handleDownload} disabled={!processedAudio || isProcessing} className="w-full sm:w-auto">
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
