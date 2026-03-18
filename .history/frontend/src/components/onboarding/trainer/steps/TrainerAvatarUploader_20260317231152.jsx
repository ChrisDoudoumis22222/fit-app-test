"use client";

import React, { useMemo, useRef, useState } from "react";
import {
  Camera,
  Upload,
  Settings2,
  Image as ImageIcon,
  CheckCircle2,
  X,
} from "lucide-react";
import { supabase } from "../../../../supabaseClient";
import { cn } from "../trainerOnboarding.utils";
import TrainerAvatarPositionModal from "./TrainerAvatarPositionModal";

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function asNumber(value, fallback = 50) {
  const n = Number(value);
  return Number.isFinite(n) ? clamp(n, 0, 100) : fallback;
}

function fakeEvent(value) {
  return { target: { value } };
}

export default function TrainerAvatarUploader({ form, setField }) {
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showPositionModal, setShowPositionModal] = useState(false);

  const avatarUrl = form?.avatar_url || "";

  const posX = useMemo(
    () => asNumber(form?.avatar_position_x, 50),
    [form?.avatar_position_x]
  );

  const posY = useMemo(
    () => asNumber(form?.avatar_position_y, 50),
    [form?.avatar_position_y]
  );

  const updateField = (key, value) => {
    if (typeof setField === "function") {
      setField(key)(fakeEvent(value));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveAvatar = () => {
    updateField("avatar_url", "");
    updateField("avatar_position_x", 50);
    updateField("avatar_position_y", 50);
    setError("");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    if (!file.type?.startsWith("image/")) {
      setError("Ανέβασε μόνο εικόνα.");
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      setError("Η εικόνα είναι πολύ μεγάλη. Δοκίμασε έως 8MB.");
      return;
    }

    try {
      setUploading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.id) throw new Error("Δεν βρέθηκε συνδεδεμένος χρήστης.");

      const safeName = file.name.replace(/\s+/g, "-");
      const ext = safeName.split(".").pop() || "jpg";
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl || "";

      updateField("avatar_url", publicUrl);
      updateField("avatar_position_x", 50);
      updateField("avatar_position_y", 50);

      setShowPositionModal(true);
    } catch (err) {
      console.error("Avatar upload error:", err);
      setError(err?.message || "Κάτι πήγε λάθος στο upload.");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <>
      <div className="-mx-4 px-4 md:mx-0 md:px-0">
        <div className="md:rounded-2xl md:border md:border-zinc-800 md:bg-zinc-900/70 md:p-5">
          <div className="mb-4 flex items-start gap-3">
            <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-black">
              <Camera className="h-5 w-5 text-white" />
            </div>

            <div>
              <h3 className="text-sm font-semibold text-white">
                Avatar προφίλ
              </h3>
              <p className="mt-1 text-sm text-zinc-400">
                Ανέβασε εικόνα προφίλ και ρύθμισε τη θέση της μέσα από popup.
              </p>
            </div>
          </div>

          <div className="overflow-hidden rounded-[24px] border border-zinc-800 bg-black">
            <div className="flex flex-col gap-4 border-b border-zinc-800 px-4 py-4 md:flex-row md:items-start md:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  {avatarUrl ? (
                    <CheckCircle2 className="h-4 w-4 text-white" />
                  ) : (
                    <ImageIcon className="h-4 w-4 text-zinc-400" />
                  )}

                  <h4 className="text-base font-semibold text-white">
                    {avatarUrl ? "Ανεβασμένο avatar" : "Avatar εικόνα"}
                  </h4>
                </div>

                <p className="mt-2 text-sm text-zinc-400">
                  {avatarUrl
                    ? "Έτοιμο αρχείο. Μπορείς να αλλάξεις εικόνα ή να ρυθμίσεις τη θέση της."
                    : "Ανέβασε μία καθαρή φωτογραφία προφίλ για τον trainer."}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 md:justify-end">
                <button
                  type="button"
                  onClick={handleUploadClick}
                  disabled={uploading}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition",
                    "border-zinc-700 bg-zinc-950 text-white hover:border-zinc-600",
                    uploading && "cursor-not-allowed opacity-60"
                  )}
                >
                  <Upload className="h-4 w-4" />
                  {avatarUrl
                    ? uploading
                      ? "Γίνεται upload..."
                      : "Αλλαγή"
                    : uploading
                    ? "Γίνεται upload..."
                    : "Ανέβασε εικόνα"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowPositionModal(true)}
                  disabled={!avatarUrl}
                  className={cn(
                    "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition",
                    avatarUrl
                      ? "border-zinc-700 bg-zinc-950 text-white hover:border-zinc-600"
                      : "cursor-not-allowed border-zinc-800 bg-zinc-950 text-zinc-500 opacity-60"
                  )}
                >
                  <Settings2 className="h-4 w-4" />
                  Ρύθμιση θέσης
                </button>

                {avatarUrl ? (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-red-500/40 bg-transparent px-4 text-sm font-semibold text-red-300 transition hover:border-red-400/60 hover:bg-red-500/10"
                  >
                    <X className="h-4 w-4" />
                    Αφαίρεση
                  </button>
                ) : null}
              </div>

              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

            <div className="px-4 py-4">
              <div className="relative min-h-[260px] overflow-hidden rounded-[22px] border border-zinc-800 bg-black md:min-h-[320px]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Trainer avatar preview"
                    className="absolute inset-0 h-full w-full object-cover"
                    style={{
                      objectPosition: `${posX}% ${posY}%`,
                    }}
                  />
                ) : (
                  <div className="flex min-h-[260px] flex-col items-center justify-center gap-4 text-center md:min-h-[320px]">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
                      <ImageIcon className="h-7 w-7 text-zinc-500" />
                    </div>

                    <div>
                      <p className="text-base font-semibold text-white">
                        Δεν έχει ανέβει avatar
                      </p>
                      <p className="mt-1 text-sm text-zinc-500">
                        Πρόσθεσε μία καθαρή φωτογραφία προφίλ
                      </p>
                    </div>
                  </div>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/40 to-transparent" />
              </div>
            </div>

            <div className="border-t border-zinc-800 px-4 py-3">
              <p className="text-xs text-zinc-500">
                Υποστηρίζονται εικόνες προφίλ. Μετά το upload ανοίγει popup για
                να ρυθμίσεις τη θέση της εικόνας.
              </p>
            </div>
          </div>

          {error ? (
            <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}
        </div>
      </div>

      <TrainerAvatarPositionModal
        open={showPositionModal}
        onClose={() => setShowPositionModal(false)}
        imageUrl={avatarUrl}
        form={form}
        setField={setField}
      />
    </>
  );
}