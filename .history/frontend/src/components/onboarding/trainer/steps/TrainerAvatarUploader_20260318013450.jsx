"use client";

import React, { useEffect, useMemo, useRef, useState, useCallback } from "react";
import {
  Image as ImageIcon,
  Upload,
  Camera,
  Settings2,
  MoreVertical,
  CheckCircle2,
  AlertTriangle,
  X,
  Loader2,
} from "lucide-react";
import { supabase } from "../../../../supabaseClient";
import TrainerAvatarPositionModal from "./TrainerAvatarPositionModal";
import {
  prepareCompressedUploadFile,
  FILE_INPUT_ACCEPT,
} from "../../../common/CompressedImageUploader";

const AVATAR_BUCKET = "avatars";
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

function withCacheBust(url) {
  if (!url) return "";
  return `${url}${url.includes("?") ? "&" : "?"}t=${Date.now()}`;
}

function getFileExtension(file) {
  const type = String(file?.type || "").toLowerCase();
  const name = String(file?.name || "").toLowerCase();

  if (type === "image/png") return "png";
  if (type === "image/webp") return "webp";
  if (type === "image/heic") return "heic";
  if (type === "image/heif") return "heif";
  if (type === "image/jpeg" || type === "image/jpg") return "jpg";

  const parts = name.split(".");
  return parts.length > 1 ? parts.pop() : "jpg";
}

function ensureFileObject(fileLike, fallbackName = "avatar.jpg", fallbackType = "image/jpeg") {
  if (typeof File !== "undefined" && fileLike instanceof File) return fileLike;

  if (typeof Blob !== "undefined" && fileLike instanceof Blob && typeof File !== "undefined") {
    return new File([fileLike], fallbackName, {
      type: fileLike.type || fallbackType,
    });
  }

  return fileLike;
}

function extractStoragePathFromPublicUrl(bucket, url) {
  if (!url) return "";

  try {
    const cleanUrl = String(url).split("?")[0];
    const parsed = new URL(cleanUrl);
    const marker = `/object/public/${bucket}/`;
    const idx = parsed.pathname.indexOf(marker);

    if (idx === -1) return "";
    return decodeURIComponent(parsed.pathname.slice(idx + marker.length));
  } catch {
    return "";
  }
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
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "group flex w-full items-center gap-3 rounded-[20px] border border-zinc-800 bg-zinc-950/90 px-4 py-3.5 text-left transition",
        "hover:border-zinc-700 hover:bg-zinc-900/90",
        "disabled:cursor-not-allowed disabled:opacity-60"
      )}
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-zinc-800 bg-black/40 text-zinc-200">
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
  uploading,
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

        {uploading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/45 backdrop-blur-[2px]">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/55 px-4 py-2 text-sm text-white">
              <Loader2 className="h-4 w-4 animate-spin" />
              Γίνεται αποθήκευση...
            </div>
          </div>
        ) : null}

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

  const updateField = useCallback(
    (key, value) => {
      if (typeof setField === "function") {
        setField(key)(fakeEvent(value));
      }
    },
    [setField]
  );

  const resetLocalAvatarFields = useCallback(() => {
    updateField("avatar_url", "");
    updateField("avatar_position_x", 50);
    updateField("avatar_position_y", 50);
    updateField("avatar_zoom", 1);
  }, [updateField]);

  const persistAvatarUrl = useCallback(async (userId, nextUrl) => {
    const { error: dbError } = await supabase
      .from("profiles")
      .update({
        avatar_url: nextUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", userId);

    if (dbError) throw dbError;
  }, []);

  const removeStoragePath = useCallback(async (path) => {
    if (!path) return;
    const { error: removeError } = await supabase.storage.from(AVATAR_BUCKET).remove([path]);
    if (removeError) throw removeError;
  }, []);

  const handleUploadClick = () => {
    setMenuOpen(false);
    galleryInputRef.current?.click();
  };

  const handleCameraClick = () => {
    setMenuOpen(false);
    cameraInputRef.current?.click();
  };

  const handleRemoveAvatar = async () => {
    setMenuOpen(false);
    setError("");
    setSuccess("");
    setShowPositionModal(false);

    if (!avatarUrl) {
      resetLocalAvatarFields();
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

      const currentPath = extractStoragePathFromPublicUrl(AVATAR_BUCKET, avatarUrl);

      if (currentPath) {
        await removeStoragePath(currentPath);
      }

      await persistAvatarUrl(user.id, null);
      resetLocalAvatarFields();
      setSuccess("Η φωτογραφία αφαιρέθηκε επιτυχώς.");
    } catch (err) {
      console.error("Avatar remove error:", err);
      setError(err?.message || "Κάτι πήγε λάθος στην αφαίρεση.");
    } finally {
      setUploading(false);
    }
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

    let uploadedPath = "";

    try {
      setUploading(true);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;
      if (!user?.id) throw new Error("Δεν βρέθηκε συνδεδεμένος χρήστης.");

      const previousAvatarUrl = avatarUrl;
      const previousPath = extractStoragePathFromPublicUrl(AVATAR_BUCKET, previousAvatarUrl);

      const prepared = await prepareCompressedUploadFile(file, {
        maxWidth: 1600,
        maxHeight: 1600,
        targetBytes: TARGET_IMAGE_BYTES,
        hardMaxBytes: TARGET_IMAGE_BYTES,
        outputType: "image/jpeg",
        fileNameBase: "avatar",
      });

      const preparedFile = prepared?.file || prepared || file;
      const uploadFile = ensureFileObject(preparedFile, "avatar.jpg", "image/jpeg");

      if (uploadFile.size > TARGET_IMAGE_BYTES) {
        setError("Ακόμα και μετά τη συμπίεση η εικόνα είναι πολύ μεγάλη.");
        return;
      }

      const ext = getFileExtension(uploadFile);
      const filePath = `${user.id}/avatar-${Date.now()}.${ext}`;
      uploadedPath = filePath;

      const { error: uploadError } = await supabase.storage
        .from(AVATAR_BUCKET)
        .upload(filePath, uploadFile, {
          cacheControl: "3600",
          upsert: true,
          contentType: uploadFile.type || "image/jpeg",
        });

      if (uploadError) throw uploadError;

      const { data: publicData } = supabase.storage
        .from(AVATAR_BUCKET)
        .getPublicUrl(filePath);

      const rawPublicUrl = publicData?.publicUrl || "";
      if (!rawPublicUrl) {
        throw new Error("Δεν δημιουργήθηκε public URL για τη φωτογραφία.");
      }

      const finalUrl = withCacheBust(rawPublicUrl);

      await persistAvatarUrl(user.id, finalUrl);

      if (previousPath && previousPath !== uploadedPath) {
        try {
          await removeStoragePath(previousPath);
        } catch (cleanupErr) {
          console.warn("Old avatar cleanup skipped:", cleanupErr);
        }
      }

      updateField("avatar_url", finalUrl);
      updateField("avatar_position_x", 50);
      updateField("avatar_position_y", 50);
      updateField("avatar_zoom", 1);

      setSuccess("Η φωτογραφία ανέβηκε και αποθηκεύτηκε επιτυχώς.");
      setShowPositionModal(true);
    } catch (err) {
      console.error("Avatar upload error:", err);

      if (uploadedPath) {
        try {
          await removeStoragePath(uploadedPath);
        } catch {
          // ignore rollback cleanup
        }
      }

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
        <div className="rounded-[28px] bg-[#09090b]/90 p-4 md:p-5">
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
              uploading={uploading}
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