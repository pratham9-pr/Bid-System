import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { TEAMS_CONFIG } from '../config/teamsConfig';

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
      {/* PHASE 1: FRANCHISE & ROLE SELECTION GRID (selectedRole === null)      */}
      {/* ===================================================================== */}
      {selectedRole === null ? (
        <div className="space-y-6 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-3 border-b border-surface-600/40">
            <div>
              <span className="text-xs font-rajdhani font-black tracking-[0.25em] text-slate-300 uppercase">
                FRANCHISE SELECTION
              </span>
              <p className="text-xs text-muted font-inter">
                Select your team franchise to enter passkey
              </p>
            </div>
            <span className="text-[10px] font-rajdhani font-bold px-2.5 py-0.5 rounded-full bg-surface-700/50 text-slate-400 border border-surface-500/40 uppercase self-start sm:self-auto">
              4 Active Teams
            </span>
          </div>

          {/* Expansive 2x2 Team Grid (1-column on mobile, 2-column on sm+) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {TEAMS_CONFIG.map((t) => {
              const isPending = t.isPending === true;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => !isPending && handleSelectRole(t.id)}
                  disabled={isPending}
                  className={`relative overflow-hidden group p-4 sm:p-5 rounded-2xl border min-h-[110px] sm:min-h-[130px]
                             transition-all duration-300 text-left flex flex-col justify-between
                             ${isPending ? 'opacity-40 cursor-not-allowed grayscale' : 'hover:scale-[1.02] active:scale-[0.98] cursor-pointer hover:shadow-2xl'}
                             ${t.color}`}
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
                    className="absolute right-0 bottom-0 w-28 h-28 sm:w-36 sm:h-36 object-cover opacity-15 pointer-events-none z-0 mix-blend-screen transition-transform duration-500 group-hover:scale-115 group-hover:opacity-25 translate-x-3 translate-y-3"
                  />

                  {/* ── Top Row: Mascot Emblem Thumbnail & Short code ─── */}
                  <div className="relative z-10 flex items-center justify-between gap-3">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-full overflow-hidden border border-white/20 bg-black/80 flex-shrink-0 flex items-center justify-center p-0.5 shadow-lg group-hover:border-white/50 transition-colors">
                      <img
                        src={t.logo}
                        alt={t.name}
                        className="w-full h-full object-cover rounded-full"
                        onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
                      />
                    </div>
                    <span className="text-[10px] font-rajdhani font-black px-2 py-0.5 rounded-md bg-black/50 border border-white/10 text-slate-300 tracking-wider">
                      {t.shortName || 'FF'}
                    </span>
                  </div>

                  {/* ── Bottom Row: Team Name & Owner ─────────────────── */}
                  <div className="relative z-10 mt-3">
                    <h3 className="font-rajdhani font-black text-base sm:text-lg tracking-wider uppercase text-white leading-tight drop-shadow-[0_2px_4px_rgba(0,0,0,0.8)] group-hover:text-amber-300 transition-colors">
                      {t.name}
                    </h3>
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <p className="text-[11px] text-slate-300 font-inter truncate">
                        {isPending ? '🔒 Inactive' : `Owner: ${t.owner}`}
                      </p>
                      <span className="text-[10px] font-rajdhani font-bold text-gold-400/90 whitespace-nowrap">
                        ₣40,000 FC
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Prominent Host / Admin Access Button */}
          <div className="pt-4 border-t border-surface-600/40">
            <button
              type="button"
              id="admin-login-entry-btn"
              onClick={() => handleSelectRole('admin')}
              className="w-full p-4 rounded-2xl text-xs font-rajdhani font-bold border border-gold-500/30
                         bg-gradient-to-r from-amber-950/40 via-surface-800/80 to-surface-800/80
                         text-slate-300 hover:text-white hover:border-gold-500/70 hover:shadow-[0_0_25px_rgba(245,158,11,0.2)]
                         transition-all duration-200 flex items-center justify-between group cursor-pointer"
            >
              <div className="flex items-center gap-3 text-left">
                <div className="w-10 h-10 rounded-xl bg-gold-500/15 border border-gold-500/30 flex items-center justify-center text-lg flex-shrink-0 group-hover:scale-110 transition-transform">
                  👑
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-rajdhani font-black text-sm text-white uppercase tracking-wider group-hover:text-gold-300 transition-colors">
                      Host Panel / Master Admin
                    </span>
                    <span className="px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-400 text-[9px] font-rajdhani font-black uppercase">
                      Admin Access
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 font-inter">
                    Manage auction flow, stage reveals, bidding clock, and rosters
                  </p>
                </div>
              </div>
              <span className="text-slate-400 group-hover:text-gold-400 group-hover:translate-x-1 transition-all text-base font-bold ml-2">
                →
              </span>
            </button>
          </div>
        </div>
      ) : (
        /* ===================================================================== */
        /* PHASE 2: PASSWORD ENTRY SCREEN (selectedRole !== null)                */
        /* ===================================================================== */
        <div className="space-y-6 animate-slide-up">
          {/* Top Bar with Back Button */}
          <div className="flex items-center justify-between pb-3 border-b border-surface-600/40">
            <button
              type="button"
              onClick={handleBack}
              className="flex items-center gap-2 text-xs font-rajdhani font-bold text-slate-400 hover:text-fire-400 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-surface-700/40"
            >
              <ArrowLeftIcon />
              <span>← Back to Franchises</span>
            </button>

            <span className="text-[10px] font-rajdhani font-black tracking-widest text-slate-500 uppercase">
              AUTHENTICATION STEP
            </span>
          </div>

          {/* Selected Franchise Summary Card */}
          <div className="p-4 rounded-2xl bg-surface-800/80 border border-surface-600/50 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full overflow-hidden border-2 border-amber-500/50 bg-black flex-shrink-0 flex items-center justify-center p-0.5 shadow-lg">
              {isAdminRole ? (
                <span className="text-2xl">👑</span>
              ) : (
                <img
                  src={currentTeam?.logo}
                  alt={currentTeam?.name}
                  className="w-full h-full object-cover rounded-full"
                  onError={(e) => { e.currentTarget.src = '/demons_reign_logo.jpg'; }}
                />
              )}
            </div>
            <div>
              <span className="text-[10px] text-slate-400 uppercase font-rajdhani font-bold tracking-wider block">
                {isAdminRole ? 'System Role' : 'Selected Franchise'}
              </span>
              <h3 className="font-rajdhani font-black text-xl text-white uppercase tracking-wide leading-tight">
                {isAdminRole ? 'Host Master Admin' : currentTeam?.name}
              </h3>
              <p className="text-xs text-slate-400 font-inter mt-0.5">
                {isAdminRole ? 'Full Auction Floor Control' : `Owner: ${currentTeam?.owner}`}
              </p>
            </div>
          </div>

          {/* Password Form */}
          <form onSubmit={handleAuthenticate} className="space-y-4" noValidate>
            <div>
              <label
                htmlFor="role-password"
                className="block text-xs font-rajdhani font-bold tracking-[0.2em] text-slate-300 uppercase mb-2"
              >
                ENTER SECURITY PASSKEY
              </label>

              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-fire-500 pointer-events-none">
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
                  className="w-full px-4 py-4 pl-12 pr-12 rounded-xl bg-surface-800/90 border border-surface-600/60
                             focus:border-fire-500 focus:ring-2 focus:ring-fire-500/20 text-white font-rajdhani
                             font-bold text-base tracking-wider placeholder:text-slate-500 placeholder:font-normal
                             placeholder:text-sm transition-all duration-200"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors cursor-pointer p-1"
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPw} />
                </button>
              </div>

              {/* Red Error Badge */}
              {error && (
                <div
                  role="alert"
                  className="mt-3 flex items-center gap-2 px-4 py-2.5 rounded-xl
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
              className="btn-primary w-full py-4 text-base font-rajdhani font-black tracking-widest uppercase
                         disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2 mt-4 shadow-lg cursor-pointer"
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  VERIFYING PASSKEY…
                </span>
              ) : (
                <>
                  <ShieldCheckIcon />
                  AUTHENTICATE & ENTER AUCTION FLOOR
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
