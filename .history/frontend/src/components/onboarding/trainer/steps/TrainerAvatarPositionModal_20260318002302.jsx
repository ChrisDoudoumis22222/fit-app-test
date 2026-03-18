"use client";

import React, { useRef, useState } from "react";
import {
  Upload,
  Camera,
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

function ActionButton({
  icon: Icon,
  children,
  onClick,
  disabled = false,
  variant = "default",
  className = "",
}) {
  const styles = {
    default:
      "border-zinc-700 bg-zinc-950 text-white hover:border-zinc-600 hover:bg-zinc-900",
    subtle:
      "border-zinc-700 bg-zinc-950 text-white hover:border-zinc-600 hover:bg-zinc-900",
    danger:
      "border-red-500/40 bg-transparent text-red-300 hover:border-red-400/60 hover:bg-red-500/10",
    disabled:
      "cursor-not-allowed border-zinc-800 bg-zinc-950 text-zinc-500 opacity-60",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-2xl border px-4 text-sm font-semibold transition",
        disabled ? styles.disabled : styles[variant],
        className
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="truncate">{children}</span>
    </button>
  );
}

function AvatarActions({
  avatarUrl,
  uploading,
  onUploadClick,
  onCameraClick,
  onOpenPosition,
  onRemove,
}) {
  return (
    <>
      {/* mobile */}
      <div className="grid grid-cols-2 gap-2 md:hidden">
        <ActionButton
          icon={Upload}
          onClick={onUploadClick}
          disabled={uploading}
          className="w-full"
        >
          {uploading ? "Upload..." : "Επιλογή εικόνας"}
        </ActionButton>

        <ActionButton
          icon={Camera}
          onClick={onCameraClick}
          disabled={uploading}
          className="w-full"
        >
          Φωτογραφία
        </ActionButton>

        <ActionButton
          icon={Settings2}
          onClick={onOpenPosition}
          disabled={!avatarUrl}
          className="col-span-2 w-full"
        >
          Ρύθμιση θέσης
        </ActionButton>

        {avatarUrl ? (
          <ActionButton
            icon={X}
            onClick={onRemove}
            variant="danger"
            className="col-span-2 w-full"
          >
            Αφαίρεση
          </ActionButton>
        ) : null}
      </div>

      {/* desktop */}
      <div className="hidden flex-wrap items-center gap-2 md:flex md:justify-end">
        <ActionButton
          icon={Upload}
          onClick={onUploadClick}
          disabled={uploading}
        >
          {uploading ? "Γίνεται upload..." : "Επιλογή εικόνας"}
        </ActionButton>

        <ActionButton
          icon={Camera}
          onClick={onCameraClick}
          disabled={uploading}
        >
          Λήψη φωτογραφίας
        </ActionButton>

        <ActionButton
          icon={Settings2}
          onClick={onOpenPosition}
          disabled={!avatarUrl}
        >
          Ρύθμιση θέσης
        </ActionButton>

        {avatarUrl ? (
          <ActionButton icon={X} onClick={onRemove} variant="danger">
            Αφαίρεση
          </ActionButton>
        ) : null}
      </div>
    </>
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
        "relative min-h-[280px] w-full overflow-hidden rounded-[24px] md:min-h-[360px]",
        "cursor-pointer border border-white/10 bg-zinc-950/40 outline-none transition",
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

          <div className="pointer-events-none absolute right-3 top-3 rounded-full border border-white/15 bg-black/45 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm md:right-4 md:top-4 md:text-xs">
            Πάτησε για αλλαγή
          </div>
        </>
      ) : (
        <div className="flex min-h-[280px] w-full flex-col items-center justify-center gap-4 px-5 text-center md:min-h-[360px]">
          <ImageIcon className="h-11 w-11 text-zinc-600 md:h-12 md:w-12" />

          <div>
            <p className="text-base font-semibold text-white">
              Δεν έχει ανέβει φωτογραφία προφίλ
            </p>
            <p className="mt-1 text-sm text-zinc-500">
              Πάτησε εδώ για εικόνα ή φωτογραφία
            </p>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/40 to-transparent md:h-28" />
    </div>
  );
}

export default function TrainerAvatarUploader({ form, setField }) {
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);

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
    galleryInputRef.current?.click();
  };

  const handleCameraClick = () => {
    cameraInputRef.current?.click();
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

  const handleFileSelected = async (file, inputEl) => {
    if (!file) return;

    setError("");

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError(
        "Υποστηρίζονται μόνο JPG, JPEG, PNG, WEBP, HEIC και HEIF εικόνες."
      );
      if (inputEl) inputEl.value = "";
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setError("Η αρχική εικόνα είναι πολύ μεγάλη. Δοκίμασε έως 15MB.");
      if (inputEl) inputEl.value = "";
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
      if (inputEl) inputEl.value = "";
    }
  };

  const handleGalleryChange = async (e) => {
    await handleFileSelected(e.target.files?.[0], e.target);
  };

  const handleCameraChange = async (e) => {
    await handleFileSelected(e.target.files?.[0], e.target);
  };

  return (
    <>
      <div className="-mx-4 px-4 md:mx-0 md:px-0">
        <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <ImageIcon className="h-4 w-4 text-zinc-400" />
              <h4 className="text-base font-semibold text-white">
                Φώτο προφίλ
              </h4>
            </div>

            {/* removed on mobile like your pic 2 */}
            <p className="mt-2 hidden text-sm text-zinc-400 md:block">
              Ανέβασε μία καθαρή φωτογραφία προφίλ
            </p>
          </div>

          <AvatarActions
            avatarUrl={avatarUrl}
            uploading={uploading}
            onUploadClick={handleUploadClick}
            onCameraClick={handleCameraClick}
            onOpenPosition={() => setShowPositionModal(true)}
            onRemove={handleRemoveAvatar}
          />

          <input
            ref={galleryInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif"
            onChange={handleGalleryChange}
            className="hidden"
          />

          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="user"
            onChange={handleCameraChange}
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