'use client';

import { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
}

type Particle = {
  x: number;
  y: number;
  size: number;
  velocityX: number;
  velocityY: number;
  color: string;
  life: number;
};

// Main component
export default function AudioVisualizer({ analyserNode, isPlaying }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const particlesRef = useRef<Particle[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvasCtx = canvas.getContext('2d');
    if(!canvasCtx) return;

    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Set canvas dimensions
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvasCtx.scale(dpr, dpr);
    
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    const primaryColor = { r: 59, g: 130, b: 246 }; // Blue
    const accentColor = { r: 16, g: 185, b: 129 }; // Green

    const createParticle = (x: number, y: number, size: number, color: string) => {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 2 + 1;
        return {
            x,
            y,
            size: Math.max(1, size),
            velocityX: Math.cos(angle) * speed * 0.5,
            velocityY: Math.sin(angle) * speed * 0.5,
            color,
            life: 1, // 1 = full life, 0 = dead
        };
    };

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      analyserNode.getByteFrequencyData(dataArray);

      // Semi-transparent background for a trailing effect
      canvasCtx.fillStyle = 'rgba(10, 18, 28, 0.2)';
      canvasCtx.fillRect(0, 0, width, height);
      
      const centerX = width / 2;
      const centerY = height / 2;

      // Create a glowing core
      const coreGradient = canvasCtx.createRadialGradient(centerX, centerY, 10, centerX, centerY, width * 0.4);
      coreGradient.addColorStop(0, 'rgba(59, 130, 246, 0.1)');
      coreGradient.addColorStop(1, 'rgba(10, 18, 28, 0)');
      canvasCtx.fillStyle = coreGradient;
      canvasCtx.fillRect(0, 0, width, height);

      // Analyze bass and treble
      const bass = dataArray.slice(0, 5).reduce((a, b) => a + b) / 5; // ~0-60Hz
      const treble = dataArray.slice(100, bufferLength).reduce((a, b) => a + b) / (bufferLength-100);

      // Create particles based on bass
      if (bass > 180 && particlesRef.current.length < 200) {
        for (let i = 0; i < Math.floor((bass - 180) / 20); i++) {
          const colorLerp = Math.min(1, treble / 100);
          const r = (1 - colorLerp) * primaryColor.r + colorLerp * accentColor.r;
          const g = (1 - colorLerp) * primaryColor.g + colorLerp * accentColor.g;
          const b = (1 - colorLerp) * primaryColor.b + colorLerp * accentColor.b;
          const color = `rgb(${r}, ${g}, ${b})`;

          particlesRef.current.push(createParticle(centerX, centerY, bass / 50, color));
        }
      }

      // Update and draw particles
      particlesRef.current = particlesRef.current.filter(p => p.life > 0.01);
      
      particlesRef.current.forEach(p => {
        p.life -= 0.01;
        p.x += p.velocityX;
        p.y += p.velocityY;
        p.size *= 0.98;

        const bassBoost = Math.max(1, bass / 128);
        const distanceToCenter = Math.hypot(p.x - centerX, p.y - centerY);
        if(distanceToCenter > 1) {
            const angleFromCenter = Math.atan2(p.y - centerY, p.x - centerX);
            p.velocityX += Math.cos(angleFromCenter) * bassBoost * 0.01;
            p.velocityY += Math.sin(angleFromCenter) * bassBoost * 0.01;
        }

        canvasCtx.beginPath();
        canvasCtx.arc(p.x, p.y, Math.max(0.1, p.size * p.life), 0, Math.PI * 2);
        canvasCtx.fillStyle = p.color.replace(')', `, ${p.life})`).replace('rgb', 'rgba');
        canvasCtx.fill();
      });
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      particlesRef.current = [];
    };
  }, [analyserNode, isPlaying]);

  return <canvas ref={canvasRef} height="150" className="w-full rounded-lg" />;
}
