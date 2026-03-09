// src/AuthProvider.js
"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProfile = useCallback(async (uid) => {
    if (!uid) {
      setProfile(null);
      return null;
    }

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (error) {
      setProfile(null);
      return null;
    }

    setProfile(data || null);
    return data || null;
  }, []);

  const createProfileIfMissing = useCallback(
    async (user) => {
      if (!user) return null;

      const existing = await fetchProfile(user.id);
      if (existing) return existing;

      const full_name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";

      const role =
        user.app_metadata?.role || user.user_metadata?.role || "user";

      const { data, error } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          full_name,
          role,
          avatar_url: user.user_metadata?.avatar_url || null,
        })
        .select()
        .single();

      if (error) {
        setProfile(null);
        return null;
      }

      setProfile(data || null);
      return data || null;
    },
    [fetchProfile]
  );

  const syncProfileForSession = useCallback(
    async (nextSession) => {
      if (nextSession?.user) {
        await createProfileIfMissing(nextSession.user);
      } else {
        setProfile(null);
      }
      setProfileLoaded(true);
    },
    [createProfileIfMissing]
  );

  const refreshProfile = useCallback(() => {
    if (!session?.user?.id) return Promise.resolve(null);
    return fetchProfile(session.user.id);
  }, [session, fetchProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    let mounted = true;

    const runProfileSync = (nextSession) => {
      setTimeout(async () => {
        if (!mounted) return;

        try {
          await syncProfileForSession(nextSession);
        } catch {
          if (!mounted) return;
          setProfile(null);
          setProfileLoaded(true);
        }
      }, 0);
    };

    const boot = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;

        const currentSession = data?.session || null;

        if (!mounted) return;

        setSession(currentSession);
        setLoading(false); // unblock UI immediately
        runProfileSync(currentSession);
      } catch {
        if (!mounted) return;
        setSession(null);
        setProfile(null);
        setProfileLoaded(true);
        setLoading(false);
      }
    };

    boot();

    const { data } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (!mounted) return;

      setSession(newSession || null);
      setLoading(false); // do not block login on profile work
      runProfileSync(newSession || null);
    });

    return () => {
      mounted = false;
      data.subscription?.unsubscribe();
    };
  }, [syncProfileForSession]);

  const role =
    profile?.role ||
    session?.user?.app_metadata?.role ||
    session?.user?.user_metadata?.role ||
    "user";

  const value = useMemo(
    () => ({
      loading,
      session,
      user: session?.user || null,
      profile,
      role,
      profileLoaded,
      refreshProfile,
      signOut,
    }),
    [loading, session, profile, role, profileLoaded, refreshProfile, signOut]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export default AuthProvider;