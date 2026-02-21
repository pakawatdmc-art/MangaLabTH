"use client";

import { useEffect, useRef } from "react";
import { useTheme, type ThemeType } from "./ThemeProvider";

// ─────────────────────────────────────────────────────────────────
// Shared particle base
// ─────────────────────────────────────────────────────────────────
interface Particle {
    x: number;
    y: number;
    size: number;
    opacity: number;
    speedX: number;
    speedY: number;
    life: number; // 0→1, used by some themes
    angle: number;
    angleSpeed: number;
    color: string;
}

type DrawFn = (ctx: CanvasRenderingContext2D, p: Particle, frame: number) => void;
type SpawnFn = (w: number, h: number, fromScratch: boolean) => Particle;
type UpdateFn = (p: Particle, w: number, h: number, frame: number) => boolean; // returns true = alive

// ─────────────────────────────────────────────────────────────────
// Theme configs
// ─────────────────────────────────────────────────────────────────

const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];

// ── Christmas: soft snowflakes fall straight down with slight drift ──
const snowSpawn: SpawnFn = (w, h, fromScratch) => ({
    x: rand(0, w),
    y: fromScratch ? rand(0, h) : rand(-60, -10),
    size: rand(1.5, 4),
    opacity: rand(0.3, 0.75),
    speedX: rand(-0.15, 0.15),
    speedY: rand(0.25, 0.7),
    life: 0,
    angle: rand(0, Math.PI * 2),
    angleSpeed: rand(0.002, 0.008),
    color: "255,255,255",
});
const snowDraw: DrawFn = (ctx, p) => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
    ctx.fill();
};
const snowUpdate: UpdateFn = (p, w, h, frame) => {
    p.x += p.speedX + Math.sin(frame * p.angleSpeed + p.angle) * 0.3;
    p.y += p.speedY;
    return p.y < h + 20;
};

// ── New Year: colorful confetti bursts (rectangle shapes, tumble) ──
const confettiColors = ["255,80,80", "255,220,50", "80,200,255", "160,80,255", "80,255,160"];
const confettiSpawn: SpawnFn = (w, _h, fromScratch) => ({
    x: rand(0, w),
    y: fromScratch ? rand(-200, 0) : rand(-60, -10),
    size: rand(4, 9),
    opacity: rand(0.6, 0.9),
    speedX: rand(-1.2, 1.2),
    speedY: rand(1, 2.5),
    life: 0,
    angle: rand(0, Math.PI * 2),
    angleSpeed: rand(0.04, 0.1),
    color: pick(confettiColors),
});
const confettiDraw: DrawFn = (ctx, p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = `rgba(${p.color},${p.opacity})`;
    ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
    ctx.restore();
};
const confettiUpdate: UpdateFn = (p, w, h) => {
    p.x += p.speedX;
    p.y += p.speedY;
    p.speedX *= 0.995;
    p.angle += p.angleSpeed;
    return p.y < h + 20 && p.x > -20 && p.x < w + 20;
};

// ── Valentine: small hearts float upward ──
const heartColors = ["255,105,180", "255,0,100", "255,182,193", "220,60,130"];
const heartSpawn: SpawnFn = (w, h, fromScratch) => ({
    x: rand(0, w),
    y: fromScratch ? rand(0, h) : h + rand(10, 50),
    size: rand(7, 16),
    opacity: rand(0.3, 0.65),
    speedX: rand(-0.3, 0.3),
    speedY: rand(-0.4, -1.0),
    life: 0,
    angle: 0,
    angleSpeed: rand(-0.02, 0.02),
    color: pick(heartColors),
});
const heartDraw: DrawFn = (ctx, p) => {
    ctx.save();
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = `rgb(${p.color})`;
    ctx.translate(p.x, p.y);
    ctx.scale(p.size / 14, p.size / 14);
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.bezierCurveTo(0, -7, -7, -7, -7, -3);
    ctx.bezierCurveTo(-7, 0, 0, 5, 0, 8);
    ctx.bezierCurveTo(0, 5, 7, 0, 7, -3);
    ctx.bezierCurveTo(7, -7, 0, -7, 0, -3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
};
const heartUpdate: UpdateFn = (p, w, _h) => {
    p.x += p.speedX + Math.sin(p.angle) * 0.4;
    p.y += p.speedY;
    p.angle += 0.03;
    return p.y > -30 && p.x > -30 && p.x < w + 30;
};

// ── Songkran: water droplets fall, splatter effect ──
const waterSpawn: SpawnFn = (w, _h, fromScratch) => ({
    x: rand(0, w),
    y: fromScratch ? rand(-100, 0) : rand(-80, -10),
    size: rand(2, 6),
    opacity: rand(0.35, 0.65),
    speedX: rand(-0.5, 0.5),
    speedY: rand(2, 5),
    life: 0,
    angle: rand(-0.3, 0.3),
    angleSpeed: 0,
    color: "100,200,255",
});
const waterDraw: DrawFn = (ctx, p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, p.size);
    grad.addColorStop(0, `rgba(200,235,255,${p.opacity})`);
    grad.addColorStop(1, `rgba(${p.color},0)`);
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.6, p.size, 0, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();
};
const waterUpdate: UpdateFn = (p, _w, h) => {
    p.x += p.speedX;
    p.y += p.speedY;
    p.speedY += 0.1;
    return p.y < h + 20;
};

// ── Mother's Day: soft blue petals drift down ──
const motherColors = ["173,216,255", "135,206,235", "144,202,249", "200,230,255"];
const petalSpawn: SpawnFn = (w, _h, fromScratch) => ({
    x: rand(0, w),
    y: fromScratch ? rand(0, -200) : rand(-80, -10),
    size: rand(5, 11),
    opacity: rand(0.3, 0.6),
    speedX: rand(-0.6, 0.6),
    speedY: rand(0.4, 0.9),
    life: 0,
    angle: rand(0, Math.PI * 2),
    angleSpeed: rand(-0.03, 0.03),
    color: pick(motherColors),
});
const petalDraw: DrawFn = (ctx, p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = `rgb(${p.color})`;
    ctx.beginPath();
    ctx.ellipse(0, 0, p.size * 0.5, p.size, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
};
const petalUpdate: UpdateFn = (p, _w, h, frame) => {
    p.x += p.speedX + Math.sin(frame * 0.01 + p.angle) * 0.4;
    p.y += p.speedY;
    p.angle += p.angleSpeed;
    return p.y < h + 20;
};

// ── Halloween: falling orange/purple leaves ──
const halloweenColors = ["255,100,0", "200,50,200", "255,140,0", "128,0,128", "220,80,0"];
const leafSpawn: SpawnFn = (w, _h, fromScratch) => ({
    x: rand(0, w),
    y: fromScratch ? rand(0, -300) : rand(-80, -10),
    size: rand(6, 13),
    opacity: rand(0.5, 0.8),
    speedX: rand(-1.5, 1.5),
    speedY: rand(0.6, 1.8),
    life: 0,
    angle: rand(0, Math.PI * 2),
    angleSpeed: rand(-0.04, 0.04),
    color: pick(halloweenColors),
});
const leafDraw: DrawFn = (ctx, p) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.globalAlpha = p.opacity;
    ctx.fillStyle = `rgb(${p.color})`;
    ctx.beginPath();
    ctx.moveTo(0, -p.size);
    ctx.bezierCurveTo(p.size * 0.8, -p.size * 0.4, p.size, p.size * 0.4, 0, p.size);
    ctx.bezierCurveTo(-p.size, p.size * 0.4, -p.size * 0.8, -p.size * 0.4, 0, -p.size);
    ctx.fill();
    ctx.restore();
};
const leafUpdate: UpdateFn = (p, _w, h, frame) => {
    p.x += p.speedX + Math.sin(frame * 0.015 + p.angle) * 0.5;
    p.y += p.speedY;
    p.angle += p.angleSpeed;
    return p.y < h + 20;
};

// ── Loy Krathong: golden firefly sparkles drift and fade ──
const loykrathongColors = ["255,220,80", "255,180,50", "255,240,120", "255,200,60"];
const sparkSpawn: SpawnFn = (w, h, fromScratch) => ({
    x: fromScratch ? rand(0, w) : rand(w * 0.1, w * 0.9),
    y: fromScratch ? rand(0, h) : h + rand(10, 60),
    size: rand(1.5, 4),
    opacity: rand(0.4, 0.9),
    speedX: rand(-0.5, 0.5),
    speedY: rand(-0.5, -1.5),
    life: Math.random(),
    angle: rand(0, Math.PI * 2),
    angleSpeed: rand(0.01, 0.04),
    color: pick(loykrathongColors),
});
const sparkDraw: DrawFn = (ctx, p, frame) => {
    const pulse = 0.6 + 0.4 * Math.sin(frame * p.angleSpeed * 4 + p.angle);
    const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2.5);
    grd.addColorStop(0, `rgba(${p.color},${p.opacity * pulse})`);
    grd.addColorStop(1, `rgba(${p.color},0)`);
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 2.5, 0, Math.PI * 2);
    ctx.fillStyle = grd;
    ctx.fill();
};
const sparkUpdate: UpdateFn = (p, _w, _h) => {
    p.x += p.speedX;
    p.y += p.speedY;
    p.speedY -= 0.005;
    p.life += 0.005;
    return p.life < 1;
};

// ─────────────────────────────────────────────────────────────────
// Config map
// ─────────────────────────────────────────────────────────────────
type ThemeConfig = {
    count: number;
    spawn: SpawnFn;
    draw: DrawFn;
    update: UpdateFn;
};

const THEME_CONFIG: Partial<Record<ThemeType, ThemeConfig>> = {
    christmas: { count: 80, spawn: snowSpawn, draw: snowDraw, update: snowUpdate },
    newyear: { count: 120, spawn: confettiSpawn, draw: confettiDraw, update: confettiUpdate },
    valentine: { count: 50, spawn: heartSpawn, draw: heartDraw, update: heartUpdate },
    songkran: { count: 60, spawn: waterSpawn, draw: waterDraw, update: waterUpdate },
    mother: { count: 60, spawn: petalSpawn, draw: petalDraw, update: petalUpdate },
    halloween: { count: 70, spawn: leafSpawn, draw: leafDraw, update: leafUpdate },
    loykrathong: { count: 55, spawn: sparkSpawn, draw: sparkDraw, update: sparkUpdate },
};

// ─────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────
export function FestiveEffect() {
    const { theme } = useTheme();
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const animRef = useRef<number | null>(null);
    const particlesRef = useRef<Particle[]>([]);

    const config = THEME_CONFIG[theme];

    useEffect(() => {
        if (!config) {
            if (animRef.current !== null) cancelAnimationFrame(animRef.current);
            particlesRef.current = [];
            return;
        }

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        const resize = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };
        resize();
        window.addEventListener("resize", resize);

        // Pre-populate particles scattered across canvas
        particlesRef.current = Array.from({ length: config.count }, () =>
            config.spawn(canvas.width, canvas.height, true)
        );

        let frame = 0;

        const loop = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            frame++;

            const living: Particle[] = [];
            for (const p of particlesRef.current) {
                config.draw(ctx, p, frame);
                if (config.update(p, canvas.width, canvas.height, frame)) {
                    living.push(p);
                }
            }

            // Continuously refill to stay at count
            while (living.length < config.count) {
                living.push(config.spawn(canvas.width, canvas.height, false));
            }
            particlesRef.current = living;

            animRef.current = requestAnimationFrame(loop);
        };

        animRef.current = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener("resize", resize);
            if (animRef.current !== null) cancelAnimationFrame(animRef.current);
        };
    }, [config]);

    if (!config) return null;

    return (
        <canvas
            ref={canvasRef}
            style={{
                position: "fixed",
                inset: 0,
                width: "100vw",
                height: "100vh",
                pointerEvents: "none",
                zIndex: 9999,
            }}
            aria-hidden="true"
        />
    );
}
