import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage        from './pages/LoginPage';
import AuctionRoom      from './pages/AuctionRoom';
import AdminPanel       from './pages/AdminPanel';
import BroadcastOverlay from './pages/BroadcastOverlay';
import PointsTableLeaderboard from './pages/PointsTableLeaderboard';

// ─── Global Error Boundary ───────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Demons Reign UI Crash caught by ErrorBoundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-surface-gradient flex items-center justify-center p-6 text-center">
          <div className="card-elevated max-w-md p-8 rounded-3xl bg-surface-900/90 border border-red-500/40">
            <div className="w-14 h-14 rounded-2xl bg-red-500/15 border border-red-500/30 flex items-center justify-center text-2xl mx-auto mb-4">
              ⚠️
            </div>
            <h2 className="font-rajdhani font-black text-xl text-white uppercase tracking-wider mb-2">
              Demons Reign · Interface Recovery
            </h2>
            <p className="text-xs text-slate-300 font-inter mb-4 leading-relaxed">
              A temporary display error occurred. Click below to reload the auction floor or return to team login.
            </p>
            {this.state.error?.message && (
              <div className="mb-5 p-3 rounded-xl bg-red-950/40 border border-red-800/40 text-left font-mono text-[11px] text-red-300 overflow-x-auto max-h-32">
                <span className="text-red-400 font-bold block mb-1">Error Trace:</span>
                {this.state.error.message}
              </div>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={() => {
                  this.setState({ hasError: false });
                  window.location.reload();
                }}
                className="btn-primary text-xs py-2.5 px-5"
              >
                ↻ Reload Auction Floor
              </button>
              <button
                onClick={() => {
                  localStorage.removeItem('ff_auction_user');
                  window.location.href = '/';
                }}
                className="btn-ghost text-xs py-2.5 px-5"
              >
                → Return to Login
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Protected Route for Admin/Host (Role: 'admin') ──────────────────────────
function AdminRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-gradient flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl border-2 border-fire-500/30 border-t-fire-500 animate-spin" />
      </div>
    );
  }
  return currentUser?.role === 'admin' ? children : <Navigate to="/" replace />;
}

// ─── Protected Route for Bidders (Role: 'bidder') ────────────────────────────
function BidderRoute({ children }) {
  const { currentUser, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen bg-surface-gradient flex items-center justify-center">
        <div className="w-10 h-10 rounded-xl border-2 border-fire-500/30 border-t-fire-500 animate-spin" />
      </div>
    );
  }
  return currentUser?.role === 'bidder' ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Unified Passkey Login at Root (/) */}
            <Route path="/" element={<LoginPage />} />

            {/* Protected Host/Admin Controls (Role: 'admin') */}
            <Route
              path="/admin"
              element={
                <AdminRoute>
                  <AdminPanel />
                </AdminRoute>
              }
            />

            {/* Protected Team Bidder Auction Room (Role: 'bidder') */}
            <Route
              path="/bidder"
              element={
                <BidderRoute>
                  <AuctionRoom />
                </BidderRoute>
              }
            />

            {/* Backward compatibility alias /auction -> /bidder */}
            <Route path="/auction" element={<Navigate to="/bidder" replace />} />

            {/* Public Read-Only Broadcast Overlay (OBS ready) */}
            <Route path="/broadcast" element={<BroadcastOverlay />} />
            <Route path="/overlay" element={<Navigate to="/broadcast" replace />} />

            {/* Standalone Demons Reign Esports Points Table / Leaderboard (1920x1080 OBS Ready) */}
            <Route path="/leaderboard" element={<PointsTableLeaderboard />} />
            <Route path="/pointstable" element={<PointsTableLeaderboard />} />
            <Route path="/points" element={<PointsTableLeaderboard />} />
            <Route path="/standings" element={<PointsTableLeaderboard />} />

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
