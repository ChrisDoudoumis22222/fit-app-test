"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, AlertTriangle } from "lucide-react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import TrainerOnboardingWizard from "../components/onboarding/TrainerOnboardingWizard";

export default function TrainerOnboardingPage() {
  const navigate = useNavigate();
  const { refreshProfile } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState("");

  const loadProfile = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      const user = session?.user;
      if (!user?.id) {
        navigate("/auth", { replace: true });
        return;
      }

      const { data, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      if (profileError) throw profileError;

      if (!data) {
        setError("Δεν βρέθηκε profile για αυτόν τον λογαριασμό.");
        return;
      }

      if (data.role !== "trainer") {
        navigate("/user", { replace: true });
        return;
      }

      if (data.onboarding_completed) {
        navigate("/trainer", { replace: true });
        return;
      }

      setProfile(data);
    } catch (err) {
      console.error("Trainer onboarding load error:", err);
      setError(
        err?.message || "Δεν ήταν δυνατή η φόρτωση του onboarding προπονητή."
      );
    } finally {
      setLoading(false);
    }
  }, [navigate]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const persistProfile = useCallback(
    async (payload, nextStep) => {
      if (!profile?.id) return;

      setSaving(true);
      setError("");

      try {
        const updatePayload = {
          ...payload,
          onboarding_step: nextStep,
          updated_at: new Date().toISOString(),
        };

        const { data, error: updateError } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", profile.id)
          .select()
          .single();

        if (updateError) throw updateError;

        setProfile(data);
        await refreshProfile?.().catch(console.error);
      } catch (err) {
        console.error("Trainer onboarding save error:", err);
        setError(
          err?.message || "Δεν ήταν δυνατή η αποθήκευση της προόδου."
        );
      } finally {
        setSaving(false);
      }
    },
    [profile?.id, refreshProfile]
  );

  const completeOnboarding = useCallback(
    async (payload) => {
      if (!profile?.id) return;

      setSaving(true);
      setError("");

      try {
        const updatePayload = {
          ...payload,
          onboarding_completed: true,
          onboarding_step: null,
          updated_at: new Date().toISOString(),
        };

        const { error: completeError } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", profile.id);

        if (completeError) throw completeError;

        await refreshProfile?.().catch(console.error);
        navigate("/trainer", { replace: true });
      } catch (err) {
        console.error("Trainer onboarding complete error:", err);
        setError(
          err?.message || "Δεν ήταν δυνατή η ολοκλήρωση του onboarding."
        );
      } finally {
        setSaving(false);
      }
    },
    [navigate, profile?.id, refreshProfile]
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="inline-flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-950 px-5 py-4 text-zinc-200">
          <Loader2 className="w-5 h-5 animate-spin" />
          Φόρτωση trainer onboarding...
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center px-4">
        <div className="w-full max-w-lg rounded-3xl border border-red-500/20 bg-red-500/10 p-6 text-red-100">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold">Κάτι πήγε στραβά</h2>
              <p className="mt-2 text-sm text-red-100/90">{error}</p>

              <button
                type="button"
                onClick={() => navigate("/auth", { replace: true })}
                className="mt-4 rounded-2xl bg-white text-black px-4 py-2 text-sm font-semibold"
              >
                Πήγαινε στη σύνδεση
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black px-4 py-8 sm:px-6 sm:py-10">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.06),transparent_35%)]" />

      {error ? (
        <div className="w-full max-w-3xl mx-auto mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <TrainerOnboardingWizard
        initialProfile={profile}
        saving={saving}
        onSaveProgress={persistProfile}
        onComplete={completeOnboarding}
      />
    </div>
  );
}