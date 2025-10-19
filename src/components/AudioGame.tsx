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
    setRounds(0);
    setScore(0);
    playSoundAtLocation(randomLocation);
  };

  const handleGuess = (guess: SoundLocation) => {
    if (gameState !== 'guessing' || !currentLocation) return;
    
    const isCorrect = guess === currentLocation;
    const newScore = isCorrect ? score + 1 : score;
    const newRounds = rounds + 1;
    
    setFeedback({ correct: isCorrect, guess });
    setGameState('feedback');
    setRounds(newRounds);
    setScore(newScore);

    setTimeout(() => {
        if(newRounds < 5) { 
            const locationKeys = Object.keys(locations) as SoundLocation[];
            const randomLocation = locationKeys[Math.floor(Math.random() * locationKeys.length)];
            setCurrentLocation(randomLocation);
            playSoundAtLocation(randomLocation);
        } else {
            setGameState('idle');
            toast({
                title: 'Game Over!',
                description: `You scored ${newScore} out of 5. ${newScore > 3 ? 'Great ears!' : 'Keep practicing!'}`,
            });
        }
    }, 2000);
  };

  const renderGuessButton = (loc: SoundLocation, gridPosition: string) => {
    const feedbackForThisButton = feedback && feedback.guess === loc;
    const isCorrect = feedbackForThisButton && feedback.correct;
    const isIncorrect = feedbackForThisButton && !feedback.correct;

    return (
        <div className={cn("flex items-center justify-center", gridPosition)}>
            <Button
                variant="outline"
                size="lg"
                onClick={() => handleGuess(loc)}
                disabled={gameState !== 'guessing'}
                className={cn(
                    "w-24 h-16 md:w-32 md:h-16 transition-all duration-300 text-xs md:text-sm",
                    isCorrect && "bg-green-500/80 border-green-400 text-white",
                    isIncorrect && "bg-destructive/80 border-destructive-foreground/50 text-white"
                )}
            >
                {feedbackForThisButton && (
                  isCorrect ? <CheckCircle className="mr-2 h-5 w-5" /> : <XCircle className="mr-2 h-5 w-5" />
                )}
                <span>{loc.split(' ')[0]}</span>
                <span className="font-bold ml-1">{loc.split(' ')[1]}</span>
            </Button>
        </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <Card className="relative shadow-lg bg-card/50 backdrop-blur-sm border-accent/20 shadow-accent/10 overflow-hidden">
        <div className="flex flex-col justify-center items-center text-center p-4 md:p-10 min-h-[400px] md:min-h-[500px]">
            <div className="w-full">
              <CardTitle className="font-headline text-xl md:text-2xl tracking-tight mb-2">
                Where is the sound?
              </CardTitle>
              <div className="flex items-center justify-center gap-4 text-base md:text-lg font-semibold">
                  <span>Score: {score} / 5</span>
              </div>
            </div>

            {gameState === 'idle' ? (
                <div className="flex-1 flex flex-col items-center justify-center h-full gap-4 my-8">
                    <p className="text-muted-foreground text-center max-w-xs text-sm md:text-base">Press Start to begin the game. <br/> Headphones are required!</p>
                    <Button onClick={startRound} size="lg" variant="secondary" className="bg-accent text-accent-foreground hover:bg-accent/90">
                        <Play className="mr-2 h-5 w-5" />
                        Start Game
                    </Button>
                </div>
            ) : (
                <div className="flex-1 flex flex-col w-full items-center justify-center my-6">
                    <div className="grid grid-cols-3 grid-rows-3 gap-2 md:gap-4 w-full max-w-xs md:max-w-sm aspect-square">
                        {renderGuessButton('Front Left', 'col-start-1 row-start-1')}
                        <div className="col-start-2 row-start-2 flex items-center justify-center">
                            <div className="h-20 w-20 md:h-24 md:w-24 rounded-full bg-primary/20 flex items-center justify-center">
                                <Volume2 className="h-10 w-10 md:h-12 md:w-12 text-primary animate-pulse" />
                            </div>
                        </div>
                        {renderGuessButton('Front Right', 'col-start-3 row-start-1')}
                        {renderGuessButton('Back Left', 'col-start-1 row-start-3')}
                        {renderGuessButton('Back Right', 'col-start-3 row-start-3')}
                    </div>
                </div>
            )}
            
            {gameState !== 'idle' && (
                <div className="w-full h-10 mt-auto">
                     <Button variant="ghost" onClick={() => playSoundAtLocation(currentLocation!)} disabled={!currentLocation || gameState !== 'guessing'}>
                        <Volume2 className="mr-2 h-4 w-4" />
                        Replay Sound
                    </Button>
                </div>
            )}
        </div>
      </Card>
    </div>
  );
}
