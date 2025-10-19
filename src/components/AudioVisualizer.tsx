'use client';

import { useRef, useEffect, forwardRef } from 'react';

export type VisualizationType = 'orb' | 'bars' | 'tunnel';

interface AudioVisualizerProps {
  analyserNode: AnalyserNode | null;
  isPlaying: boolean;
  visualizationType: VisualizationType;
}

// --- Drawing functions for each visualizer type ---

const drawOrb = (
  ctx: CanvasRenderingContext2D,
  analyser: AnalyserNode,
  dataArray: Uint8Array,
  width: number,
  height: number
) => {
  analyser.getByteTimeDomainData(dataArray);
  ctx.fillStyle = 'rgba(10, 18, 28, 0.2)';
  ctx.fillRect(0, 0, width, height);

  const bufferLength = dataArray.length;
  let volume = dataArray.reduce((sum, value) => sum + Math.abs(value - 128), 0) / bufferLength;
  const coreSize = 5 + volume * 1.5;
  const intensity = Math.min(1, volume / 50);

  const centerX = width / 2;
  const centerY = height / 2;

  const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize * 2);
  coreGradient.addColorStop(0, `rgba(150, 180, 255, ${0.2 + intensity * 0.4})`);
  coreGradient.addColorStop(1, 'rgba(10, 18, 28, 0)');
  ctx.fillStyle = coreGradient;
  ctx.fillRect(0, 0, width, height);

  ctx.beginPath();
  ctx.arc(centerX, centerY, coreSize, 0, 2 * Math.PI);
  ctx.fillStyle = `rgba(200, 220, 255, ${0.5 + intensity * 0.5})`;
  ctx.fill();

  ctx.lineWidth = 2 + intensity * 2;
  const numLines = 6;
  for (let j = 0; j < numLines; j++) {
    ctx.beginPath();
    const rotation = (j / numLines) * Math.PI * 2;
    const r = 59 * (1 - intensity) + 16 * intensity;
    const g = 130 * (1 - intensity) + 185 * intensity;
    const b = 246 * (1 - intensity) + 129 * intensity;
    const colorLerp = `rgba(${r}, ${g}, ${b}, 0.6)`;
    const finalColor = intensity > 0.8 ? 'rgba(230, 240, 255, 1)' : colorLerp;
    ctx.strokeStyle = finalColor;

    let moved = false;
    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v - 1) * height * 0.3;
      const x = i * (width / 2) / bufferLength;
      const rotatedX = x * Math.cos(rotation) - y * Math.sin(rotation);
      const rotatedY = x * Math.sin(rotation) + y * Math.cos(rotation);
      if (!moved) {
        ctx.moveTo(centerX + rotatedX, centerY + rotatedY);
        moved = true;
      } else {
        ctx.lineTo(centerX + rotatedX, centerY + rotatedY);
      }
    }
    ctx.stroke();
  }
};

const drawBars = (
  ctx: CanvasRenderingContext2D,
  analyser: AnalyserNode,
  dataArray: Uint8Array,
  width: number,
  height: number
) => {
  analyser.getByteFrequencyData(dataArray);
  ctx.fillStyle = 'rgba(10, 18, 28, 1)';
  ctx.fillRect(0, 0, width, height);

  const bufferLength = analyser.frequencyBinCount;
  const barWidth = (width / 2) / bufferLength;
  let x = width / 2;

  const primaryColor = 'rgba(59, 130, 246, 0.7)'; // Blue
  const accentColor = 'rgba(16, 185, 129, 0.9)'; // Green

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * height * 0.8;
    const intensity = dataArray[i] / 255;
    
    const r = 59 * (1 - intensity) + 16 * intensity;
    const g = 130 * (1 - intensity) + 185 * intensity;
    const b = 246 * (1 - intensity) + 129 * intensity;
    ctx.fillStyle = `rgb(${r},${g},${b})`;

    // Draw right bar
    ctx.fillRect(x, height - barHeight, barWidth, barHeight);
    // Draw left bar (mirrored)
    ctx.fillRect(x - barWidth, height - barHeight, barWidth, barHeight);
    
    x += barWidth;
  }
};

const drawTunnel = (
    ctx: CanvasRenderingContext2D,
    analyser: AnalyserNode,
    dataArray: Uint8Array,
    width: number,
    height: number,
    time: number
  ) => {
    analyser.getByteFrequencyData(dataArray);
    ctx.fillStyle = 'rgba(10, 18, 28, 0.2)'; // Faded background for motion blur
    ctx.fillRect(0, 0, width, height);
  
    const centerX = width / 2;
    const centerY = height / 2;
    const bufferLength = analyser.frequencyBinCount;
  
    let overallLevel = dataArray.reduce((sum, value) => sum + value, 0) / bufferLength / 255;
  
    const numCircles = 32;
    const depth = 20;
  
    for (let i = numCircles; i > 0; i--) {
      const slice = Math.floor((i / numCircles) * (bufferLength * 0.75));
      const v = dataArray[slice] / 255;
      const radius = (i / numCircles) * (width * 0.3) * (1 + v * 1.5);
  
      const perspective = i / numCircles;
      const z = (time * 0.05 + perspective * depth) % depth;
      const scale = 1 - z / depth;
  
      if (scale < 0) continue;
  
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius * scale, 0, 2 * Math.PI);
  
      const intensity = Math.pow(v, 2);
      const r = 59 * (1 - intensity) + 16 * intensity;
      const g = 130 * (1 - intensity) + 185 * intensity;
      const b = 246 * (1 - intensity) + 129 * intensity;
  
      const alpha = scale * 0.8 * (0.5 + intensity * 0.5);
      
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
      ctx.lineWidth = 1 + scale * 2;
      ctx.stroke();
    }
  };

// Main component
const AudioVisualizer = forwardRef<HTMLCanvasElement, AudioVisualizerProps>(
  ({ analyserNode, isPlaying, visualizationType }, ref) => {
  const internalCanvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number>();
  const timeRef = useRef(0);

  const canvasRef = ref || internalCanvasRef;

  useEffect(() => {
    const canvas = (canvasRef as React.RefObject<HTMLCanvasElement>).current;
    if (!canvas || !analyserNode || !isPlaying) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      return;
    }

    const canvasCtx = canvas.getContext('2d');
    if(!canvasCtx) return;

    // Different visualizers prefer different data
    if (visualizationType === 'orb') {
        analyserNode.fftSize = 512;
    } else { // bars and tunnel
        analyserNode.fftSize = 256;
    }
    const bufferLength = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    canvasCtx.scale(dpr, dpr);
    
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    let lastTime = 0;
    const draw = (timestamp: number) => {
      if (!lastTime) lastTime = timestamp;
      const deltaTime = timestamp - lastTime;
      lastTime = timestamp;
      timeRef.current += deltaTime;

      animationFrameRef.current = requestAnimationFrame(draw);
      
      switch(visualizationType) {
        case 'orb':
          drawOrb(canvasCtx, analyserNode, dataArray, width, height);
          break;
        case 'bars':
          drawBars(canvasCtx, analyserNode, dataArray, width, height);
          break;
        case 'tunnel':
          drawTunnel(canvasCtx, analyserNode, dataArray, width, height, timeRef.current);
          break;
        default:
          // Clear canvas if type is unknown
          canvasCtx.fillStyle = 'rgba(10, 18, 28, 1)';
          canvasCtx.fillRect(0, 0, width, height);
      }
    };

    draw(0);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [analyserNode, isPlaying, visualizationType, canvasRef]);

  return <canvas ref={canvasRef} height="150" className="w-full rounded-lg bg-background/50" />;
});

AudioVisualizer.displayName = 'AudioVisualizer';
export default AudioVisualizer;
