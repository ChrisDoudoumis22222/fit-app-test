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
  /* auth session straight from Supabase */
  const [session, setSession] = useState(() => supabase.auth.session());

  /* profile row (+ load flag) */
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

  /* helper that both the listener and pages can reuse */
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

  /* react to login / logout */
  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_e, sess) => {
      setSession(sess);
      if (sess?.user) fetchProfile(sess.user.id);
      else {
        setProfile(null);
        setProfileLoaded(true);
      }
    });

    /* first load (page refresh) */
    if (session?.user) fetchProfile(session.user.id);
    else setProfileLoaded(true);

    return () => sub?.subscription.unsubscribe();
  }, [fetchProfile, session?.user]);

  return (
    <AuthCtx.Provider
      value={{ session, profile, profileLoaded, refreshProfile }}
    >
      {children}
    </AuthCtx.Provider>
  );
}
