import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Login } from '../components/Login';

export default function LoginPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-surface-gradient flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden">
      {/* Decorative ambient background glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-red-600/10 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-amber-500/10 blur-[130px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md animate-slide-up">
        {/* ── Glassmorphism Card with Amber/Fire Glowing Border ──────────── */}
        <div
          className="card-elevated p-6 sm:p-8 rounded-3xl bg-surface-900/85 backdrop-blur-xl border border-amber-500/30
                     shadow-[0_25px_60px_rgba(0,0,0,0.85),0_0_40px_rgba(245,158,11,0.15),inset_0_0_20px_rgba(249,115,22,0.05)]"
        >
          {/* ── Branding Header with Demons Reign Circular Logo ─────────── */}
          <div className="flex flex-col items-center gap-3 mb-6 text-center">
            <div className="relative group">
              <div className="absolute -inset-2 bg-gradient-to-r from-fire-500/30 to-amber-500/30 rounded-full blur-md animate-pulse" />
              <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full overflow-hidden border-2 border-amber-500/50 shadow-[0_0_25px_rgba(245,158,11,0.35)] relative z-10 bg-black">
                <img
                  src="/image_440ba2.jpg"
                  alt="Demons Reign Logo"
                  className="w-full h-full object-cover object-center"
                  onError={(e) => {
                    // Fallback to demons_reign_logo.jpg if image_440ba2 is cached differently
                    e.currentTarget.src = '/demons_reign_logo.jpg';
                  }}
                />
              </div>
            </div>

            <div>
              <h1 className="font-rajdhani font-black text-3xl sm:text-4xl text-white tracking-wider leading-tight">
                DEMONS REIGN
              </h1>
              <p className="font-rajdhani font-black text-xs sm:text-sm text-fire-400 tracking-[0.4em] uppercase mt-0.5">
                AUCTION SERIES
              </p>
            </div>
          </div>

          {/* ── Two-Step Login Component ───────────────────────────────── */}
          <Login />

          {/* ── Stream Overlay Public Shortcut ─────────────────────────── */}
          <div className="mt-5 pt-4 border-t border-surface-600/40 text-center">
            <button
              id="goto-broadcast-btn"
              onClick={() => navigate('/broadcast')}
              className="text-xs font-rajdhani font-bold text-slate-400 hover:text-fire-400 transition-colors flex items-center justify-center gap-1.5 mx-auto"
            >
              <span>📺</span>
              <span>Open Public Stream Overlay (/broadcast) →</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
