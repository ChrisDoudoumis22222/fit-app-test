"use client";

import React, { useMemo, useRef, useState } from "react";
import { Camera, Upload, Settings2, Image as ImageIcon } from "lucide-react";
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

      if (
        form?.avatar_position_x === undefined ||
        form?.avatar_position_x === null ||
        form?.avatar_position_x === ""
      ) {
        updateField("avatar_position_x", 50);
      }

      if (
        form?.avatar_position_y === undefined ||
        form?.avatar_position_y === null ||
        form?.avatar_position_y === ""
      ) {
        updateField("avatar_position_y", 50);
      }

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
          <div className="mb-2 flex items-center gap-2">
            <Camera className="h-4 w-4 text-white/80" />
            <h3 className="text-sm font-semibold text-white">Avatar προφίλ</h3>
          </div>

          <p className="mb-4 text-sm text-zinc-400">
            Ανέβασε φωτογραφία trainer και μετά ρύθμισε τη θέση της μέσα από popup.
          </p>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
            <div className="space-y-3">
              <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Trainer avatar preview"
                    className="h-full w-full object-cover"
                    style={{
                      objectPosition: `${posX}% ${posY}%`,
                    }}
                  />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-3 text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900">
                      <ImageIcon className="h-7 w-7 text-zinc-500" />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-white">
                        Δεν έχει ανέβει avatar
                      </p>
                      <p className="mt-1 text-xs text-zinc-500">
                        Πρόσθεσε μία καθαρή φωτογραφία προφίλ
                      </p>
                    </div>
                  </div>
                )}

                <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/35 to-transparent" />
              </div>
            </div>

            <div className="space-y-3">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <h4 className="mb-2 text-sm font-semibold text-white">
                  Avatar actions
                </h4>
                <p className="mb-4 text-sm text-zinc-400">
                  Κάνε upload και μετά άνοιξε το popup για να ρυθμίσεις τη θέση της εικόνας.
                </p>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={handleUploadClick}
                    disabled={uploading}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all",
                      "border-zinc-800 bg-zinc-900 text-white hover:border-zinc-700 hover:bg-zinc-800",
                      uploading && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <Upload className="h-4 w-4" />
                    {uploading ? "Γίνεται upload..." : "Ανέβασε εικόνα"}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowPositionModal(true)}
                    disabled={!avatarUrl}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium transition-all",
                      avatarUrl
                        ? "border-white bg-white text-black hover:opacity-90"
                        : "cursor-not-allowed border-zinc-800 bg-zinc-900 text-zinc-500 opacity-60"
                    )}
                  >
                    <Settings2 className="h-4 w-4" />
                    Ρύθμιση θέσης
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <h4 className="mb-2 text-sm font-semibold text-white">
                  Current position
                </h4>

                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3">
                    <div className="text-zinc-500">Οριζόντια</div>
                    <div className="mt-1 font-semibold text-white">{posX}%</div>
                  </div>

                  <div className="rounded-xl border border-zinc-800 bg-zinc-900 px-3 py-3">
                    <div className="text-zinc-500">Κάθετη</div>
                    <div className="mt-1 font-semibold text-white">{posY}%</div>
                  </div>
                </div>
              </div>

              {error ? (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {error}
                </div>
              ) : null}
            </div>
          </div>
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