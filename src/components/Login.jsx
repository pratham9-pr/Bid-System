import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// ─── Team / Role Configurations ──────────────────────────────────────────────
const TEAMS_CONFIG = [
  {
    id: 'alpha_wolves',
    name: 'Alpha Wolves',
    owner: 'Pending',
    logo: '/alpha-wolves.png',
    fallbackLogo: '/alpha-wolves.png.png',
    color: 'border-fire-500/40 text-fire-400 bg-fire-500/10 hover:border-fire-500/80 hover:bg-fire-500/20 shadow-[0_0_20px_rgba(249,115,22,0.15)]',
  },
  {
    id: 'beta_strikers',
    name: 'Beta Strikers',
    owner: 'Pending',
    logo: '/beta-strikers.png',
    fallbackLogo: '/beta-strikers.png.png',
    color: 'border-sky-500/40 text-sky-400 bg-sky-500/10 hover:border-sky-500/80 hover:bg-sky-500/20 shadow-[0_0_20px_rgba(14,165,233,0.15)]',
  },
  {
    id: 'gamma_reapers',
    name: 'Gamma Reapers',
    owner: 'Pending',
    logo: '/gamma-reapers.png',
    fallbackLogo: '/gamma-reapers.png.png',
    color: 'border-purple-500/40 text-purple-400 bg-purple-500/10 hover:border-purple-500/80 hover:bg-purple-500/20 shadow-[0_0_20px_rgba(168,85,247,0.15)]',
  },
  {
    id: 'delta_phantoms',
    name: 'Delta Phantoms',
    owner: 'Pending',
    logo: '/delta-phantoms.png',
    fallbackLogo: '/delta-phantoms.png.png',
    color: 'border-amber-500/40 text-amber-400 bg-amber-500/10 hover:border-amber-500/80 hover:bg-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.15)]',
  },
];

// ─── Icons ────────────────────────────────────────────────────────────────────
const LockIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" strokeLinejoin="round"/>
    <path d="M7 11V7a5 5 0 0110 0v4" strokeLinejoin="round"/>
  </svg>
);

const EyeIcon = ({ open }) => (
  open ? (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" strokeLinejoin="round"/>
      <circle cx="12" cy="12" r="3" strokeLinejoin="round"/>
    </svg>
  ) : (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-4 h-4">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" strokeLinejoin="round" strokeLinecap="round"/>
      <line x1="1" y1="1" x2="23" y2="23" strokeLinecap="round"/>
    </svg>
  )
);

const ArrowLeftIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const ShieldCheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" strokeLinejoin="round"/>
    <polyline points="9 12 11 14 15 10" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export function Login({ onSuccess }) {
  const navigate = useNavigate();
  const { login } = useAuth();

  // ── Two-Step State: null (Selection Phase) or role string (Password Phase) ──
  const [selectedRole, setSelectedRole] = useState(null);
  const [password,     setPassword]     = useState('');
  const [showPw,       setShowPw]       = useState(false);
  const [loading,      setLoading]      = useState(false);
  const [error,        setError]        = useState('');

  // Selected Team metadata
  const currentTeam = TEAMS_CONFIG.find((t) => t.id === selectedRole);
  const isAdminRole = selectedRole === 'admin';

  const handleSelectRole = (roleId) => {
    setSelectedRole(roleId);
    setPassword('');
    setError('');
  };

  const handleBack = () => {
    setSelectedRole(null);
    setPassword('');
    setError('');
  };

  const handleAuthenticate = async (e) => {
    if (e) e.preventDefault();
    const p = password.trim();

    if (!p) {
      setError('Please enter your password.');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const user = await login(selectedRole, p);
      onSuccess?.(user);
      navigate(user.redirect || (isAdminRole ? '/admin' : '/bidder'));
    } catch (err) {
      setError(err.message || 'Invalid Password / Access Denied');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      {/* ===================================================================== */}
      {/* PHASE 1: TEAM & ROLE SELECTION SCREEN (selectedRole === null)         */}
      {/* ===================================================================== */}
      {selectedRole === null ? (
        <div className="space-y-4 animate-fade-in">
          <div className="text-center mb-4">
            <span className="text-xs font-rajdhani font-black tracking-[0.25em] text-slate-300 uppercase">
              SELECT YOUR TEAM
            </span>
            <p className="text-[10px] text-muted font-inter mt-0.5">
              Choose your team franchise to enter password
            </p>
          </div>

          {/* 2x2 Team Grid with Low-Opacity Background Watermark Logos */}
          <div className="grid grid-cols-2 gap-3">
            {TEAMS_CONFIG.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSelectRole(t.id)}
                className={`relative overflow-hidden group p-4 rounded-2xl border min-h-[96px]
                           transition-all duration-300 active:scale-95 text-center cursor-pointer ${t.color}`}
              >
                {/* ── Background Watermark Logo (15% - 25% Opacity) ──── */}
                <img
                  src={t.logo}
                  alt=""
                  aria-hidden="true"
                  onError={(e) => {
                    if (t.fallbackLogo && e.currentTarget.src !== t.fallbackLogo) {
                      e.currentTarget.src = t.fallbackLogo;
                    }
                  }}
                  className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none z-0 mix-blend-screen transition-transform duration-500 group-hover:scale-110 group-hover:opacity-30"
                />

                {/* ── Protected Text Layer ───────────────────────────── */}
                <div className="relative z-10 flex flex-col items-center justify-center h-full">
                  <h3 className="font-rajdhani font-black text-sm tracking-wider uppercase text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)]">
                    {t.name}
                  </h3>
                  <p className="text-[10px] text-slate-300 font-inter mt-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    Owner: {t.owner}
                  </p>
                </div>
              </button>
            ))}
          </div>

          {/* Minimalist Discrete Host/Admin Button */}
          <div className="pt-3 border-t border-surface-600/40">
            <button
              type="button"
              onClick={() => handleSelectRole('admin')}
              className="w-full py-2.5 px-4 rounded-xl text-xs font-rajdhani font-bold border border-white/10
                         bg-surface-800/40 text-slate-400 hover:text-white hover:bg-surface-700/60
                         hover:border-gold-500/40 transition-all duration-150 flex items-center justify-center gap-2"
            >
              <span>👑</span>
              <span>Host Panel / Admin Access</span>
            </button>
          </div>
        </div>
      ) : (
        /* ===================================================================== */
        /* PHASE 2: PASSWORD ENTRY SCREEN (selectedRole !== null)                */
        /* ===================================================================== */
        <div className="space-y-4 animate-slide-up">
          {/* Top Bar with Back Button & Role Header */}
          <div className="flex items-center justify-between pb-3 border-b border-surface-600/40">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-1.5 text-xs font-rajdhani font-bold text-slate-400 hover:text-fire-400 transition-colors"
            >
              <ArrowLeftIcon />
              <span>Back</span>
            </button>

            <div className="flex items-center gap-2">
              {isAdminRole ? (
                <span className="text-lg">👑</span>
              ) : (
                <img
                  src={currentTeam?.logo}
                  alt=""
                  onError={(e) => {
                    if (currentTeam?.fallbackLogo) e.currentTarget.src = currentTeam.fallbackLogo;
                  }}
                  className="w-7 h-7 rounded-full object-cover border border-amber-500/50 shadow-[0_0_10px_rgba(245,158,11,0.3)] bg-black"
                />
              )}
              <span className="font-rajdhani font-black text-sm text-white uppercase tracking-wider">
                {isAdminRole ? 'Auction Host' : currentTeam?.name}
              </span>
            </div>
          </div>

          {/* Password Form */}
          <form onSubmit={handleAuthenticate} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="role-password"
                className="block text-xs font-rajdhani font-bold tracking-[0.2em] text-slate-300 uppercase mb-1.5"
              >
                ENTER PASSWORD
              </label>

              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-fire-500 pointer-events-none">
                  <LockIcon />
                </span>
                <input
                  id="role-password"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder={isAdminRole ? 'HOST#FF2026-X99' : 'e.g. ALPHA-9082-FF'}
                  autoComplete="current-password"
                  autoFocus
                  className="w-full px-4 py-3.5 pl-11 pr-11 rounded-xl bg-surface-800/90 border border-surface-600/60
                             focus:border-fire-500 focus:ring-2 focus:ring-fire-500/20 text-white font-rajdhani
                             font-bold text-base tracking-wider placeholder:text-muted placeholder:font-normal
                             placeholder:text-xs transition-all duration-200"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-slate-300 transition-colors"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>

              {/* Red Error Badge */}
              {error && (
                <div
                  role="alert"
                  className="mt-2.5 flex items-center gap-2 px-3.5 py-2 rounded-xl
                             bg-red-500/10 border border-red-500/30 text-red-400
                             text-xs font-inter animate-fade-in"
                >
                  <span>✕</span>
                  <span className="font-semibold">{error}</span>
                </div>
              )}
            </div>

            {/* Authenticate Submit Button */}
            <button
              id="authenticate-btn"
              type="submit"
              disabled={loading || !password.trim()}
              className="btn-primary w-full py-3.5 text-base font-rajdhani font-black tracking-widest uppercase
                         disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-2"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  VERIFYING…
                </span>
              ) : (
                <>
                  <ShieldCheckIcon />
                  AUTHENTICATE
                </>
              )}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

export default Login;
