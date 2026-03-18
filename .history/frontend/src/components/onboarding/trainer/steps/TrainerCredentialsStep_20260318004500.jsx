"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Image as ImageIcon,
  Upload,
  Camera,
  Settings2,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { supabase } from "../../../../supabaseClient";
import TrainerAvatarPositionModal from "./TrainerAvatarPositionModal";
import {
  prepareCompressedUploadFile,
  FILE_INPUT_ACCEPT,
} from "../../../common/CompressedImageUploader";

const MAX_FILE_BYTES = 15 * 1024 * 1024;
const TARGET_IMAGE_BYTES = 8 * 1024 * 1024;

const cn = (...classes) => classes.filter(Boolean).join(" ");

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

function MenuItem({
  icon: Icon,
  children,
  onClick,
  tone = "default",
  danger = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium transition",
        danger
          ? "text-red-300 hover:bg-red-950/40"
          : "text-white hover:bg-white/6",
        tone === "muted" && "text-zinc-300"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{children}</span>
    </button>
  );
}

function AvatarOptionsMenu({
  open,
  onToggle,
  onUpload,
  onCamera,
  onPosition,
  onRemove,
  menuRef,
}) {
  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={onToggle}
        className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-black/45 text-white backdrop-blur-md transition hover:border-white/20 hover:bg-black/55 md:h-11 md:w-11"
        aria-label="Άνοιγμα επιλογών φωτογραφίας"
      >
        <MoreVertical className="h-5 w-5" />
      </button>

      {open ? (
        <div className="absolute right-0 top-[calc(100%+8px)] z-20 w-[220px] overflow-hidden rounded-2xl border border-white/10 bg-zinc-950/95 p-2 shadow-[0_18px_50px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <MenuItem icon={Upload} onClick={onUpload}>
            Αλλαγή φωτογραφίας
          </MenuItem>

          <MenuItem icon={Camera} onClick={onCamera}>
            Τράβα φωτογραφία
          </MenuItem>

          <MenuItem icon={Settings2} onClick={onPosition}>
            Ρύθμιση θέσης
          </MenuItem>

          <div className="my-1 h-px bg-white/8" />

          <MenuItem icon={X} onClick={onRemove} danger>
            Αφαίρεση
          </MenuItem>
        </div>
      ) : null}
    </div>
  );
}

function PickerActionButton({
  icon: Icon,
  title,
  subtitle,
  onClick,
  disabled,
  primary = false,
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex w-full items-center gap-3 rounded-[20px] border px-4 py-3.5 text-left transition",
        primary
          ? "border-white/15 bg-white/[0.05] hover:border-white/25 hover:bg-white/[0.075]"
          : "border-zinc-800 bg-zinc-950/90 hover:border-zinc-700 hover:bg-zinc-900/90",
        "disabled:cursor-not-allowed disabled:opacity-60"
      )}
    >
      <div
        className={cn(
          "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border",
          primary
            ? "border-white/15 bg-white/[0.06] text-white"
            : "border-zinc-800 bg-black/40 text-zinc-200"
        )}
      >
        <Icon className="h-4.5 w-4.5" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{title}</p>
        {subtitle ? (
          <p className="mt-0.5 text-xs text-zinc-400">{subtitle}</p>
        ) : null}
      </div>
    </button>
  );
}

function EmptyPicker({ busy, onUploadClick, onCameraClick }) {
  return (
    <div className="rounded-[24px] border border-dashed border-zinc-700 bg-zinc-950/80 p-4 md:rounded-[28px] md:p-6">
      <div className="flex flex-col items-center justify-center text-center">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] md:h-16 md:w-16">
          <ImageIcon className="h-6 w-6 text-zinc-400 md:h-7 md:w-7" />
        </div>

        <h4 className="text-[15px] font-semibold text-white md:text-lg">
          Πρόσθεσε φωτογραφία προφίλ
        </h4>

        <p className="mt-2 max-w-[420px] px-2 text-sm leading-6 text-zinc-400">
          Επίλεξε εικόνα από τη συσκευή σου ή άνοιξε την κάμερα. Μετά το upload
          θα μπορείς να ρυθμίσεις και τη θέση της.
        </p>

        <div className="mt-5 w-full max-w-[460px] rounded-[22px] border border-white/8 bg-black/20 p-2">
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            <PickerActionButton
              icon={Upload}
              title={busy ? "Γίνεται επεξεργασία..." : "Επιλογή εικόνας"}
              subtitle="Από τη συσκευή σου"
              onClick={onUploadClick}
              disabled={busy}
              primary
            />

            <PickerActionButton
              icon={Camera}
              title="Τράβα φωτογραφία"
              subtitle="Άνοιγμα κάμερας"
              onClick={onCameraClick}
              disabled={busy}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadedAvatarPreview({
  avatarUrl,
  posX,
  posY,
  zoom,
  menuOpen,
  onToggleMenu,
  onUpload,
  onCamera,
  onPosition,
  onRemove,
  menuRef,
}) {
  return (
    <div className="overflow-hidden rounded-[28px] border border-zinc-800 bg-zinc-950/80">
      <div className="relative min-h-[280px] w-full overflow-hidden md:min-h-[340px]">
        <img
          src={avatarUrl}
          alt="Avatar preview"
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-200"
          style={{
            objectPosition: `${posX}% ${posY}%`,
            transform: `scale(${zoom})`,
            transformOrigin: "center center",
          }}
        />

        <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/5 to-transparent" />

        <div className="absolute left-3 top-3 inline-flex items-center gap-2 rounded-full border border-emerald-900/40 bg-emerald-950/40 px-3 py-1.5 text-xs font-medium text-emerald-300 backdrop-blur-md md:left-4 md:top-4">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Φωτογραφία έτοιμη
        </div>

        <div className="absolute right-3 top-3 md:right-4 md:top-4">
          <AvatarOptionsMenu
            open={menuOpen}
            onToggle={onToggleMenu}
            onUpload={onUpload}
            onCamera={onCamera}
            onPosition={onPosition}
            onRemove={onRemove}
            menuRef={menuRef}
          />
        </div>

        <div className="absolute inset-x-0 bottom-0 p-3 md:p-5">
          <div className="rounded-2xl border border-white/10 bg-black/35 px-4 py-3 backdrop-blur-md">
            <p className="text-sm font-medium text-white">
              Χρησιμοποίησε το μενού με τις 3 τελείες για αλλαγή, κάμερα ή
              ρύθμιση θέσης.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TrainerAvatarUploader({ form, setField }) {
  const galleryInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const menuRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPositionModal, setShowPositionModal] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const avatarUrl = form?.avatar_url || "";
  const posX = asNumber(form?.avatar_position_x, 50);
  const posY = asNumber(form?.avatar_position_y, 50);
  const zoom = useMemo(
    () => clamp(Number(form?.avatar_zoom || 1), 1, 2.6),
    [form?.avatar_zoom]
  );

  const acceptValue = useMemo(() => {
    const base = FILE_INPUT_ACCEPT || "image/*";
    return `${base},.heic,.heif`;
  }, []);

  useEffect(() => {
    if (!menuOpen) return;

    const handleClickOutside = (e) => {
      if (!menuRef.current?.contains(e.target)) {
        setMenuOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMenuOpen(false);
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen]);

  const updateField = (key, value) => {
    if (typeof setField === "function") {
      setField(key)(fakeEvent(value));
    }
  };

  const handleUploadClick = () => {
    setMenuOpen(false);
    galleryInputRef.current?.click();
  };

  const handleCameraClick = () => {
    setMenuOpen(false);
    cameraInputRef.current?.click();
  };

  const handleRemoveAvatar = () => {
    setMenuOpen(false);
    updateField("avatar_url", "");
    updateField("avatar_position_x", 50);
    updateField("avatar_position_y", 50);
    updateField("avatar_zoom", 1);
    setError("");
    setSuccess("");
  };

  const handleFileSelected = async (file, inputEl) => {
    if (!file) return;

    setError("");
    setSuccess("");
    setMenuOpen(false);

    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setError(
        "Υποστηρίζονται μόνο JPG, JPEG, PNG, WEBP, HEIC και HEIF εικόνες."
      );
      if (inputEl) inputEl.value = "";
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
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
        targetBytes: TARGET_IMAGE_BYTES,
        hardMaxBytes: TARGET_IMAGE_BYTES,
        outputType: "image/jpeg",
        fileNameBase: "avatar",
      });

      const uploadFile = prepared?.file || prepared || file;

      if (uploadFile.size > TARGET_IMAGE_BYTES) {
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

      setSuccess("Η φωτογραφία ανέβηκε επιτυχώς.");
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
      <div className="grid grid-cols-1 gap-4">
        <div className="rounded-[28px] border border-white/8 bg-[#09090b]/90 p-4 md:p-5">
          <input
            ref={galleryInputRef}
            type="file"
            accept={acceptValue}
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

          {!avatarUrl ? (
            <EmptyPicker
              busy={uploading}
              onUploadClick={handleUploadClick}
              onCameraClick={handleCameraClick}
            />
          ) : (
            <UploadedAvatarPreview
              avatarUrl={avatarUrl}
              posX={posX}
              posY={posY}
              zoom={zoom}
              menuOpen={menuOpen}
              onToggleMenu={() => setMenuOpen((s) => !s)}
              onUpload={handleUploadClick}
              onCamera={handleCameraClick}
              onPosition={() => {
                setMenuOpen(false);
                setShowPositionModal(true);
              }}
              onRemove={handleRemoveAvatar}
              menuRef={menuRef}
            />
          )}

          {success ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-emerald-900/50 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-300">
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{success}</span>
            </div>
          ) : null}

          {error ? (
            <div className="mt-4 flex items-start gap-2 rounded-2xl border border-red-900/50 bg-red-950/30 px-4 py-3 text-sm text-red-300">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <p className="mt-4 text-xs text-zinc-500">
            Υποστηρίζονται εικόνες JPG, PNG, WEBP, HEIC και HEIF. Οι εικόνες
            συμπιέζονται αυτόματα πριν αποθηκευτούν.
          </p>
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