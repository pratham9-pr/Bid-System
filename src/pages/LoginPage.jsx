import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Login } from '../components/Login';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-full bg-surface-gradient flex flex-col justify-between relative overflow-x-hidden">
      {/* ── Ambient Background Lighting ───────────────────────────────── */}
      <div className="absolute top-1/6 left-1/12 w-[35rem] h-[35rem] rounded-full bg-fire-600/10 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-1/6 right-1/12 w-[35rem] h-[35rem] rounded-full bg-amber-500/10 blur-[150px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[45rem] h-[45rem] rounded-full bg-surface-900/40 blur-[120px] pointer-events-none" />

      {/* ── Main Two-Column Viewport Split ────────────────────────────── */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-12 py-8 lg:py-12 flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-16 relative z-10">
        
        {/* ── Left / Top Branding & Stream Section ────────────────────── */}
        <section className="w-full lg:w-5/12 flex flex-col items-center lg:items-start text-center lg:text-left space-y-6">
          
          {/* Tournament Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-fire-500/10 border border-fire-500/30 backdrop-blur-md shadow-[0_0_20px_rgba(249,115,22,0.15)]">
            <span className="w-2 h-2 rounded-full bg-fire-400 animate-pulse" />
            <span className="text-[11px] font-rajdhani font-black tracking-[0.25em] text-fire-300 uppercase">
              OFFICIAL BIDDING PORTAL
            </span>
          </div>

          {/* Logo & Headline */}
          <div className="flex flex-col items-center lg:items-start gap-4">
            <div className="relative group">
              <div className="absolute -inset-3 bg-gradient-to-r from-fire-500/30 via-amber-500/20 to-fire-500/30 rounded-full blur-xl animate-pulse" />
              <div className="w-28 h-28 sm:w-36 sm:h-36 lg:w-44 lg:h-44 rounded-full overflow-hidden border-2 border-amber-500/60 shadow-[0_0_40px_rgba(245,158,11,0.4)] relative z-10 bg-black/90 p-1">
                <img
                  src="/image_440ba2.jpg"
                  alt="Demons Reign"
                  className="w-full h-full object-cover object-center rounded-full transition-transform duration-700 group-hover:scale-105"
                  onError={(e) => {
                    e.currentTarget.src = '/demons_reign_logo.jpg';
                  }}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <h1 className="font-rajdhani font-black text-4xl sm:text-5xl lg:text-6xl text-white tracking-tight leading-none drop-shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                DEMONS <span className="text-gradient-fire">REIGN</span>
              </h1>
              <p className="font-rajdhani font-extrabold text-sm sm:text-base lg:text-lg text-slate-300 tracking-[0.3em] uppercase">
                AUCTION SERIES 2026
              </p>
              <p className="text-xs sm:text-sm text-slate-400 font-inter max-w-md pt-1 leading-relaxed">
                Real-time synchronized live bidding floor for Free Fire franchise owners, team management, and broadcast production.
              </p>
            </div>
          </div>

          {/* Stream Overlay & Points Table Quick Access Cards */}
          <div className="w-full max-w-md pt-2 flex flex-col gap-2.5">
            <button
              id="goto-broadcast-btn"
              onClick={() => navigate('/broadcast')}
              className="w-full p-3.5 rounded-2xl bg-surface-900/80 border border-fire-500/30 hover:border-fire-500/70
                         hover:shadow-[0_0_30px_rgba(249,115,22,0.25)] transition-all duration-300 group
                         flex items-center justify-between gap-4 text-left cursor-pointer backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-fire-500/15 border border-fire-500/30 flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                  📺
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-rajdhani font-black text-sm text-white uppercase tracking-wider group-hover:text-fire-300 transition-colors">
                      Live Stream Overlay
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 text-[9px] font-rajdhani font-black uppercase">
                      OBS Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-inter">
                    Open the public broadcast display (/broadcast)
                  </p>
                </div>
              </div>
              <span className="text-slate-400 group-hover:text-fire-400 group-hover:translate-x-1 transition-all text-sm font-bold">
                →
              </span>
            </button>

            <button
              id="goto-leaderboard-btn"
              onClick={() => navigate('/leaderboard')}
              className="w-full p-3.5 rounded-2xl bg-surface-900/80 border border-amber-500/30 hover:border-amber-500/70
                         hover:shadow-[0_0_30px_rgba(245,158,11,0.25)] transition-all duration-300 group
                         flex items-center justify-between gap-4 text-left cursor-pointer backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                  🏆
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-rajdhani font-black text-sm text-white uppercase tracking-wider group-hover:text-amber-300 transition-colors">
                      Demons Reign Points Table
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 text-[9px] font-rajdhani font-black uppercase">
                      1080p OBS
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-inter">
                    Open official tournament standings (/leaderboard)
                  </p>
                </div>
              </div>
              <span className="text-slate-400 group-hover:text-amber-400 group-hover:translate-x-1 transition-all text-sm font-bold">
                →
              </span>
            </button>
          </div>
        </section>

        {/* ── Right / Bottom Interaction & Login Section ──────────────── */}
        <section className="w-full lg:w-7/12 flex items-center justify-center">
          <div className="w-full max-w-2xl">
            <div
              className="card-elevated p-6 sm:p-8 lg:p-10 rounded-3xl bg-surface-900/90 backdrop-blur-2xl border border-white/10
                         shadow-[0_30px_70px_rgba(0,0,0,0.9),0_0_50px_rgba(245,158,11,0.1),inset_0_0_30px_rgba(255,255,255,0.02)]"
            >
              <Login />
            </div>
          </div>
        </section>

      </main>

      {/* ── Minimalist Footer ─────────────────────────────────────────── */}
      <footer className="w-full py-4 text-center border-t border-surface-600/30 relative z-10 bg-surface-950/60 backdrop-blur-sm">
        <p className="text-[11px] font-inter text-slate-500 tracking-wider">
          DEMONS REIGN AUCTION LEAGUE • REAL-TIME MULTI-TENANT ENGINE • 2026
        </p>
      </footer>
    </div>
  );
}
