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

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const getProfile = async () => {
      if (!session?.user) {
        setProfile(null);
        return;
      }
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .single();
      if (error) console.error(error);
      setProfile(data);
    };
    getProfile();
  }, [session]);

  return (
    <AuthCtx.Provider value={{ session, profile, loading }}>
      {children}
    </AuthCtx.Provider>
  );
}
