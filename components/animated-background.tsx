'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { useTheme } from 'next-themes';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number }>({ x: -500, y: -500 });
  const { resolvedTheme } = useTheme();

  // Mouse tracking spotlight (only on desktop/pointer)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    // Skip heavy mouse listener on touch devices
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    const handleMouseMove = (e: MouseEvent) => {
      setMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Neural nodes and animated connection lines canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);
    const isMobile = width < 640;

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    const isDark = resolvedTheme !== 'light';
    const maxDist = isMobile ? 120 : 160;

    // Deterministic static positions for initial render / SSR compatibility
    const nodeCount = isMobile ? 18 : Math.min(Math.floor(width / 35), 40);
    interface Node {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      pulse: number;
      pulseSpeed: number;
      color: string;
    }

    const colors = ['#6D5BFF', '#00D4FF', '#A855F7', '#3B82F6'];

    const nodes: Node[] = Array.from({ length: nodeCount }, (_, idx) => ({
      x: ((idx * 137.5) % width),
      y: ((idx * 223.7) % height),
      vx: ((idx % 2 === 0 ? 1 : -1) * 0.3),
      vy: ((idx % 3 === 0 ? 1 : -1) * 0.3),
      radius: (idx % 3) + 1.2,
      pulse: (idx * 0.5),
      pulseSpeed: 0.015,
      color: colors[idx % colors.length],
    }));

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw lines between close nodes
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const baseOpacity = isDark ? 0.2 : 0.12;
            const opacity = (1 - dist / maxDist) * baseOpacity;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(109, 91, 255, ${opacity})`;
            ctx.lineWidth = 0.9;
            ctx.stroke();
          }
        }
      }

      // Draw & update nodes
      for (let i = 0; i < nodes.length; i++) {
        const n = nodes[i];

        n.x += n.vx;
        n.y += n.vy;

        if (n.x < 0 || n.x > width) n.vx *= -1;
        if (n.y < 0 || n.y > height) n.vy *= -1;

        n.pulse += n.pulseSpeed;
        const currentRadius = n.radius + Math.sin(n.pulse) * 0.6;

        // Glow
        ctx.save();
        ctx.beginPath();
        ctx.arc(n.x, n.y, currentRadius * 1.8, 0, Math.PI * 2);
        ctx.fillStyle = `${n.color}${isDark ? '1A' : '10'}`;
        ctx.fill();

        // Solid Node Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, [resolvedTheme]);

  return (
    <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none">
      {/* 1. Animated Gradient Mesh Blobs */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          x: [0, 25, 0],
          y: [0, -20, 0],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -top-40 -left-40 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] rounded-full bg-gradient-to-br from-[#6D5BFF]/15 via-[#00D4FF]/10 to-transparent blur-[100px] sm:blur-[120px] opacity-75 dark:opacity-70"
      />

      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, -30, 0],
          y: [0, 30, 0],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute top-1/3 -right-40 w-[480px] sm:w-[650px] h-[480px] sm:h-[650px] rounded-full bg-gradient-to-bl from-[#A855F7]/15 via-[#6D5BFF]/10 to-transparent blur-[110px] sm:blur-[140px] opacity-65 dark:opacity-60"
      />

      <motion.div
        animate={{
          scale: [1.05, 0.95, 1.05],
          x: [0, 20, 0],
          y: [0, 35, 0],
        }}
        transition={{ duration: 22, repeat: Infinity, ease: 'easeInOut' }}
        className="absolute -bottom-40 left-1/4 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full bg-gradient-to-t from-[#00D4FF]/10 via-[#6D5BFF]/08 to-transparent blur-[120px] sm:blur-[150px] opacity-55 dark:opacity-50"
      />

      {/* 2. Faint Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 dark:opacity-50" />

      {/* 3. Interactive Mouse Spotlight Glow */}
      {mousePos.x > 0 && (
        <div
          className="absolute inset-0 transition-opacity duration-300 hidden sm:block"
          style={{
            background: `radial-gradient(600px circle at ${mousePos.x}px ${mousePos.y}px, rgba(109, 91, 255, 0.08), transparent 80%)`,
          }}
        />
      )}

      {/* 4. Canvas Neural Network Nodes & Connection Lines */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60 dark:opacity-80" />
    </div>
  );
}

