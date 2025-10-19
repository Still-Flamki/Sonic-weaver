'use client';

import { useRef, useEffect, forwardRef } from 'react';

export type VisualizationType = 'orb' | 'bars' | 'tunnel' | 'fabric' | 'skyline' | 'chromatic' | 'bloom' | 'genesis';

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
  const barWidth = width / bufferLength;
  let x = 0;

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = (dataArray[i] / 255) * height;
    const intensity = dataArray[i] / 255;
    
    const r = 59 * (1 - intensity) + 16 * intensity;
    const g = 130 * (1 - intensity) + 185 * intensity;
    const b = 246 * (1 - intensity) + 129 * intensity;
    ctx.fillStyle = `rgb(${r},${g},${b})`;

    ctx.fillRect(x, height - barHeight, barWidth, barHeight);
    
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

// --- Perlin Noise for Quantum Fabric ---
const PERLIN_YWRAPB = 4;
const PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
const PERLIN_ZWRAPB = 8;
const PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
const PERLIN_SIZE = 4095;
let perlin: number[];
const perlin_octaves = 4;
const perlin_amp_falloff = 0.5;
const scaled_cosine = (i: number) => 0.5 * (1.0 - Math.cos(i * Math.PI));

const noise = (x: number, y = 0, z = 0) => {
  if (perlin == null) {
    perlin = new Array(PERLIN_SIZE + 1);
    for (let i = 0; i < PERLIN_SIZE + 1; i++) {
      perlin[i] = Math.random();
    }
  }
  if (x < 0) x = -x;
  if (y < 0) y = -y;
  if (z < 0) z = -z;

  let xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  let xf = x - xi, yf = y - yi, zf = z - zi;
  let rxf, ryf;
  let r = 0, ampl = 0.5;
  let n1, n2, n3;

  for (let o = 0; o < perlin_octaves; o++) {
    let of = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);
    rxf = scaled_cosine(xf);
    ryf = scaled_cosine(yf);
    n1 = perlin[of & PERLIN_SIZE];
    n1 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n1);
    n2 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
    n2 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
    n1 += ryf * (n2 - n1);
    of += PERLIN_ZWRAP;
    n2 = perlin[of & PERLIN_SIZE];
    n2 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n2);
    n3 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
    n3 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
    n2 += ryf * (n3 - n2);
    n1 += scaled_cosine(zf) * (n2 - n1);
    r += n1 * ampl;
    ampl *= perlin_amp_falloff;
    xi <<= 1; xf *= 2;
    yi <<= 1; yf *= 2;
    zi <<= 1; zf *= 2;
    if (xf >= 1.0) { xi++; xf--; }
    if (yf >= 1.0) { yi++; yf--; }
    if (zf > 1.0) { zi++; zf--; }
  }
  return r;
};


let particles: {x: number; y: number; vx: number; vy: number; life: number; }[] = [];
let lastBass = 0;

const drawFabric = (
    ctx: CanvasRenderingContext2D,
    analyser: AnalyserNode,
    dataArray: Uint8Array,
    width: number,
    height: number,
    time: number
) => {
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);
    analyser.getByteTimeDomainData(dataArray);

    ctx.fillStyle = 'rgba(10, 18, 28, 0.35)';
    ctx.fillRect(0, 0, width, height);

    const bass = freqData.slice(0, 5).reduce((s, v) => s + v, 0) / 5 / 255;
    const treble = freqData.slice(100, 200).reduce((s,v)=>s+v, 0) / 100 / 255;

    // Particle Generation on bass hits
    if (particles.length < 500 && bass > 0.6 && bass > lastBass + 0.05) {
        for(let i=0; i<10; i++) {
            particles.push({
                x: Math.random() * width,
                y: Math.random() * height,
                vx: 0,
                vy: 0,
                life: 1.0,
            });
        }
    }
    lastBass = bass;

    const waveformSlice = dataArray.slice(0, dataArray.length / 2);
    const gravityPoints = waveformSlice.map((val, i) => ({
        x: (i / (waveformSlice.length - 1)) * width,
        y: (val / 255) * height,
        strength: Math.pow(Math.abs(val - 128) / 128, 3) * 0.1
    }));
    
    // Update and draw particles
    ctx.lineWidth = 1.5;
    particles.forEach(p => {
        // Noise field force
        const angle = noise(p.x / 300, p.y / 300, time / 5000) * Math.PI * 4;
        p.vx += Math.cos(angle) * 0.05;
        p.vy += Math.sin(angle) * 0.05;

        // Gravity from waveform
        gravityPoints.forEach(g => {
            const dx = g.x - p.x;
            const dy = g.y - p.y;
            const distSq = dx * dx + dy * dy;
            if (distSq < 40000) {
                const force = g.strength / (distSq / 1000 + 1);
                p.vx += dx * force;
                p.vy += dy * force;
            }
        });

        // Update position & apply friction
        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.96;
        p.vy *= 0.96;

        p.life -= 0.005;

        // Wrap around edges
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;
        
        const r = 150 + Math.floor(treble * 105);
        const g = 50 + Math.floor(treble * 205);
        const b = 150 - Math.floor(treble * 50);
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${p.life * 0.8})`;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 3, p.y - p.vy * 3); // Longer trails
        ctx.stroke();
    });

    particles = particles.filter(p => p.life > 0);
};


const drawSkyline = (
  ctx: CanvasRenderingContext2D,
  analyser: AnalyserNode,
  dataArray: Uint8Array,
  width: number,
  height: number,
  time: number
) => {
  analyser.getByteFrequencyData(dataArray);

  // Background gradient
  const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
  bgGradient.addColorStop(0, '#0a121c'); // Dark blue sky
  bgGradient.addColorStop(0.7, '#141a32'); // Purple horizon
  bgGradient.addColorStop(1, '#2c1a3c'); // Dark pink ground
  ctx.fillStyle = bgGradient;
  ctx.fillRect(0, 0, width, height);
  
  // Pulsing Moon
  const volume = dataArray.reduce((sum, val) => sum + val, 0) / dataArray.length / 255;
  const moonRadius = 20 + volume * 20;
  const moonX = width * 0.75;
  const moonY = height * 0.25;
  const moonGradient = ctx.createRadialGradient(moonX, moonY, 0, moonX, moonY, moonRadius);
  moonGradient.addColorStop(0, 'rgba(255, 255, 240, 0.9)');
  moonGradient.addColorStop(0.8, 'rgba(255, 255, 240, 0.2)');
  moonGradient.addColorStop(1, 'rgba(255, 255, 240, 0)');
  ctx.fillStyle = moonGradient;
  ctx.fillRect(moonX - moonRadius, moonY - moonRadius, moonRadius * 2, moonRadius * 2);

  const bufferLength = analyser.frequencyBinCount * 0.7; // Use 70% of frequency bins for buildings

  for (let i = 0; i < bufferLength; i++) {
    const barHeight = Math.pow(dataArray[i] / 255, 2) * height * 0.8;
    if (barHeight < 2) continue;

    const x = (i / bufferLength) * width;
    const barWidth = (width / bufferLength) * (Math.random() * 0.5 + 0.75); // Varied width
    const y = height - barHeight;

    const intensity = dataArray[i] / 255;
    const r = 10 + 200 * intensity;
    const g = 10;
    const b = 50 + 150 * (1 - intensity);

    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.6)`;
    ctx.fillRect(x, y, barWidth, barHeight);

    // Windows
    const highFreqIntensity = dataArray[Math.floor(bufferLength * 0.8 + i*0.2)] / 255;
    if (highFreqIntensity > 0.5 && Math.random() > 0.8) {
      const windowSize = Math.random() * 2 + 1;
      const windowX = x + Math.random() * (barWidth - windowSize);
      const windowY = y + Math.random() * (barHeight - windowSize);
      ctx.fillStyle = `rgba(255, 220, 180, ${Math.random() * 0.5 + 0.5})`;
      ctx.fillRect(windowX, windowY, windowSize, windowSize);
    }
  }
};

const drawChromatic = (
    ctx: CanvasRenderingContext2D,
    analyser: AnalyserNode,
    dataArray: Uint8Array,
    width: number,
    height: number
  ) => {
    analyser.getByteTimeDomainData(dataArray);
    ctx.fillStyle = 'rgba(10, 18, 28, 1)';
    ctx.fillRect(0, 0, width, height);
  
    const bufferLength = dataArray.length;
    const sliceWidth = width * 1.0 / bufferLength;
  
    const volume = dataArray.reduce((sum, val) => sum + Math.abs(val - 128), 0) / bufferLength;
    const aberrationAmount = Math.pow(volume / 50, 2) * (width * 0.05);

    const highFreqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(highFreqData);
    const highFreqEnergy = highFreqData.slice(highFreqData.length / 2).reduce((sum, val) => sum + val, 0) / (highFreqData.length / 2);
    const verticalJitter = Math.pow(highFreqEnergy / 100, 2) * (height * 0.05);
  
    // --- Draw the 3 color channels ---
    const channels = [
      { color: 'rgb(0, 255, 255)', offset: -aberrationAmount, yOffset: 0 }, // Cyan
      { color: 'rgb(255, 0, 255)', offset: 0, yOffset: verticalJitter }, // Magenta
      { color: 'rgb(255, 255, 0)', offset: aberrationAmount, yOffset: -verticalJitter }, // Yellow
    ];
  
    ctx.lineWidth = 3;
    ctx.globalCompositeOperation = 'lighter'; // Additive blending for bright colors
  
    channels.forEach(channel => {
      ctx.strokeStyle = channel.color;
      ctx.beginPath();
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * height / 2 + channel.yOffset;
  
        if (i === 0) {
          ctx.moveTo(x + channel.offset, y);
        } else {
          ctx.lineTo(x + channel.offset, y);
        }
  
        x += sliceWidth;
      }
      ctx.stroke();
    });
    
    ctx.globalCompositeOperation = 'source-over'; // Reset composite operation
  };

  const drawGenesis = (
    ctx: CanvasRenderingContext2D,
    analyser: AnalyserNode,
    dataArray: Uint8Array,
    width: number,
    height: number,
    time: number
  ) => {
    analyser.getByteTimeDomainData(dataArray);
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);

    // --- Background & Gravity Warp ---
    const subBass = freqData.slice(0, 2).reduce((s, v) => s + v, 0) / 2 / 255;
    const warpFactor = 1.0 + subBass * 0.05;
    ctx.save();
    ctx.translate(width / 2, height / 2);
    ctx.scale(warpFactor, warpFactor);
    ctx.translate(-width / 2, -height / 2);
    ctx.fillStyle = 'rgba(10, 18, 28, 0.3)';
    ctx.fillRect(0, 0, width, height);
    
    // --- Particle Field ---
    drawFabric(ctx, analyser, dataArray, width, height, time);

    // --- Central Orb ---
    const centerX = width / 2;
    const centerY = height / 2;
    const bass = freqData.slice(0, 5).reduce((s, v) => s + v, 0) / 5 / 255;
    const mids = freqData.slice(10, 50).reduce((s, v) => s + v, 0) / 40 / 255;
    
    const coreSize = 10 + bass * 40;

    // Outer corona
    const coronaGradient = ctx.createRadialGradient(centerX, centerY, coreSize * 0.8, centerX, centerY, coreSize * 2.5);
    coronaGradient.addColorStop(0, `rgba(255, 180, 80, ${mids * 0.2})`);
    coronaGradient.addColorStop(1, 'rgba(10, 18, 28, 0)');
    ctx.fillStyle = coronaGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Inner core
    const coreGradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, coreSize);
    coreGradient.addColorStop(0, `rgba(255, 255, 220, ${0.5 + bass * 0.5})`);
    coreGradient.addColorStop(0.5, `rgba(255, 200, 100, ${0.3 + bass * 0.4})`);
    coreGradient.addColorStop(1, `rgba(255, 100, 0, ${bass * 0.5})`);
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(centerX, centerY, coreSize, 0, 2 * Math.PI);
    ctx.fill();

    // --- Waveform Solar Flares ---
    ctx.lineWidth = 1.5 + mids * 2;
    const bufferLength = dataArray.length;
    const numFlares = 4;
    for (let j = 0; j < numFlares; j++) {
        ctx.beginPath();
        const rotation = (j / numFlares) * Math.PI * 2 + (time * 0.00005);
        let moved = false;
        for (let i = 0; i < bufferLength; i += 4) {
            const v = dataArray[i] / 128.0; // 0-2
            const arcRadius = coreSize + (v - 1) * (height * 0.1) * mids;
            const angle = (i / bufferLength) * Math.PI * 1.5 - Math.PI / 4;

            const x = centerX + arcRadius * Math.cos(angle + rotation);
            const y = centerY + arcRadius * Math.sin(angle + rotation);

            if (!moved) {
                ctx.moveTo(x, y);
                moved = true;
            } else {
                ctx.lineTo(x, y);
            }
        }
        const flareColor = `rgba(255, 220, 180, ${0.2 + mids * 0.6})`;
        ctx.strokeStyle = flareColor;
        ctx.stroke();
    }
    ctx.restore(); // Restore from gravity warp
};

const drawBloom = (
    ctx: CanvasRenderingContext2D,
    analyser: AnalyserNode,
    dataArray: Uint8Array,
    width: number,
    height: number,
    time: number
  ) => {
    analyser.getByteFrequencyData(dataArray);
    const freqData = new Uint8Array(analyser.frequencyBinCount);
    analyser.getByteFrequencyData(freqData);

    ctx.fillStyle = 'rgba(10, 18, 28, 0.2)';
    ctx.fillRect(0, 0, width, height);

    const centerX = width / 2;
    const centerY = height / 2;

    const bass = freqData.slice(0, 5).reduce((s, v) => s + v, 0) / 5 / 255;
    const treble = freqData.slice(100, 200).reduce((s, v) => s + v, 0) / 100 / 255;

    const rotation = time * 0.0001;

    const drawBranch = (level: number, angle: number, length: number, opacity: number) => {
        if (level < 0) return;

        ctx.save();
        ctx.rotate(angle);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -length);
        ctx.lineWidth = level * 1.5;
        
        const r = 180 - level * 20 + treble * 50;
        const g = 100 + level * 25;
        const b = 220 - level * 10;
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
        ctx.stroke();

        ctx.translate(0, -length);

        const newLength = length * 0.75;
        const newOpacity = opacity * 0.8;
        const subBranches = 2 + Math.floor(bass * 3);
        const spread = Math.PI / 3 * (1 + bass * 0.5);

        for (let i = 0; i < subBranches; i++) {
            const newAngle = (i / (subBranches - 1) - 0.5) * spread * (1 + Math.sin(time*0.0005 + level) * 0.1);
            drawBranch(level - 1, newAngle, newLength, newOpacity);
        }

        ctx.restore();
    };

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.rotate(rotation);

    const maxLevel = 4 + Math.floor(bass * 3);
    const initialBranches = 5 + Math.floor(bass * 4);
    const initialLength = height * 0.1 * (1 + bass);

    for (let i = 0; i < initialBranches; i++) {
        const angle = (i / initialBranches) * Math.PI * 2;
        drawBranch(maxLevel, angle, initialLength, 0.8);
    }

    // Central core
    const coreRadius = 5 + bass * 20;
    const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, coreRadius);
    coreGradient.addColorStop(0, `rgba(255, 220, 200, ${0.5 + treble * 0.5})`);
    coreGradient.addColorStop(1, 'rgba(255, 150, 100, 0)');
    ctx.fillStyle = coreGradient;
    ctx.beginPath();
    ctx.arc(0, 0, coreRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
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
    if (['orb', 'fabric', 'bloom', 'genesis'].includes(visualizationType)) {
        analyserNode.fftSize = 1024;
    } else { // bars, tunnel, skyline, chromatic
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
        case 'fabric':
            drawFabric(canvasCtx, analyserNode, dataArray, width, height, timeRef.current);
            break;
        case 'skyline':
            drawSkyline(canvasCtx, analyserNode, dataArray, width, height, timeRef.current);
            break;
        case 'chromatic':
            drawChromatic(canvasCtx, analyserNode, dataArray, width, height);
            break;
        case 'genesis':
            drawGenesis(canvasCtx, analyserNode, dataArray, width, height, timeRef.current);
            break;
        case 'bloom':
            drawBloom(canvasCtx, analyserNode, dataArray, width, height, timeRef.current);
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
