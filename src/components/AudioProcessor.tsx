'use client';

import { useState, useTransition, ChangeEvent, Dispatch, SetStateAction } from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { UploadCloud, Download, FileAudio, RotateCw, CheckCircle2 } from 'lucide-react';
import type { EffectType } from './SonicWeaverApp';
import { useToast } from '@/hooks/use-toast';

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
  const [progress, setProgress] = useState(0);
  const [isProcessed, setIsProcessed] = useState(false);
  const { toast } = useToast();

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === 'audio/mpeg' || file.type === 'audio/wav') {
        setAudioFile(file);
        setIsProcessed(false);
        setProgress(0);
      } else {
        toast({
          title: 'Invalid File Type',
          description: 'Please upload an MP3 or WAV file.',
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

    startProcessing(() => {
      setIsProcessed(false);
      setProgress(0);
      const interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 95) {
            return prev;
          }
          return prev + 5;
        });
      }, 200);

      // Simulate network and processing delay
      setTimeout(() => {
        clearInterval(interval);
        setProgress(100);
        setIsProcessed(true);
        toast({
          title: 'Processing Complete!',
          description: `Your ${effectType} audio is ready for download.`,
        });
      }, 4000);
    });
  };

  const handleDownload = () => {
    if (audioFile && isProcessed) {
      // Mock download by creating a URL for the original file
      const url = URL.createObjectURL(audioFile);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sonic-weaver-${effectType}-${audioFile.name}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  const handleReset = () => {
    setAudioFile(null);
    setIsProcessed(false);
    setProgress(0);
  };

  return (
    <Card className="w-full shadow-lg border-border/50">
      <CardHeader>
        <CardTitle className="font-headline text-2xl">Audio Converter</CardTitle>
        <CardDescription>Upload your track and select an effect to get started.</CardDescription>
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
              accept=".mp3,.wav"
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
                <p className="text-sm">MP3 or WAV files supported</p>
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

        {(isProcessing || isProcessed) && (
          <div className="space-y-2 pt-4">
            <Label>3. Processing</Label>
            <div className="flex items-center gap-4">
              <Progress value={progress} className="w-full" />
              <span className="text-sm font-semibold text-muted-foreground">{progress}%</span>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-2">
        <Button onClick={handleConvert} disabled={isProcessing || !audioFile} className="w-full sm:w-auto">
          {isProcessing ? (
            <>
              <RotateCw className="mr-2 h-4 w-4 animate-spin" />
              Processing...
            </>
          ) : isProcessed ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Processed
            </>
          ) : (
            'Convert Audio'
          )}
        </Button>
        <Button onClick={handleDownload} disabled={!isProcessed || isProcessing} className="w-full sm:w-auto">
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
