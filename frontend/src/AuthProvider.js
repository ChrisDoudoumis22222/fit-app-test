import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  /* top-level state */
  const [session, setSession]   = useState(null);
  const [profile, setProfile]   = useState(null);   // ALWAYS an object after loading
  const [loading, setLoading]   = useState(true);

  /* ─── 1) watch auth state ─── */
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setSession(session);
    };
    init();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_evt, sess) => setSession(sess)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  /* ─── 2) fetch profile whenever session changes ─── */
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);

      /* logged-out */
      if (!session?.user) {
        setProfile(null);
        return setLoading(false);
      }

      /* logged-in: try to read row */
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      /* guarantee we return an object */
      setProfile(
        data || {
          id: session.user.id,
          full_name: "",
          role: "user",        // sane default
          avatar_url: null,
        }
      );
      setLoading(false);
    };

    loadProfile();
  }, [session]);

  return (
    <AuthCtx.Provider value={{ session, profile, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}
