'use client';

import React, { useEffect, useRef } from 'react';
import { useTheme } from 'next-themes';

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const { resolvedTheme } = useTheme();

  // Update the spotlight directly on animation frames to avoid React re-renders on every mouse move.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Skip pointer tracking on touch/mobile devices.
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    if (isTouch) return;

    let frameId: number | null = null;
    let latestX = 0;
    let latestY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      latestX = e.clientX;
      latestY = e.clientY;
      if (frameId !== null) return;

      frameId = requestAnimationFrame(() => {
        const spotlight = spotlightRef.current;
        if (spotlight) {
          spotlight.style.background = `radial-gradient(600px circle at ${latestX}px ${latestY}px, rgba(109, 91, 255, 0.06), transparent 80%)`;
          spotlight.style.opacity = '1';
        }
        frameId = null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, []);

  // Neural nodes and animated connection lines canvas (Desktop only)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobile = window.innerWidth < 768;
    
    // Completely skip canvas logic on mobile/touch to preserve CPU and battery
    if (isTouch || isMobile) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize, { passive: true });

    const isDark = resolvedTheme !== 'light';
    const maxDist = 150;
    const nodeCount = Math.min(Math.floor(width / 40), 30);

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
      x: ((idx * 157.5) % width),
      y: ((idx * 253.7) % height),
      vx: ((idx % 2 === 0 ? 1 : -1) * 0.2),
      vy: ((idx % 3 === 0 ? 1 : -1) * 0.2),
      radius: (idx % 3) + 1.2,
      pulse: (idx * 0.5),
      pulseSpeed: 0.01,
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
            const baseOpacity = isDark ? 0.16 : 0.08;
            const opacity = (1 - dist / maxDist) * baseOpacity;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.strokeStyle = `rgba(109, 91, 255, ${opacity})`;
            ctx.lineWidth = 0.8;
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
        const currentRadius = n.radius + Math.sin(n.pulse) * 0.5;

        // Glow
        ctx.beginPath();
        ctx.arc(n.x, n.y, currentRadius * 1.6, 0, Math.PI * 2);
        ctx.fillStyle = `${n.color}${isDark ? '12' : '08'}`;
        ctx.fill();

        // Solid Node Core
        ctx.beginPath();
        ctx.arc(n.x, n.y, currentRadius, 0, Math.PI * 2);
        ctx.fillStyle = n.color;
        ctx.fill();
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
      {/* 1. GPU CSS-Animated Gradient Mesh Blobs - Entirely CSS/GPU driven */}
      <div className="absolute -top-40 -left-40 w-[450px] sm:w-[600px] h-[450px] sm:h-[600px] rounded-full bg-gradient-to-br from-[#6D5BFF]/15 via-[#00D4FF]/10 to-transparent blur-[100px] sm:blur-[120px] opacity-75 dark:opacity-70 animate-bg-blob-1 gpu-accelerated" />

      <div className="absolute top-1/3 -right-40 w-[480px] sm:w-[650px] h-[480px] sm:h-[650px] rounded-full bg-gradient-to-bl from-[#A855F7]/15 via-[#6D5BFF]/10 to-transparent blur-[110px] sm:blur-[140px] opacity-65 dark:opacity-60 animate-bg-bg-blob-2 gpu-accelerated" />

      <div className="absolute -bottom-40 left-1/4 w-[500px] sm:w-[700px] h-[500px] sm:h-[700px] rounded-full bg-gradient-to-t from-[#00D4FF]/10 via-[#6D5BFF]/08 to-transparent blur-[120px] sm:blur-[150px] opacity-55 dark:opacity-50 animate-bg-blob-3 gpu-accelerated" />

      {/* 2. Faint Grid Pattern Overlay */}
      <div className="absolute inset-0 bg-grid-pattern opacity-30 dark:opacity-50" />

      {/* 3. Interactive Mouse Spotlight Glow (updated without React state churn) */}
      <div
        ref={spotlightRef}
        aria-hidden="true"
        className="absolute inset-0 transition-opacity duration-300 hidden md:block opacity-0"
      />

      {/* 4. Canvas Neural Network Nodes & Connection Lines (Pre-rendered only on desktop) */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60 dark:opacity-80 hidden md:block" />
    </div>
  );
}
