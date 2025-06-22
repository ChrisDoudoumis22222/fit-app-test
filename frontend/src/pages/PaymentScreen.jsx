/*  PaymentScreen.jsx – Πληρωμές (dark-glass, GR, v2.2)
   ---------------------------------------------------- */

"use client";

import { lazy, Suspense, useState } from "react";
import {
  ArrowLeft,
  CalendarCheck,
  CreditCard,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Home,
  CalendarDays,
  Users2,
  CreditCard as CreditCardIcon,
  MoreHorizontal,
  Clock,
  Database,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth }     from "../AuthProvider";

/* --- lazy imports --- */
const TrainerMenu = lazy(() => import("../components/TrainerMenu"));
const PaymentRow  = lazy(() => Promise.resolve({ default: PaymentRowImpl }));
const PendingRow  = lazy(() => Promise.resolve({ default: PendingRowImpl }));
const GatewayCard = lazy(() => Promise.resolve({ default: GatewayCardImpl }));

/* --- mock data (αντικαταστήστε με API) --- */
const historyMock = [
  { title: "Αμοιβή Προπόνησης",          date: "Ολοκληρώθηκε • 15 Ιαν 2024", amount: 120,   status: "success" },
  { title: "Μηνιαία Συνδρομή",           date: "Ολοκληρώθηκε • 10 Ιαν 2024", amount: 49.99, status: "success" },
  { title: "Αγορά Προγράμματος",         date: "Απέτυχε • 05 Ιαν 2024",      amount: 25,    status: "failed"  },
  { title: "Αμοιβή Προπόνησης",          date: "Ολοκληρώθηκε • 02 Ιαν 2024", amount: 120,   status: "success" },
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

/* ------------------- Page ------------------- */
export default function PaymentScreen() {
  const [active, setActive] = useState("Ιστορικό");
  const navigate            = useNavigate();
  const { profile }         = useAuth();         // <-- αν το χρειαστείτε

  return (
    <div className="relative min-h-screen pt-14 lg:pt-0 lg:pl-[var(--side-w)]">
      {/* gradient */}
      <div className="pointer-events-none fixed inset-0 -z-10 bg-gradient-to-br from-black via-neutral-900 to-neutral-800" />

      {/* rail */}
      <Suspense fallback={<></>}>
        <TrainerMenu />
      </Suspense>

      <div className="mx-auto w-full max-w-4xl px-4">
        {/* mobile header */}
        <header className="lg:hidden sticky top-0 z-40 flex items-center bg-black/80 p-4 backdrop-blur">
          <button onClick={() => navigate(-1)} className="mr-2 flex size-10 items-center justify-center rounded-full hover:bg-white/10">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center text-2xl font-semibold">Πληρωμές</h1>
        </header>

        {/* tabs */}
        <nav className="mt-8 flex rounded-xl bg-white/5 p-1 backdrop-blur ring-1 ring-white/10">
          {tabs.map((t) => (
            <button
              key={t}
              onClick={() => setActive(t)}
              className={`flex flex-1 items-center justify-center rounded-lg px-4 py-3 text-base font-medium transition
                          ${active === t ? "bg-indigo-500/30 text-white shadow" : "text-white/60 hover:bg-white/10"}`}
            >
              {t}
            </button>
          ))}
        </nav>

        {/* lists */}
        <main className="mt-10 space-y-6 pb-32 lg:pb-16">
          <Suspense fallback={<PageSpinner />}>
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
          </Suspense>
        </main>
      </div>

      {/* bottom nav */}
      <footer className="lg:hidden fixed inset-x-0 bottom-0 z-40 flex border-t border-white/10 bg-black/90 backdrop-blur">
        <NavItem icon={Home}           label="Επισκόπηση" />
        <NavItem icon={CalendarDays}   label="Πρόγραμμα"  />
        <NavItem icon={Users2}         label="Πελάτες"    />
        <NavItem icon={CreditCardIcon} label="Πληρωμές"   active />
        <NavItem icon={MoreHorizontal} label="Περισσότερα" />
      </footer>
    </div>
  );
}

/* --------------- sub-components --------------- */

/* ιστορικό */
function PaymentRowImpl({ title, date, amount, status }) {
  const ok      = status === "success";
  const AmountC = ok ? "text-emerald-400" : "text-rose-400";
  const Icon    = ok ? CheckCircle       : AlertTriangle;
  const InfoC   = ok ? "text-emerald-400" : "text-rose-400";

  return (
    <div className="flex items-center gap-6 rounded-3xl p-6 ring-1 ring-white/10 backdrop-blur-lg"
         style={{ background:"linear-gradient(135deg,rgba(255,255,255,.06)0%,rgba(255,255,255,.03)100%)" }}>
      <div className="flex-shrink-0 rounded-full bg-indigo-500/25 p-3 text-indigo-300">
        <CreditCardIcon className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-lg font-medium text-white/90">{title}</p>
        <p className={`mt-1 flex items-center gap-1 text-sm ${InfoC}`}>
          <Icon className="h-4 w-4" /> {date}
        </p>
      </div>

      <p className={`shrink-0 text-lg font-semibold ${AmountC}`}>
        €{amount.toFixed(2)}
      </p>
    </div>
  );
}

/* εκκρεμείς */
function PendingRowImpl({ title, expected, amount, gateway }) {
  return (
    <div className="flex items-center gap-6 rounded-3xl p-6 ring-1 ring-white/10 backdrop-blur-lg"
         style={{ background:"linear-gradient(135deg,rgba(255,255,255,.06)0%,rgba(255,255,255,.03)100%)" }}>
      <div className="flex-shrink-0 rounded-full bg-indigo-500/25 p-3 text-indigo-300">
        <Clock className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="truncate text-lg font-medium text-white/90">{title}</p>
        <p className="text-sm text-amber-400">Αναμένεται • {expected}</p>
        <p className="text-xs text-white/50">Gateway: {gateway}</p>
      </div>

      <p className="shrink-0 text-lg font-semibold text-rose-400">
        €{amount.toFixed(2)}
      </p>
    </div>
  );
}

/* πύλες */
function GatewayCardImpl({ name, status, currency, lastSync }) {
  const ok = status === "connected";
  return (
    <div className="flex items-center gap-6 rounded-3xl p-6 ring-1 ring-white/10 backdrop-blur-lg"
         style={{ background:"linear-gradient(135deg,rgba(255,255,255,.06)0%,rgba(255,255,255,.03)100%)" }}>
      <div className="flex-shrink-0 rounded-full bg-indigo-500/25 p-3 text-indigo-300">
        <Database className="h-6 w-6" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-lg font-medium text-white/90">{name}</p>
        <p className="text-sm text-white/60">
          Νόμισμα: {currency} • Τελευταίος συγχρονισμός: {lastSync}
        </p>
      </div>

      <span className={`rounded-full px-4 py-1 text-sm font-semibold
                       ${ok ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-rose-500/20 text-rose-300"}`}>
        {ok ? "Connected" : "Error"}
      </span>
    </div>
  );
}

/* βοηθητικά */
function EmptyState({ icon: Icon, label }) {
  return (
    <div className="flex flex-col items-center gap-5 py-24 text-white/60">
      <Icon className="h-12 w-12" />
      <p className="text-base">{label}</p>
    </div>
  );
}

function NavItem({ icon: Icon, label, active }) {
  return (
    <button className={`flex flex-1 flex-col items-center justify-center gap-1 py-3
                        ${active ? "text-indigo-400" : "text-white/60 hover:bg-white/10"}`}>
      <Icon className="h-6 w-6" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function PageSpinner() {
  return (
    <div className="flex justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
    </div>
  );
}
