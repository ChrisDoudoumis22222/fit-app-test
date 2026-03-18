"use client";

import React, { useRef, useState } from "react";
import {
  Upload,
  Settings2,
  Image as ImageIcon,
  X,
} from "lucide-react";
import { supabase } from "../../../../supabaseClient";
import { cn } from "../trainerOnboarding.utils";
import TrainerAvatarPositionModal from "./TrainerAvatarPositionModal";
import { prepareCompressedUploadFile } from "../../../common/CompressedImageUploader";

const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

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

function AvatarActions({
  avatarUrl,
  uploading,
  onUploadClick,
  onOpenPosition,
  onRemove,
}) {
  const baseBtn =
    "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition";

  return (
    <div className="flex flex-wrap items-center gap-2 md:justify-end">
      <button
        type="button"
        onClick={onUploadClick}
        disabled={uploading}
        className={cn(
          baseBtn,
          "border-zinc-700 bg-zinc-950 text-white hover:border-zinc-600",
          uploading && "cursor-not-allowed opacity-60"
        )}
      >
        <Upload className="h-4 w-4" />
        {uploading ? "Γίνεται upload..." : "Επιλογή εικόνας"}
      </button>

      <button
        type="button"
        onClick={onOpenPosition}
        disabled={!avatarUrl}
        className={cn(
          baseBtn,
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
          onClick={onRemove}
          className={cn(
            baseBtn,
            "border-red-500/40 bg-transparent text-red-300 hover:border-red-400/60 hover:bg-red-500/10"
          )}
        >
          <X className="h-4 w-4" />
          Αφαίρεση
        </button>
      ) : null}
    </div>
  );
}

function AvatarPreview({
  avatarUrl,
  posX,
  posY,
  zoom,
  onClick,
  onKeyDown,
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={onKeyDown}
      aria-label="Άνοιγμα επιλογής εικόνας avatar"
      className={cn(
        "relative min-h-[280px] w-full overflow-hidden md:min-h-[360px]",
        "cursor-pointer outline-none transition",
        "hover:opacity-95 focus-visible:ring-2 focus-visible:ring-white/30"
      )}
    >
      {avatarUrl ? (
        <>
          <div className="absolute inset-0 overflow-hidden">
            <img
              src={avatarUrl}
              alt="Trainer avatar preview"
              className="absolute inset-0 h-full w-full object-cover transition-transform duration-200"
              style={{
                objectPosition: `${posX}% ${posY}%`,
                transform: `scale(${zoom})`,
                transformOrigin: "center center",
              }}
            />
          </div>

          <div className="pointer-events-none absolute right-4 top-4 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-xs font-medium text-white backdrop-blur-sm">
            Πάτησε για επιλογή εικόνας
          </div>
        </>
      ) : (
        <div className="flex min-h-[280px] w-full flex-col items-center justify-center gap-4 text-center md:min-h-[360px]">
          <ImageIcon className="h-12 w-12 text-zinc-600" />

          <div>
            <p className="text-base font-semibold text-white">
              Δεν έχει ανέβει φωτογραφία προφίλ
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Πάτησε εδώ ή το κουμπί για να επιλέξεις εικόνα
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/40 to-transparent" />
    </div>
  );
}

export default function TrainerAvatarUploader({ form, setField }) {
  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [showPositionModal, setShowPositionModal] = useState(false);

  const avatarUrl = form?.avatar_url || "";
  const posX = asNumber(form?.avatar_position_x, 50);
  const posY = asNumber(form?.avatar_position_y, 50);
  const zoom = clamp(Number(form?.avatar_zoom || 1), 1, 2.6);

  const updateField = (key, value) => {
    if (typeof setField === "function") {
      setField(key)(fakeEvent(value));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handlePreviewKeyDown = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleUploadClick();
    }
  };

  const handleRemoveAvatar = () => {
    updateField("avatar_url", "");
    updateField("avatar_position_x", 50);
    updateField("avatar_position_y", 50);
    updateField("avatar_zoom", 1);
    setError("");
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError(
        "Υποστηρίζονται μόνο JPG, JPEG, PNG, WEBP, HEIC και HEIF εικόνες."
      );
      e.target.value = "";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("Η αρχική εικόνα είναι πολύ μεγάλη. Δοκίμασε έως 15MB.");
      e.target.value = "";
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

      const prepared = await prepareCompressedUploadFile(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        targetBytes: 8 * 1024 * 1024,
        hardMaxBytes: 8 * 1024 * 1024,
        outputType: "image/jpeg",
        fileNameBase: "avatar",
      });

      const uploadFile = prepared?.file || file;

      if (uploadFile.size > 8 * 1024 * 1024) {
        setError("Ακόμα και μετά τη συμπίεση η εικόνα είναι πολύ μεγάλη.");
        return;
      }

      const safeName = (uploadFile.name || "avatar.jpg").replace(/\s+/g, "-");
      const ext = safeName.split(".").pop() || "jpg";
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, uploadFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: uploadFile.type || "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from("avatars")
        .getPublicUrl(filePath);

      const publicUrl = publicData?.publicUrl || "";

      updateField("avatar_url", publicUrl);
      updateField("avatar_position_x", 50);
      updateField("avatar_position_y", 50);
      updateField("avatar_zoom", 1);

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
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-zinc-400" />
              <h4 className="text-base font-semibold text-white">
                Φώτο προφίλ
              </h4>
            </div>

            <p className="mt-2 text-sm text-zinc-400">
              Ανέβασε μία καθαρή φωτογραφία προφίλ
            </p>
          </div>

          <AvatarActions
            avatarUrl={avatarUrl}
            uploading={uploading}
            onUploadClick={handleUploadClick}
            onOpenPosition={() => setShowPositionModal(true)}
            onRemove={handleRemoveAvatar}
          />

          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <AvatarPreview
          avatarUrl={avatarUrl}
          posX={posX}
          posY={posY}
          zoom={zoom}
          onClick={handleUploadClick}
          onKeyDown={handlePreviewKeyDown}
        />

        {error ? <p className="mt-3 text-sm text-red-300">{error}</p> : null}
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