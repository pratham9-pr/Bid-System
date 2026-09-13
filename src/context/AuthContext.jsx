import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../config/supabase';

// ─── ADMIN CREDENTIALS (HOST ACCESS) ─────────────────────────────────────────
export const TEAM_CREDENTIALS = {
  admin: {
    role: 'admin',
    name: 'Auction Host Admin',
    password: 'HOST#FF2026-X99',
    redirect: '/admin',
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
        .eq('id', teamId)
        .maybeSingle();

      if (data && !error) {
        const budget = data.budget ?? data.fire_coin_balance ?? 40000;
        const normalized = {
          ...data,
          teamId: data.id,
          team_name: data.team_name || data.name,
          owner_name: data.owner_name || data.owner || 'Owner',
          budget,
          fire_coin_balance: budget,
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
  //  LOGIN: Dynamic Teams Table Authentication via access_pin
  // ───────────────────────────────────────────────────────────────────────────
  const login = async (selectedRoleOrTeamId, passwordOrPin) => {
    const roleId = (selectedRoleOrTeamId || '').trim();
    const cleanPin = (passwordOrPin || '').trim();

    if (!cleanPin) {
      throw new Error('Please enter your access PIN or password.');
    }

    // 1. Host / Admin Passkey Check
    if (roleId.toLowerCase() === 'admin' || cleanPin === 'HOST#FF2026-X99') {
      if (cleanPin !== 'HOST#FF2026-X99') {
        throw new Error('Invalid Admin Password / Access Denied');
      }

      const adminUser = {
        role: 'admin',
        id: 'admin',
        name: 'Auction Host Admin',
        redirect: '/admin',
      };

      localStorage.setItem('ff_auction_user', JSON.stringify(adminUser));
      setCurrentUser(adminUser);
      setTeam(null);
      return adminUser;
    }

    // 2. Dynamic Team Authentication via Supabase
    let teamRecord = null;
    try {
      if (roleId && roleId !== 'bidder') {
        // Query by team ID
        const { data, error } = await supabase
          .from('teams')
          .select('*')
          .eq('id', roleId)
          .maybeSingle();

        if (data && !error) {
          // Verify pin against access_pin or password
          const actualPin = String(data.access_pin || data.password || '').trim();
          if (actualPin.toLowerCase() === cleanPin.toLowerCase()) {
            teamRecord = data;
          }
        }
      }

      // If not resolved by roleId, query directly by PIN
      if (!teamRecord) {
        // First try 'password' column which is active in current schema
        const { data: passMatch } = await supabase
          .from('teams')
          .select('*')
          .eq('password', cleanPin)
          .maybeSingle();

        if (passMatch) {
          teamRecord = passMatch;
        } else {
          // Try 'access_pin' column if modern schema is active
          try {
            const { data: pinMatch } = await supabase
              .from('teams')
              .select('*')
              .eq('access_pin', cleanPin)
              .maybeSingle();

            if (pinMatch) teamRecord = pinMatch;
          } catch (pinErr) {
            // column might not exist in current schema cache, safely ignored
          }
        }
      }

      // Final fallback: fetch all teams and match in-memory (resilient to column variations)
      if (!teamRecord) {
        const { data: allTeams } = await supabase.from('teams').select('*');
        if (allTeams && allTeams.length > 0) {
          teamRecord = allTeams.find((t) => {
            const pinVal = String(t.access_pin || t.password || '').trim().toLowerCase();
            return pinVal === cleanPin.toLowerCase();
          });
        }
      }
    } catch (e) {
      console.warn('Supabase query during login:', e);
    }

    if (!teamRecord) {
      throw new Error('Invalid Access PIN / Team not found.');
    }

    const budget = teamRecord.budget ?? teamRecord.fire_coin_balance ?? 40000;
    const bidderUser = {
      ...teamRecord,
      id: teamRecord.id,
      teamId: teamRecord.id,
      team_name: teamRecord.team_name || teamRecord.name || 'Team',
      owner_name: teamRecord.owner_name || teamRecord.owner || 'Owner',
      budget,
      fire_coin_balance: budget,
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
