import React, { useEffect, useRef } from 'react';

/**
 * FluidBackground
 *
 * High-performance interactive fluid/magma particle canvas background
 * matching the Demons Reign dark esports theme (deep charcoal, ember red, gold/orange hues).
 *
 * - Smooth cursor velocity lerping and particle eddy generation
 * - Organic ambient drift when idle or on touch/mobile devices
 * - Responsive retina scaling with DPR clamping for high framerate
 * - Non-blocking: pointer-events: none, position: fixed, z-index: -10
 */
export function FluidBackground() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animId = null;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Clamp DPR to 2 to guarantee 60 FPS on 4K/retina screens
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.scale(dpr, dpr);
    };

    resize();
    window.addEventListener('resize', resize, { passive: true });

    // ── Mouse / Touch Tracking & Lerp ──
    const mouse = {
      x: width / 2,
      y: height / 2,
      targetX: width / 2,
      targetY: height / 2,
      vx: 0,
      vy: 0,
      lastX: width / 2,
      lastY: height / 2,
      moved: false,
      idleTimer: 0,
    };

    const onMouseMove = (e) => {
      mouse.targetX = e.clientX;
      mouse.targetY = e.clientY;
      mouse.moved = true;
      mouse.idleTimer = 0;
    };

    const onTouchMove = (e) => {
      if (e.touches.length > 0) {
        mouse.targetX = e.touches[0].clientX;
        mouse.targetY = e.touches[0].clientY;
        mouse.moved = true;
        mouse.idleTimer = 0;
      }
    };

    window.addEventListener('mousemove', onMouseMove, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });

    // ── Palette of Demons Reign Magma / Embers ──
    const PALETTE = [
      { r: 255, g: 100, b: 20 }, // Vivid Flame Orange
      { r: 245, g: 60,  b: 60 }, // Ember Red
      { r: 255, g: 180, b: 30 }, // Fiery Gold
      { r: 235, g: 45,  b: 45 }, // Molten Crimson
      { r: 255, g: 140, b: 0  }, // Pure Solar Amber
    ];

    // ── Particle System ──
    const PARTICLE_COUNT = Math.min(140, Math.max(70, Math.floor((width * height) / 9000)));
    const particles = [];

    class Particle {
      constructor() {
        this.reset(true);
      }

      reset(init = false) {
        this.x = init ? Math.random() * width : Math.random() * width;
        this.y = init ? Math.random() * height : height + Math.random() * 20;
        this.size = 1.8 + Math.random() * 3.8;
        this.baseSize = this.size;
        
        // Convective upward velocity
        this.vx = (Math.random() - 0.5) * 0.8;
        this.vy = -(0.45 + Math.random() * 1.2);

        this.color = PALETTE[Math.floor(Math.random() * PALETTE.length)];
        this.alpha = 0.4 + Math.random() * 0.55;
        this.baseAlpha = this.alpha;
        this.life = 0;
        this.maxLife = 220 + Math.random() * 280;
        this.swirlSpeed = 0.015 + Math.random() * 0.025;
        this.swirlRadius = 20 + Math.random() * 40;
        this.swirlAngle = Math.random() * Math.PI * 2;
      }

      update(time) {
        this.life++;
        this.swirlAngle += this.swirlSpeed;

        // Upward drift with Sinusoidal swirl
        this.x += this.vx + Math.sin(this.swirlAngle) * 0.6;
        this.y += this.vy;

        // Interactive Distance to cursor
        const dx = mouse.x - this.x;
        const dy = mouse.y - this.y;
        const dist = Math.hypot(dx, dy);
        const interactionRadius = 200;

        if (dist < interactionRadius && dist > 1) {
          const force = (1 - dist / interactionRadius);
          
          // Tangent vortex swirling
          const angle = Math.atan2(dy, dx);
          const tangentAngle = angle + Math.PI / 2;
          
          const mouseSpeed = Math.hypot(mouse.vx, mouse.vy);
          const dynamicPush = Math.min(force * (3.5 + mouseSpeed * 0.25), 7.0);

          this.x -= Math.cos(angle) * dynamicPush * 0.9;
          this.y -= Math.sin(angle) * dynamicPush * 0.9;
          this.x += Math.cos(tangentAngle) * dynamicPush * 0.8;
          this.y += Math.sin(tangentAngle) * dynamicPush * 0.8;

          // Flare up
          this.size = this.baseSize * (1 + force * 2.0);
          this.alpha = Math.min(1, this.baseAlpha + force * 0.5);
        } else {
          this.size += (this.baseSize - this.size) * 0.05;
          this.alpha += (this.baseAlpha - this.alpha) * 0.05;
        }

        if (this.y < -30 || this.x < -40 || this.x > width + 40 || this.life >= this.maxLife) {
          this.reset(false);
        }
      }

      draw(c) {
        c.save();
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);

        // Vibrant radial ember glow
        c.shadowBlur = this.size * 4;
        c.shadowColor = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;

        c.fillStyle = `rgba(${this.color.r}, ${this.color.g}, ${this.color.b}, ${this.alpha})`;
        c.fill();
        c.restore();
      }
    }

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push(new Particle());
    }

    // ── Ambient Magma Pools ──
    const BLOBS = [
      { xPct: 0.15, yPct: 0.30, r: 320, color: 'rgba(239, 68, 68, 0.12)', speed: 0.0009, phase: 0 },
      { xPct: 0.85, yPct: 0.60, r: 360, color: 'rgba(245, 158, 11, 0.10)', speed: 0.0007, phase: 2 },
      { xPct: 0.50, yPct: 0.75, r: 400, color: 'rgba(220, 38, 38, 0.09)', speed: 0.0005, phase: 4 },
      { xPct: 0.40, yPct: 0.20, r: 280, color: 'rgba(249, 115, 22, 0.08)', speed: 0.0011, phase: 1 },
    ];

    const render = (time) => {
      animId = requestAnimationFrame(render);

      // Smooth cursor lerp
      const prevX = mouse.x;
      const prevY = mouse.y;
      mouse.x += (mouse.targetX - mouse.x) * 0.14;
      mouse.y += (mouse.targetY - mouse.y) * 0.14;
      mouse.vx = mouse.x - prevX;
      mouse.vy = mouse.y - prevY;

      // Ambient idle drift simulation
      mouse.idleTimer++;
      if (mouse.idleTimer > 90) {
        const driftT = time * 0.0012;
        mouse.targetX = width / 2 + Math.cos(driftT * 0.6) * (width * 0.32);
        mouse.targetY = height / 2 + Math.sin(driftT * 0.8) * (height * 0.26);
      }

      // Deep Charcoal Base
      ctx.fillStyle = '#07090e';
      ctx.fillRect(0, 0, width, height);

      // 1. Organic Magma Bloom Waves
      BLOBS.forEach((blob) => {
        const oscX = Math.cos(time * blob.speed + blob.phase) * 60;
        const oscY = Math.sin(time * blob.speed + blob.phase) * 50;
        const bx = width * blob.xPct + oscX;
        const by = height * blob.yPct + oscY;

        const grad = ctx.createRadialGradient(bx, by, 0, bx, by, blob.r);
        grad.addColorStop(0, blob.color);
        grad.addColorStop(0.6, blob.color.replace(/[\d\.]+\)$/, '0.03)'));
        grad.addColorStop(1, 'transparent');

        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(bx, by, blob.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Interactive Cursor Magma Glow Pool
      const cursorDistSpeed = Math.min(Math.hypot(mouse.vx, mouse.vy) * 2.5, 120);
      const cursorGlowRadius = 110 + cursorDistSpeed;
      const cursorGrad = ctx.createRadialGradient(
        mouse.x,
        mouse.y,
        0,
        mouse.x,
        mouse.y,
        cursorGlowRadius
      );
      cursorGrad.addColorStop(0, 'rgba(249, 115, 22, 0.18)');
      cursorGrad.addColorStop(0.4, 'rgba(239, 68, 68, 0.08)');
      cursorGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = cursorGrad;
      ctx.beginPath();
      ctx.arc(mouse.x, mouse.y, cursorGlowRadius, 0, Math.PI * 2);
      ctx.fill();

      // 3. Update & Draw Particles
      for (let i = 0; i < particles.length; i++) {
        particles[i].update(time);
        particles[i].draw(ctx);
      }

      // 4. Molten Connections between nearby embers
      ctx.lineWidth = 0.8;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.hypot(dx, dy);

          if (dist < 65) {
            const alpha = (1 - dist / 65) * 0.22;
            ctx.strokeStyle = `rgba(245, 158, 11, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }
    };

    animId = requestAnimationFrame(render);

    // ── Cleanup on Unmount ──
    return () => {
      if (animId) cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('touchmove', onTouchMove);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        zIndex: -10,
        pointerEvents: 'none',
      }}
    />
  );
}

export default FluidBackground;
