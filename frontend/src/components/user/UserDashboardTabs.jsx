"use client";

import React from "react";
import {
  LayoutDashboard,
  UserRound,
  Image as ImageIcon,
  Shield,
} from "lucide-react";

function cn(...classes) {
  return classes.filter(Boolean).join(" ");
}

function AlertBadge() {
  return (
    <span
      className={cn(
        "absolute -right-2 -top-2 z-20 flex h-[17px] w-[17px] items-center justify-center rounded-full",
        "bg-red-500 text-white text-[11px] font-extrabold leading-none",
        "shadow-[0_0_0_2px_rgba(0,0,0,0.92),0_6px_16px_rgba(239,68,68,0.35)]"
      )}
      title="Πρόσθεσε φωτογραφία προφίλ"
      aria-label="Λείπει φωτογραφία προφίλ"
    >
      !
    </span>
  );
}

export default function UserDashboardTabs({
  currentSection,
  onSectionChange,
  hasProfileImage,
}) {
  const shouldShowAvatarAlert = hasProfileImage === false;

  const tabs = [
    {
      key: "dashboard",
      label: "Πίνακας",
      icon: LayoutDashboard,
    },
    {
      key: "profile",
      label: "Προφίλ",
      icon: UserRound,
    },
    {
      key: "avatar",
      label: "Φωτογραφία Προφίλ",
      icon: ImageIcon,
      showAlert: shouldShowAvatarAlert,
    },
    {
      key: "security",
      label: "Ασφάλεια",
      icon: Shield,
    },
  ];

  return (
    <div className="w-full">
      {/* Desktop */}
      <div className="hidden w-full border-b border-white/10 md:block">
        <div className="grid grid-cols-4 items-stretch">
          {tabs.map(({ key, label, icon: Icon, showAlert }) => {
            const active = currentSection === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSectionChange?.(key)}
                aria-pressed={active}
                className={cn(
                  "group relative flex h-[58px] w-full items-center justify-center gap-2 overflow-visible px-3",
                  "text-sm font-semibold transition-all duration-200",
                  active
                    ? "text-white"
                    : "text-white/35 hover:text-white/70"
                )}
              >
                <div className="relative flex max-w-full items-center gap-2 overflow-visible">
                  <div className="relative shrink-0 overflow-visible">
                    <Icon
                      className={cn(
                        "h-[15px] w-[15px] shrink-0 transition-colors duration-200",
                        active
                          ? "text-white"
                          : "text-white/35 group-hover:text-white/70"
                      )}
                    />

                    {showAlert && <AlertBadge />}
                  </div>

                  <span className="truncate tracking-[-0.01em]">{label}</span>
                </div>

                <span
                  className={cn(
                    "absolute bottom-0 left-0 h-[3px] rounded-full bg-white transition-all duration-200",
                    active ? "w-full opacity-100" : "w-0 opacity-0"
                  )}
                />
              </button>
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
          {tabs.map(({ key, label, icon: Icon, showAlert }) => {
            const active = currentSection === key;

            return (
              <button
                key={key}
                type="button"
                onClick={() => onSectionChange?.(key)}
                aria-pressed={active}
                className={cn(
                  "group relative snap-start flex h-[54px] shrink-0 items-center gap-2 overflow-visible whitespace-nowrap px-4",
                  "text-[13px] font-semibold transition-all duration-200",
                  active
                    ? "text-white"
                    : "text-white/35 hover:text-white/70"
                )}
              >
                <div className="relative flex items-center gap-2 overflow-visible">
                  <div className="relative shrink-0 overflow-visible">
                    <Icon
                      className={cn(
                        "h-[14px] w-[14px] shrink-0 transition-colors duration-200",
                        active
                          ? "text-white"
                          : "text-white/35 group-hover:text-white/70"
                      )}
                    />

                    {showAlert && <AlertBadge />}
                  </div>

                  <span className="tracking-[-0.01em]">{label}</span>
                </div>

                <span
                  className={cn(
                    "absolute bottom-0 left-0 h-[3px] rounded-full bg-white transition-all duration-200",
                    active ? "w-full opacity-100" : "w-0 opacity-0"
                  )}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}