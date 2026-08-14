import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

// ─── ASSIGNED FRANCHISE & HOST PASSWORDS ──────────────────────────────────────
export const TEAM_CREDENTIALS = {
  admin: {
    role: 'admin',
    name: 'Auction Host Admin',
    password: 'HOST#FF2026-X99',
    redirect: '/admin',
  },
  alpha_wolves: {
    id: 'alpha_wolves',
    aliasId: 'TEAM_ALPHA',
    teamName: 'POWER HAWKS',
    owner: 'NX4 SILENT',
    password: 'ALPHA-9082-FF',
    redirect: '/bidder',
  },
  beta_strikers: {
    id: 'beta_strikers',
    aliasId: 'TEAM_BETA',
    teamName: 'TEAM VORTEX',
    owner: 'MOKSHII FF',
    password: 'BETA-4173-FF',
    redirect: '/bidder',
  },
  gamma_reapers: {
    id: 'gamma_reapers',
    aliasId: 'TEAM_GAMMA',
    teamName: 'Abyssal Ebon',
    owner: 'invincible',
    password: 'GAMMA-6315-FF',
    redirect: '/bidder',
  },
  delta_phantoms: {
    id: 'delta_phantoms',
    aliasId: 'TEAM_DELTA',
    teamName: 'RX KUDLA',
    owner: 'RX KAUSHII',
    password: 'DELTA-2849-FF',
    redirect: '/bidder',
  },
};

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('ff_auction_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [team, setTeam] = useState(() => {
    try {
      const saved = localStorage.getItem('ff_auction_user');
      const u = saved ? JSON.parse(saved) : null;
      return u?.role === 'bidder' ? u : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(false);

  // Sync live team document from Supabase when currentUser has a teamId
  const syncTeamData = async (teamId) => {
    if (!teamId) {
      setTeam(null);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('teams')
        .select('*')
        .or(`id.eq.${teamId},id.eq.${teamId.toUpperCase()}`)
        .maybeSingle();

      if (data && !error) {
        const normalized = {
          ...data,
          teamId: data.id,
          team_name: data.name || data.team_name,
          owner_name: data.owner || data.owner_name || 'Pending',
        };
        setTeam(normalized);
      }
    } catch (err) {
      console.warn('Error syncing team data:', err);
    }
  };

  useEffect(() => {
    if (currentUser?.teamId || currentUser?.id) {
      syncTeamData(currentUser.teamId || currentUser.id);
    }
  }, [currentUser?.teamId, currentUser?.id]);

  // ───────────────────────────────────────────────────────────────────────────
  //  LOGIN: Supabase Teams Table Authentication + Passkey Verification
  // ───────────────────────────────────────────────────────────────────────────
  const login = async (selectedRole, password) => {
    const roleId = (selectedRole || '').trim().toLowerCase();
    const cleanPass = (password || '').trim();

    if (!roleId || !cleanPass) {
      throw new Error('Please select a team/role and enter the password.');
    }

    // 1. Host / Admin Passkey Check
    if (roleId === 'admin') {
      if (cleanPass !== 'HOST#FF2026-X99') {
        throw new Error('Invalid Password / Access Denied');
      }

      const adminUser = {
        role: 'admin',
        name: 'Auction Host Admin',
        redirect: '/admin',
      };

      localStorage.setItem('ff_auction_user', JSON.stringify(adminUser));
      setCurrentUser(adminUser);
      setTeam(null);
      return adminUser;
    }

    // 2. Team Passkey Registry Resolution
    const registered = TEAM_CREDENTIALS[roleId] || Object.values(TEAM_CREDENTIALS).find(
      (c) => c.id === roleId || c.aliasId?.toLowerCase() === roleId
    );

    // 3. Supabase Team Query (supports both primary ID and alias)
    let teamRecord = null;
    try {
      const { data } = await supabase
        .from('teams')
        .select('*')
        .or(`id.eq.${roleId},id.eq.${roleId.toUpperCase()},id.eq.${registered?.aliasId || roleId}`)
        .maybeSingle();
      teamRecord = data;
    } catch (e) {
      console.warn('Supabase query during login:', e);
    }

    // 4. Validate Password against assigned passkey OR database password column
    const expectedPass = registered?.password;
    const dbPass = teamRecord?.password;

    const isPasswordValid = Boolean(
      (expectedPass && cleanPass === expectedPass) ||
      (dbPass && String(dbPass).trim() === cleanPass)
    );

    if (!isPasswordValid) {
      throw new Error('Invalid Password / Access Denied');
    }

    const bidderUser = {
      ...(teamRecord || {}),
      id: teamRecord?.id || registered?.id || roleId,
      teamId: teamRecord?.id || registered?.id || roleId,
      team_name: teamRecord?.team_name || teamRecord?.name || registered?.teamName || 'Team',
      owner_name: teamRecord?.owner_name || teamRecord?.owner || registered?.owner || 'Owner',
      fire_coin_balance: teamRecord?.fire_coin_balance ?? 40000,
      role: 'bidder',
      redirect: '/bidder',
    };

    localStorage.setItem('ff_auction_user', JSON.stringify(bidderUser));
    setCurrentUser(bidderUser);
    setTeam(bidderUser);
    return bidderUser;
  };

  // ── Logout ─────────────────────────────────────────────────────────────────
  const signOut = async () => {
    localStorage.removeItem('ff_auction_user');
    setCurrentUser(null);
    setTeam(null);
  };

  const isAdmin = currentUser?.role === 'admin';
  const isBidder = currentUser?.role === 'bidder';

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser: currentUser, // compatibility alias
        team,
        setTeam,
        login,
        loginWithPasskey: (role, pass) => login(role, pass),
        signIn: login,
        signOut,
        loading,
        isAdmin,
        isBidder,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
export default AuthContext;
