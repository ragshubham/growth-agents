'use client';

// Growth Agents — Launch Page (Cinematic v6, brand-aligned)
// Hero (Cinematic OS Boot) → Agents (Glass cards, free pilot CTA)
// Impact (DeepImpactChart on right) → Growth Globe (Left) → Case Study (concrete story) → Footer (MVP)

import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* =====================================================
   CONFIG
   ===================================================== */
const CALENDLY_URL = 'https://calendly.com/ragshubham/30min';
const SITE = { brand: 'Growth Agents', supportEmail: 'founders@growthagents.com' };
const PLATFORMS = [
  { label: 'Meta', color: '#1877F2' },
  { label: 'Google', color: '#4285F4' },
  { label: 'Shopify', color: '#10B981' },
  { label: 'TikTok', color: '#00F2EA' },
];

/* =====================================================
   UTILS & HOOKS
   ===================================================== */
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));
const mix = (a: number, b: number, t: number) => a + (b - a) * t;

function usePointer() {
  const frame = useRef<number | null>(null);
  const latest = useRef({ x: 0, y: 0 });
  const [p, setP] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const { innerWidth: w, innerHeight: h } = window;
      latest.current = { x: (e.clientX / w) * 2 - 1, y: (e.clientY / h) * 2 - 1 };
      if (frame.current == null) {
        frame.current = requestAnimationFrame(() => {
          frame.current = null;
          setP(latest.current);
        });
      }
    };
    window.addEventListener('mousemove', onMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', onMove);
      if (frame.current) cancelAnimationFrame(frame.current);
    };
  }, []);

  return p;
}

function useMotionOK() {
  const [ok, setOk] = useState(true);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const update = () => setOk(!(mq?.matches));
    update();
    mq?.addEventListener?.('change', update);
    return () => mq?.removeEventListener?.('change', update);
  }, []);
  return ok;
}

function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden);
    document.addEventListener('visibilitychange', onVis);
    onVis();
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  return visible;
}

/* =====================================================
   GLOBAL STARFIELD (2.6× speed, more shine) — sits BEHIND content
   ===================================================== */
type DriftDir = 'right' | 'left' | 'up' | 'down';
function GlobalStarfield({
  density = 180,
  twinkle = true,
  direction = 'right',
  speed = 1.0,
  twinkleSpeed = 0.008,
}: {
  density?: number; twinkle?: boolean; direction?: DriftDir; speed?: number; twinkleSpeed?: number;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const rafId = useRef<number | null>(null);
  const motionOK = useMotionOK();
const pointer = usePointer();
const visible = usePageVisible();

  useEffect(() => {
  if (!visible) return; // don’t animate when tab is hidden

  const c = ref.current!;
  const ctx = c.getContext('2d')!;
  const dpr = Math.min(devicePixelRatio || 1, 2);
  let W = 0, H = 0;

  const stars: {x:number;y:number;z:number;tw:number; flare:number}[] = [];
  const shooting: {x:number;y:number;vx:number;vy:number;life:number}[] = [];

  const base = (() => {
    switch (direction) {
      case 'left':  return { vx: -0.35 * speed, vy: 0.00 };
      case 'up':    return { vx:  0.00,         vy: -0.25 * speed };
      case 'down':  return { vx:  0.00,         vy:  0.25 * speed };
      default:      return { vx:  0.35 * speed, vy: 0.00 };
    }
  })();

  // ---- define seed first
  const seed = () => {
    stars.length = 0;
    const count = Math.floor(density * (W * H) / (1440 * 900));
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        z: Math.random() * 0.9 + 0.1,
        tw: Math.random() * Math.PI * 2,
        flare: Math.random() * 0.04,
      });
    }
  };

  // ---- single resize (sizes + reseeds)
  const resize = () => {
    const cw = Math.max(document.documentElement.clientWidth, window.innerWidth || 0);
    const ch = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);
    W = cw; H = ch;
    c.width = Math.floor(W * dpr);
    c.height = Math.floor(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
  };

  const maybeShoot = () => {
    if (shooting.length > 1 || Math.random() > 0.006) return;
    const startX = direction === 'left' ? W + 40 : -40;
    const startY = Math.random() * H * 0.6;
    const vx = direction === 'left' ? -(6 + Math.random() * 4) : (6 + Math.random() * 4);
    const vy = (direction === 'up' ? -1 : 1) * (0.8 + Math.random()*0.6);
    shooting.push({ x: startX, y: startY, vx, vy, life: 1 });
  };

  const draw = (t: number) => {
    ctx.clearRect(0, 0, W, H);

    if (!motionOK) {
      for (const s of stars) {
        const alpha = 0.25 + s.z * 0.6;
        const r = 0.8 + s.z * 1.2;
        ctx.fillStyle = `rgba(203,213,225,${alpha})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
      }
      rafId.current = requestAnimationFrame(draw);
      return;
    }

    // aurora wash
    const grd = ctx.createRadialGradient(W*0.7, H*0.3, 0, W*0.7, H*0.3, Math.hypot(W,H)*0.6);
    grd.addColorStop(0, 'rgba(99,102,241,0.10)');
    grd.addColorStop(1, 'rgba(99,102,241,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(0,0,W,H);

    const driftX = pointer.x * 6;
    const driftY = pointer.y * 4;

    for (let i = 0; i < stars.length; i++) {
      const s = stars[i];
      s.x += base.vx * (0.8 + s.z * 1.2) + driftX * 0.01 * s.z;
      s.y += base.vy * (0.8 + s.z * 1.0) + driftY * 0.008 * s.z;

      if (s.x > W + 5) s.x = -5;
      if (s.x < -5) s.x = W + 5;
      if (s.y > H + 5) s.y = -5;
      if (s.y < -5) s.y = H + 5;

      const baseAlpha = 0.2 + s.z * 0.55;
      const r = 0.7 + s.z * 1.15;
      let alpha = baseAlpha;
      if (twinkle) alpha *= 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(s.tw + t * twinkleSpeed + i));

      const flareBoost = (Math.sin(t * (twinkleSpeed*3) + i*2) * 0.5 + 0.5) * s.flare;
      ctx.fillStyle = `rgba(203,213,225,${alpha + flareBoost})`;
      ctx.beginPath(); ctx.arc(s.x, s.y, r + flareBoost * 3, 0, Math.PI * 2); ctx.fill();
    }

    maybeShoot();
    for (let i = shooting.length - 1; i >= 0; i--) {
      const sh = shooting[i];
      sh.x += sh.vx; sh.y += sh.vy; sh.life -= 0.01;
      ctx.strokeStyle = `rgba(96,165,250,${Math.max(0, sh.life)})`;
      ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(sh.x, sh.y); ctx.lineTo(sh.x - 28 * Math.sign(sh.vx), sh.y - 10); ctx.stroke();
      if (sh.life <= 0 || sh.x > W + 60 || sh.x < -60 || sh.y > H + 60 || sh.y < -60) shooting.splice(i, 1);
    }

    rafId.current = requestAnimationFrame(draw);
  };

  // now that resize exists, we can observe it
  const ro = new ResizeObserver(resize);
  resize();
  ro.observe(document.body);
  rafId.current = requestAnimationFrame(draw);

  return () => { ro.disconnect(); if (rafId.current) cancelAnimationFrame(rafId.current); };
}, [density, twinkle, direction, speed, twinkleSpeed, motionOK, visible]);

  return (
    <canvas
      ref={ref}
      aria-hidden
      className="pointer-events-none fixed inset-0 z-0 h-screen w-screen"
      style={{ opacity: 0.55 }}
    />
  );
}

/* =====================================================
   HEADER
   ===================================================== */
function PrimaryCTA({ children, href }: { children: React.ReactNode; href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="group relative inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-blue-600 to-purple-600 px-8 py-2.5 text-sm font-semibold text-white shadow-[0_12px_30px_rgba(59,130,246,0.35)] transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60"
    >
      <span className="relative z-10">{children}</span>
      <span className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-white/20" />
      <span className="pointer-events-none absolute -inset-1 -z-10 rounded-3xl bg-gradient-to-r from-blue-600/25 to-purple-600/25 blur-lg opacity-0 transition-opacity group-hover:opacity-100" />
    </a>
  );
}

function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0b0d12]/70 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-2 font-semibold text-white">
          <div className="relative">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 blur-sm opacity-60" />
            <div className="relative rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 p-2.5">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.84L18.18 22 12 18.77 5.82 22 7 14.11l-5-4.84 6.91-1.01z"/></svg>
            </div>
          </div>
          {SITE.brand}
        </div>
        <nav className="hidden items-center gap-6 text-sm text-slate-300 md:flex">
          <a href="#agents" className="hover:text-white">Agents</a>
          <a href="#impact" className="hover:text-white">Impact</a>
          <a href="#globe" className="hover:text-white">Why It Wins</a>
          <a href="#case" className="hover:text-white">Proof</a>
          <PrimaryCTA href={CALENDLY_URL}>Start free pilot</PrimaryCTA>
        </nav>
      </div>
    </header>
  );
}

/* =====================================================
   GlowFrame (background shine effect)
   ===================================================== */
function GlowFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative">
      {/* backlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-10 -z-10 blur-3xl"
        style={{
          background:
            "radial-gradient(1200px 600px at 50% 30%, rgba(99,102,241,0.35), rgba(56,189,248,0.15) 40%, rgba(0,0,0,0) 65%)",
        }}
      />
      {/* rotating sheen */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-6 -z-10 blur-2xl animate-spin-slow opacity-70"
        style={{
          background:
            "conic-gradient(from 0deg, rgba(99,102,241,0.18), rgba(16,185,129,0.12), rgba(56,189,248,0.18), rgba(99,102,241,0.18))",
        }}
      />
      {children}
    </div>
  );
}

/* =====================================================
   LIVE AGENT DEMO — v2.5 (deeper glow, gradient border,
   cursor spotlight, subtle parallax, perf-safe)
   ===================================================== */
function LiveAgentDemo() {
  const [t, setT] = React.useState(0);
  const motionOK = useMotionOK();

  React.useEffect(() => {
    if (!motionOK) return;
    let raf = 0;
    const loop = () => {
      setT((v) => (v + 0.008) % 1);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [motionOK]);

  // sparkline points (slightly higher frequency, smoother wiggle)
  const points = React.useMemo(() => {
    const N = 36;
    return Array.from({ length: N }, (_, i) => {
      const u = i / (N - 1);
      const base = 44 - u * 10;
      const wiggle =
        Math.sin((u * 9 + t * 10.5) * Math.PI) * 1.15 +
        Math.sin((u * 3 + t * 4.2) * Math.PI) * 0.35;
      return 60 - (base + wiggle);
    });
  }, [t]);

  const pathD = React.useMemo(
    () => points.map((y, i) => `${i === 0 ? "M" : "L"} ${i * 6.2} ${y.toFixed(2)}`).join(" "),
    [points]
  );

  // cursor path (slightly larger radius + phase offset)
  const a = 2 * Math.PI * t;
  const xPct = 50 + 34 * Math.sin(a * 0.9);
  const yPct = 50 + 24 * Math.sin(a * 1.25 + 0.7);

  return (
    <section aria-label="Live agent demo" className="relative isolate pb-24">
      {/* soft multi-spot halo (parallax with t) */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 will-change-transform"
        style={{
          transform: `translate3d(${motionOK ? Math.sin(a) * 6 : 0}px, ${
            motionOK ? Math.cos(a * 0.7) * 4 : 0
          }px, 0)`,
          background:
            "radial-gradient(520px 340px at 62% 30%, rgba(59,130,246,0.16), transparent 60%), radial-gradient(620px 380px at 30% 72%, rgba(16,185,129,0.12), transparent 65%)",
          maskImage: "radial-gradient(80% 65% at 50% 45%, black, transparent)"
        }}
      />

      {/* faint grid for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "48px 48px"
        }}
      />

      <div className="mx-auto max-w-5xl px-6">
        {/* panel: 20px down, animated gradient border ring via ::before */}
        <div className="relative translate-y-[20px] rounded-2xl">
          {/* animated gradient ring */}
          <div className="pointer-events-none absolute -inset-[1px] -z-10 rounded-[1.1rem] opacity-80"
               style={{
                 background: "conic-gradient(from 220deg, rgba(59,130,246,0.35), rgba(16,185,129,0.35), rgba(59,130,246,0.35))",
                 filter: "blur(8px)"
               }} />
          {/* main surface */}
          <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl ring-1 ring-white/10">
            {/* sheen stripe */}
            <div
              aria-hidden
              className="pointer-events-none absolute -top-24 left-0 h-48 w-full opacity-20"
              style={{
                background:
                  "linear-gradient(120deg, transparent 20%, rgba(255,255,255,0.35) 50%, transparent 80%)",
                transform: `translateX(${motionOK ? (Math.sin(a) * 18) : 0}%) skewY(-6deg)`
              }}
            />
            {/* header bar */}
            <div className="flex items-center gap-2 rounded-t-2xl bg-white/5 px-3 py-2 border-b border-white/10">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
              <div className="ml-3 text-xs text-slate-200/90">Growth Agent: Live</div>
              <div className="ml-auto text-[10px] text-slate-300/80">
                {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>

            {/* body */}
            <div className="relative grid h-[380px] grid-cols-5 gap-4 rounded-b-2xl bg-[#0a0d13]/90 p-4 ring-1 ring-white/10">
              {/* cursor spotlight */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{
                  background: `radial-gradient(180px 140px at ${xPct}% ${yPct}%, rgba(255,255,255,0.08), transparent 60%)`,
                  transition: "background-position 60ms linear"
                }}
              />

              {/* streaming chips */}
              <div className="col-span-3 space-y-2">
                {[
                  { text: "Overlap rising: branded vs remarketing", tone: "warn" },
                  { text: "Creative fatigue: set B slowing", tone: "warn" },
                  { text: "CPC ↑ on Google Brand", tone: "info" },
                  { text: "Prospecting CTR improving on Meta", tone: "good" }
                ].map((it, i) => (
                  <motion.div
                    key={it.text}
                    initial={{ opacity: 0, y: 6 }}
                    animate={motionOK ? { opacity: 1, y: [2, -2, 2] } : { opacity: 1, y: 0 }}
                    transition={{ duration: 1.4, repeat: motionOK ? Infinity : 0, repeatType: "reverse", delay: i * 0.2 }}
                    className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs backdrop-blur-sm
                      ${
                        it.tone === "good"
                          ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-200"
                          : it.tone === "warn"
                          ? "border-amber-300/30 bg-amber-300/10 text-amber-200"
                          : "border-sky-300/25 bg-sky-300/10 text-sky-200"
                      }`}
                  >
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-90" />
                    {it.text}
                  </motion.div>
                ))}

                {/* actions (magnetic-ish pulse) */}
                <div className="mt-4 flex flex-wrap gap-2">
                  {["Lower Brand cap 15%", "Pause Set B (fatigue)", "Shift +10% to Prospecting"].map((a, i) => (
                    <motion.button
                      key={a}
                      className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 shadow hover:shadow-lg hover:bg-white/10 transition"
                      animate={motionOK ? { scale: [1, 1, 0.985, 1] } : {}}
                      transition={{ duration: 1.6, repeat: motionOK ? Infinity : 0, delay: 0.8 + i * 0.25 }}
                    >
                      {a}
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* impact panel (clearer contrast + tick labels) */}
              <div className="col-span-2 rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="mb-2 text-[11px] font-semibold text-slate-200">Impact forecast</div>
                <div className="relative h-[150px] w-full overflow-hidden rounded-lg border border-white/5 bg-[#070a0f] p-3">
                  {/* Y grid */}
                  <svg viewBox="0 0 216 60" className="absolute inset-0 h-full w-full opacity-20">
                    {[12, 24, 36, 48].map((y) => (
                      <line key={y} x1="0" y1={y} x2="216" y2={y} stroke="white" strokeWidth="0.5" />
                    ))}
                  </svg>
                  {/* sparkline */}
                  <svg viewBox="0 0 216 60" className="absolute inset-0 h-full w-full">
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="rgba(16,185,129,0.35)" />
                        <stop offset="100%" stopColor="rgba(16,185,129,0)" />
                      </linearGradient>
                    </defs>
                    <path d={pathD} fill="none" stroke="#10b981" strokeWidth="2" />
                    <path d={`${pathD} L 216 60 L 0 60 Z`} fill="url(#g1)" />
                  </svg>

                  {/* moving node */}
                  <div
                    aria-hidden
                    className="absolute h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.9)] will-change-transform"
                    style={{
                      left: `${(t * 100) % 100}%`,
                      top: "50%",
                      transform: "translate(-50%, -50%)"
                    }}
                  />
                  {/* KPI chip */}
                  <div className="absolute right-2 top-2 rounded-full bg-emerald-400/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    CAC ↓ {Math.round(18 + Math.sin(t * 6) * 4)}%
                  </div>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg border border-white/10 bg-[#0a0d13] p-2 text-slate-200">
                    Payback:{" "}
                    <span className="font-bold text-emerald-300">
                      {58 - Math.round((Math.sin(t * 8) + 1) * 3)} days
                    </span>
                  </div>
                  <div className="rounded-lg border border-white/10 bg-[#0a0d13] p-2 text-slate-200">
                    Overlap:{" "}
                    <span className="font-bold text-emerald-300">
                      {12 - Math.round((Math.sin(t * 7) + 1) * 2)}%
                    </span>
                  </div>
                </div>
              </div>

              {/* “ghost” cursor */}
              <div className="pointer-events-none absolute inset-4">
                <div
                  className="absolute -mt-2 -ml-2 h-3 w-3 rounded-full bg-white shadow-[0_0_14px_rgba(255,255,255,0.6)] will-change-transform"
                  style={{
                    left: `${xPct}%`,
                    top: `${yPct}%`,
                    transition: "transform 60ms linear",
                    transform: "translate(-50%,-50%)"
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* =====================================================
   ORBIT SECTION v1.3 — "How the Agent decides"
   - No imports
   - No hooks defined here (receives motionOK prop)
   - All keyframes/styles inline so nothing looks "off"
   - Responsive square canvas
   ===================================================== */

function OrbitSection({ motionOK = true }: { motionOK?: boolean }) {
  return (
    <section aria-label="How the Agent Thinks" className="relative isolate overflow-hidden py-24">
      {/* backdrop + grid */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(800px 520px at 75% 20%, rgba(59,130,246,0.15), transparent 60%), radial-gradient(720px 520px at 25% 80%, rgba(16,185,129,0.12), transparent 65%)",
          maskImage: "radial-gradient(90% 75% at 50% 45%, black, transparent)"
        }}
      />
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "56px 56px"
        }}
      />

      <div className="mx-auto max-w-6xl px-6 text-center">
        <h2 className="text-balance text-3xl font-semibold tracking-tight text-white md:text-4xl">
          How the <span className="text-emerald-300">Agent</span> decides
        </h2>
        <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-300/90">
          The agent pulls in all your data, filters out the noise, and tells you the one action that actually matters.
        </p>

        {/* ORBIT CANVAS */}
        <div className="relative mx-auto mt-10" style={{ width: "min(82vw, 580px)", height: "min(82vw, 580px)" }}>
          {/* glow ring */}
          <div aria-hidden className="absolute inset-0 rounded-full opacity-80"
            style={{
              background:
                "conic-gradient(from 220deg, rgba(59,130,246,0.20), rgba(16,185,129,0.20), rgba(59,130,246,0.20))",
              filter: "blur(14px)",
              maskImage: "radial-gradient(circle at center, black 58%, transparent 62%)"
            }}
          />

          {/* base rings */}
          {[0.42, 0.58, 0.74].map((r, i) => (
            <div key={i} className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{
                width: `calc(${r * 100}% * 2)`,
                height: `calc(${r * 100}% * 2)`,
                boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
                opacity: [0.25, 0.18, 0.12][i]
              }}
            />
          ))}

          {/* dotted accents */}
          <svg className="absolute inset-0 opacity-40" viewBox="0 0 100 100" aria-hidden>
            <circle cx="50" cy="50" r="36" fill="none" stroke="white" strokeWidth="0.6" strokeDasharray="1 3" opacity="0.7" />
            <circle cx="50" cy="50" r="50" fill="none" stroke="white" strokeWidth="0.5" strokeDasharray="0.5 5" opacity="0.5" />
          </svg>

          {/* CORE */}
          <div className="absolute left-1/2 top-1/2 z-10 -translate-x-1/2 -translate-y-1/2">
            <div className="relative h-36 w-36 rounded-2xl border border-white/15 bg-white/5 p-3 backdrop-blur-md ring-1 ring-white/10 shadow-2xl">
              <div aria-hidden className={`pointer-events-none absolute inset-0 rounded-2xl ${motionOK ? "animate-corePulse" : ""}`}
                style={{ boxShadow: "0 0 0 0 rgba(16,185,129,0.18), 0 0 40px 8px rgba(16,185,129,0.10) inset" }}
              />
              <div className="text-[10px] font-semibold text-slate-300">Decision Layer</div>
              <div className="mt-1 text-[11px] font-bold text-emerald-300">Next best action →</div>
              <div className="mt-2 rounded-md border border-white/10 bg-[#0b0f15] p-2 text-[10px] text-slate-200">
                • Lower Brand cap 15%<br />
                • Shift +10% to Prospecting
              </div>
            </div>
          </div>

          {/* ORBITS */}
          <OrbitBadge enabled={motionOK} radiusPct={27} durationSec={30} label="Audience"  hueClass="from-sky-300/90 to-blue-400/90" iconDot />
          <OrbitBadge enabled={motionOK} radiusPct={33} durationSec={40} reverse label="Spend"    hueClass="from-emerald-300/90 to-teal-300/90" iconDot />
          <OrbitBadge enabled={motionOK} radiusPct={39} durationSec={52} label="Creatives" hueClass="from-pink-400/90 to-rose-400/90" iconDot />
          <OrbitBadge enabled={motionOK} radiusPct={46} durationSec={64} reverse label="Search"   hueClass="from-amber-300/90 to-yellow-300/90" iconDot />
        </div>

        <div className="mx-auto mt-6 max-w-xl text-xs leading-relaxed text-slate-400">
  Inputs orbit continuously; only{" "}
  <span className="text-slate-300">incremental</span> signals cross the threshold.
  <br /> {/* 👈 line break here */}
  The core emits one clear action. No dashboards, just decisions.
</div>
      </div>

      {/* local styles for animation */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          .animate-orbit, .animate-orbit-rev, .animate-corePulse { animation: none !important; }
        }
        @keyframes orbitSpin { to { transform: rotate(360deg); } }
        @keyframes orbitSpinRev { to { transform: rotate(-360deg); } }
        @keyframes corePulse {
          0%   { box-shadow: 0 0 0 0 rgba(16,185,129,0.20), 0 0 40px 8px rgba(16,185,129,0.10) inset; }
          70%  { box-shadow: 0 0 0 24px rgba(16,185,129,0.00), 0 0 40px 8px rgba(16,185,129,0.14) inset; }
          100% { box-shadow: 0 0 0 0 rgba(16,185,129,0.00), 0 0 40px 8px rgba(16,185,129,0.10) inset; }
        }
        .animate-corePulse { animation: corePulse 2.8s ease-in-out infinite; }
        .animate-orbit { animation: orbitSpin var(--dur, 40s) linear infinite; }
        .animate-orbit-rev { animation: orbitSpinRev var(--dur, 40s) linear infinite; }
      `}</style>
    </section>
  );
}

/* orbit badge (no hooks) */
function OrbitBadge({
  enabled, radiusPct, durationSec, reverse = false, label, hueClass, iconDot = false
}: {
  enabled: boolean;
  radiusPct: number;
  durationSec: number;
  reverse?: boolean;
  label: string;
  hueClass: string;
  iconDot?: boolean;
}) {
  return (
    <div
      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 ${
        enabled ? (reverse ? "animate-orbit-rev" : "animate-orbit") : ""
      }`}
      style={{ width: `calc(${radiusPct}% * 2)`, height: `calc(${radiusPct}% * 2)`, ["--dur" as any]: `${durationSec}s` } as any}
    >
      <div className="absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2">
        <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 backdrop-blur-md ring-1 ring-white/10 shadow">
          {iconDot && <span className="inline-block h-2 w-2 rounded-full bg-white shadow" />}
          <span className={`bg-gradient-to-r ${hueClass} bg-clip-text text-[11px] font-semibold text-transparent`}>{label}</span>
        </div>
      </div>
    </div>
  );
}

/* =====================================================
   HERO STARFIELD (masked, denser)
   ===================================================== */
function Starfield({ density = 320, baseSpeed = 0.06 }: { density?: number; baseSpeed?: number }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const anim = useRef<number | null>(null);
  const stars = useRef<{ x: number; y: number; z: number }[]>([]);
  const pointer = usePointer();
  const motionOK = useMotionOK();
  const visible = usePageVisible();

  useEffect(() => {
  if (!visible) return; // don't run a draw loop when tab is hidden
    const canvas = ref.current!;
    const ctx = canvas.getContext('2d')!;

    function resize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(canvas.clientWidth * dpr);
      canvas.height = Math.floor(canvas.clientHeight * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function resetStars() {
      stars.current = Array.from({ length: density }, () => ({
        x: Math.random() * canvas.clientWidth,
        y: Math.random() * canvas.clientHeight,
        z: Math.random() * 0.9 + 0.1,
      }));
    }

    function draw(t: number) {
      if (!motionOK) {
        ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
        for (const s of stars.current) {
          const alpha = 0.25 + s.z * 0.6;
          const r = 0.8 + s.z * 1.2;
          ctx.fillStyle = `rgba(148,163,184,${alpha})`;
          ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
        }
        anim.current = requestAnimationFrame(draw);
        return;
      }

      ctx.clearRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      const driftX = pointer.x * 10;
      const driftY = pointer.y * 6;
      for (let i = 0; i < stars.current.length; i++) {
        const s = stars.current[i];
        const sp = baseSpeed * (0.5 + s.z * 0.9);
        s.x += sp * (0.6 + Math.sin((t / 6000 + i) % Math.PI) * 0.4) + driftX * 0.02 * s.z;
        s.y += sp * 0.2 + driftY * 0.01 * s.z;
        if (s.x > canvas.clientWidth + 10) s.x = -10;
        if (s.y > canvas.clientHeight + 10) s.y = -10;
        // base brightness
let alpha = 0.25 + s.z * 0.6;

// twinkle multiplier (speed + strength)
const twinkle = 0.6 + 0.6 * Math.sin(t / 400 + i * 4); 
// ↑ 0.6+0.6 means alpha swings between 0.0x and 1.2x

alpha *= twinkle;

const r = 0.8 + s.z * 1.2;
ctx.fillStyle = `rgba(148,163,184,${alpha})`;
        ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
      }
      anim.current = requestAnimationFrame(draw);
    }

    resize();
    resetStars();
    const obs = new ResizeObserver(() => { resize(); resetStars(); });
    obs.observe(canvas);
    anim.current = requestAnimationFrame(draw);
    return () => { obs.disconnect(); if (anim.current) cancelAnimationFrame(anim.current); };
  }, [density, baseSpeed, motionOK, visible]);

  return (
    <canvas
      ref={ref}
      className="absolute inset-0 h-full w-full"
      style={{ maskImage: 'radial-gradient( at 70% 50%, black 60%, transparent 100%)' }}
      aria-hidden
    />
  );
}

/* =====================================================
   TYPEWRITER
   ===================================================== */
function Typewriter({ text, speed = 22, className = '' }: { text: string; speed?: number; className?: string }) {
  const [out, setOut] = useState('');
  useEffect(() => { let i = 0; const id = setInterval(() => { i++; setOut(text.slice(0, i)); if (i >= text.length) clearInterval(id); }, speed); return () => clearInterval(id); }, [text, speed]);
  return (
    <span className={className}>
      {out}
      <span aria-hidden className="ml-0.5 inline-block h-5 w-2 animate-pulse rounded-sm bg-slate-100 align-[-2px]"/>
    </span>
  );
}

/* =====================================================
   HERO — Growth Core + Orbit chips + HUD logs
   ===================================================== */
function GrowthCore({ pulseKey }: { pulseKey: number }) {
  const [rot, setRot] = useState(0);
  const [pulse, setPulse] = useState(0);
  const motionOK = useMotionOK();

  useEffect(() => {
    let raf: number;
    const loop = () => {
      if (motionOK) setRot((r) => (r + 0.15) % 360);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [motionOK]);

  useEffect(() => { setPulse((p) => p + 1); }, [pulseKey]);

  return (
    <div className="relative aspect-square w-full max-w-[540px]">
      <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.25),transparent_60%)] blur-2xl" />
      <svg viewBox="-100 -100 200 200" className="relative z-10 h-full w-full select-none">
        <defs>
          <radialGradient id="coreGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="55%" stopColor="#a78bfa" />
            <stop offset="100%" stopColor="#1f2937" />
          </radialGradient>
          <filter id="glow"><feGaussianBlur stdDeviation="3" result="b" /><feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge></filter>
        </defs>
        <g style={{ transform: `rotate(${rot}deg)`, transformOrigin: 'center' }}>
          <circle r="34" fill="url(#coreGrad)" filter="url(#glow)" />
          {[...Array(8)].map((_, i) => (<polygon key={i} points="0,-32 6,-8 0,0 -6,-8" fill={i % 2 ? '#a5b4fc' : '#c084fc'} opacity="0.8" style={{ transform: `rotate(${i * 45}deg)` }} />))}
        </g>
        {[24, 38, 56, 72].map((rad, i) => (
          <g key={rad} style={{ transform: `rotate(${(rot * (i % 2 ? -1 : 1))}deg)`, transformOrigin: 'center' }}>
            <circle r={rad} fill="none" stroke={i % 2 ? '#93c5fd' : '#c4b5fd'} strokeOpacity="0.45" strokeWidth={i === 2 ? 1.6 : 1.2} strokeDasharray={i === 2 ? '4 6' : '2 4'} />
          </g>
        ))}
        <circle r="30" fill="none" stroke="#22d3ee" strokeWidth="2" opacity="0.7">
          <animate attributeName="r" values="30;80;30" dur="1.8s" begin={`${pulse}s`} repeatCount="1" />
          <animate attributeName="opacity" values="0.7;0;0" dur="1.8s" begin={`${pulse}s`} repeatCount="1" />
        </circle>
      </svg>
      <div className="pointer-events-none absolute inset-0 rounded-full [background:radial-gradient(120px_60px_at_60%_40%,rgba(99,102,241,0.25),transparent_60%)]" />
    </div>
  );
}

function OrbitChips({ radius = 220 }: { radius?: number }) {
  const [t, setT] = useState(0); const ptr = usePointer();
  const motionOK = useMotionOK();
  useEffect(() => { let raf: number; const loop = () => { if (motionOK) setT((v) => v + 0.016); raf = requestAnimationFrame(loop); }; raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf); }, [motionOK]);
  function pos(i: number, phase = 0) { const a = t * (0.6 + i * 0.05) + phase + ptr.x * 0.6; const rx = radius * (1 + Math.sin(t * 0.3) * 0.04); const ry = radius * 0.58 * (1 + Math.cos(t * 0.27) * 0.04); return { x: Math.cos(a) * rx, y: Math.sin(a) * ry }; }
  return (
    <div className="pointer-events-none absolute left-1/2 top-1/2 -z-10 h-[560px] w-[560px] -translate-x-1/2 -translate-y-1/2">
      {PLATFORMS.map((p, i) => { const { x, y } = pos(i, i * 1.1); return (
        <div key={p.label} className="absolute grid place-items-center rounded-full border border-white/70 bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-700 shadow-lg backdrop-blur" style={{ transform: `translate(${x + 280}px, ${y + 280}px)` }}>
          <span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} /> {p.label}
        </div> ); })}
      <div className="absolute inset-0 -z-10 rounded-full border border-slate-200/60" />
      <div className="absolute inset-6 -z-10 rounded-full border border-slate-200/40" />
      <div className="absolute inset-12 -z-10 rounded-full border border-slate-200/30" />
      <div className="absolute inset-20 -z-10 rounded-full border border-slate-200/20" />
    </div>
  );
}

type LogItem = { id: number; text: string; tone: 'info' | 'good' | 'warn' };
const LOGS: LogItem[] = [
  { id: 1, text: 'Shield on, overlap -9.3%', tone: 'good' },
  { id: 2, text: 'Branded cannibalization blocked', tone: 'good' },
  { id: 3, text: 'Payback forecast 57 days', tone: 'info' },
  { id: 4, text: 'Creative fatigue slowing set B', tone: 'warn' },
  { id: 5, text: 'Cohort drift contained', tone: 'info' },
];

function LiveHUD({ onPulse }: { onPulse: () => void }) {
  const [queue, setQueue] = useState<LogItem[]>([]);
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = setInterval(() => {
      setQueue((q) => {
        const next = LOGS[i % LOGS.length];
        setI((v) => v + 1);
        if (/shield|blocked/i.test(next.text)) onPulse();
        return [next, ...q].slice(0, 4);
      });
    }, 1800);
    return () => clearInterval(id);
  }, [i, onPulse]);

  const toneClass = (t: LogItem['tone']) =>
    t === 'good'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : t === 'warn'
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-slate-50 text-slate-700 border-slate-200';

  return (
    <div className="relative" aria-live="polite">
      <div className="pointer-events-none absolute right-0 top-0 flex w-[320px] flex-col gap-2">
        <AnimatePresence initial={false}>
          {queue.map((log) => (
            <motion.div
              key={log.id + '-' + i + '-' + log.text}
              initial={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -6, filter: 'blur(4px)' }}
              transition={{ type: 'spring', stiffness: 480, damping: 32 }}
              className={`pointer-events-auto inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-xs shadow-md ${toneClass(
                log.tone
              )}`}
            >
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              {log.text}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function HeroCinematic() {
  const pointer = usePointer();
  const [pulseKey, setPulseKey] = useState(0);
  return (
    <section className="relative isolate overflow-visible bg-gradient-to-b from-[#0b0d12] via-[#0d1016] to-[#0f121a] px-6 pt-20 pb-36 sm:pt-28 sm:pb-44">
      <div className="pointer-events-none absolute inset-0 -z-10"><Starfield density={360} baseSpeed={0.50} /></div>
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 md:grid-cols-2">
        <div style={{ transform: `translate3d(${pointer.x * 6}px, ${pointer.y * 4}px, 0)` }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/90 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Read-only OAuth · Finance-grade accuracy
          </div>
          <h1 className="mt-6 text-5xl font-black tracking-tight text-white sm:text-6xl">
  <Typewriter text="The only AI agents" className="block" />
  <span className="mt-3 block text-3xl font-semibold text-slate-300 sm:text-4xl">
    built for profitable growth.
  </span>
</h1>
<p className="mt-6 max-w-xl text-lg text-slate-300/90">
   Your marketing copilot that cuts waste. From CAC to payback, decisions become clear, fast, and trusted.
</p>
          <div className="mt-8 flex items-center gap-4">
            <PrimaryCTA href={CALENDLY_URL}>Start free pilot</PrimaryCTA>
            <span className="text-sm text-slate-400">No card. 14-day pilot. Cancel anytime.</span>
          </div>
        </div>
        <div className="relative">
  <div style={{ transform: `translate3d(${pointer.x * -6}px, ${pointer.y * -4}px, 0)` }}>
    <LiveAgentDemo />
  </div>
</div>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/40 to-transparent" />
    </section>
  );
}

/* =====================================================
   AGENTS — Glass cards, short lines, pricing psychology (LIGHT SECTION)
   ===================================================== */
function ProFiQRadar() {
  const sweepRef = useRef<HTMLDivElement | null>(null);
  const motionOK = useMotionOK();
  const [dots, setDots] = useState<{ id:number; top:number; left:number }[]>(
    () => Array.from({ length: 6 }, (_, i) => ({
      id: i,
      top: 20 + Math.random() * 60,
      left: 20 + Math.random() * 60,
    }))
  );

  useEffect(() => {
    const el = sweepRef.current;
    if (!el) return;
    let raf: number; let angle = 0;
    const tick = () => {
      if (motionOK) { angle = (angle + 0.5) % 360; el.style.transform = `rotate(${angle}deg)`; }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [motionOK]);

  // Randomly “respawn” one dot every 1.2s to a new location
  useEffect(() => {
    const id = setInterval(() => {
      setDots((prev) => {
        const idx = Math.floor(Math.random() * prev.length);
        const next = [...prev];
        next[idx] = {
          id: next[idx].id,
          top: 20 + Math.random() * 60,
          left: 20 + Math.random() * 60,
        };
        return next;
      });
    }, 1200);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="relative h-48 w-48 overflow-hidden rounded-full bg-slate-900/70 ring-1 ring-white/10 backdrop-blur">
      <div className="absolute inset-0 rounded-full border border-emerald-400/40" />
      <div className="absolute inset-4 rounded-full border border-emerald-400/30" />
      <div className="absolute inset-8 rounded-full border border-emerald-400/20" />
      <div ref={sweepRef} className="absolute inset-0 origin-center">
        <div className="absolute left-1/2 top-1/2 h-1/2 w-[2px] -translate-x-1/2 bg-gradient-to-b from-emerald-400 to-transparent" />
      </div>
      {dots.map((d) => (
        <div
          key={d.id}
          className="absolute h-1 w-1 rounded-full bg-emerald-400"
          style={{
            top: `${d.top}%`,
            left: `${d.left}%`,
            opacity: 0.7,
            transition: 'top 800ms ease, left 800ms ease, opacity 400ms ease',
          }}
        />
      ))}
    </div>
  );
}

function RealROICoin() {
  return (
    <div className="relative flex h-48 w-48 items-center justify-center rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 shadow-2xl ring-1 ring-white/10 backdrop-blur">
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 12, ease: 'linear' }} className="absolute inset-0 rounded-full border-[6px] border-white/40" />
      <motion.div animate={{ rotate: -360 }} transition={{ repeat: Infinity, duration: 20, ease: 'linear' }} className="absolute inset-4 rounded-full border-[4px] border-white/20" />
      <div className="relative text-center">
        <div className="text-3xl font-black text-white drop-shadow">ROI</div>
        <div className="mt-1 text-sm text-white/90">Signals</div>
      </div>
    </div>
  );
}

function SignalLine() {
  return (
    <div className="relative mt-1 h-[2px] w-full overflow-hidden rounded">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-emerald-500 opacity-30" />
      <motion.div
        initial={{ x: '-100%' }}
        animate={{ x: '100%' }}
        transition={{ repeat: Infinity, duration: 2.2, ease: 'linear' }}
        className="absolute top-0 h-[2px] w-1/3 bg-white/80 mix-blend-overlay"
      />
    </div>
  );
}

function FoundingBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      Founding rate
    </span>
  );
}

function AgentBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-800">
      <div className="text-[13px]">✓ {children}</div>
      <SignalLine/>
    </li>
  );
}

function AgentCard({
  title, tag, Viz, bullets, blurb,
  anchorPrice, price,
}: {
  title: string;
  tag: string;
  Viz: React.ComponentType<any>;
  bullets: string[];
  blurb: string;
  anchorPrice: string;
  price: string;
}) {
  return (
  <motion.div
    whileHover={{ y: -6 }}
    transition={{ type: 'spring', stiffness: 260, damping: 20 }}
    className="relative flex flex-col items-center rounded-3xl border border-slate-200 bg-white p-8 shadow-xl"
  >
    {/* Optional ribbon (can remove if not needed) */}
    {title === "ProFiQ Agent" && (
  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow">
    Most popular
  </span>
)}

{title === "RealROI Agent" && (
  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-emerald-600 px-2.5 py-0.5 text-[10px] font-semibold text-white shadow">
    Fastest payback
  </span>
)}

    <Viz />
    <div className="mt-6 text-center">
      <h3 className="text-xl font-bold text-slate-900">{title}</h3>
      <div className="text-xs font-medium text-emerald-700">{tag}</div>
      <p className="mt-2 text-sm font-semibold text-slate-700">{blurb}</p>
    </div>

    <ul className="mt-4 w-full space-y-2">
      {bullets.map((b) => (
        <AgentBullet key={b}>{b}</AgentBullet>
      ))}
    </ul>

    {/* Pricing psychology: anchor + cohort */}
    <div className="mt-6 text-center">
      {/* Standard anchor */}
      <div className="text-xs text-slate-400">
        <span className="line-through">{anchorPrice}</span>
        <span className="ml-1 text-slate-500">(standard)</span>
      </div>

      {/* Price + unit */}
      <div className="mt-1 text-3xl font-black text-slate-900 tabular-nums">
        {price}
        <span className="ml-1 text-sm font-semibold text-slate-500">/brand</span>
      </div>

      {/* Cohort badge + reassurance */}
      <div className="mt-2 flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Founding cohort
        </span>
        <span className="text-[11px] text-slate-500">locks price for 12 months</span>
      </div>

      {/* Optional: seats left */}
      {/* <div className="mt-1 text-[11px] font-semibold text-amber-600">12 seats left</div> */}
    </div>

    <div className="mt-5" />
    <PrimaryCTA href={CALENDLY_URL}>Start free pilot</PrimaryCTA>
    <div className="mt-2 text-[11px] text-slate-500">
      No card. 14-day pilot. Cancel anytime.
    </div>
  </motion.div>
);
}

function AgentsSection() {
  return (
    <section id="agents" className="relative border-t border-white/10 bg-gradient-to-b from-white via-slate-50 to-slate-100 py-24">
      <div className="mx-auto w-full max-w-7xl px-6">
        <div className="mb-12 text-center">
          <h2 className="text-4xl font-black tracking-tight text-slate-900">Choose your Agent</h2>
          <p className="mt-3 text-lg text-slate-600">Live, proactive modules. Tuned to defend margin and speed payback.</p>
        </div>
        <div className="grid gap-12 md:grid-cols-2">
          <AgentCard
            title="ProFiQ Agent"
            tag="Decision Support"
            Viz={ProFiQRadar}
            blurb="Waste spotted early."
            bullets={[
              'Risk badge overlay (brand vs remarketing)',
              '1 vs 7-day attribution skew monitor',
              'AM Slack digest, top 3 actions',
            ]}
            anchorPrice="$99/mo"
            price="$19/mo"
          />
          <AgentCard
            title="RealROI Agent"
            tag="Finance Lens"
            Viz={RealROICoin}
            blurb="Spend → payback."
            bullets={[
              'Variance alerts (CPC↑ / AOV↓ early)',
              'Chargeback loop (net revenue realism)',
              'One-click finance PDF',
            ]}
            anchorPrice="$199/mo"
            price="$49/mo"
          />
        </div>
      </div>
    </section>
  );
}

/* =====================================================
   IMPACT CHART — polished 2D, dark tooltip, thin axes
   ===================================================== */
function DeepImpactChart() {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const wrap = useRef<HTMLDivElement | null>(null);
  const [hoverX, setHoverX] = useState<number | null>(null);
  const motionOK = useMotionOK();

  // ---------- data (stable across renders)
  const data = useRef<{ weeks: number[]; before: number[]; after: number[] }>({
    weeks: [], before: [], after: [],
  });

  if (data.current.weeks.length === 0) {
    const N = 36; // smoother line
    const weeks = Array.from({ length: N }, (_, i) => i);
    const before: number[] = [];
    const after: number[] = [];
    let b = 44, a = 44;
    for (let i = 0; i < N; i++) {
      // baseline: slight drift
      b += (Math.random() - 0.5) * 0.25 - 0.05;
      // after: stronger improvement (later stronger)
      a += (Math.random() - 0.5) * 0.22 - (i < 12 ? 0.12 : 0.22);
      before.push(Math.max(39.5, Math.min(46, b)));
      after.push(Math.max(34.0, Math.min(45, a)));
    }
    data.current = { weeks, before, after };
  }

  // ---------- DPR + resize
  useEffect(() => {
    const c = ref.current!;
    const ro = new ResizeObserver(() => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      c.width = Math.floor(c.clientWidth * dpr);
      c.height = Math.floor(c.clientHeight * dpr);
      const ctx = c.getContext('2d')!;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    });
    ro.observe(c);
    return () => ro.disconnect();
  }, []);

  // ---------- helpers
  const MIN = 34, MAX = 46;
  type Plot = { l:number; r:number; t:number; b:number; w:number; h:number };
  const xAt = (i:number, P:Plot, len:number) => P.l + (i / (len - 1)) * P.w;
  const yAt = (v:number, P:Plot) => P.t + (1 - (v - MIN) / (MAX - MIN)) * P.h;

  function spline(ctx: CanvasRenderingContext2D, xs: number[], ys: number[]) {
    const n = xs.length;
    ctx.beginPath();
    ctx.moveTo(xs[0], ys[0]);
    for (let i = 0; i < n - 1; i++) {
      const x0 = i === 0 ? xs[0] : xs[i - 1];
      const y0 = i === 0 ? ys[0] : ys[i - 1];
      const x1 = xs[i],     y1 = ys[i];
      const x2 = xs[i + 1], y2 = ys[i + 1];
      const x3 = i + 2 < n ? xs[i + 2] : xs[i + 1];
      const y3 = i + 2 < n ? ys[i + 2] : ys[i + 1];
      const cp1x = x1 + (x2 - x0) / 6;
      const cp1y = y1 + (y2 - y0) / 6;
      const cp2x = x2 - (x3 - x1) / 6;
      const cp2y = y2 - (y3 - y1) / 6;
      ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
    }
  }

  // floating callouts
  type Badge = { t: number; text: string; hue: number; side: 'L'|'R' };
  const badges = useRef<Badge[]>([
    { t: 0.34, text: 'Overlap down', hue: 160, side: 'L' },
    { t: 0.55, text: 'CAC ↓ 24%', hue: 160, side: 'R' },
    { t: 0.85, text: 'Payback −34d', hue: 200, side: 'R' },
  ]);

  // ---------- draw loop
  useEffect(() => {
    const c = ref.current!;
    const ctx = c.getContext('2d')!;
    let raf = 0; let t = 0;

    const draw = () => {
      const W = c.clientWidth, H = c.clientHeight;
      ctx.clearRect(0, 0, W, H);

      // background panel (white to match section)
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, W, H);

      // plot box
      const P: Plot = { l: 56, r: 18, t: 28, b: 36, w: W - 56 - 18, h: H - 28 - 36 };

      // grid dots
      ctx.save();
      ctx.fillStyle = 'rgba(2,6,23,0.06)';
      const rows = 6, cols = 48;
      for (let r = 0; r <= rows; r++) {
        const y = P.t + (r / rows) * P.h;
        for (let i = 0; i <= cols; i++) {
          const x = P.l + (i / cols) * P.w;
          ctx.fillRect(x, y, 1, 1);
        }
      }
      ctx.restore();

      // axis spines (thin + subtle)
      ctx.strokeStyle = 'rgba(100,116,139,0.16)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(P.l, P.t); ctx.lineTo(P.l, P.t + P.h); ctx.stroke();   // Y
      ctx.beginPath(); ctx.moveTo(P.l, P.t + P.h); ctx.lineTo(P.l + P.w, P.t + P.h); ctx.stroke(); // X

      // y labels + x label
      ctx.fillStyle = 'rgba(100,116,139,0.95)';
      ctx.font = '11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';
      [46, 44, 42, 40, 38, 36, 34].forEach(v => {
        const y = yAt(v, P); ctx.fillText(`$${v}`, 16, y + 3);
      });
      ctx.fillText('Days →', P.l + P.w - 62, P.t + P.h + 22);

      // points
      const { before, after } = data.current;
      const xs = after.map((_, i) => xAt(i, P, after.length));
      const ysAfter = after.map(v => yAt(v, P));
      const ysBefore = before.map(v => yAt(v, P));

      // AFTER — line + soft glow
      ctx.save();
      ctx.shadowColor = 'rgba(16,185,129,0.45)';
      ctx.shadowBlur = 12;
      ctx.lineWidth = 2.8;
      ctx.strokeStyle = '#10b981';
      spline(ctx, xs, ysAfter);
      ctx.stroke();
      ctx.restore();

      // fill under AFTER
      const fill = ctx.createLinearGradient(0, P.t, 0, P.t + P.h);
      fill.addColorStop(0, 'rgba(16,185,129,0.18)');
      fill.addColorStop(1, 'rgba(16,185,129,0.00)');
      ctx.save();
      spline(ctx, xs, ysAfter);
      ctx.lineTo(P.l + P.w, P.t + P.h);
      ctx.lineTo(P.l, P.t + P.h);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.restore();

      // spark on AFTER
      if (motionOK) {
        const travel = (Math.sin(t * 0.012) * 0.5 + 0.5) * (after.length - 1 - 1e-3);
        const ti = Math.floor(travel);
        const tf = travel - ti;
        const sx = xs[ti] * (1 - tf) + xs[ti + 1] * tf;
        const sy = ysAfter[ti] * (1 - tf) + ysAfter[ti + 1] * tf;

        const grd = ctx.createRadialGradient(sx, sy, 0, sx, sy, 32);
        grd.addColorStop(0, 'rgba(16,185,129,0.22)');
        grd.addColorStop(1, 'rgba(16,185,129,0)');
        ctx.fillStyle = grd;
        ctx.beginPath(); ctx.arc(sx, sy, 32, 0, Math.PI * 2); ctx.fill();

        ctx.save();
        ctx.shadowColor = 'rgba(16,185,129,0.9)';
        ctx.shadowBlur = 16;
        ctx.fillStyle = '#10b981';
        ctx.beginPath(); ctx.arc(sx, sy, 3.1, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // BEFORE — ghost by default; solid on hover
      if (hoverX !== null) {
        ctx.save();
        ctx.lineWidth = 2.2;
        ctx.strokeStyle = 'rgba(244,63,94,0.9)';
        ctx.shadowColor = 'rgba(244,63,94,0.5)';
        ctx.shadowBlur = 8;
        spline(ctx, xs, ysBefore);
        ctx.stroke();
        ctx.restore();
      } else {
        ctx.save();
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(244,63,94,0.35)';
        spline(ctx, xs, ysBefore);
        ctx.stroke();
        ctx.restore();
      }

      // hover guideline + dots + DARK tooltip for contrast
      if (hoverX !== null) {
        const idx = Math.round(((hoverX - P.l) / P.w) * (after.length - 1));
        const i = Math.max(0, Math.min(after.length - 1, idx));
        const hx = xs[i];
        const ay = ysAfter[i];
        const by = ysBefore[i];

        // guideline
        ctx.strokeStyle = 'rgba(2,6,23,0.10)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 6]);
        ctx.beginPath(); ctx.moveTo(hx, P.t); ctx.lineTo(hx, P.t + P.h); ctx.stroke();
        ctx.setLineDash([]);

        // dots
        ctx.fillStyle = '#10b981'; ctx.beginPath(); ctx.arc(hx, ay, 3.2, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#f43f5e'; ctx.beginPath(); ctx.arc(hx, by, 3.2, 0, Math.PI * 2); ctx.fill();

        // tooltip — dark glass chip
        const TW = 184, TH = 64;
        let tipX = hx + 14;
        let tipY = ay - TH - 10;
        tipX = Math.min(Math.max(P.l + 6, tipX), P.l + P.w - TW - 6);
        tipY = Math.min(Math.max(P.t + 6, tipY), P.t + P.h - TH - 6);

        ctx.fillStyle = 'rgba(15,23,42,0.95)';
        ctx.strokeStyle = 'rgba(255,255,255,0.06)';
        ctx.lineWidth = 1;
        // @ts-ignore
        ctx.roundRect?.(tipX, tipY, TW, TH, 10);
        ctx.shadowColor = 'rgba(0,0,0,0.35)';
        ctx.shadowBlur = 12;
        ctx.fill(); ctx.shadowBlur = 0; ctx.stroke();

        ctx.font = '11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';
        ctx.fillStyle = 'rgba(255,255,255,0.98)';
        ctx.fillText(`Day ${i}`, tipX + 12, tipY + 16);

        const row = (y:number, color:string, text:string) => {
          ctx.beginPath(); ctx.fillStyle = color;
          ctx.arc(tipX + 12, y - 4, 3, 0, Math.PI * 2); ctx.fill();
          ctx.fillStyle = 'rgba(255,255,255,0.98)';
          ctx.fillText(text, tipX + 22, y);
        };
        row(tipY + 34, '#22c55e', `After: $${data.current.after[i].toFixed(1)}`);
        row(tipY + 52, '#ef4444', `Before: $${data.current.before[i].toFixed(1)}`);
      }

      // floating badges (gentle drift)
      if (motionOK) {
        badges.current.forEach((b, k) => {
          const i = Math.floor(b.t * (after.length - 1));
          const tf = b.t * (after.length - 1) - i;
          const x = xs[i] * (1 - tf) + xs[i + 1] * tf;
          const y = ysAfter[i] * (1 - tf) + ysAfter[i + 1] * tf;
          const drift = Math.sin((t * 0.01) + k) * 6;
          const w = ctx.measureText(b.text).width + 22;
          const h = 26;
          const bx = Math.min(Math.max(12, (b.side === 'L' ? x - w - 8 : x + 8)), W - w - 12);
          const by = Math.min(Math.max(P.t + 6, y - 26 + drift), P.t + P.h - h - 6);

          // bubble
          ctx.fillStyle = 'rgba(255,255,255,0.92)';
          ctx.strokeStyle = 'rgba(15,23,42,0.10)';
          // @ts-ignore
          ctx.roundRect?.(bx, by, w, h, 10); ctx.fill(); ctx.stroke();

          ctx.beginPath(); ctx.fillStyle = `hsl(${b.hue} 70% 45%)`;
          ctx.arc(bx + 10, by + h / 2, 3, 0, Math.PI * 2); ctx.fill();

          ctx.fillStyle = 'rgba(15,23,42,0.95)';
          ctx.font = '12px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';
          ctx.fillText(b.text, bx + 20, by + 17);
        });
      }

      // legend chips
      ctx.font = '11px ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto';
      const chip = (x:number, y:number, color:string, label:string) => {
        const pad = 7; const tw = ctx.measureText(label).width;
        ctx.fillStyle = 'rgba(255,255,255,0.92)';
        // @ts-ignore
        ctx.roundRect?.(x, y, tw + pad * 2 + 10, 22, 999); ctx.fill();
        ctx.fillStyle = color; ctx.beginPath(); ctx.arc(x + pad + 5, y + 11, 3, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = 'rgba(15,23,42,0.9)'; ctx.fillText(label, x + pad + 12, y + 14);
      };
      chip(P.l, P.t + 4, '#10b981', 'After (with agent)');
      chip(P.l + 160, P.t + 4, '#f43f5e', 'Before baseline');

      t += motionOK ? 1 : 0;
      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [hoverX, motionOK]);

  return (
    <div
      ref={wrap}
      className="relative rounded-xl ring-1 ring-slate-200 bg-white shadow-sm"
      onMouseMove={(e) => {
        const r = (e.currentTarget as HTMLDivElement).getBoundingClientRect();
        setHoverX(e.clientX - r.left);
      }}
      onMouseLeave={() => setHoverX(null)}
    >
      <canvas
        ref={ref}
        className="h-[340px] w-full rounded-xl"
        aria-label="Performance improvement chart"
      />
    </div>
  );
}

/* =====================================================
   IMPACT — single section using DeepImpactChart
   ===================================================== */
function ImpactSection() {
  return (
    <section
  id="impact"
  className="relative isolate overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-100 py-44"
>
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 md:grid-cols-2">
        {/* Copy (left) */}
        <div className="text-slate-700">
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Measured impact
          </div>
          <h2 className="mt-4 text-4xl font-black text-slate-900">
            Fewer wasted dollars. Faster payback.
          </h2>
          <p className="mt-3 max-w-md">
            Clear before vs. after trajectory of blended CAC (lower is better). The
            green line shows campaigns with agents enabled; the red line shows
            the old baseline.
          </p>
        </div>

        {/* Chart (right on md+) */}
        <div className="relative md:order-last">
          <GlowFrame>
  <DeepImpactChart />
</GlowFrame>
        </div>
      </div>
    </section>
  );
}

/* =====================================================
   GROWTH GLOBE — Globe LEFT, Copy RIGHT (NO CHART HERE)
   ===================================================== */
const G_PLATFORMS = [
  { id: 'meta', label: 'Meta', color: '#1877F2', lat: 0.12 },
  { id: 'google', label: 'Google', color: '#4285F4', lat: -0.18 },
  { id: 'shopify', label: 'Shopify', color: '#10B981', lat: 0.32 },
  { id: 'tiktok', label: 'TikTok', color: '#00F2EA', lat: -0.36 },
  { id: 'snap', label: 'Snap', color: '#FFFC00', lat: 0.0 },
];
function rotY([x, y, z]: number[], a: number) { const ca = Math.cos(a), sa = Math.sin(a); return [ca * x + sa * z, y, -sa * x + ca * z]; }
function rotX([x, y, z]: number[], a: number) { const ca = Math.cos(a), sa = Math.sin(a); return [x, ca * y - sa * z, sa * y + ca * z]; }

function GlobeCanvas({ radius = 220, yaw, pitch, links }: { radius?: number; yaw: number; pitch: number; links: { a: number[]; b: number[]; front: boolean }[]; }) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  useEffect(() => {
    const canvas = ref.current!; const ctx = canvas.getContext('2d')!;
    function resize() { const dpr = Math.min(window.devicePixelRatio || 1, 2); const W = Math.floor(canvas.clientWidth * dpr); const H = Math.floor(canvas.clientHeight * dpr); canvas.width = W; canvas.height = H; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); }
    resize(); const ro = new ResizeObserver(resize); ro.observe(canvas); return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const canvas = ref.current!; const ctx = canvas.getContext('2d')!; const W = canvas.clientWidth, H = canvas.clientHeight; ctx.clearRect(0, 0, W, H); const cx = W / 2, cy = H / 2;
    const grad = ctx.createRadialGradient(cx - radius * 0.2, cy - radius * 0.3, radius * 0.2, cx, cy, radius * 1.1); grad.addColorStop(0, '#1e293b'); grad.addColorStop(0.45, '#0f172a'); grad.addColorStop(1, '#0b1020'); ctx.fillStyle = grad; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();
    const rim = ctx.createRadialGradient(cx + radius * 0.4, cy - radius * 0.6, radius * 0.2, cx + radius * 0.6, cy - radius * 0.8, radius * 1.2); rim.addColorStop(0, 'rgba(59,130,246,0.25)'); rim.addColorStop(1, 'rgba(59,130,246,0)'); ctx.globalCompositeOperation = 'lighter'; ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill(); ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = 'rgba(148,163,184,0.18)'; ctx.lineWidth = 1; for (let i = -60; i <= 60; i += 20) { const lat = (i / 180) * Math.PI; ctx.beginPath(); for (let j = 0; j <= 360; j += 4) { const lon = (j / 180) * Math.PI; let v: number[] = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)]; v = rotX(rotY(v, yaw), pitch); const [x, y] = v.map((n) => n * radius); if (j === 0) ctx.moveTo(cx + x, cy + y); else ctx.lineTo(cx + x, cy + y); } ctx.stroke(); }
    for (let i = 0; i < 360; i += 20) { const lon = (i / 180) * Math.PI; ctx.beginPath(); for (let j = -90; j <= 90; j += 3) { const lat = (j / 180) * Math.PI; let v: number[] = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)]; v = rotX(rotY(v, yaw), pitch); const [x, y] = v.map((n) => n * radius); if (j === -90) ctx.moveTo(cx + x, cy + y); else ctx.lineTo(cx + x, cy + y); } ctx.stroke(); }
    ctx.lineWidth = 1.6; ctx.shadowColor = 'rgba(56,189,248,0.45)'; ctx.shadowBlur = 12; ctx.strokeStyle = 'rgba(56,189,248,0.6)'; links.forEach((L) => { if (!L.front) return; const [ax, ay] = L.a, [bx, by] = L.b; const mx = (ax + bx) / 2, my = (ay + by) / 2 - 24; ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(mx, my, bx, by); ctx.stroke(); }); ctx.shadowBlur = 0;
  }, [yaw, pitch, links, radius]);
  return <canvas ref={ref} className="absolute inset-0 h-full w-full" aria-hidden />;
}

function Satellites({ positions }: { positions: { id: string; x: number; y: number; z: number; scale: number; label: string; color: string; front: boolean }[]; }){
  return <>{positions.map((p) => (<div key={p.id} className="pointer-events-none absolute grid -translate-x-1/2 -translate-y-1/2 place-items-center" style={{ left: p.x, top: p.y, opacity: p.front ? 1 : 0.32, transform: `translate(-50%,-50%) scale(${p.scale})` }}><div className="rounded-full border border-white/10 bg-white/80 px-2.5 py-1 text-[11px] font-medium text-slate-800 shadow-lg backdrop-blur"><span className="mr-1 inline-block h-2 w-2 rounded-full" style={{ backgroundColor: p.color }} />{p.label}</div></div>))}</>;
}

function GrowthGlobeSection(){
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [yaw, setYaw] = useState(0.2), [pitch, setPitch] = useState(-0.25);
  const [drag, setDrag] = useState(false);
  const targetYaw = useRef(0.2);
  const targetPitch = useRef(-0.25);
  const speed = useRef(0.0042);
  const last = useRef<{x:number;y:number}|null>(null);

  const [positions, setPositions] = useState<
    { id: string; x: number; y: number; z: number; scale: number; label: string; color: string; front: boolean }[]
  >([]);
  const [links, setLinks] = useState<{ a: number[]; b: number[]; front: boolean }[]>([]);

  useEffect(() => {
    let raf: number; let t = 0;
    const loop = () => {
      t += 1;
      if (!drag) targetYaw.current += speed.current;
      setYaw((y) => mix(y, targetYaw.current, 0.08));
      setPitch((p) => mix(p, targetPitch.current, 0.08));

      const box = wrapRef.current!.getBoundingClientRect();
      const cx = box.width / 2, cy = box.height / 2, R = Math.min(cx, cy) * 0.78;

      const locs = G_PLATFORMS.map((p, i) => {
        const lon = (t * 0.008 + i * 1.2) % (Math.PI * 2);
        const lat = p.lat;
        let v: number[] = [Math.cos(lat) * Math.cos(lon), Math.sin(lat), Math.cos(lat) * Math.sin(lon)];
        v = rotX(rotY(v, yaw), pitch);
        const [x, y, z] = v;
        const scale = 0.75 + clamp((z + 1) / 2, 0, 1) * 0.4;
        const px = cx + x * R; const py = cy + y * R;
                return { id: p.id, x: px, y: py, z, scale, label: p.label, color: p.color, front: z > 0 };
      }).sort((a, b) => a.z - b.z);

      setPositions(locs);

      const fronts = locs.filter((p) => p.front);
      const pairs: { a: number[]; b: number[]; front: boolean }[] = [];
      for (let i = 0; i < fronts.length; i++) {
        const a = fronts[i];
        const b = fronts[(i + 1) % fronts.length];
        pairs.push({ a: [a.x, a.y], b: [b.x, b.y], front: true });
      }
      setLinks(pairs);

      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [drag]);

  useEffect(() => {
    const el = wrapRef.current!;
    const onDown = (e: PointerEvent) => {
      setDrag(true);
      last.current = { x: e.clientX, y: e.clientY };
      (e.target as Element).setPointerCapture?.(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag || !last.current) return;
      const dx = e.clientX - last.current.x;
      const dy = e.clientY - last.current.y;
      targetYaw.current += dx * 0.0035;
      targetPitch.current = clamp(targetPitch.current + dy * 0.003, -0.9, 0.9);
      last.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => { setDrag(false); last.current = null; };

    el.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      el.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag]);

  return (
    <section id="globe" className="relative isolate overflow-hidden bg-gradient-to-b from-[#0b0d12] via-[#0d1016] to-[#0f121a] py-24">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-start gap-14 px-6 md:grid-cols-2">
        {/* LEFT: Globe only */}
        <div className="relative" ref={wrapRef} aria-label="Interactive growth globe">
          <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_70%_30%,rgba(59,130,246,0.18),transparent_60%)]" />
          <div className="relative h-[520px] w-full md:h-[620px]">
            <GlobeCanvas yaw={yaw} pitch={pitch} links={links} />
            <Satellites positions={positions} />
            <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/40 to-transparent" />
          </div>
        </div>

        {/* RIGHT: Copy — clear, direct, no jargon */}
<div>
  <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200/90 backdrop-blur">
    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
    Why teams need this
  </div>

  <h2 className="mt-4 text-4xl font-black text-white">Too much time lost in dashboards</h2>

  <p className="mt-4 max-w-xl leading-relaxed text-slate-300">
    Growth teams spend hours switching between Meta, Google, Shopify, TikTok, and other marketing channels.  
    Each platform shows its own version of results. By the time numbers are exported and stitched together, decisions are late and budgets have already drifted.
  </p>

  <p className="mt-4 max-w-xl leading-relaxed text-slate-300">
    Our AI agents remove that delay. They connect signals in real time so you can see how one platform affects the others and act before waste builds up.
  </p>

  <ul className="mt-6 max-w-xl space-y-3 text-sm leading-relaxed text-slate-300/90">
    <li>
      <span className="font-semibold">One place:</span>
      <span className="ml-1">no more flipping across five different dashboards.</span>
    </li>
    <li>
      <span className="font-semibold">Faster action:</span>
      <span className="ml-1">see shifts as they happen, not a week later.</span>
    </li>
    <li>
      <span className="font-semibold">Clear signals:</span>
      <span className="ml-1"><span className="text-emerald-400 font-semibold" aria-hidden>▲</span> improving · <span className="text-rose-400 font-semibold" aria-hidden>▼</span> risk.</span>
    </li>
  </ul>
</div>

      </div>
    </section>
  );
}

/* =====================================================
   CASE STUDY — concrete, specific narrative
   ===================================================== */
function MiniBars({ t }: { t: number }) {
  const lerp = (a:number,b:number,u:number)=>a+(b-a)*u;
  const media = lerp(30, 22, t);       // media spend component
  const fees = lerp(8, 7, t);          // platform + processing fees
  const returns = lerp(8, 6, t);       // returns/chargebacks impact
  const total = media + fees + returns;
  const w = 240;
  const scale = (x:number)=> (x / 46) * w;
  return (
    <div className="h-3 w-60 overflow-hidden rounded-full bg-slate-200">
      <div className="h-full bg-blue-500" style={{ width: `${scale(media)}px` }} />
      <div className="-mt-3 h-3 bg-indigo-500" style={{ width: `${scale(media + fees)}px` }} />
      <div className="-mt-3 h-3 bg-emerald-500" style={{ width: `${scale(total)}px` }} />
    </div>
  );
}

function CaseStudySection(){
  const [t, setT] = useState(0);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [drag, setDrag] = useState(false);

  useEffect(() => {
    const el = wrapRef.current!;
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const rect = el.getBoundingClientRect();
      const nx = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      setT(nx);
    };
    const onUp = () => setDrag(false);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [drag]);

  const CAC = mix(46, 35, t);
  const Payback = mix(92, 58, t);
  const Overlap = mix(18, 7, t);

  return (
    <section id="case" className="relative isolate overflow-hidden bg-gradient-to-b from-white to-slate-50 py-36">
      <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 px-6 md:grid-cols-2">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600 shadow-sm">Case study: D2C apparel</div>
          <h2 className="mt-4 text-4xl font-black text-slate-900">Drag to see the change</h2>
          <div className="mt-3 max-w-md space-y-3 text-slate-700 leading-relaxed">
  <p>
    We connected <span className="font-semibold text-slate-900">Meta</span>,
    <span className="font-semibold text-slate-900"> Google</span>, and
    <span className="font-semibold text-slate-900"> Shopify</span> in one view.
  </p>

  <p>
    <span className="font-semibold text-emerald-600">ProFiQ</span> flagged
    <span className="font-semibold"> branded vs. remarketing overlap</span> and
    <span className="font-semibold"> creative fatigue</span>.
  </p>

  <p className="mt-2">
    <span className="font-semibold text-amber-600">RealROI</span> measured on
    <span className="font-semibold"> true revenue (chargebacks included)</span>.
  </p>

  <p>
    <span className="text-slate-800">Budgets shifted</span> →
    <span className="text-emerald-700 font-semibold"> overlap dropped</span> →
    <span className="text-emerald-700 font-semibold"> payback got faster</span>.
  </p>
</div>
          <div className="mt-8 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-24 text-xs text-slate-500">CAC</div>
              <div className="tabular-nums text-3xl font-black text-black">${Math.round(CAC)}</div>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {Math.round(((46 - CAC) / 46) * 100)}% better
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-xs text-slate-500">Payback</div>
              <div className="tabular-nums text-3xl font-black text-black">{Math.round(Payback)} days</div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-24 text-xs text-slate-500">Overlap</div>
              <div className="tabular-nums text-3xl font-black text-black">{Math.round(Overlap)}%</div>
            </div>
            <MiniBars t={t} />
          </div>
        </div>

        <div className="relative" ref={wrapRef}>
          <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">Before</div>
                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-slate-700">Branded + remarketing overlap high</div>
                  <div className="mt-2 text-3xl font-black text-black">$46 CAC</div>
                  <div className="mt-2 text-xs text-slate-500">Fatigue: medium → high</div>
                </div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-500">After</div>
                <div className="mt-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                  <div className="text-emerald-700">Overlap trimmed, prospecting signal clean</div>
                  <div className="mt-2 text-3xl font-black text-emerald-700">$35 CAC</div>
                  <div className="mt-2 text-xs text-emerald-600">Fatigue: slowed</div>
                </div>
              </div>
            </div>

            {/* Scrubber */}
            <div
              role="slider"
              aria-label="Case study scrubber"
              aria-valuemin={0}
              aria-valuemax={1}
              aria-valuenow={t}
              tabIndex={0}
              onPointerDown={() => setDrag(true)}
              className="absolute inset-y-6 left-1/2 grid w-10 -translate-x-1/2 place-items-center"
              style={{ left: `calc(${t * 100}% + 24px)` }}
            >
              <div className="pointer-events-none h-full w-[2px] rounded-full bg-gradient-to-b from-blue-500 via-purple-500 to-emerald-500 opacity-60" />
              <div className="pointer-events-none absolute -top-2 grid h-8 w-8 place-items-center rounded-full bg-white shadow-xl ring-1 ring-slate-200">
                <div className="h-2 w-2 rounded-full bg-slate-900" />
              </div>
              <div className="pointer-events-none absolute -bottom-2 grid h-8 w-8 place-items-center rounded-full bg-white shadow-xl ring-1 ring-slate-200">
                <div className="h-2 w-2 rounded-full bg-slate-900" />
              </div>
            </div>
          </div>
          <div className="mt-3 text-center text-xs text-slate-500">Drag the handle to compare</div>
        </div>
      </div>
    </section>
  );
}

/* --- Blinking dot (small + subtle ping) --- */
function StatusDot({ color }: { color: "green" | "red" }) {
  const palette = {
    green: "bg-emerald-500",
    red: "bg-rose-500",
  } as const;
  return (
    <span
      className={`relative inline-block h-1.5 w-1.5 rounded-full ${palette[color]}`}
    >
      {/* Softer ping: smaller radius, slower */}
      <span
        className={`absolute inset-0 rounded-full ${palette[color]} animate-ping`}
        style={{
          animationDuration: "2s",
          transform: "scale(1.8)", // smaller pulse radius
          opacity: 0.45,
        }}
      />
    </span>
  );
}

/* --- StatCard --- */
function StatCard({
  label,
  sublabel,
  value,
  prefix,
  suffix,
  badge,
  statusColor,
}: {
  label: string;
  sublabel?: string;
  value: string;
  prefix?: string;
  suffix?: string;
  badge?: React.ReactNode;
  statusColor: "green" | "red";
}) {
  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 text-[11px] font-semibold tracking-wide text-slate-600">
          <StatusDot color={statusColor} />
          <div>
            <div>{label}</div>
            {sublabel && (
              <div className="mt-0.5 text-[10px] font-medium text-slate-500">
                {sublabel}
              </div>
            )}
          </div>
        </div>
        {badge}
      </div>

      <div className="flex items-baseline gap-2">
        {prefix && (
          <div className="text-lg font-black text-slate-400 tabular-nums">
            {prefix}
          </div>
        )}
        <div className="text-[34px] leading-none font-black text-slate-900 tabular-nums">
          {value}
        </div>
        {suffix && (
          <div className="text-lg font-bold text-slate-400">{suffix}</div>
        )}
      </div>
    </div>
  );
}

/* --- Section with rule-based status --- */
function MetricShowcaseSection() {
  // metrics
  const waitlist = 7;
  const pilots = 2;
  const cacImprovement = 24.6; // %
  const budget = 12845;        // $

  // thresholds (serious logic, not random)
  const statusColor = {
    waitlist: waitlist < 30 ? "red" : "green",
    pilots: pilots >= 8 ? "green" : "red",
    cac: cacImprovement >= 20 ? "green" : "red",
    budget: budget >= 10000 ? "green" : "red",
  };

  return (
    <section
      id="metric-showcase"
      className="relative isolate overflow-hidden bg-gradient-to-b from-white via-slate-50 to-slate-100 py-24"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Header chip */}
        <div className="mb-6 flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-600">
            Updated monthly (last 30 days)
          </span>
        </div>

        {/* Title + subcopy */}
        <div className="max-w-3xl">
          <h2 className="text-4xl font-black tracking-tight text-slate-900">
            Momentum you can measure
          </h2>
          <p className="mt-3 text-slate-700">
            A quick pulse on what the agents are delivering across pilots and
            waitlist brands. Updated continuously.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Brands waitlisted"
            sublabel="growing interest"
            value={waitlist.toString()}
            statusColor={statusColor.waitlist}
            badge={
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                +5 this week
              </span>
            }
          />

          <StatCard
            label="Active pilots"
            sublabel="hands on trials"
            value={pilots.toString()}
            statusColor={statusColor.pilots}
            badge={
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-blue-50 text-blue-700 ring-1 ring-blue-200">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-blue-500" />
                +2 live
              </span>
            }
          />

          <StatCard
            label="Avg CAC improvement"
            sublabel="vs baseline"
            value={cacImprovement.toString()}
            suffix="%"
            statusColor={statusColor.cac}
            badge={
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                uptrend
              </span>
            }
          />

          <StatCard
            label="Budget reallocated"
            sublabel="to higher ROI"
            prefix="$"
            value={budget.toLocaleString()}
            statusColor={statusColor.budget}
            badge={
              <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium bg-slate-100 text-slate-700 ring-1 ring-slate-200">
                last 30 days
              </span>
            }
          />
        </div>
      </div>
    </section>
  );
}

/* =====================================================
   FOOTER — MVP (no Careers/Security/Legal)
   ===================================================== */
function Footer(){
  return (
    <footer className="border-t border-white/10 bg-[#0b0d12]">
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid gap-10 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2 font-semibold text-white">
              <span className="inline-grid h-7 w-7 place-items-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="white"><path d="M12 2l3.09 6.26L22 9.27l-5 4.84L18.18 22 12 18.77 5.82 22 7 14.11l-5-4.84 6.91-1.01z"/></svg>
              </span>
              {SITE.brand}
            </div>
            <p className="mt-4 text-sm text-slate-400">A decision layer for growth. Read-only OAuth. Finance-grade accuracy.</p>
            <div className="mt-5">
              <a className="text-sm text-slate-300 underline decoration-white/30 hover:text-white" href={`mailto:${SITE.supportEmail}`}>{SITE.supportEmail}</a>
            </div>
          </div>

          <div>
            <div className="text-sm font-semibold text-white">Product</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-400">
              <li><a className="hover:text-white" href="#agents">Agents</a></li>
              <li><a className="hover:text-white" href="#impact">Impact</a></li>
              <li><a className="hover:text-white" href="#globe">Why It Wins</a></li>
              <li><a className="hover:text-white" href="#case">Proof</a></li>
            </ul>
          </div>

          <div className="flex flex-col items-start gap-3">
            <PrimaryCTA href={CALENDLY_URL}>Start free pilot</PrimaryCTA>
            <div className="text-xs text-slate-500">No card. 14-day pilot. Cancel anytime.</div>
          </div>
        </div>

        <div className="mt-10 border-t border-white/10 pt-6 text-xs text-slate-500">
          © {new Date().getFullYear()} {SITE.brand}. All rights reserved.
        </div>
      </div>
    </footer>
  );
}

/* =====================================================
   PAGE — glue it all together
   ===================================================== */
export default function Page(){
  const motionOK = useMotionOK();
  return (
    <main className="relative min-h-screen bg-[#0b0d12] text-white">
      {/* Starfield sits behind everything */}
      <GlobalStarfield density={260} twinkle direction="right" speed={2.6} twinkleSpeed={0.024} />

      <Header />
      <HeroCinematic /> 
      <MetricShowcaseSection />
      <AgentsSection />
      <OrbitSection motionOK={motionOK} />
      <ImpactSection />
      <GrowthGlobeSection />
      <CaseStudySection />
      {/* Social proof band */}
<section className="border-t border-white/10 bg-[#0c0f15] py-6">
  <div className="mx-auto flex max-w-7xl flex-col items-center justify-center gap-4 px-6 text-center md:flex-row md:justify-between">
    <p className="text-sm font-medium text-slate-300">
      Connects securely with your stack · <span className="text-emerald-400">Results audited with finance</span>
    </p>
    <div className="flex items-center gap-4 ml-6">
    <span className="font-semibold text-slate-300">Meta</span>
    <span className="font-semibold text-slate-300">Google</span>
    <span className="font-semibold text-slate-300">Shopify</span>
    <span className="font-semibold text-slate-300">TikTok</span>
  </div>
  </div>
</section>
      <Footer />
    </main>
  );
}