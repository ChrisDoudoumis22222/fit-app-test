"use client";

import React from "react";
import {
  LayoutDashboard,
  UserRound,
  Image as ImageIcon,
  GraduationCap,
  Shield,
} from "lucide-react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

export default function TrainerDashboardTabs({ section, showDiplomaWarning }) {
  const tabs = [
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
    },
    {
      key: "diploma",
      label: "Πτυχίο",
      icon: GraduationCap,
      href: "/trainer#diploma",
      showAlert: showDiplomaWarning,
    },
    {
      key: "security",
      label: "Ασφάλεια",
      icon: Shield,
      href: "/trainer#security",
    },
  ];

  return (
    <div className="w-full">
      {/* Desktop */}
      <div className="hidden md:block w-full border-b border-white/10">
        <div className="grid grid-cols-5 items-stretch">
          {tabs.map(({ key, label, icon: Icon, href, showAlert }) => {
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
                  active
                    ? "text-white"
                    : "text-white/35 hover:text-white/70"
                )}
              >
                <div className="relative flex items-center gap-2 max-w-full">
                  <Icon
                    className={cn(
                      "h-[15px] w-[15px] shrink-0 transition-colors duration-200",
                      active
                        ? "text-white"
                        : "text-white/35 group-hover:text-white/70"
                    )}
                  />

                  <span className="truncate tracking-[-0.01em]">{label}</span>

                  {showAlert ? (
                    <span
                      className="absolute -right-4 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-[0_4px_14px_rgba(239,68,68,0.35)]"
                      aria-label="Λείπει πτυχίο"
                      title="Δεν έχει ανέβει πτυχίο"
                    >
                      !
                    </span>
                  ) : null}
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
      <div className="md:hidden w-full border-b border-white/10">
        <div
          className={cn(
            "flex items-stretch gap-1.5 overflow-x-auto px-1",
            "snap-x snap-mandatory",
            "[scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          )}
        >
          {tabs.map(({ key, label, icon: Icon, href, showAlert }) => {
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
                  active
                    ? "text-white"
                    : "text-white/35 hover:text-white/70"
                )}
              >
                <div className="relative flex items-center gap-2">
                  <Icon
                    className={cn(
                      "h-[14px] w-[14px] shrink-0 transition-colors duration-200",
                      active
                        ? "text-white"
                        : "text-white/35 group-hover:text-white/70"
                    )}
                  />

                  <span className="tracking-[-0.01em]">{label}</span>

                  {showAlert ? (
                    <span
                      className="absolute -right-4 -top-1 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow-[0_4px_14px_rgba(239,68,68,0.35)]"
                      aria-label="Λείπει πτυχίο"
                      title="Δεν έχει ανέβει πτυχίο"
                    >
                      !
                    </span>
                  ) : null}
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