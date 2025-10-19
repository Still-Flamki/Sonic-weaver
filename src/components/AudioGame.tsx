'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Volume2, CheckCircle, XCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type SoundLocation = 'Front Left' | 'Front Right' | 'Back Left' | 'Back Right';

const locations: Record<
  SoundLocation,
  { x: number; y: number; z: number }
> = {
  'Front Left': { x: -2, y: 0, z: -2 },
  'Front Right': { x: 2, y: 0, z: -2 },
  'Back Left': { x: -2, y: 0, z: 2 },
  'Back Right': { x: 2, y: 0, z: 2 },
};

let audioContext: AudioContext | null = null;

export default function AudioGame() {
  const [gameState, setGameState] = useState<'idle' | 'playing' | 'guessing' | 'feedback'>('idle');
  const [score, setScore] = useState(0);
  const [rounds, setRounds] = useState(0);
  const [currentLocation, setCurrentLocation] = useState<SoundLocation | null>(null);
  const [feedback, setFeedback] = useState<{ correct: boolean; guess: SoundLocation } | null>(null);

  const { toast } = useToast();

  const initializeAudio = useCallback(() => {
    if (!audioContext) {
      try {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      } catch (e) {
        console.error('Web Audio API is not supported in this browser.');
        toast({
          title: 'Audio Not Supported',
          description: 'Your browser does not support the Web Audio API for the game.',
          variant: 'destructive',
        });
      }
    }
    return !!audioContext;
  }, [toast]);

  useEffect(() => {
    initializeAudio();
  }, [initializeAudio]);

  const playSoundAtLocation = (location: SoundLocation) => {
    if (!audioContext) return;
    
    setGameState('playing');
    const { x, y, z } = locations[location];

    const oscillator = audioContext.createOscillator();
    oscillator.type = 'sine';
    oscillator.frequency.value = 440; 

    const gainNode = audioContext.createGain();
    gainNode.gain.setValueAtTime(0, audioContext.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.5, audioContext.currentTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);

    const panner = audioContext.createPanner();
    panner.panningModel = 'HRTF';
    panner.distanceModel = 'inverse';
    if(panner.positionX) {
      panner.positionX.value = x;
      panner.positionY.value = y;
      panner.positionZ.value = z;
    } else {
      panner.setPosition(x,y,z);
    }
    

    if(audioContext.listener.positionX) {
      audioContext.listener.positionX.value = 0;
      audioContext.listener.positionY.value = 0;
      audioContext.listener.positionZ.value = 0;
    } else {
      audioContext.listener.setPosition(0,0,0);
    }

    oscillator.connect(gainNode).connect(panner).connect(audioContext.destination);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.3);
    
    oscillator.onended = () => {
      setGameState('guessing');
    };
  };

  const startRound = () => {
    if (!initializeAudio()) return;

    setFeedback(null);
    const locationKeys = Object.keys(locations) as SoundLocation[];
    const randomLocation = locationKeys[Math.floor(Math.random() * locationKeys.length)];
    setCurrentLocation(randomLocation);
    playSoundAtLocation(randomLocation);
  };

  const handleGuess = (guess: SoundLocation) => {
    if (gameState !== 'guessing' || !currentLocation) return;
    
    const isCorrect = guess === currentLocation;
    setFeedback({ correct: isCorrect, guess });
    setGameState('feedback');
    setRounds(rounds + 1);
    if(isCorrect) {
      setScore(score + 1);
    }

    setTimeout(() => {
        if(rounds < 4) { // Play 5 rounds
            startRound();
        } else {
            setGameState('idle');
            toast({
                title: 'Game Over!',
                description: `You scored ${score + (isCorrect ? 1 : 0)} out of 5. ${score + (isCorrect ? 1 : 0) > 3 ? 'Great ears!' : 'Keep practicing!'}`,
            });
            setScore(0);
            setRounds(0);
        }
    }, 2000);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="relative shadow-lg bg-card/50 backdrop-blur-sm border-accent/20 shadow-accent/10 overflow-hidden">
        <div className="relative flex flex-col justify-center items-center text-center p-8 md:p-10 min-h-[500px]">
            <div className="w-full">
              <CardTitle className="font-headline text-2xl tracking-tight mb-2">
                Where is the sound?
              </CardTitle>
              <div className="flex items-center justify-center gap-4 text-lg font-semibold">
                  <span>Score: {score} / 5</span>
              </div>
            </div>

            {gameState === 'idle' ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 my-8">
                    <p className="text-muted-foreground text-center max-w-xs">Press Start to begin the game. <br/> Headphones are required!</p>
                    <Button onClick={startRound} size="lg" variant="secondary" className="bg-accent text-accent-foreground hover:bg-accent/90">
                        <Play className="mr-2 h-5 w-5" />
                        Start Game
                    </Button>
                </div>
            ) : (
                <>
                <div className="relative aspect-square max-w-[300px] w-full mx-auto my-6 flex-1 flex items-center justify-center">
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center">
                            <Volume2 className="h-12 w-12 text-primary animate-pulse" />
                        </div>
                    </div>
                    {(Object.keys(locations) as SoundLocation[]).map((loc, i) => {
                        const angle = (i * 90) - 45;
                        const feedbackForThisButton = feedback && feedback.guess === loc;
                        const isCorrect = feedbackForThisButton && feedback.correct;
                        const isIncorrect = feedbackForThisButton && !feedback.correct;
                        return (
                            <Button
                                key={loc}
                                variant="outline"
                                size="lg"
                                onClick={() => handleGuess(loc)}
                                disabled={gameState !== 'guessing'}
                                className={cn(
                                    "absolute w-32 h-16 transition-all duration-300",
                                    isCorrect && "bg-green-500/80 border-green-400 text-white",
                                    isIncorrect && "bg-destructive/80 border-destructive-foreground/50 text-white"
                                )}
                                style={{
                                    transform: `translate(-50%, -50%) translate(${Math.cos(angle * Math.PI / 180) * 120}px, ${Math.sin(angle * Math.PI / 180) * 120}px)`
                                }}
                            >
                                {feedbackForThisButton && (
                                  isCorrect ? <CheckCircle className="mr-2 h-5 w-5" /> : <XCircle className="mr-2 h-5 w-5" />
                                )}
                                {loc.split(' ')[1]}
                            </Button>
                        );
                    })}
                </div>

                <div className="w-full mt-auto">
                    <Button variant="ghost" onClick={() => playSoundAtLocation(currentLocation!)} disabled={!currentLocation || gameState !== 'guessing'}>
                        <Volume2 className="mr-2 h-4 w-4" />
                        Replay Sound
                    </Button>
                </div>
                </>
            )}
        </div>
      </Card>
    </div>
  );
}
