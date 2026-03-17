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

      const [{ data: profileData, error: profileError }, { data: availabilityData, error: availabilityError }] =
        await Promise.all([
          supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
          supabase
            .from("trainer_availability")
            .select("*")
            .eq("trainer_id", user.id)
            .order("weekday", { ascending: true })
            .order("start_time", { ascending: true }),
        ]);

      if (profileError) throw profileError;
      if (availabilityError) throw availabilityError;

      if (!profileData) {
        setError("Δεν βρέθηκε profile για αυτόν τον λογαριασμό.");
        return;
      }

      if (profileData.role !== "trainer") {
        navigate("/user", { replace: true });
        return;
      }

      if (profileData.onboarding_completed) {
        navigate("/trainer", { replace: true });
        return;
      }

      setProfile({
        ...profileData,
        trainer_availability: availabilityData || [],
      });
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

  const syncTrainerAvailability = useCallback(async (trainerId, availabilityRows) => {
    const normalizedRows = Array.isArray(availabilityRows) ? availabilityRows : [];

    const { error: deleteError } = await supabase
      .from("trainer_availability")
      .delete()
      .eq("trainer_id", trainerId);

    if (deleteError) throw deleteError;

    if (normalizedRows.length === 0) return [];

    const rowsToInsert = normalizedRows.map((row) => ({
      trainer_id: trainerId,
      weekday: row.weekday,
      start_time: row.start_time,
      end_time: row.end_time,
      is_online: Boolean(row.is_online),
    }));

    const { data, error: insertError } = await supabase
      .from("trainer_availability")
      .insert(rowsToInsert)
      .select("*");

    if (insertError) throw insertError;

    return data || [];
  }, []);

  const persistProfileStep = useCallback(
    async (data, nextStep) => {
      if (!profile?.id) return;

      setSaving(true);
      setError("");

      try {
        const profilePayload = data?.profilePayload || {};
        const availabilityRows = data?.availabilityRows || [];

        const updatePayload = {
          ...profilePayload,
          onboarding_step: nextStep,
          updated_at: new Date().toISOString(),
        };

        const { data: updatedProfile, error: updateError } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", profile.id)
          .select()
          .single();

        if (updateError) throw updateError;

        const syncedAvailability = await syncTrainerAvailability(
          profile.id,
          availabilityRows
        );

        setProfile({
          ...updatedProfile,
          trainer_availability: syncedAvailability,
        });

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
    [profile?.id, refreshProfile, syncTrainerAvailability]
  );

  const completeOnboarding = useCallback(
    async (data) => {
      if (!profile?.id) return;

      setSaving(true);
      setError("");

      try {
        const profilePayload = data?.profilePayload || {};
        const availabilityRows = data?.availabilityRows || [];

        const updatePayload = {
          ...profilePayload,
          onboarding_completed: true,
          onboarding_step: null,
          updated_at: new Date().toISOString(),
        };

        const { error: completeError } = await supabase
          .from("profiles")
          .update(updatePayload)
          .eq("id", profile.id);

        if (completeError) throw completeError;

        await syncTrainerAvailability(profile.id, availabilityRows);
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
    [navigate, profile?.id, refreshProfile, syncTrainerAvailability]
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
        <div className="w-full max-w-5xl mx-auto mb-4 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
          {error}
        </div>
      ) : null}

      <TrainerOnboardingWizard
        initialProfile={profile}
        saving={saving}
        onSaveProgress={persistProfileStep}
        onComplete={completeOnboarding}
      />
    </div>
  );
}