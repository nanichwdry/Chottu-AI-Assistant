
import React, { useEffect, useRef } from 'react';
import { AssistantStatus } from '../types';

interface VisualizerProps {
  status: AssistantStatus;
  audioLevel: number;
}

const Visualizer: React.FC<VisualizerProps> = ({ status, audioLevel }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let time = 0;

    const draw = () => {
      time += 0.04;
      const { width, height } = canvas;
      ctx.clearRect(0, 0, width, height);

      const centerX = width / 2;
      const centerY = height / 2;
      
      let color;
      let radiusScale = 1;
      let jitter = audioLevel * 30;

      switch (status) {
        case AssistantStatus.LISTENING:
          color = '59, 130, 246'; // Blue
          radiusScale = 1.1 + Math.sin(time * 2) * 0.05;
          break;
        case AssistantStatus.SPEAKING:
          color = '147, 197, 253'; // Light Blue
          radiusScale = 1.2 + audioLevel * 0.8;
          break;
        case AssistantStatus.ERROR:
          color = '239, 68, 68'; // Red
          radiusScale = 0.85;
          break;
        default:
          color = '161, 161, 170'; // Zinc
          radiusScale = 1.0;
          jitter = 4;
      }

      const baseRadius = 75 * radiusScale;

      // Outer Bloom
      for (let i = 3; i > 0; i--) {
        const gradient = ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, baseRadius * (i * 2));
        gradient.addColorStop(0, `rgba(${color}, ${0.1 / i})`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(centerX, centerY, baseRadius * (i * 2.5), 0, Math.PI * 2);
        ctx.fill();
      }

      // Plasma Core
      ctx.beginPath();
      const segments = 120;
      for (let i = 0; i < segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const noise = Math.sin(angle * 5 + time) * jitter + 
                      Math.cos(angle * 3 - time * 0.7) * (jitter * 0.5) +
                      Math.sin(angle * 12 + time * 1.5) * (jitter * 0.2);
        const r = baseRadius + noise;
        const x = centerX + Math.cos(angle) * r;
        const y = centerY + Math.sin(angle) * r;
        
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();

      const coreGradient = ctx.createLinearGradient(centerX - baseRadius, centerY - baseRadius, centerX + baseRadius, centerY + baseRadius);
      coreGradient.addColorStop(0, `rgba(${color}, 1)`);
      coreGradient.addColorStop(1, `rgba(${color}, 0.5)`);
      
      ctx.shadowBlur = 30 + jitter;
      ctx.shadowColor = `rgba(${color}, 0.6)`;
      ctx.fillStyle = coreGradient;
      ctx.fill();

      // Spectral Highlight
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(centerX - baseRadius * 0.4, centerY - baseRadius * 0.4, baseRadius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fill();

      animationRef.current = requestAnimationFrame(draw);
    };

    draw();
    return () => {
      if (animationRef.current !== undefined) cancelAnimationFrame(animationRef.current);
    };
  }, [status, audioLevel]);

  return (
    <div className="relative flex items-center justify-center h-[400px] w-[400px]">
      <canvas
        ref={canvasRef}
        width={600}
        height={600}
        className="w-full h-full drop-shadow-[0_0_30px_rgba(59,130,246,0.2)]"
      />
      {status === AssistantStatus.IDLE && (
        <div className="absolute inset-0 flex items-center justify-center">
           <div className="w-5 h-5 rounded-full bg-zinc-800 animate-ping"></div>
        </div>
      )}
    </div>
  );
};

export default Visualizer;
