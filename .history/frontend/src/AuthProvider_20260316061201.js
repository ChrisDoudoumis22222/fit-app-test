"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext(null);

export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  const mountedRef = useRef(true);
  const sessionRef = useRef(null);
  const profileRef = useRef(null);
  const syncingUidRef = useRef(null);
  const lastSyncedUidRef = useRef(null);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    profileRef.current = profile;
  }, [profile]);

  const readProfileById = useCallback(async (uid) => {
    if (!uid) return null;

    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .maybeSingle();

    if (error) throw error;
    return data || null;
  }, []);

  const syncProfileForSession = useCallback(
    async (nextSession, { force = false } = {}) => {
      const uid = nextSession?.user?.id || null;

      if (!uid) {
        lastSyncedUidRef.current = null;
        syncingUidRef.current = null;

        if (mountedRef.current) {
          setProfile(null);
          setProfileLoaded(true);
        }

        return null;
      }

      if (
        !force &&
        lastSyncedUidRef.current === uid &&
        profileRef.current?.id === uid
      ) {
        if (mountedRef.current) {
          setProfileLoaded(true);
        }
        return profileRef.current;
      }

      if (syncingUidRef.current === uid) {
        return profileRef.current;
      }

      syncingUidRef.current = uid;

      try {
        const nextProfile = await readProfileById(uid);

        lastSyncedUidRef.current = uid;

        if (mountedRef.current) {
          setProfile(nextProfile || null);
          setProfileLoaded(true);
        }

        return nextProfile || null;
      } catch (err) {
        console.error("AuthProvider syncProfileForSession error:", err);

        if (mountedRef.current) {
          setProfile(null);
          setProfileLoaded(true);
        }

        return null;
      } finally {
        if (syncingUidRef.current === uid) {
          syncingUidRef.current = null;
        }
      }
    },
    [readProfileById]
  );

  const refreshProfile = useCallback(async () => {
    const uid = sessionRef.current?.user?.id || null;

    if (!uid) {
      if (mountedRef.current) {
        setProfile(null);
        setProfileLoaded(true);
      }
      return null;
    }

    try {
      const data = await readProfileById(uid);
      lastSyncedUidRef.current = uid;

      if (mountedRef.current) {
        setProfile(data || null);
        setProfileLoaded(true);
      }

      return data || null;
    } catch (err) {
      console.error("AuthProvider refreshProfile error:", err);

      if (mountedRef.current) {
        setProfile(null);
        setProfileLoaded(true);
      }

      return null;
    }
  }, [readProfileById]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("AuthProvider signOut error:", err);
    } finally {
      lastSyncedUidRef.current = null;
      syncingUidRef.current = null;

      if (mountedRef.current) {
        setSession(null);
        setProfile(null);
        setProfileLoaded(true);
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    let active = true;

    const boot = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!active || !mountedRef.current) return;

        const currentSession = data?.session || null;
        setSession(currentSession);
        setLoading(false);

        await syncProfileForSession(currentSession, { force: true });
      } catch (err) {
        console.error("AuthProvider boot error:", err);

        if (!active || !mountedRef.current) return;

        setSession(null);
        setProfile(null);
        setProfileLoaded(true);
        setLoading(false);
      }
    };

    void boot();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!active || !mountedRef.current) return;

      setSession(nextSession || null);
      setLoading(false);

      if (event === "SIGNED_OUT") {
        lastSyncedUidRef.current = null;
        syncingUidRef.current = null;

        if (mountedRef.current) {
          setProfile(null);
          setProfileLoaded(true);
        }
        return;
      }

      if (event === "SIGNED_IN" || event === "USER_UPDATED") {
        void syncProfileForSession(nextSession || null, { force: true });
        return;
      }

      if (event === "TOKEN_REFRESHED") {
        return;
      }
    });

    return () => {
      active = false;
      mountedRef.current = false;
      subscription?.unsubscribe();
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