import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext();
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  /* session from Supabase (null until we fetch it) */
  const [session, setSession] = useState(null);

  /* profile row & load flag */
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  /* ---------------- helpers ---------------- */
  const fetchProfile = useCallback(async (uid) => {
    const { data } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", uid)
      .single();
    setProfile(data);
    setProfileLoaded(true);
    return data;
  }, []);

  const refreshProfile = () =>
    session?.user ? fetchProfile(session.user.id) : Promise.resolve(null);

  /* ---------------- initial load + listener ---------------- */
  useEffect(() => {
    /* 1️⃣ initial load */
    (async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();
      setSession(currentSession);
      if (currentSession?.user) await fetchProfile(currentSession.user.id);
      else setProfileLoaded(true);
    })();

    /* 2️⃣ listen for future auth changes */
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) fetchProfile(newSession.user.id);
      else {
        setProfile(null);
        setProfileLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  return (
    <AuthCtx.Provider
      value={{ session, profile, profileLoaded, refreshProfile }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
