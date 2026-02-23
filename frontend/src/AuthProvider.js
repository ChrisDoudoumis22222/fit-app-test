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
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();

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

      const { data: inserted, error } = await supabase
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

      setProfile(inserted);
      return inserted;
    },
    [fetchProfile]
  );

  const refreshProfile = useCallback(
    () => (session?.user ? fetchProfile(session.user.id) : Promise.resolve(null)),
    [session, fetchProfile]
  );

  // ✅ This is the big fix: when you come back to the tab, re-hydrate / refresh tokens
  const recoverSession = useCallback(async () => {
    // 1) normal session read
    const {
      data: { session: s1 },
    } = await supabase.auth.getSession();

    if (s1) {
      setSession(s1);
      await createProfileIfMissing(s1.user);
      setProfileLoaded(true);
      return s1;
    }

    // 2) force refresh from refresh_token if needed
    const { data, error } = await supabase.auth.refreshSession();
    const s2 = data?.session || null;

    if (!error && s2) {
      setSession(s2);
      await createProfileIfMissing(s2.user);
      setProfileLoaded(true);
      return s2;
    }

    // signed out
    setSession(null);
    setProfile(null);
    setProfileLoaded(true);
    return null;
  }, [createProfileIfMissing]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setProfileLoaded(true);
  }, []);

  useEffect(() => {
    let unsub = () => {};

    (async () => {
      await recoverSession();
      setLoading(false);

      const { data } = supabase.auth.onAuthStateChange(
        async (event, newSession) => {
          // ✅ don’t “perma die” on refresh hiccup
          if (event === "TOKEN_REFRESH_FAILED") {
            await recoverSession();
            return;
          }

          setSession(newSession || null);

          if (newSession?.user) {
            await createProfileIfMissing(newSession.user);
            setProfileLoaded(true);
          } else {
            setProfile(null);
            setProfileLoaded(true);
          }
        }
      );

      unsub = () => data.subscription?.unsubscribe();
    })();

    return () => unsub();
  }, [recoverSession, createProfileIfMissing]);

  // ✅ tab focus / visibility restore
  useEffect(() => {
    const onFocus = () => recoverSession();
    const onVis = () => {
      if (!document.hidden) recoverSession();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [recoverSession]);

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
      recoverSession, // ✅ expose this so pages can refetch on focus if needed
      signOut,
    }),
    [
      loading,
      session,
      profile,
      role,
      profileLoaded,
      refreshProfile,
      recoverSession,
      signOut,
    ]
  );

  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>;
}

export default AuthProvider;