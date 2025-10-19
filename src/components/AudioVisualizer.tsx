'use client';

import { useRef, useEffect } from 'react';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
}

export default function AudioVisualizer({ analyserNode, isPlaying }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      // Clear canvas when not playing
      const canvasCtx = canvas?.getContext('2d');
      if (canvasCtx && canvas) {
        canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      }
      return;
    }

    const canvasCtx = canvas.getContext('2d');
    analyserNode.fftSize = 256;
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvasCtx || !analyserNode) return;

      animationFrameRef.current = requestAnimationFrame(draw);

      analyserNode.getByteFrequencyData(dataArray);

      canvasCtx.clearRect(0, 0, canvas.width, canvas.height);
      
      const barWidth = (canvas.width / 2) / bufferLength;
      let barHeight;
      let x = canvas.width / 2;

      const primaryColor = 'hsl(217, 91%, 60%)';
      const accentColor = 'hsl(150, 95%, 50%)';

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 2.5;

        const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, primaryColor);
        gradient.addColorStop(0.5, accentColor);
        gradient.addColorStop(1, accentColor);
        
        canvasCtx.fillStyle = gradient;

        // Draw bar to the right
        canvasCtx.fillRect(x + i * (barWidth + 2), canvas.height - barHeight, barWidth, barHeight);
        // Draw mirrored bar to the left
        canvasCtx.fillRect(x - (i + 1) * (barWidth + 2), canvas.height - barHeight, barWidth, barHeight);
      }
    };

    draw();

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserNode, isPlaying]);

  return <canvas ref={canvasRef} width="1000" height="150" className="w-full rounded-lg" />;
}
