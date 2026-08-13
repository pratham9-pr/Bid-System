import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

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

  const [team, setTeam] = useState(null);
  const [loading, setLoading] = useState(true);

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
        .single();

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
    if (currentUser?.teamId) {
      syncTeamData(currentUser.teamId);
    } else {
      setTeam(null);
    }
    setLoading(false);
  }, [currentUser?.teamId]);

  // ───────────────────────────────────────────────────────────────────────────
  //  LOGIN: Supabase Teams Table Authentication + Admin Passkey Verification
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

    // 2. Team Authentication via Supabase 'teams' table query
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .eq('id', roleId)
      .single();

    if (error || !data) {
      throw new Error('Team record not found in database.');
    }

    // Compare returned password field with entered password
    if ((data.password || '').trim() !== cleanPass) {
      throw new Error('Invalid Password / Access Denied');
    }

    const bidderUser = {
      ...data,
      teamId: data.id,
      team_name: data.name || data.team_name,
      owner_name: data.owner || data.owner_name || 'Pending',
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
