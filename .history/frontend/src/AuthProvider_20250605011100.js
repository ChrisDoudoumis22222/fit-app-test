import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "./supabaseClient";

const AuthCtx = createContext(null);
export const useAuth = () => useContext(AuthCtx);

export default function AuthProvider({ children }) {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_evt, sess) => setSession(sess)
    );
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!session?.user) return setProfile(null);
      const { data } = await supabase.from("profiles").select("*").single();
      setProfile(data);
    };
    fetchProfile();
  }, [session]);

  return (
    <AuthCtx.Provider value={{ session, profile, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}
