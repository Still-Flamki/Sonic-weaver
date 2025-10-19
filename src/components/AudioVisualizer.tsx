'use client';

import { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
}

// Main component
export default function AudioVisualizer({ analyserNode, isPlaying }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

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

    // Use a smaller FFT size for a smoother, less detailed waveform, which looks more artistic
    analyserNode.fftSize = 512;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvasCtx.scale(dpr, dpr);
    
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const centerX = width / 2;
    const centerY = height / 2;

    const primaryColor = 'rgba(59, 130, 246, 0.7)'; // Blue
    const accentColor = 'rgba(16, 185, 129, 0.9)'; // Green
    const highlightColor = 'rgba(230, 240, 255, 1)'; // Whiteish

    const draw = () => {
      animationFrameRef.current = requestAnimationFrame(draw);
      
      // Use getByteTimeDomainData for waveform visualization
      analyserNode.getByteTimeDomainData(dataArray);

      canvasCtx.fillStyle = 'rgba(10, 18, 28, 0.2)'; // Faded background for motion blur
      canvasCtx.fillRect(0, 0, width, height);
      
      // Calculate overall volume for core pulse and color intensity
      let volume = dataArray.reduce((sum, value) => sum + Math.abs(value - 128), 0) / bufferLength;
      const coreSize = 5 + volume * 1.5;
      const intensity = Math.min(1, volume / 50); // Normalize intensity

      // Draw the central glowing orb
      const coreGradient = canvasCtx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize * 2);
      coreGradient.addColorStop(0, `rgba(150, 180, 255, ${0.2 + intensity * 0.4})`);
      coreGradient.addColorStop(1, 'rgba(10, 18, 28, 0)');
      canvasCtx.fillStyle = coreGradient;
      canvasCtx.fillRect(0, 0, width, height);
      
      canvasCtx.beginPath();
      canvasCtx.arc(centerX, centerY, coreSize, 0, 2 * Math.PI);
      canvasCtx.fillStyle = `rgba(200, 220, 255, ${0.5 + intensity * 0.5})`;
      canvasCtx.fill();


      canvasCtx.lineWidth = 2 + intensity * 2;
      
      const numLines = 6; // Create 6 symmetrical lines
      for (let j = 0; j < numLines; j++) {
        canvasCtx.beginPath();
        const rotation = (j / numLines) * Math.PI * 2;
        
        // Interpolate color based on intensity
        const r = 59 * (1 - intensity) + 16 * intensity;
        const g = 130 * (1 - intensity) + 185 * intensity;
        const b = 246 * (1 - intensity) + 129 * intensity;
        const colorLerp = `rgba(${r}, ${g}, ${b}, 0.6)`;
        const finalColor = intensity > 0.8 ? highlightColor : colorLerp;

        canvasCtx.strokeStyle = finalColor;
        
        let moved = false;
        for (let i = 0; i < bufferLength; i++) {
          const v = dataArray[i] / 128.0; // Normalize to 0-2 range
          const y = (v - 1) * height * 0.3; // Waveform amplitude
          const x = i * (width / 2) / bufferLength;

          // Rotate the point
          const rotatedX = x * Math.cos(rotation) - y * Math.sin(rotation);
          const rotatedY = x * Math.sin(rotation) + y * Math.cos(rotation);
          
          if (!moved) {
            canvasCtx.moveTo(centerX + rotatedX, centerY + rotatedY);
            moved = true;
          } else {
            canvasCtx.lineTo(centerX + rotatedX, centerY + rotatedY);
          }
        }
        canvasCtx.stroke();
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserNode, isPlaying]);

  return <canvas ref={canvasRef} height="150" className="w-full rounded-lg" />;
}