import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginPage        from './pages/LoginPage';
import AuctionRoom      from './pages/AuctionRoom';
import AdminPanel       from './pages/AdminPanel';
import BroadcastOverlay from './pages/BroadcastOverlay';

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

          {/* Catch-all fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
