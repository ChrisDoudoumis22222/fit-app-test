"use client";

import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  Settings,
  CheckCircle2,
  AlertTriangle,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function toCssContent(value) {
  return `"${String(value ?? "")
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')}"`;
}

const PROFILE_SETTINGS_TOAST_EVENT = "profile-settings:toast";
const PROFILE_SETTINGS_SAVING_EVENT = "profile-settings:saving";

export function emitProfileSettingsToast(
  text,
  type = "success",
  options = {}
) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(PROFILE_SETTINGS_TOAST_EVENT, {
      detail: {
        text,
        type,
        markClean:
          options.markClean ??
          (type === "success" || type === "info" ? true : false),
      },
    })
  );
}

export function emitProfileSettingsSaving(isSaving = true) {
  if (typeof window === "undefined") return;

  window.dispatchEvent(
    new CustomEvent(PROFILE_SETTINGS_SAVING_EVENT, {
      detail: { isSaving: Boolean(isSaving) },
    })
  );
}

function PageToast({ open, text, type = "success", onClose }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => onClose?.(), 2600);
    return () => clearTimeout(t);
  }, [open, onClose]);

  if (!mounted) return null;

  const isWarning = type === "warning";
  const bg = isWarning
    ? "border-rose-400/25 bg-rose-500/15"
    : "border-emerald-400/25 bg-emerald-500/15";
  const iconWrap = isWarning ? "bg-rose-500/20" : "bg-emerald-500/20";
  const iconColor = isWarning ? "text-rose-300" : "text-emerald-300";
  const title = isWarning ? "Κάτι πήγε λάθος" : "Η ενημέρωση ολοκληρώθηκε";
  const Icon = isWarning ? AlertTriangle : CheckCircle2;
  const progressColor = isWarning ? "bg-rose-300/80" : "bg-emerald-300/80";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          initial={{ opacity: 0, x: 40, y: -10, scale: 0.985 }}
          animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
          exit={{ opacity: 0, x: 28, y: -8, scale: 0.985 }}
          transition={{ duration: 0.22, ease: "easeOut" }}
          className="
            pointer-events-none fixed right-3 top-4 z-[99999]
            w-[calc(100vw-24px)]
            sm:right-5 sm:top-5 sm:w-[380px]
          "
        >
          <div
            className={cn(
              "pointer-events-auto relative overflow-hidden rounded-[22px] border backdrop-blur-2xl",
              "shadow-[0_18px_50px_rgba(0,0,0,0.35)]",
              bg
            )}
          >
            <div className="pointer-events-none absolute inset-0 bg-white/[0.06]" />

            <div className="relative flex items-start gap-3 px-4 py-3.5">
              <div
                className={cn(
                  "mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
                  iconWrap
                )}
              >
                <Icon className={cn("h-5 w-5", iconColor)} />
              </div>

              <div className="min-w-0 flex-1 pr-2">
                <div className="text-[13px] font-semibold tracking-[-0.01em] text-white">
                  {title}
                </div>
                <div className="mt-0.5 text-sm leading-5 text-white/80">
                  {text}
                </div>
              </div>

              <button
                type="button"
                onClick={() => onClose?.()}
                className="rounded-full p-1.5 text-white/55 transition hover:bg-white/10 hover:text-white"
                aria-label="Κλείσιμο"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <motion.div
              key={`${type}-${text}`}
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 2.5, ease: "linear" }}
              className={cn("h-[3px]", progressColor)}
            />
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    document.body
  );
}

function getElementKey(el, index) {
  return (
    el.name ||
    el.id ||
    el.getAttribute("data-field-key") ||
    `field-${index}`
  );
}

function serializeForm(form) {
  if (!form) return "[]";

  const elements = Array.from(form.querySelectorAll("input, textarea, select"));
  const pairs = [];

  elements.forEach((el, index) => {
    if (!el || el.disabled) return;

    const type = String(el.type || "").toLowerCase();

    if (
      type === "submit" ||
      type === "button" ||
      type === "reset" ||
      type === "image" ||
      type === "file" ||
      type === "hidden"
    ) {
      return;
    }

    const key = getElementKey(el, index);

    if (type === "checkbox") {
      pairs.push([key, el.checked ? "1" : "0"]);
      return;
    }

    if (type === "radio") {
      if (el.checked) pairs.push([key, String(el.value ?? "")]);
      return;
    }

    pairs.push([key, String(el.value ?? "")]);
  });

  pairs.sort((a, b) => {
    const left = `${a[0]}:${a[1]}`;
    const right = `${b[0]}:${b[1]}`;
    return left.localeCompare(right);
  });

  return JSON.stringify(pairs);
}

export default function ProfileSettingsSection({
  children,
  sectionTitle = "ΒΑΣΙΚΑ ΣΤΟΙΧΕΙΑ",
  fieldLabels = ["ΟΝΟΜΑ ΧΡΗΣΤΗ", "ΤΗΛΕΦΩΝΟ", "EMAIL"],
  title = "Επεξεργασία Προφίλ",
  description = "Διαχειρίσου τα προσωπικά σου στοιχεία.",
}) {
  const rootRef = useRef(null);
  const baselineRef = useRef(new WeakMap());
  const rafRef = useRef(null);

  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const [toastOpen, setToastOpen] = useState(false);
  const [toastText, setToastText] = useState("");
  const [toastType, setToastType] = useState("success");

  const cssVars = useMemo(
    () => ({
      "--field-label-1": toCssContent(fieldLabels[0] || ""),
      "--field-label-2": toCssContent(fieldLabels[1] || ""),
      "--field-label-3": toCssContent(fieldLabels[2] || ""),
      "--field-label-4": toCssContent(fieldLabels[3] || ""),
      "--field-label-5": toCssContent(fieldLabels[4] || ""),
      "--field-label-6": toCssContent(fieldLabels[5] || ""),
    }),
    [fieldLabels]
  );

  const showToast = useCallback((text, type = "success") => {
    setToastText(text);
    setToastType(type);
    setToastOpen(false);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setToastOpen(true);
      });
    });
  }, []);

  const getForms = useCallback(() => {
    if (!rootRef.current) return [];
    return Array.from(rootRef.current.querySelectorAll("form"));
  }, []);

  const ensureBaselines = useCallback(() => {
    const forms = getForms();

    forms.forEach((form) => {
      if (!baselineRef.current.has(form)) {
        baselineRef.current.set(form, serializeForm(form));
      }
    });

    if (!forms.length) setIsDirty(false);
  }, [getForms]);

  const captureCurrentAsBaseline = useCallback(() => {
    const forms = getForms();

    forms.forEach((form) => {
      baselineRef.current.set(form, serializeForm(form));
    });

    setIsDirty(false);
  }, [getForms]);

  const evaluateDirty = useCallback(() => {
    const forms = getForms();

    if (!forms.length) {
      setIsDirty(false);
      return;
    }

    const dirty = forms.some((form) => {
      const baseline = baselineRef.current.get(form);

      if (typeof baseline !== "string") {
        baselineRef.current.set(form, serializeForm(form));
        return false;
      }

      return baseline !== serializeForm(form);
    });

    setIsDirty(dirty);
  }, [getForms]);

  const scheduleDirtyCheck = useCallback(() => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);

    rafRef.current = requestAnimationFrame(() => {
      evaluateDirty();
    });
  }, [evaluateDirty]);

  useEffect(() => {
    const timer = setTimeout(() => {
      ensureBaselines();
      evaluateDirty();
    }, 80);

    return () => clearTimeout(timer);
  }, [ensureBaselines, evaluateDirty]);

  useEffect(() => {
    if (!rootRef.current) return;

    const observer = new MutationObserver(() => {
      ensureBaselines();
      scheduleDirtyCheck();
    });

    observer.observe(rootRef.current, {
      childList: true,
      subtree: true,
    });

    return () => observer.disconnect();
  }, [ensureBaselines, scheduleDirtyCheck]);

  useEffect(() => {
    const onToast = (event) => {
      const detail = event?.detail || {};
      const text = detail.text || "Η ενέργεια ολοκληρώθηκε.";
      const type = detail.type || "success";

      showToast(text, type);

      setIsSaving(false);

      if (detail.markClean === true) {
        captureCurrentAsBaseline();
      }
    };

    const onSaving = (event) => {
      setIsSaving(Boolean(event?.detail?.isSaving));
    };

    window.addEventListener(PROFILE_SETTINGS_TOAST_EVENT, onToast);
    window.addEventListener(PROFILE_SETTINGS_SAVING_EVENT, onSaving);

    return () => {
      window.removeEventListener(PROFILE_SETTINGS_TOAST_EVENT, onToast);
      window.removeEventListener(PROFILE_SETTINGS_SAVING_EVENT, onSaving);
    };
  }, [captureCurrentAsBaseline, showToast]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const handleFieldInteraction = useCallback(() => {
    ensureBaselines();
    scheduleDirtyCheck();
  }, [ensureBaselines, scheduleDirtyCheck]);

  const handleSubmitCapture = useCallback(
    (e) => {
      if (isSaving) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (!isDirty) {
        e.preventDefault();
        e.stopPropagation();
        showToast("Δεν υπάρχουν αλλαγές για αποθήκευση.", "warning");
        return;
      }

      setIsSaving(true);
    },
    [isDirty, isSaving, showToast]
  );

  const handleClickCapture = useCallback(
    (e) => {
      if (!(e.target instanceof Element)) return;

      const submitTrigger = e.target.closest(
        'button[type="submit"], input[type="submit"]'
      );

      if (!submitTrigger) return;

      if (isSaving) {
        e.preventDefault();
        e.stopPropagation();
        return;
      }

      if (!isDirty) {
        e.preventDefault();
        e.stopPropagation();
        showToast("Δεν υπάρχουν αλλαγές για αποθήκευση.", "warning");
      }
    },
    [isDirty, isSaving, showToast]
  );

  return (
    <>
      <motion.div
        ref={rootRef}
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="w-full pb-8 sm:pb-0"
        onInputCapture={handleFieldInteraction}
        onChangeCapture={handleFieldInteraction}
        onClickCapture={handleClickCapture}
        onSubmitCapture={handleSubmitCapture}
      >
        <div
          style={cssVars}
          data-pss-dirty={isDirty ? "true" : "false"}
          data-pss-saving={isSaving ? "true" : "false"}
          className={cn(
            "profile-settings-shell relative overflow-hidden",
            "-mx-4 rounded-none border-y-0 bg-transparent shadow-none ring-0 backdrop-blur-0",
            "sm:mx-0 sm:rounded-3xl sm:border sm:border-white/10 sm:bg-black",
            "sm:shadow-[0_18px_60px_rgba(0,0,0,0.45)] sm:backdrop-blur-[10px]",
            "lg:rounded-[32px]"
          )}
        >
          <style>{`
            .profile-settings-shell form {
              display: grid;
              gap: 18px;
              width: 100%;
            }

            .profile-settings-shell .form-field {
              display: grid;
              gap: 8px;
              width: 100%;
            }

            .profile-settings-shell label,
            .profile-settings-shell .field-label,
            .profile-settings-shell .section-eyebrow {
              display: block;
              color: rgba(255,255,255,0.42);
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 0.16em;
              text-transform: uppercase;
              line-height: 1.2;
            }

            .profile-settings-shell form > div {
              display: grid;
              gap: 8px;
              width: 100%;
              margin-bottom: 2px;
            }

            .profile-settings-shell form > div:nth-of-type(1)::before,
            .profile-settings-shell form > div:nth-of-type(2)::before,
            .profile-settings-shell form > div:nth-of-type(3)::before,
            .profile-settings-shell form > div:nth-of-type(4)::before,
            .profile-settings-shell form > div:nth-of-type(5)::before,
            .profile-settings-shell form > div:nth-of-type(6)::before {
              display: block;
              color: rgba(255,255,255,0.42);
              font-size: 11px;
              font-weight: 600;
              letter-spacing: 0.16em;
              text-transform: uppercase;
              line-height: 1.2;
              margin-bottom: 6px;
            }

            .profile-settings-shell form > div:nth-of-type(1)::before {
              content: var(--field-label-1, "");
            }

            .profile-settings-shell form > div:nth-of-type(2)::before {
              content: var(--field-label-2, "");
            }

            .profile-settings-shell form > div:nth-of-type(3)::before {
              content: var(--field-label-3, "");
            }

            .profile-settings-shell form > div:nth-of-type(4)::before {
              content: var(--field-label-4, "");
            }

            .profile-settings-shell form > div:nth-of-type(5)::before {
              content: var(--field-label-5, "");
            }

            .profile-settings-shell form > div:nth-of-type(6)::before {
              content: var(--field-label-6, "");
            }

            .profile-settings-shell input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
            .profile-settings-shell textarea,
            .profile-settings-shell select {
              width: 100%;
              min-height: 56px;
              border-radius: 20px;
              border: 1px solid rgba(255,255,255,0.10);
              background: rgba(255,255,255,0.045);
              color: white;
              padding: 14px 16px;
              outline: none;
              box-shadow: 0 8px 22px rgba(0,0,0,0.18);
              transition:
                background .18s ease,
                border-color .18s ease,
                box-shadow .18s ease,
                transform .18s ease;
            }

            .profile-settings-shell input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"])::placeholder,
            .profile-settings-shell textarea::placeholder {
              color: rgba(255,255,255,0.28);
            }

            .profile-settings-shell input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]):focus,
            .profile-settings-shell textarea:focus,
            .profile-settings-shell select:focus {
              background: rgba(255,255,255,0.06);
              border-color: rgba(255,255,255,0.16);
              box-shadow:
                0 0 0 3px rgba(255,255,255,0.10),
                0 12px 28px rgba(0,0,0,0.22);
            }

            .profile-settings-shell textarea {
              min-height: 120px;
              resize: vertical;
            }

            .profile-settings-shell button[type="submit"],
            .profile-settings-shell input[type="submit"] {
              position: relative;
              min-height: 56px;
              border-radius: 18px;
              border: 1px solid rgba(255,255,255,0.04);
              background: white;
              color: rgb(9 9 11);
              padding: 14px 18px;
              font-size: 0.95rem;
              font-weight: 700;
              letter-spacing: -0.01em;
              box-shadow:
                0 14px 28px rgba(0,0,0,0.20),
                inset 0 1px 0 rgba(255,255,255,0.75);
              transition:
                transform .18s ease,
                box-shadow .18s ease,
                background .18s ease,
                opacity .18s ease,
                color .18s ease;
            }

            .profile-settings-shell[data-pss-dirty="true"] button[type="submit"]:hover:not(:disabled),
            .profile-settings-shell[data-pss-dirty="true"] input[type="submit"]:hover:not(:disabled) {
              background: rgba(255,255,255,0.92);
              transform: translateY(-1px);
              box-shadow:
                0 18px 32px rgba(0,0,0,0.24),
                inset 0 1px 0 rgba(255,255,255,0.72);
            }

            .profile-settings-shell button[type="submit"]:active:not(:disabled),
            .profile-settings-shell input[type="submit"]:active:not(:disabled) {
              transform: translateY(0);
            }

            .profile-settings-shell[data-pss-dirty="false"] button[type="submit"],
            .profile-settings-shell[data-pss-dirty="false"] input[type="submit"] {
              cursor: not-allowed;
              opacity: 0.65;
              transform: none !important;
              background: rgba(255,255,255,0.10);
              color: rgba(255,255,255,0.55);
              border-color: rgba(255,255,255,0.08);
              box-shadow: none;
            }

            .profile-settings-shell button[type="submit"]:disabled,
            .profile-settings-shell input[type="submit"]:disabled {
              cursor: not-allowed;
              opacity: 0.6;
              transform: none !important;
              background: rgba(255,255,255,0.10);
              color: rgba(255,255,255,0.55);
              border-color: rgba(255,255,255,0.08);
              box-shadow: none;
            }

            .profile-settings-shell[data-pss-saving="true"] button[type="submit"],
            .profile-settings-shell[data-pss-saving="true"] input[type="submit"] {
              pointer-events: none;
              color: transparent !important;
            }

            .profile-settings-shell[data-pss-saving="true"] button[type="submit"]::after,
            .profile-settings-shell[data-pss-saving="true"] input[type="submit"]::after {
              content: "Αποθήκευση...";
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%);
              color: rgb(9 9 11);
              font-size: 0.95rem;
              font-weight: 700;
              white-space: nowrap;
            }

            .profile-settings-shell[data-pss-saving="true"] button[type="submit"]::before,
            .profile-settings-shell[data-pss-saving="true"] input[type="submit"]::before {
              content: "";
              position: absolute;
              top: 50%;
              left: calc(50% - 64px);
              width: 16px;
              height: 16px;
              margin-top: -8px;
              border-radius: 999px;
              border: 2px solid rgba(9,9,11,0.18);
              border-top-color: rgba(9,9,11,0.9);
              animation: pss-spin .7s linear infinite;
            }

            .profile-settings-shell .error,
            .profile-settings-shell .text-red-500,
            .profile-settings-shell .text-red-400,
            .profile-settings-shell .text-rose-400,
            .profile-settings-shell .text-rose-500 {
              color: rgb(251 113 133) !important;
            }

            .profile-settings-shell .success,
            .profile-settings-shell .text-green-500,
            .profile-settings-shell .text-green-400,
            .profile-settings-shell .text-emerald-400,
            .profile-settings-shell .text-emerald-500 {
              color: rgb(74 222 128) !important;
            }

            @keyframes pss-spin {
              to {
                transform: rotate(360deg);
              }
            }

            @media (min-width: 640px) {
              .profile-settings-shell form {
                gap: 20px;
              }

              .profile-settings-shell input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
              .profile-settings-shell textarea,
              .profile-settings-shell select,
              .profile-settings-shell button[type="submit"],
              .profile-settings-shell input[type="submit"] {
                min-height: 58px;
              }
            }

            @media (min-width: 1024px) {
              .profile-settings-shell form {
                gap: 22px;
              }

              .profile-settings-shell input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
              .profile-settings-shell textarea,
              .profile-settings-shell select,
              .profile-settings-shell button[type="submit"],
              .profile-settings-shell input[type="submit"] {
                min-height: 60px;
              }
            }

            @media (max-width: 640px) {
              .profile-settings-shell input:not([type="checkbox"]):not([type="radio"]):not([type="hidden"]),
              .profile-settings-shell textarea,
              .profile-settings-shell select,
              .profile-settings-shell button[type="submit"],
              .profile-settings-shell input[type="submit"] {
                min-height: 56px;
                border-radius: 16px;
                padding-top: 14px;
                padding-bottom: 14px;
                padding-left: 14px;
                padding-right: 14px;
              }

              .profile-settings-shell[data-pss-saving="true"] button[type="submit"]::before,
              .profile-settings-shell[data-pss-saving="true"] input[type="submit"]::before {
                left: calc(50% - 58px);
              }
            }
          `}</style>

          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent" />
          <div className="pointer-events-none absolute -top-24 -right-24 hidden h-72 w-72 rounded-full bg-white/[0.04] blur-3xl lg:block" />
          <div className="pointer-events-none absolute -bottom-28 -left-28 hidden h-80 w-80 rounded-full bg-white/[0.03] blur-3xl lg:block" />

          <div className="relative px-5 py-6 sm:px-6 sm:py-7 lg:px-10 xl:px-12">
            <div className="flex items-start gap-4">
              <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/5 text-white/85 sm:h-12 sm:w-12">
                <Settings className="h-5 w-5" />
              </div>

              <div className="min-w-0">
                <h3 className="text-xl font-semibold tracking-tight text-white sm:text-2xl">
                  {title}
                </h3>
                <p className="mt-1 max-w-2xl text-sm text-white/55 sm:text-base">
                  {description}
                </p>
              </div>
            </div>
          </div>

          <div className="relative px-5 pb-14 pt-7 sm:px-6 sm:pb-8 sm:pt-7 lg:px-10 lg:pb-10 xl:px-12">
            <div className="mb-4 sm:mb-5">
              <span className="section-eyebrow">{sectionTitle}</span>
            </div>

            {children}
          </div>
        </div>
      </motion.div>

      <PageToast
        open={toastOpen}
        text={toastText}
        type={toastType}
        onClose={() => setToastOpen(false)}
      />
    </>
  );
}