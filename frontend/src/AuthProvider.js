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
  /* Supabase session */
  const [session, setSession] = useState(null);

  /* Profile row + load flag */
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);

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
      // If no row found, data === null; that's fine (we'll show the prompt)
      setProfile(null);
    } else {
      setProfile(data || null);
    }

    setProfileLoaded(true);
    return data || null;
  }, []);

  const refreshProfile = () =>
    session?.user ? fetchProfile(session.user.id) : Promise.resolve(null);

  /* ---------- initial load + auth listener ---------- */
  useEffect(() => {
    (async () => {
      const {
        data: { session: currentSession },
      } = await supabase.auth.getSession();

      setSession(currentSession);

      if (currentSession?.user) {
        const result = await fetchProfile(currentSession.user.id);
        // If we have a session but no profile row, show the prompt
        if (!result) setShowAuthPrompt(true);
      } else {
        // No session -> we mark profile as loaded to avoid hanging UI
        setProfileLoaded(true);
      }
    })();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);

      if (newSession?.user) {
        fetchProfile(newSession.user.id).then((result) => {
          if (!result) setShowAuthPrompt(true);
        });
      } else {
        setProfile(null);
        setProfileLoaded(true);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchProfile]);

  /* ---------- resend Supabase auth / magic link ---------- */
  const sendTrainerEmail = async () => {
    const email = session?.user?.email;
    if (!email || sending) return;

    try {
      setSending(true);
      setEmailSent(false);

      // Optional: redirect after confirming / magic link completes
      // const emailRedirectTo =
      //   typeof window !== "undefined"
      //     ? `${window.location.origin}/trainer/onboarding`
      //     : undefined;

      const { error } = await supabase.auth.signInWithOtp({
        email,
        // options: { emailRedirectTo },
      });

      if (!error) setEmailSent(true);
    } finally {
      setSending(false);
    }
  };

  return (
    <AuthCtx.Provider
      value={{
        session,
        profile,
        profileLoaded,
        refreshProfile,
      }}
    >
      {children}

      {/* “Hey dude, auth yourself” modal – shown only if: session exists && no profile row */}
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
                  onClick={sendTrainerEmail}
                  disabled={sending}
                  className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-60"
                >
                  {sending ? "Sending…" : "Proceed (Resend Auth Email)"}
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
