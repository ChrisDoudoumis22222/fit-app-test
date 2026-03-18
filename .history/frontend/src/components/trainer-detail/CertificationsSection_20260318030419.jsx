"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  UserRound,
  Image as ImageIcon,
  GraduationCap,
  Shield,
  AlertCircle,
} from "lucide-react";
import { supabase } from "../../supabaseClient";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function hasValue(value) {
  return typeof value === "string" ? value.trim().length > 0 : Boolean(value);
}

export default function TrainerDashboardTabs({ section }) {
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [missingAvatar, setMissingAvatar] = useState(false);
  const [missingDiploma, setMissingDiploma] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadProfileStatus() {
      try {
        setLoadingStatus(true);

        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError) throw authError;

        if (!user?.id) {
          if (!mounted) return;
          setMissingAvatar(true);
          setMissingDiploma(true);
          return;
        }

        const { data, error } = await supabase
          .from("profiles")
          .select("avatar_url, diploma_url")
          .eq("id", user.id)
          .single();

        if (error) throw error;

        if (!mounted) return;

        setMissingAvatar(!hasValue(data?.avatar_url));
        setMissingDiploma(!hasValue(data?.diploma_url));
      } catch (error) {
        console.error("Failed to load trainer profile status:", error);

        if (!mounted) return;

        setMissingAvatar(true);
        setMissingDiploma(true);
      } finally {
        if (mounted) {
          setLoadingStatus(false);
        }
      }
    }

    loadProfileStatus();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      loadProfileStatus();
    });

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  const tabs = useMemo(
    () => [
      {
        key: "overview",
        label: "Επισκόπηση",
        icon: LayoutDashboard,
        href: "/trainer#overview",
      },
      {
        key: "profile",
        label: "Προφίλ",
        icon: UserRound,
        href: "/trainer#profile",
      },
      {
        key: "avatar",
        label: "Εικόνα",
        icon: ImageIcon,
        href: "/trainer#avatar",
        showAlert: !loadingStatus && missingAvatar,
        alertLabel: "Λείπει εικόνα προφίλ",
      },
      {
        key: "diploma",
        label: "Πτυχίο",
        icon: GraduationCap,
        href: "/trainer#diploma",
        showAlert: !loadingStatus && missingDiploma,
        alertLabel: "Λείπει πτυχίο",
      },
      {
        key: "security",
        label: "Ασφάλεια",
        icon: Shield,
        href: "/trainer#security",
      },
    ],
    [loadingStatus, missingAvatar, missingDiploma]
  );

  const renderAlertIcon = (showAlert, alertLabel) => {
    if (!showAlert) return null;

    return (
      <span
        className="absolute -right-4 -top-1 inline-flex h-4 w-4 items-center justify-center"
        aria-label={alertLabel}
        title={alertLabel}
      >
        <AlertCircle className="h-4 w-4 text-red-500 drop-shadow-[0_4px_10px_rgba(239,68,68,0.45)]" />
      </span>
    );
  };

  return (
    <div className="w-full">
      {/* Desktop */}
      <div className="hidden w-full border-b border-white/10 md:block">
        <div className="grid grid-cols-5 items-stretch">
          {tabs.map(({ key, label, icon: Icon, href, showAlert, alertLabel }) => {
            const active = section === key;

            return (
              <a
                key={key}
                href={href}
                aria-label={label}
                title={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex h-[58px] w-full items-center justify-center gap-2 px-3",
                  "text-sm font-semibold transition-all duration-200",
                  active ? "text-white" : "text-white/35 hover:text-white/70"
                )}
              >
                <div className="relative flex max-w-full items-center gap-2">
                  <Icon
                    className={cn(
                      "h-[15px] w-[15px] shrink-0 transition-colors duration-200",
                      active ? "text-white" : "text-white/35 group-hover:text-white/70"
                    )}
                  />

                  <span className="truncate tracking-[-0.01em]">{label}</span>

                  {renderAlertIcon(showAlert, alertLabel)}
                </div>

                <span
                  className={cn(
                    "absolute bottom-0 left-0 h-[3px] rounded-full bg-white transition-all duration-200",
                    active ? "w-full opacity-100" : "w-0 opacity-0"
                  )}
                />
              </a>
            );
          })}
        </div>
      </div>

      {/* Mobile */}
      <div className="w-full border-b border-white/10 md:hidden">
        <div
          className={cn(
            "flex items-stretch gap-1.5 overflow-x-auto px-1",
            "snap-x snap-mandatory",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          )}
        >
          {tabs.map(({ key, label, icon: Icon, href, showAlert, alertLabel }) => {
            const active = section === key;

            return (
              <a
                key={key}
                href={href}
                aria-label={label}
                title={label}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative snap-start flex h-[54px] shrink-0 items-center gap-2 whitespace-nowrap px-4",
                  "text-[13px] font-semibold transition-all duration-200",
                  active ? "text-white" : "text-white/35 hover:text-white/70"
                )}
              >
                <div className="relative flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-[14px] w-[14px] shrink-0 transition-colors duration-200",
                      active ? "text-white" : "text-white/35 group-hover:text-white/70"
                    )}
                  />

                  <span className="tracking-[-0.01em]">{label}</span>

                  {renderAlertIcon(showAlert, alertLabel)}
                </div>

                <span
                  className={cn(
                    "absolute bottom-0 left-0 h-[3px] rounded-full bg-white transition-all duration-200",
                    active ? "w-full opacity-100" : "w-0 opacity-0"
                  )}
                />
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}