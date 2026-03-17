import React, { useState, useCallback, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import {
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Info,
  X,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";

import AuthLoginForm from "../components/auth/AuthLoginForm";
import AuthSignupForm from "../components/auth/AuthSignupForm";
import {
  TRAINER_CATEGORIES as BASE_TRAINER_CATEGORIES,
  LOCATION_OPTIONS,
  SPECIALTIES_BY_VALUE,
} from "../components/trainer-detail/shared";

/* ------------------ CONFIG ------------------ */
const LOGO_SRC =
  "https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png";

const OAUTH_PENDING_KEY = "pv_google_oauth_pending";
const OAUTH_INTENT_KEY = "pv_google_oauth_intent";

/* ------------------ DERIVED SHARED DATA ------------------ */
const TRAINER_CATEGORIES = BASE_TRAINER_CATEGORIES.map((category) => ({
  ...category,
  specialties: SPECIALTIES_BY_VALUE[category.value] || [],
}));

/* ------------------ HELPERS ------------------ */
function withTimeout(promise, ms, label = "operation") {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
    ),
  ]);
}

function safeSetStorage(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (_) {}
}

function safeSessionSet(key, value) {
  try {
    sessionStorage.setItem(key, value);
  } catch (_) {}
}

function safeSessionGet(key) {
  try {
    return sessionStorage.getItem(key);
  } catch (_) {
    return null;
  }
}

function safeSessionRemove(key) {
  try {
    sessionStorage.removeItem(key);
  } catch (_) {}
}

function setOAuthIntent(intent) {
  safeSessionSet(OAUTH_INTENT_KEY, JSON.stringify(intent || null));
}

function getOAuthIntent() {
  try {
    const raw = safeSessionGet(OAUTH_INTENT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (_) {
    return null;
  }
}

function clearOAuthIntent() {
  safeSessionRemove(OAUTH_INTENT_KEY);
}

function hasOAuthParams() {
  if (typeof window === "undefined") return false;

  const search = new URLSearchParams(window.location.search);
  const hash = window.location.hash || "";

  return (
    search.has("code") ||
    search.has("state") ||
    hash.includes("access_token") ||
    hash.includes("refresh_token")
  );
}

function getTokensFromHash() {
  if (typeof window === "undefined") {
    return { access_token: null, refresh_token: null };
  }

  const hash = (window.location.hash || "").replace(/^#/, "");
  const params = new URLSearchParams(hash);

  return {
    access_token: params.get("access_token"),
    refresh_token: params.get("refresh_token"),
  };
}

function cleanupOAuthUrl() {
  if (typeof window === "undefined") return;

  const url = new URL(window.location.href);
  url.searchParams.delete("code");
  url.searchParams.delete("error");
  url.searchParams.delete("error_description");
  url.searchParams.delete("error_code");
  url.searchParams.delete("state");
  url.hash = "";
  window.history.replaceState({}, document.title, `${url.pathname}${url.search}`);
}

function mapAuthErrorToGreek(err) {
  const raw = String(err?.message || "");
  const msg = raw.toLowerCase();
  const status = err?.status ?? err?.statusCode ?? err?.code;

  if (msg.includes("invalid login credentials")) {
    return {
      kind: "invalid_creds",
      title: "Λάθος στοιχεία σύνδεσης",
      message:
        "Το email ή ο κωδικός δεν είναι σωστά. Δοκίμασε ξανά ή κάνε επαναφορά κωδικού.",
    };
  }

  if (
    msg.includes("email not confirmed") ||
    msg.includes("not confirmed") ||
    msg.includes("otp_expired") ||
    msg.includes("email link is invalid or has expired")
  ) {
    return {
      kind: "email_not_confirmed",
      title: "Το link του email έληξε ή δεν είναι έγκυρο",
      message:
        "Το link επιβεβαίωσης ή σύνδεσης έχει λήξει. Ζήτησε νέο email και δοκίμασε ξανά.",
    };
  }

  if (
    status === 429 ||
    msg.includes("too many requests") ||
    msg.includes("rate limit") ||
    msg.includes("try again later")
  ) {
    return {
      kind: "rate_limited",
      title: "Πολλές προσπάθειες",
      message:
        "Έγιναν πολλές προσπάθειες σε λίγο χρόνο. Περίμενε λίγο και δοκίμασε ξανά.",
    };
  }

  if (msg.includes("timed out") || msg.includes("timeout")) {
    return {
      kind: "timeout",
      title: "Καθυστέρηση σύνδεσης",
      message:
        "Η σύνδεση καθυστέρησε. Έλεγξε το internet σου και δοκίμασε ξανά.",
    };
  }

  if (
    msg.includes("popup closed") ||
    msg.includes("access_denied") ||
    msg.includes("oauth") ||
    msg.includes("provider")
  ) {
    return {
      kind: "oauth",
      title: "Η σύνδεση με Google δεν ολοκληρώθηκε",
      message: "Η διαδικασία με τη Google δεν ολοκληρώθηκε. Δοκίμασε ξανά.",
    };
  }

  return {
    kind: "generic",
    title: "Κάτι πήγε στραβά",
    message:
      raw && raw.length < 200
        ? raw
        : "Παρουσιάστηκε πρόβλημα. Δοκίμασε ξανά σε λίγο.",
  };
}

function validateForm(form, mode) {
  if (!form.email.trim() || !form.password.trim()) {
    return "Το email και ο κωδικός είναι υποχρεωτικά.";
  }

  if (mode === "signup" && !form.full_name.trim()) {
    return "Συμπλήρωσε ονοματεπώνυμο.";
  }

  if (mode === "signup" && form.password.length < 6) {
    return "Ο κωδικός πρέπει να έχει τουλάχιστον 6 χαρακτήρες.";
  }

  if (mode === "signup" && form.role === "trainer" && !form.category) {
    return "Διάλεξε κατηγορία επαγγελματία.";
  }

  if (mode === "signup" && !LOCATION_OPTIONS.includes(form.location)) {
    return "Επίλεξε μία πόλη από τις διαθέσιμες επιλογές.";
  }

  return null;
}

/* ------------------ MAIN COMPONENT ------------------ */
export default function AuthPage() {
  const { refreshProfile } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({
    email: "",
    password: "",
    full_name: "",
    role: "user",
    category: "",
    specialities: [],
    location: "Όλες οι πόλεις",
  });

  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const [toasts, setToasts] = useState([]);
  const [modal, setModal] = useState(null);

  const toastTimersRef = useRef(new Map());
  const mountedRef = useRef(true);

  const oauthFinalizeInFlightRef = useRef(false);
  const oauthHandledRef = useRef(false);
  const oauthHandledUserIdRef = useRef(null);

  const submitLockRef = useRef(false);
  const googleLockRef = useRef(false);
  const redirectInFlightRef = useRef(false);
  const redirectHandledUserIdRef = useRef(null);

  const closeToast = useCallback((id) => {
    const timer = toastTimersRef.current.get(id);

    if (timer) {
      clearTimeout(timer);
      toastTimersRef.current.delete(id);
    }

    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const pushToast = useCallback(
    (t) => {
      const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const type = t.type || "info";

      const durationMs =
        typeof t.durationMs === "number"
          ? t.durationMs
          : type === "error"
          ? 0
          : type === "success"
          ? 6000
          : 8000;

      const toast = {
        id,
        type,
        title: t.title || "",
        message: t.message || "",
        durationMs,
      };

      setToasts((prev) => {
        const next = [toast, ...prev];

        if (next.length > 2) {
          const removed = next.slice(2);

          removed.forEach((oldToast) => {
            const oldTimer = toastTimersRef.current.get(oldToast.id);
            if (oldTimer) {
              clearTimeout(oldTimer);
              toastTimersRef.current.delete(oldToast.id);
            }
          });
        }

        return next.slice(0, 2);
      });

      if (durationMs > 0) {
        const timer = window.setTimeout(() => {
          closeToast(id);
        }, durationMs);

        toastTimersRef.current.set(id, timer);
      }
    },
    [closeToast]
  );

  const openModal = useCallback((m) => {
    setModal({
      title: m.title || "",
      message: m.message || "",
      icon: m.icon || "info",
      actions: Array.isArray(m.actions) ? m.actions : [{ label: "ΟΚ" }],
    });
  }, []);

  const closeModal = useCallback(() => setModal(null), []);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      toastTimersRef.current.forEach((timer) => clearTimeout(timer));
      toastTimersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    pushToast(
      mode === "signup"
        ? {
            type: "info",
            title: "Εγγραφή",
            message: "Συμπλήρωσε τα στοιχεία σου και προχώρα.",
            durationMs: 8000,
          }
        : {
            type: "info",
            title: "Σύνδεση",
            message: "Συνδέσου για να συνεχίσεις.",
            durationMs: 8000,
          }
    );
  }, [mode, pushToast]);

  const setField = useCallback(
    (key) => (e) => {
      const value = e?.target?.value ?? e;
      setForm((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  const toggleSpeciality = useCallback((name) => {
    setForm((prev) => {
      const exists = prev.specialities.includes(name);

      return {
        ...prev,
        specialities: exists
          ? prev.specialities.filter((s) => s !== name)
          : [...prev.specialities, name],
      };
    });
  }, []);

  const persistSession = useCallback(async () => {
    const { data, error } = await withTimeout(
      supabase.auth.getSession(),
      8000,
      "getSession"
    );

    if (error) throw error;

    const sess = data?.session ?? null;
    safeSetStorage("pv_session", sess);
    return sess;
  }, []);

  const getPostLoginRoute = useCallback((authUser, profile) => {
    const role =
      profile?.role ||
      authUser?.user_metadata?.role ||
      authUser?.app_metadata?.role ||
      "user";

    const onboardingCompleted = profile?.onboarding_completed === true;

    if (!onboardingCompleted) {
      return role === "trainer" ? "/trainer-onboarding" : "/user-onboarding";
    }

    return role === "trainer" ? "/trainer" : "/user";
  }, []);

  const getOAuthRedirectUrl = useCallback(() => {
    const url = new URL(window.location.href);
    url.search = "";
    url.hash = "";
    return url.toString();
  }, []);

  const getGoogleIntentMeta = useCallback((intent) => {
    switch (intent?.type) {
      case "google_signup_trainer":
        return {
          loadingTitle: "Google εγγραφή trainer…",
          loadingMessage: "Σε μεταφέρουμε στη Google για trainer εγγραφή.",
          successTitle: "Ο trainer λογαριασμός δημιουργήθηκε",
          successMessage: "Η trainer εγγραφή με Google ολοκληρώθηκε.",
        };

      case "google_signup_user":
        return {
          loadingTitle: "Google εγγραφή…",
          loadingMessage: "Σε μεταφέρουμε στη Google για εγγραφή.",
          successTitle: "Ο λογαριασμός δημιουργήθηκε",
          successMessage: "Η εγγραφή με Google ολοκληρώθηκε.",
        };

      default:
        return {
          loadingTitle: "Google…",
          loadingMessage: "Σε μεταφέρουμε στη Google για ασφαλή σύνδεση.",
          successTitle: "Έτοιμο",
          successMessage: "Η σύνδεση με Google ολοκληρώθηκε.",
        };
    }
  }, []);

  const ensureUserProfile = useCallback(async (authUser, intent = null) => {
    if (!authUser?.id) return null;

    const isGoogleIntent = Boolean(intent?.type?.startsWith("google"));
    const roleFromIntent = intent?.role || null;

    const resolvedRole =
      roleFromIntent ||
      authUser.user_metadata?.role ||
      authUser.app_metadata?.role ||
      "user";

    const resolvedFullName =
      intent?.full_name ||
      authUser.user_metadata?.full_name ||
      authUser.user_metadata?.name ||
      authUser.user_metadata?.user_name ||
      authUser.email?.split("@")[0] ||
      "";

    const resolvedAvatar =
      authUser.user_metadata?.avatar_url ||
      authUser.user_metadata?.picture ||
      null;

    const resolvedSpecialty =
      resolvedRole === "trainer"
        ? intent?.category || authUser.user_metadata?.specialty || null
        : null;

    const resolvedRoles =
      resolvedRole === "trainer"
        ? Array.isArray(intent?.specialities)
          ? intent.specialities
          : Array.isArray(authUser.user_metadata?.roles)
          ? authUser.user_metadata.roles
          : []
        : [];

    const resolvedLocation =
      intent?.location ||
      authUser.user_metadata?.location ||
      "Όλες οι πόλεις";

    const onboardingStartStep =
      resolvedRole === "trainer"
        ? isGoogleIntent
          ? 1
          : 2
        : 1;

    const resolvedSignupProvider = isGoogleIntent ? "google" : "email";

    let existingProfile = null;

    try {
      const { data, error } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle(),
        8000,
        "ensure profile lookup"
      );

      if (error) throw error;
      existingProfile = data || null;
    } catch (err) {
      console.error("ensureUserProfile lookup error:", err);
    }

    if (existingProfile) {
      const patch = {};

      if (
        (!existingProfile.full_name ||
          existingProfile.full_name === existingProfile.email) &&
        resolvedFullName
      ) {
        patch.full_name = resolvedFullName;
      }

      if (!existingProfile.avatar_url && resolvedAvatar) {
        patch.avatar_url = resolvedAvatar;
      }

      if (existingProfile.role !== resolvedRole && resolvedRole) {
        patch.role = resolvedRole;
      }

      if (
        resolvedRole === "trainer" &&
        !existingProfile.specialty &&
        resolvedSpecialty
      ) {
        patch.specialty = resolvedSpecialty;
      }

      if (
        resolvedRole === "trainer" &&
        (!Array.isArray(existingProfile.roles) ||
          existingProfile.roles.length === 0) &&
        resolvedRoles.length > 0
      ) {
        patch.roles = resolvedRoles;
      }

      if (!existingProfile.location && resolvedLocation) {
        patch.location = resolvedLocation;
      }

      if (!existingProfile.signup_provider && resolvedSignupProvider) {
        patch.signup_provider = resolvedSignupProvider;
      }

      if (
        resolvedRole === "trainer" &&
        (!Number.isFinite(existingProfile.onboarding_step) ||
          existingProfile.onboarding_step < onboardingStartStep)
      ) {
        patch.onboarding_step = onboardingStartStep;
      }

      if (Object.keys(patch).length > 0) {
        try {
          const { data, error } = await withTimeout(
            supabase
              .from("profiles")
              .update(patch)
              .eq("id", authUser.id)
              .select()
              .maybeSingle(),
            8000,
            "ensure profile patch"
          );

          if (error) {
            console.error("ensureUserProfile patch error:", error);
            existingProfile = { ...existingProfile, ...patch };
          } else if (data) {
            existingProfile = data;
          } else {
            existingProfile = { ...existingProfile, ...patch };
          }
        } catch (err) {
          console.error("ensureUserProfile patch throw:", err);
          existingProfile = { ...existingProfile, ...patch };
        }
      }

      safeSetStorage("pv_profile", existingProfile);
      return existingProfile;
    }

    const payload = {
      id: authUser.id,
      email:
        authUser.email ||
        authUser.user_metadata?.email ||
        authUser.identities?.[0]?.identity_data?.email ||
        null,
      full_name: resolvedFullName,
      avatar_url: resolvedAvatar,
      role: resolvedRole,
      specialty: resolvedSpecialty,
      roles: resolvedRoles,
      location: resolvedLocation,
      has_seen_welcome: false,
      onboarding_completed: false,
      onboarding_step: onboardingStartStep,
      signup_provider: resolvedSignupProvider,
    };

    try {
      const { data, error } = await withTimeout(
        supabase.from("profiles").insert(payload).select().maybeSingle(),
        8000,
        "ensure profile insert"
      );

      if (error) throw error;

      const finalProfile = data || payload;
      safeSetStorage("pv_profile", finalProfile);
      return finalProfile;
    } catch (err) {
      const msg = String(err?.message || "").toLowerCase();
      const code = err?.code;

      const looksLikeDuplicate =
        code === "23505" ||
        msg.includes("duplicate key") ||
        msg.includes("already exists") ||
        msg.includes("profiles_pkey") ||
        msg.includes("profiles_email_key");

      if (!looksLikeDuplicate) {
        throw err;
      }

      const { data: fallbackProfile, error: fallbackErr } = await withTimeout(
        supabase.from("profiles").select("*").eq("id", authUser.id).maybeSingle(),
        8000,
        "ensure profile fallback lookup"
      );

      if (fallbackErr) throw fallbackErr;
      if (!fallbackProfile) throw err;

      safeSetStorage("pv_profile", fallbackProfile);
      return fallbackProfile;
    }
  }, []);

  const redirectAuthenticatedUser = useCallback(
    async (session, { force = false, successToast = null, intent = null } = {}) => {
      const userId = session?.user?.id || null;
      if (!userId) return;

      if (redirectInFlightRef.current) return;
      if (!force && redirectHandledUserIdRef.current === userId) return;

      redirectInFlightRef.current = true;

      try {
        const sess = await persistSession();
        const profile = await ensureUserProfile(session.user, intent);
        await refreshProfile().catch(console.error);

        redirectHandledUserIdRef.current = userId;

        if (successToast) {
          pushToast(successToast);
        }

        const nextRoute = getPostLoginRoute(session.user || sess?.user, profile);
        navigate(nextRoute, { replace: true });
      } finally {
        redirectInFlightRef.current = false;
      }
    },
    [
      ensureUserProfile,
      getPostLoginRoute,
      navigate,
      persistSession,
      pushToast,
      refreshProfile,
    ]
  );

  const finalizeOAuthLogin = useCallback(
    async (session) => {
      const userId = session?.user?.id || null;
      if (!userId) return;

      if (oauthFinalizeInFlightRef.current) return;
      if (
        oauthHandledRef.current &&
        oauthHandledUserIdRef.current &&
        oauthHandledUserIdRef.current === userId
      ) {
        return;
      }

      oauthFinalizeInFlightRef.current = true;
      setGoogleSubmitting(true);

      try {
        const intent = getOAuthIntent();

        await ensureUserProfile(session.user, intent);
        await refreshProfile().catch(console.error);

        oauthHandledRef.current = true;
        oauthHandledUserIdRef.current = userId;

        safeSessionRemove(OAUTH_PENDING_KEY);
        clearOAuthIntent();
        cleanupOAuthUrl();

        const meta = getGoogleIntentMeta(intent);

        await redirectAuthenticatedUser(session, {
          force: true,
          intent,
          successToast: {
            type: "success",
            title: meta.successTitle,
            message: meta.successMessage,
            durationMs: 6000,
          },
        });
      } catch (err) {
        console.error("OAuth finalize error:", err);

        oauthHandledRef.current = false;
        oauthHandledUserIdRef.current = null;
        safeSessionRemove(OAUTH_PENDING_KEY);
        clearOAuthIntent();
        cleanupOAuthUrl();

        const mapped = mapAuthErrorToGreek(err);

        if (mountedRef.current) {
          setError(mapped.message);

          openModal({
            icon: "error",
            title: mapped.title,
            message: mapped.message,
            actions: [{ label: "ΟΚ", onClick: closeModal }],
          });

          pushToast({
            type: "error",
            title: mapped.title,
            message: mapped.message,
            durationMs: 0,
          });
        }
      } finally {
        googleLockRef.current = false;
        oauthFinalizeInFlightRef.current = false;

        if (mountedRef.current) {
          setGoogleSubmitting(false);
        }
      }
    },
    [
      closeModal,
      ensureUserProfile,
      getGoogleIntentMeta,
      openModal,
      pushToast,
      redirectAuthenticatedUser,
      refreshProfile,
    ]
  );

  useEffect(() => {
    const shouldHandleOAuth =
      safeSessionGet(OAUTH_PENDING_KEY) === "1" || hasOAuthParams();

    if (!shouldHandleOAuth) return;

    let active = true;

    const bootOAuth = async () => {
      try {
        let session = null;

        const { data, error } = await withTimeout(
          supabase.auth.getSession(),
          8000,
          "oauth getSession"
        );

        if (!active || !mountedRef.current) return;
        if (error) throw error;

        session = data?.session || null;

        if (!session?.user) {
          const { access_token, refresh_token } = getTokensFromHash();

          if (access_token && refresh_token) {
            const { data: setData, error: setSessionError } = await withTimeout(
              supabase.auth.setSession({
                access_token,
                refresh_token,
              }),
              8000,
              "oauth setSession from hash"
            );

            if (!active || !mountedRef.current) return;
            if (setSessionError) throw setSessionError;

            session = setData?.session || null;
          }
        }

        if (session?.user) {
          await finalizeOAuthLogin(session);
        } else {
          safeSessionRemove(OAUTH_PENDING_KEY);
          clearOAuthIntent();
          cleanupOAuthUrl();
          setGoogleSubmitting(false);
        }
      } catch (err) {
        if (!active || !mountedRef.current) return;

        console.error("OAuth boot error:", err);
        safeSessionRemove(OAUTH_PENDING_KEY);
        clearOAuthIntent();
        cleanupOAuthUrl();

        const mapped = mapAuthErrorToGreek(err);
        setError(mapped.message);

        openModal({
          icon: "error",
          title: mapped.title,
          message: mapped.message,
          actions: [{ label: "ΟΚ", onClick: closeModal }],
        });

        pushToast({
          type: "error",
          title: mapped.title,
          message: mapped.message,
          durationMs: 0,
        });

        setGoogleSubmitting(false);
      }
    };

    void bootOAuth();

    return () => {
      active = false;
    };
  }, [closeModal, finalizeOAuthLogin, openModal, pushToast]);

  useEffect(() => {
    let active = true;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!active || !mountedRef.current) return;

      if (event === "SIGNED_IN" && session?.user) {
        const oauthPending = safeSessionGet(OAUTH_PENDING_KEY) === "1";

        if (oauthPending) {
          void finalizeOAuthLogin(session);
        }
      }

      if (event === "SIGNED_OUT") {
        safeSessionRemove(OAUTH_PENDING_KEY);
        clearOAuthIntent();
        oauthHandledRef.current = false;
        oauthHandledUserIdRef.current = null;
        redirectHandledUserIdRef.current = null;
        setGoogleSubmitting(false);
      }
    });

    return () => {
      active = false;
      subscription?.unsubscribe();
    };
  }, [finalizeOAuthLogin]);

  const startGoogleOAuth = useCallback(
    async (intent) => {
      if (googleLockRef.current || googleSubmitting || submitting) return;

      setError("");
      googleLockRef.current = true;
      setGoogleSubmitting(true);

      try {
        safeSessionSet(OAUTH_PENDING_KEY, "1");
        setOAuthIntent(intent);

        const meta = getGoogleIntentMeta(intent);

        pushToast({
          type: "info",
          title: meta.loadingTitle,
          message: meta.loadingMessage,
          durationMs: 8000,
        });

        const { error: oauthErr } = await withTimeout(
          supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: getOAuthRedirectUrl(),
              queryParams: { prompt: "select_account" },
            },
          }),
          15000,
          "google oauth"
        );

        if (oauthErr) throw oauthErr;
      } catch (err) {
        console.error("Google auth error:", err);

        safeSessionRemove(OAUTH_PENDING_KEY);
        clearOAuthIntent();
        cleanupOAuthUrl();
        googleLockRef.current = false;

        const mapped = mapAuthErrorToGreek(err);
        setError(mapped.message);

        openModal({
          icon: "error",
          title: mapped.title,
          message: mapped.message,
          actions: [{ label: "ΟΚ", onClick: closeModal }],
        });

        pushToast({
          type: "error",
          title: mapped.title,
          message: mapped.message,
          durationMs: 0,
        });

        setGoogleSubmitting(false);
      }
    },
    [
      closeModal,
      getGoogleIntentMeta,
      getOAuthRedirectUrl,
      googleSubmitting,
      openModal,
      pushToast,
      submitting,
    ]
  );

  const handleGoogleLogin = useCallback(async () => {
    await startGoogleOAuth({ type: "google_login" });
  }, [startGoogleOAuth]);

  const handleGoogleSignupUser = useCallback(async () => {
    await startGoogleOAuth({
      type: "google_signup_user",
      role: "user",
      full_name: form.full_name?.trim() || "",
      location: form.location || "Όλες οι πόλεις",
    });
  }, [form.full_name, form.location, startGoogleOAuth]);

  const handleGoogleSignupTrainer = useCallback(async () => {
    await startGoogleOAuth({
      type: "google_signup_trainer",
      role: "trainer",
      full_name: form.full_name?.trim() || "",
      location: form.location || "Όλες οι πόλεις",
      category: form.category || null,
      specialities: Array.isArray(form.specialities) ? form.specialities : [],
    });
  }, [
    form.category,
    form.full_name,
    form.location,
    form.specialities,
    startGoogleOAuth,
  ]);

  const handleLoginSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (submitLockRef.current || submitting || googleSubmitting) return;

      setError("");
      submitLockRef.current = true;
      setSubmitting(true);

      try {
        cleanupOAuthUrl();
        safeSessionRemove(OAUTH_PENDING_KEY);
        clearOAuthIntent();

        const validationError = validateForm(form, "login");

        if (validationError) {
          setError(validationError);

          openModal({
            icon: "error",
            title: "Χρειάζονται στοιχεία",
            message: validationError,
            actions: [{ label: "ΟΚ", onClick: closeModal }],
          });

          return;
        }

        pushToast({
          type: "info",
          title: "Σύνδεση…",
          message: "Γίνεται έλεγχος στοιχείων.",
          durationMs: 8000,
        });

        const { data, error: loginErr } = await withTimeout(
          supabase.auth.signInWithPassword({
            email: form.email.trim(),
            password: form.password,
          }),
          10000,
          "login"
        );

        if (loginErr) throw loginErr;

        const sess = data?.session || (await persistSession());
        const profile = await ensureUserProfile(data?.user || sess?.user);
        await refreshProfile().catch(console.error);

        const nextRoute = getPostLoginRoute(data?.user || sess?.user, profile);

        redirectHandledUserIdRef.current = (data?.user || sess?.user)?.id || null;

        pushToast({
          type: "success",
          title: "Έτοιμο",
          message: "Συνδέθηκες επιτυχώς.",
          durationMs: 6000,
        });

        navigate(nextRoute, { replace: true });
      } catch (err) {
        console.error("Login error:", err);

        const mapped = mapAuthErrorToGreek(err);
        setError(mapped.message);

        if (mapped.kind === "invalid_creds") {
          openModal({
            icon: "error",
            title: mapped.title,
            message: mapped.message,
            actions: [
              {
                label: "Επαναφορά κωδικού",
                onClick: () => {
                  closeModal();
                  navigate("/forgot-password");
                },
              },
              { label: "ΟΚ", onClick: closeModal },
            ],
          });
        } else {
          openModal({
            icon: mapped.kind === "email_not_confirmed" ? "info" : "error",
            title: mapped.title,
            message: mapped.message,
            actions: [{ label: "ΟΚ", onClick: closeModal }],
          });
        }

        pushToast({
          type: "error",
          title: mapped.title,
          message: mapped.message,
          durationMs: 0,
        });
      } finally {
        submitLockRef.current = false;

        if (mountedRef.current) {
          setSubmitting(false);
        }
      }
    },
    [
      closeModal,
      ensureUserProfile,
      form,
      getPostLoginRoute,
      googleSubmitting,
      navigate,
      openModal,
      persistSession,
      pushToast,
      refreshProfile,
      submitting,
    ]
  );

  const handleSignupSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (submitLockRef.current || submitting || googleSubmitting) return;

      setError("");
      submitLockRef.current = true;
      setSubmitting(true);

      try {
        cleanupOAuthUrl();
        safeSessionRemove(OAUTH_PENDING_KEY);
        clearOAuthIntent();

        const validationError = validateForm(form, "signup");

        if (validationError) {
          setError(validationError);

          openModal({
            icon: "error",
            title: "Χρειάζονται στοιχεία",
            message: validationError,
            actions: [{ label: "ΟΚ", onClick: closeModal }],
          });

          return;
        }

        pushToast({
          type: "info",
          title: "Εγγραφή…",
          message: "Δημιουργούμε τον λογαριασμό σου.",
          durationMs: 8000,
        });

        const signupIntent = {
          type: "email_signup",
          role: form.role,
          full_name: form.full_name.trim(),
          location: form.location || "Όλες οι πόλεις",
          category: form.role === "trainer" ? form.category : null,
          specialities: form.role === "trainer" ? form.specialities : [],
        };

        const { data, error: signErr } = await withTimeout(
          supabase.auth.signUp({
            email: form.email.trim(),
            password: form.password,
            options: {
              data: {
                full_name: form.full_name.trim(),
                role: form.role,
                specialty: form.role === "trainer" ? form.category : null,
                roles: form.role === "trainer" ? form.specialities : [],
                location: form.location || null,
              },
            },
          }),
          12000,
          "signup"
        );

        if (signErr) {
          const signMsg = String(signErr?.message || "").toLowerCase();

          if (
            signErr.status === 400 &&
            /registered|exists|used|already/i.test(signMsg)
          ) {
            const msg =
              "Υπάρχει ήδη λογαριασμός με αυτό το email. Παρακαλώ συνδέσου.";
            setError(msg);

            openModal({
              icon: "error",
              title: "Υπάρχει ήδη λογαριασμός",
              message: msg,
              actions: [
                {
                  label: "Πήγαινε στη σύνδεση",
                  onClick: () => {
                    closeModal();
                    setMode("login");
                  },
                },
                { label: "ΟΚ", onClick: closeModal },
              ],
            });

            return;
          }

          throw signErr;
        }

        let activeSession = data?.session || null;

        if (!activeSession) {
          const { data: loginData, error: autoLoginErr } = await withTimeout(
            supabase.auth.signInWithPassword({
              email: form.email.trim(),
              password: form.password,
            }),
            10000,
            "auto login after signup"
          );

          if (!autoLoginErr && loginData?.session) {
            activeSession = loginData.session;
          }
        }

        if (activeSession?.user) {
          const sess = activeSession || (await persistSession());
          const profile = await ensureUserProfile(sess.user, signupIntent);
          await refreshProfile().catch(console.error);

          const nextRoute = getPostLoginRoute(sess.user, profile);

          redirectHandledUserIdRef.current = sess?.user?.id || null;

          pushToast({
            type: "success",
            title: "Ο λογαριασμός δημιουργήθηκε",
            message: "Έγινε και αυτόματη σύνδεση.",
            durationMs: 7000,
          });

          navigate(nextRoute, { replace: true });
          return;
        }

        openModal({
          icon: "success",
          title: "Σχεδόν τελείωσες",
          message:
            "Ο λογαριασμός δημιουργήθηκε, αλλά χρειάζεται επιβεβαίωση email πριν γίνει σύνδεση. Άνοιξε το inbox ή το spam και επιβεβαίωσέ το.",
          actions: [
            {
              label: "Πήγαινε στη σύνδεση",
              onClick: () => {
                closeModal();
                setMode("login");
              },
            },
            { label: "ΟΚ", onClick: closeModal },
          ],
        });

        pushToast({
          type: "success",
          title: "Ο λογαριασμός δημιουργήθηκε",
          message:
            "Αν δεν έγινε αυτόματη σύνδεση, έλεγξε αν χρειάζεται email confirmation.",
          durationMs: 7000,
        });
      } catch (err) {
        console.error("Signup error:", err);

        const mapped = mapAuthErrorToGreek(err);
        setError(mapped.message);

        openModal({
          icon: mapped.kind === "email_not_confirmed" ? "info" : "error",
          title: mapped.title,
          message: mapped.message,
          actions: [{ label: "ΟΚ", onClick: closeModal }],
        });

        pushToast({
          type: "error",
          title: mapped.title,
          message: mapped.message,
          durationMs: 0,
        });
      } finally {
        submitLockRef.current = false;

        if (mountedRef.current) {
          setSubmitting(false);
        }
      }
    },
    [
      closeModal,
      ensureUserProfile,
      form,
      getPostLoginRoute,
      googleSubmitting,
      navigate,
      openModal,
      persistSession,
      pushToast,
      refreshProfile,
      submitting,
    ]
  );

  const disableMainActions = submitting || googleSubmitting;
  const showGoogleLoginButton = mode === "login";

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-zinc-900 px-4 py-10">
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black" />
      <StaticBlobs />

      <ToastViewport toasts={toasts} onClose={closeToast} />
      <ModalPopup modal={modal} onClose={closeModal} />

      <LayoutGroup>
        <motion.div
          layout
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", damping: 20, stiffness: 150 }}
          className="relative z-10 w-full max-w-md px-7 py-9 space-y-7 rounded-3xl
                     bg-black/40 backdrop-blur-xl border border-zinc-700/50 text-gray-200
                     shadow-[0_20px_50px_rgba(0,0,0,0.7)]"
        >
          <motion.div
            className="text-center space-y-3"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <img
              src={LOGO_SRC}
              alt="Peak Velocity"
              className="mx-auto h-16 w-16 rounded-xl bg-white p-1 object-contain"
            />
            <div className="text-[30px] font-bold text-white">
              Peak<span className="font-light text-zinc-300">Velocity</span>
            </div>
            <p className="text-zinc-400 text-[15px]">
              Σύνδεση & εγγραφή — σε λίγα βήματα.
            </p>
          </motion.div>

          <TogglePill mode={mode} setMode={setMode} />

          {showGoogleLoginButton ? (
            <div className="space-y-3">
              <GoogleButton
                loading={googleSubmitting}
                onClick={handleGoogleLogin}
                text="Σύνδεση με Google"
              />
              <Divider />
            </div>
          ) : null}

          <AnimatePresence mode="wait" initial={false}>
            {mode === "login" ? (
              <motion.div
                key="login-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <AuthLoginForm
                  form={form}
                  error={error}
                  showPw={showPw}
                  setShowPw={setShowPw}
                  setField={setField}
                  onSubmit={handleLoginSubmit}
                  disabled={disableMainActions}
                  onForgotPassword={() =>
                    openModal({
                      icon: "info",
                      title: "Επαναφορά κωδικού",
                      message:
                        "Θες να κάνεις επαναφορά κωδικού; Θα σε πάμε στη σελίδα επαναφοράς.",
                      actions: [
                        { label: "Άκυρο", onClick: closeModal },
                        {
                          label: "Συνέχεια",
                          onClick: () => {
                            closeModal();
                            navigate("/forgot-password");
                          },
                        },
                      ],
                    })
                  }
                />
              </motion.div>
            ) : (
              <motion.div
                key="signup-view"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                <AuthSignupForm
                  form={form}
                  error={error}
                  showPw={showPw}
                  setShowPw={setShowPw}
                  setField={setField}
                  setForm={setForm}
                  onSubmit={handleSignupSubmit}
                  disabled={disableMainActions}
                  googleSubmitting={googleSubmitting}
                  onGoogleSignupUser={handleGoogleSignupUser}
                  onGoogleSignupTrainer={handleGoogleSignupTrainer}
                  locationOptions={LOCATION_OPTIONS}
                  trainerCategories={TRAINER_CATEGORIES}
                  toggleSpeciality={toggleSpeciality}
                  pushToast={pushToast}
                  openModal={openModal}
                  closeModal={closeModal}
                />
              </motion.div>
            )}
          </AnimatePresence>

          <p className="text-center text-[15px] text-zinc-500 pt-1">
            {mode === "login" ? "Δεν έχεις λογαριασμό;" : "Έχεις ήδη λογαριασμό;"}{" "}
            <button
              type="button"
              onClick={() => {
                setError("");
                setMode(mode === "login" ? "signup" : "login");
              }}
              className="text-zinc-300 hover:text-white font-medium transition-colors"
            >
              {mode === "login" ? "Εγγραφή" : "Σύνδεση"}
            </button>
          </p>
        </motion.div>
      </LayoutGroup>
    </div>
  );
}

/* ------------------ SHARED UI ------------------ */
function StaticBlobs() {
  return (
    <>
      <div className="absolute left-1/4 -top-40 w-96 aspect-square rounded-full bg-gradient-to-r from-zinc-600/10 to-gray-700/10 blur-2xl" />
      <div className="absolute -right-40 bottom-10 w-[30rem] aspect-square rounded-full bg-gradient-to-r from-gray-700/10 to-zinc-800/10 blur-2xl" />
    </>
  );
}

function Divider() {
  return (
    <div className="relative">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-zinc-700/70" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-black/40 px-3 text-xs tracking-wide uppercase text-zinc-500">
          ή
        </span>
      </div>
    </div>
  );
}

function TogglePill({ mode, setMode }) {
  return (
    <div className="flex justify-center pb-2">
      <div className="relative p-1 rounded-2xl bg-black/30 backdrop-blur-sm border border-zinc-700 w-64 flex">
        <motion.span
          layout
          className="absolute inset-y-1 rounded-xl bg-zinc-800 shadow-inner"
          style={{
            width: "calc(50% - 4px)",
            left: mode === "login" ? "4px" : "calc(50% + 4px - 4px)",
          }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        />
        {["login", "signup"].map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setMode(key)}
            className={`relative flex-1 py-2 text-base rounded-xl z-10 transition-colors ${
              mode === key ? "text-white font-semibold" : "text-gray-300"
            }`}
          >
            {key === "login" ? "Σύνδεση" : "Εγγραφή"}
          </button>
        ))}
      </div>
    </div>
  );
}

function GoogleButton({ loading, onClick, text }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileHover={!loading ? { y: -1 } : {}}
      whileTap={!loading ? { scale: 0.98 } : {}}
      transition={{ duration: 0.15 }}
      className={`w-full py-4 rounded-xl font-semibold text-base border transition-all duration-300 flex items-center justify-center gap-3 ${
        loading
          ? "bg-white/70 text-zinc-700 border-white/70 opacity-80 cursor-not-allowed"
          : "bg-white text-zinc-900 border-white hover:bg-zinc-100 shadow-lg"
      }`}
    >
      {loading ? (
        <Loader2 className="animate-spin w-5 h-5" />
      ) : (
        <>
          <GoogleIcon />
          <span>{text}</span>
        </>
      )}
    </motion.button>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.239 36 24 36c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.27 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.166 0 9.86-1.977 13.409-5.193l-6.19-5.238C29.145 35.091 26.715 36 24 36c-5.218 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.051 12.051 0 0 1-4.084 5.569l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"
      />
    </svg>
  );
}

/* ------------------ TOASTS ------------------ */
function ToastViewport({ toasts, onClose }) {
  return (
    <div className="fixed z-[60] top-5 right-5 left-5 sm:left-auto sm:w-[380px] pointer-events-none">
      <div className="flex flex-col gap-2">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastCard key={t.id} toast={t} onClose={() => onClose(t.id)} />
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

function ToastCard({ toast, onClose }) {
  const Icon =
    toast.type === "success"
      ? CheckCircle2
      : toast.type === "error"
      ? AlertTriangle
      : Info;

  const ring =
    toast.type === "success"
      ? "border-emerald-500/25"
      : toast.type === "error"
      ? "border-red-500/25"
      : "border-zinc-500/25";

  const bg =
    toast.type === "success"
      ? "bg-emerald-500/10"
      : toast.type === "error"
      ? "bg-red-500/10"
      : "bg-zinc-500/10";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -8, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.98 }}
      transition={{ duration: 0.22, ease: "easeOut" }}
      className={`pointer-events-auto rounded-2xl border ${ring} ${bg} backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.45)] px-4 py-3`}
    >
      <div className="flex gap-3 items-start">
        <div className="mt-0.5">
          <Icon className="w-5 h-5 text-zinc-200" />
        </div>

        <div className="flex-1">
          {toast.title ? (
            <div className="text-sm font-semibold text-white leading-tight">
              {toast.title}
            </div>
          ) : null}

          <div className="text-sm text-zinc-200/85 leading-snug">
            {toast.message}
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="text-zinc-400 hover:text-white transition-colors"
          aria-label="Κλείσιμο"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}

/* ------------------ MODAL ------------------ */
function ModalPopup({ modal, onClose }) {
  return (
    <AnimatePresence>
      {modal ? (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.button
            type="button"
            aria-label="Κλείσιμο"
            onClick={onClose}
            className="absolute inset-0 bg-black/60"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />

          <motion.div
            initial={{ y: 14, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 14, opacity: 0, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 240, damping: 22 }}
            className="relative w-full max-w-md rounded-3xl border border-zinc-700/50 bg-black/55 backdrop-blur-xl shadow-[0_30px_90px_rgba(0,0,0,0.7)] p-6 text-zinc-100"
          >
            <button
              type="button"
              onClick={onClose}
              className="absolute right-4 top-4 text-zinc-400 hover:text-white transition-colors"
              aria-label="Κλείσιμο"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-start gap-3">
              <div className="mt-0.5">
                {modal.icon === "success" ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : modal.icon === "error" ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Info className="w-6 h-6" />
                )}
              </div>

              <div className="flex-1">
                <div className="text-lg font-semibold text-white leading-tight">
                  {modal.title}
                </div>
                <div className="mt-1 text-sm text-zinc-200/85 leading-relaxed">
                  {modal.message}
                </div>
              </div>
            </div>

            <div className="mt-5 flex flex-col sm:flex-row gap-2 sm:justify-end">
              {modal.actions?.map((a, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={a.onClick || onClose}
                  className={`px-4 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    idx === modal.actions.length - 1
                      ? "bg-zinc-100 text-black hover:bg-white"
                      : "bg-white/5 text-zinc-200 hover:bg-white/10 border border-zinc-700/60"
                  }`}
                >
                  {a.label || "ΟΚ"}
                </button>
              ))}
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}