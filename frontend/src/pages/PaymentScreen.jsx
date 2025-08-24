// src/pages/PaymentScreen.jsx
import React, { useState } from "react";
import {
  CalendarCheck,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Clock,
  Database,
} from "lucide-react";
import { useAuth } from "../AuthProvider";
import UserMenu from "../components/UserMenu";
import TrainerMenu from "../components/TrainerMenu";

/* ---- mock data (replace with API) ---- */
const historyMock = [
  { title: "Αμοιβή Προπόνησης", date: "Ολοκληρώθηκε • 15 Ιαν 2024", amount: 120,   status: "success" },
  { title: "Μηνιαία Συνδρομή",  date: "Ολοκληρώθηκε • 10 Ιαν 2024", amount: 49.99, status: "success" },
  { title: "Αγορά Προγράμματος",date: "Απέτυχε • 05 Ιαν 2024",      amount: 25,    status: "failed"  },
  { title: "Αμοιβή Προπόνησης", date: "Ολοκληρώθηκε • 02 Ιαν 2024", amount: 120,   status: "success" },
  { title: "Ανανέωση Συνδρομής Γυμναστηρίου", date: "Ολοκληρώθηκε • 28 Δεκ 2023", amount: 75, status: "success" },
];

const pendingMock = [
  { title: "Αμοιβή Προπόνησης", expected: "20 Φεβ 2024", amount: 120,   gateway: "Stripe" },
  { title: "E-book Διατροφής",  expected: "22 Φεβ 2024", amount: 15.99, gateway: "PayPal" },
];

const gatewaysMock = [
  { name: "Stripe",  status: "connected", currency: "EUR", lastSync: "πριν 2 ώρες" },
  { name: "PayPal",  status: "connected", currency: "EUR", lastSync: "πριν 1 μέρα" },
  { name: "Revolut", status: "error",     currency: "EUR", lastSync: "—" },
];

const tabs = ["Ιστορικό", "Εκκρεμείς", "Πύλες Πληρωμής"];

export default function PaymentScreen() {
  const [active, setActive] = useState("Ιστορικό");
  const { profile } = useAuth();
  const Menu = profile?.role === "trainer" ? TrainerMenu : UserMenu;

  return (
    <div className="relative min-h-screen lg:pl-[var(--side-w)]" style={{ "--side-w": "280px" }}>
      {/* ---- Premium background (black + radial glow + subtle grid) ---- */}
      <div className="fixed inset-0 -z-50 bg-black" />
      <div className="fixed inset-0 -z-40 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
      <div className="fixed inset-0 -z-40 opacity-20 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />

      {/* Global menu (handles mobile & desktop) */}
      <Menu />

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-4xl px-4">
        {/* Tabs */}
        <nav className="mt-6 flex rounded-2xl bg-zinc-900/60 p-1 backdrop-blur-xl ring-1 ring-white/10">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`flex flex-1 items-center justify-center rounded-xl px-4 py-3 text-sm sm:text-base font-semibold transition-all
                ${active === t
                  ? "bg-white text-black shadow-lg shadow-white/20"
                  : "text-zinc-300 hover:text-white hover:bg-zinc-800/60"}`}
            >
              {t}
            </button>
          ))}
        </nav>

        {/* Lists */}
        <main className="mt-8 space-y-6 pb-28 lg:pb-16">
          {active === "Ιστορικό" &&
            historyMock.map((row, i) => <PaymentRow key={i} {...row} />)}

          {active === "Εκκρεμείς" &&
            (pendingMock.length
              ? pendingMock.map((r, i) => <PendingRow key={i} {...r} />)
              : <EmptyState icon={CalendarCheck} label="Δεν υπάρχουν εκκρεμείς πληρωμές" />)}

          {active === "Πύλες Πληρωμής" &&
            (gatewaysMock.length
              ? gatewaysMock.map((g, i) => <GatewayCard key={i} {...g} />)
              : <EmptyState icon={CreditCard} label="Δεν έχετε συνδέσει ακόμη πύλες πληρωμής" />)}
        </main>
      </div>
    </div>
  );
}

/* ---------------- components (premium colors) ---------------- */

function CardShell({ children }) {
  return (
    <div
      className="flex items-center gap-6 rounded-3xl p-6 border border-white/10 bg-gradient-to-b from-zinc-900/60 to-black/60 backdrop-blur-xl hover:border-white/20 transition"
    >
      {children}
    </div>
  );
}

function PaymentRow({ title, date, amount, status }) {
  const ok    = status === "success";
  const Icon  = ok ? CheckCircle : AlertTriangle;
  const infoC = ok ? "text-emerald-300" : "text-rose-300";
  const amtC  = ok ? "text-white" : "text-rose-300";

  return (
    <CardShell>
      <div className="flex-shrink-0 rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 text-white">
        <CreditCard className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-base sm:text-lg font-semibold text-white">{title}</p>
        <p className={`mt-1 flex items-center gap-1 text-xs sm:text-sm ${infoC}`}>
          <Icon className="h-4 w-4" /> {date}
        </p>
      </div>

      <p className={`shrink-0 text-base sm:text-lg font-bold ${amtC}`}>
        €{amount.toFixed(2)}
      </p>
    </CardShell>
  );
}

function PendingRow({ title, expected, amount, gateway }) {
  return (
    <CardShell>
      <div className="flex-shrink-0 rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 text-white">
        <Clock className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1 space-y-1">
        <p className="truncate text-base sm:text-lg font-semibold text-white">{title}</p>
        <p className="text-xs sm:text-sm text-amber-300">Αναμένεται • {expected}</p>
        <p className="text-[11px] sm:text-xs text-zinc-400">Πύλη: {gateway}</p>
      </div>

      <p className="shrink-0 text-base sm:text-lg font-bold text-white">
        €{amount.toFixed(2)}
      </p>
    </CardShell>
  );
}

function GatewayCard({ name, status, currency, lastSync }) {
  const ok = status === "connected";
  return (
    <CardShell>
      <div className="flex-shrink-0 rounded-2xl bg-white/10 p-3 ring-1 ring-white/20 text-white">
        <Database className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-base sm:text-lg font-semibold text-white">{name}</p>
        <p className="text-xs sm:text-sm text-zinc-300">
          Νόμισμα: {currency} • Τελευταίος συγχρονισμός: {lastSync}
        </p>
      </div>

      <span className={`rounded-full px-3 sm:px-4 py-1 text-xs sm:text-sm font-semibold ring-1
        ${ok ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20"
             : "bg-rose-500/15 text-rose-300 ring-rose-400/20"}`}>
        {ok ? "Connected" : "Error"}
      </span>
    </CardShell>
  );
}

function EmptyState({ icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center gap-5 py-24 text-zinc-300">
      <Icon className="h-12 w-12 text-zinc-400" />
      <p className="text-sm sm:text-base">{label}</p>
    </div>
  );
}

function PageSpinner() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-zinc-300" />
    </div>
  );
}
