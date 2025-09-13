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

export default function AuthProvider({ children }) {
  /* Supabase session */
  const [session, setSession] = useState(null);

  /* Profile row + flags */
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading, setLoading] = useState(true);

  /* Popup + email state */
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [sending, setSending] = useState(false);

  /* ---------- helpers ---------- */

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

      // 1) Try to read
      const existing = await fetchProfile(user.id);
      if (existing) return existing;

      // 2) Create minimal row
      const full_name =
        user.user_metadata?.full_name ||
        user.user_metadata?.name ||
        user.email?.split("@")[0] ||
        "User";

      const role =
        user.app_metadata?.role ||
        user.user_metadata?.role ||
        "user"; // default

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
        // Failed to create — leave modal on to let the user retry or re-auth
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

  const getAccessToken = useCallback(async () => {
    const {
      data: { session: s },
    } = await supabase.auth.getSession();
    return s?.access_token || null;
  }, []);

  /* ---------- auth flows exposed to UI ---------- */
  const signInWithGoogle = useCallback(async () => {
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/`
        : undefined;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo },
    });
    return { error };
  }, []);

  const signInWithOtp = useCallback(async (email) => {
    if (!email) return { error: new Error("Email is required") };
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/`
        : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: redirectTo },
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
    setProfileLoaded(true);
    setShowAuthPrompt(false);
  }, []);

  /* ---------- initial load + auth listener ---------- */
  useEffect(() => {
    let unsub = () => {};

    (async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);

      if (currentSession?.user) {
        const ensured = await createProfileIfMissing(currentSession.user);
        // If we still don't have a profile, show the prompt
        setShowAuthPrompt(!ensured);
        setProfileLoaded(true);
      } else {
        setProfile(null);
        setProfileLoaded(true);
      }
      setLoading(false);

      const { data } = supabase.auth.onAuthStateChange(
        async (_event, newSession) => {
          setSession(newSession);
          if (newSession?.user) {
            const ensured = await createProfileIfMissing(newSession.user);
            setShowAuthPrompt(!ensured);
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
  }, [createProfileIfMissing]);

  /* ---------- modal actions ---------- */
  const proceedFixProfile = useCallback(async () => {
    if (!session?.user || sending) return;
    // Try creating the profile row again
    const created = await createProfileIfMissing(session.user);
    if (created) {
      setShowAuthPrompt(false);
      setEmailSent(false);
      return;
    }

    // If we couldn't create, fall back to resending OTP
    try {
      setSending(true);
      setEmailSent(false);
      const { error } = await supabase.auth.signInWithOtp({
        email: session.user.email,
      });
      if (!error) setEmailSent(true);
    } finally {
      setSending(false);
    }
  }, [session, sending, createProfileIfMissing]);

  /* ---------- derived values ---------- */
  const role =
    profile?.role ||
    session?.user?.app_metadata?.role ||
    session?.user?.user_metadata?.role ||
    "user";

  const value = useMemo(
    () => ({
      // state
      loading,
      session,
      user: session?.user || null,
      profile,
      role,
      profileLoaded,

      // helpers
      refreshProfile,
      getAccessToken,
      signInWithGoogle,
      signInWithOtp,
      signOut,
    }),
    [
      loading,
      session,
      profile,
      role,
      profileLoaded,
      refreshProfile,
      getAccessToken,
      signInWithGoogle,
      signInWithOtp,
      signOut,
    ]
  );

  return (
    <AuthCtx.Provider value={value}>
      {children}

      {/* Show only if: session exists AND profile not created yet */}
      {showAuthPrompt && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-white text-black p-6 rounded shadow-xl max-w-sm w-[92%] text-center space-y-4">
            <p className="font-semibold text-lg">
              Hey dude 👋
              <br />
              We found your session but no profile in our DB.
            </p>

            {!emailSent ? (
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setShowAuthPrompt(false)}
                  className="bg-gray-300 text-black px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  onClick={proceedFixProfile}
                  disabled={sending}
                  className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
                >
                  {sending ? "Working…" : "Proceed (Fix Profile / Resend Email)"}
                </button>
              </div>
            ) : (
              <p className="text-green-600">
                ✅ Auth email re-sent to {session?.user?.email}
              </p>
            )}
          </div>
        </div>
      )}
    </AuthCtx.Provider>
  );
}
