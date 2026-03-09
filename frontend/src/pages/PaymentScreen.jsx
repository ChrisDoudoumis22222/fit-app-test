"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  Clock,
  History,
  CheckCircle,
  AlertTriangle,
  Loader2,
  Search,
  RefreshCw,
  Wifi,
  WifiOff,
  Euro,
  BadgeCheck,
  Receipt,
  Users,
  ChevronRight,
} from "lucide-react";

import { useAuth } from "../AuthProvider";
import { supabase } from "../supabaseClient";
import UserMenu from "../components/UserMenu";
import TrainerMenu from "../components/TrainerMenu";
import BookingModal from "../components/allbookings/BookingModal";

/* ----------------------------- helpers ----------------------------- */
const timeToMinutes = (t) => {
  if (!t) return 0;
  const [h, m] = String(t).split(":").map((x) => parseInt(x, 10));
  return (h || 0) * 60 + (m || 0);
};

const hhmm = (t) => {
  if (!t) return "—";
  const m = String(t).match(/^(\d{1,2}:\d{2})/);
  return m?.[1] ?? String(t);
};

const toLocalDateLabel = (ymd) => {
  if (!ymd) return "—";
  const d = new Date(`${ymd}T00:00:00`);
  return d.toLocaleDateString("el-GR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

function withTimeout(promise, ms = 12000, msg = "Timeout") {
  let t;
  const timeout = new Promise((_, rej) => (t = setTimeout(() => rej(new Error(msg)), ms)));
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

function normalizeStatus(s) {
  const v = String(s || "pending").toLowerCase();
  if (["accepted", "completed"].includes(v)) return "accepted";
  if (["declined", "cancelled"].includes(v)) return "declined";
  return "pending";
}

function statusMeta(status) {
  const key = normalizeStatus(status);
  if (key === "accepted")
    return { label: "Εγκεκριμένες/Ολοκληρωμένες", Icon: CheckCircle, tone: "emerald" };
  if (key === "declined")
    return { label: "Απορριφθείσες/Ακυρωμένες", Icon: AlertTriangle, tone: "rose" };
  return { label: "Σε αναμονή", Icon: Clock, tone: "amber" };
}

function formatMoney(amount, currencyCode = "EUR") {
  const num = Number(amount);
  if (!Number.isFinite(num)) return null;
  const cc = String(currencyCode || "EUR").toUpperCase();
  if (cc !== "EUR") return `${num.toFixed(2)} ${cc}`;
  return `€${num.toFixed(2)}`;
}

function paymentMethodGR(m) {
  const v = String(m || "").toLowerCase();
  if (v === "cash") return "Μετρητά";
  if (v === "card") return "Κάρτα";
  if (v === "bank_transfer") return "Τραπεζική μεταφορά";
  if (v === "wallet") return "Ψηφιακό πορτοφόλι";
  if (v === "paypal") return "PayPal";
  return m || "—";
}

function paymentStatusGR(s) {
  const v = String(s || "unpaid").toLowerCase();
  if (v === "paid") return { label: "Πληρώθηκε", tone: "emerald" };
  if (v === "pending") return { label: "Σε εξέλιξη", tone: "amber" };
  if (v === "failed") return { label: "Απέτυχε", tone: "rose" };
  if (v === "refunded") return { label: "Επιστροφή χρημάτων", tone: "blue" };
  return { label: "Απλήρωτο", tone: "zinc" };
}

/* ----------------------------- UI primitives ----------------------------- */
const BaseBackground = () => (
  <>
    <div className="fixed inset-0 -z-50 bg-black" />
    <div className="fixed inset-0 -z-40 opacity-30 pointer-events-none bg-[radial-gradient(circle_at_50%_20%,rgba(255,255,255,0.12),transparent_55%)]" />
    <div className="fixed inset-0 -z-40 opacity-20 pointer-events-none bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:24px_24px]" />
  </>
);

function Glass({ className = "", children }) {
  return (
    <div
      className={[
        "relative rounded-3xl border border-white/10",
        "bg-[rgba(17,18,21,.65)] backdrop-blur-xl",
        "shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_10px_30px_rgba(0,0,0,.45)]",
        className,
      ].join(" ")}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[.06] via-white/[.02] to-transparent opacity-40" />
        <div className="absolute -top-1/2 left-0 right-0 h-1/2 bg-gradient-to-b from-white/15 to-transparent opacity-50" />
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function PageSpinner({ label = "Φόρτωση..." }) {
  return (
    <div className="flex justify-center py-16">
      <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-[rgba(17,18,21,.65)] px-4 py-3 backdrop-blur-xl">
        <Loader2 className="h-6 w-6 animate-spin text-white/80" />
        <p className="text-white/70">{label}</p>
      </div>
    </div>
  );
}

function Chip({ children, tone = "zinc", className = "" }) {
  const tones = {
    zinc: "bg-white/6 text-white border-white/10",
    emerald: "bg-emerald-500/12 text-emerald-200 border-emerald-400/20",
    amber: "bg-amber-500/12 text-amber-200 border-amber-400/20",
    rose: "bg-rose-500/12 text-rose-200 border-rose-400/20",
    blue: "bg-blue-500/12 text-blue-200 border-blue-400/20",
  };

  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold",
        tones[tone] || tones.zinc,
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}

/* ----------------------------- booking card ----------------------------- */
function BookingCard({ booking, displayName, onOpen, isLast = false }) {
  const meta = statusMeta(booking.status);
  const statusKey = normalizeStatus(booking.status);
  const tone =
    statusKey === "accepted" ? "emerald" : statusKey === "declined" ? "rose" : "amber";

  const pay = paymentStatusGR(booking.payment_status);
  const money = formatMoney(booking.amount, booking.currency_code);

  const minutes =
    (timeToMinutes(booking.end_time) - timeToMinutes(booking.start_time)) ||
    booking.duration_min ||
    null;

  const durationStr = minutes ? `${minutes}’` : null;

  return (
    <button
      type="button"
      onClick={() => onOpen?.(booking)}
      className={[
        "group block w-full appearance-none text-left text-white",
        "sm:rounded-2xl",
        "sm:border sm:border-white/10 sm:bg-white/[.03] sm:hover:bg-white/[.05]",
        "sm:shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_8px_24px_rgba(0,0,0,.28)]",
        "sm:transition",
        "-mx-4 px-4 sm:mx-0 sm:px-0",
      ].join(" ")}
    >
      <div
        className={[
          "py-3 text-white sm:p-4",
          !isLast ? "border-b border-white/10 sm:border-b-0" : "",
        ].join(" ")}
      >
        <div className="flex items-start gap-3 text-white">
          <div className="min-w-0 flex-1 text-white">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 text-white">
                <p className="truncate text-sm font-semibold text-white sm:text-[15px]">
                  {toLocalDateLabel(booking.date)}
                </p>

                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-white/72">
                  <span className="inline-flex items-center gap-1 text-white/72">
                    <Clock className="h-3.5 w-3.5 text-white/70" />
                    <span className="text-white/72">
                      {hhmm(booking.start_time)}–{hhmm(booking.end_time)}
                    </span>
                  </span>

                  {durationStr && <span className="text-white/45">• {durationStr}</span>}

                  {booking.is_online ? (
                    <span className="inline-flex items-center gap-1 text-blue-200/85">
                      <Wifi className="h-3.5 w-3.5" />
                      Online
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-white/42">
                      <WifiOff className="h-3.5 w-3.5" />
                      Offline
                    </span>
                  )}
                </div>

                <p className="mt-1.5 truncate text-[12px] text-white/62">
                  Με: <span className="font-medium text-white/88">{displayName || "—"}</span>
                </p>
              </div>

              <div className="shrink-0 flex items-start gap-2 text-white">
                {money && (
                  <span className="inline-flex items-center gap-1 text-sm font-bold text-white sm:text-base">
                    <Euro className="h-4 w-4 text-white/80" />
                    <span className="text-white">{money.replace("€", "")}</span>
                  </span>
                )}

                <ChevronRight className="mt-0.5 h-4 w-4 text-white/35 transition group-hover:text-white/55" />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-white">
              <Chip tone={tone}>
                <meta.Icon className="h-3.5 w-3.5" />
                {meta.label}
              </Chip>

              <Chip tone={pay.tone}>
                <BadgeCheck className="h-3.5 w-3.5" />
                {pay.label}
              </Chip>

              <Chip tone="zinc">
                <Receipt className="h-3.5 w-3.5" />
                {paymentMethodGR(booking.payment_method)}
              </Chip>
            </div>
          </div>
        </div>
      </div>
    </button>
  );
}

/* ----------------------------- group section ----------------------------- */
function GroupSection({ group, statusFilter, onOpen, roleLabel }) {
  const buckets = useMemo(() => {
    const pending = [];
    const accepted = [];
    const declined = [];
    for (const b of group.rows) {
      const s = normalizeStatus(b.status);
      if (s === "accepted") accepted.push(b);
      else if (s === "declined") declined.push(b);
      else pending.push(b);
    }
    return { all: group.rows, pending, accepted, declined };
  }, [group.rows]);

  const Column = ({ title, tone, list }) => {
    const visible =
      statusFilter === "all"
        ? list
        : statusFilter === "pending"
        ? title === "Σε αναμονή"
          ? list
          : []
        : statusFilter === "accepted"
        ? title === "Εγκεκριμένες/Ολοκληρωμένες"
          ? list
          : []
        : statusFilter === "declined"
        ? title === "Απορριφθείσες/Ακυρωμένες"
          ? list
          : []
        : list;

    return (
      <div className="min-w-0">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-semibold text-white">{title}</p>
          <Chip tone={tone} className="px-2 py-0.5 text-[11px]">
            {list.length}
          </Chip>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-white/[.03] p-4 text-center text-sm text-white/45">
            — κενό —
          </div>
        ) : (
          <div className="sm:space-y-2">
            {visible.map((b, idx) => (
              <BookingCard
                key={b.id}
                booking={b}
                displayName={group.name}
                onOpen={onOpen}
                isLast={idx === visible.length - 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <Glass className="p-4 sm:p-6">
      <div className="mb-4 flex items-center gap-3">
        <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white/6">
          {group.avatar ? (
            <img src={group.avatar} alt={group.name} className="h-full w-full object-cover" />
          ) : (
            <Users className="h-5 w-5 text-white/70" />
          )}
        </div>

        <div className="min-w-0">
          <p className="truncate text-base font-bold text-white sm:text-lg">{group.name}</p>
          <p className="text-xs text-white/60 sm:text-sm">
            {roleLabel}: <span className="font-semibold text-white/80">{group.name}</span>
            <span className="mx-2 text-white/35">•</span>
            Σύνολο: <span className="font-semibold text-white/80">{group.rows.length}</span>
          </p>
        </div>
      </div>

      <div className="hidden lg:grid grid-cols-4 gap-4">
        <Column title="Σε αναμονή" tone="amber" list={buckets.pending} />
        <Column title="Εγκεκριμένες/Ολοκληρωμένες" tone="emerald" list={buckets.accepted} />
        <Column title="Απορριφθείσες/Ακυρωμένες" tone="rose" list={buckets.declined} />
        <Column title="Όλες" tone="zinc" list={buckets.all} />
      </div>

      <div className="lg:hidden">
        {statusFilter === "pending" && (
          <Column title="Σε αναμονή" tone="amber" list={buckets.pending} />
        )}
        {statusFilter === "accepted" && (
          <Column title="Εγκεκριμένες/Ολοκληρωμένες" tone="emerald" list={buckets.accepted} />
        )}
        {statusFilter === "declined" && (
          <Column title="Απορριφθείσες/Ακυρωμένες" tone="rose" list={buckets.declined} />
        )}
        {statusFilter === "all" && <Column title="Όλες" tone="zinc" list={buckets.all} />}
      </div>
    </Glass>
  );
}

/* ----------------------------- main page ----------------------------- */
export default function PaymentScreen() {
  const { profile, loading: authLoading } = useAuth();
  const Menu = profile?.role === "trainer" ? TrainerMenu : UserMenu;

  const [uid, setUid] = useState(null);

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState(null);

  const [q, setQ] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);

  const isTrainer = profile?.role === "trainer";

  const [statusFilter, setStatusFilter] = useState("all");

  const [selected, setSelected] = useState(null);
  const [selectedCounterparty, setSelectedCounterparty] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  const pageSize = 300;
  const [limit, setLimit] = useState(pageSize);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const id = profile?.id || data?.user?.id || null;
        if (!alive) return;
        setUid(id);
      } catch {
        if (!alive) return;
        setUid(profile?.id || null);
      }
    })();
    return () => {
      alive = false;
    };
  }, [profile?.id]);

  const fetchBookings = useCallback(async (userId, take, trainerMode) => {
    if (!userId) return;

    setLoading(true);
    setErr(null);

    const baseFields =
      "id,trainer_id,user_id,date,start_time,end_time,duration_min,status,created_at,is_online,user_name,trainer_name,amount,currency_code,payment_method,payment_status,paid_at,payment_reference,note,sale,updated_at";

    const select =
      `${baseFields},` +
      "trainer:profiles!trainer_bookings_trainer_id_fkey(id,full_name,avatar_url)," +
      "user:profiles!trainer_bookings_user_id_fkey(id,full_name,avatar_url)";

    try {
      let query = supabase.from("trainer_bookings").select(select);

      query = trainerMode ? query.eq("trainer_id", userId) : query.eq("user_id", userId);

      query = query
        .order("date", { ascending: false })
        .order("start_time", { ascending: false })
        .limit(take);

      const { data, error } = await withTimeout(query, 12000, "Timeout φόρτωσης κρατήσεων");
      if (error) throw error;

      setRows(data || []);
      setLoading(false);
    } catch (e) {
      setErr(e?.message || "Σφάλμα φόρτωσης κρατήσεων");
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!uid) return;
    fetchBookings(uid, limit, isTrainer);
  }, [uid, refreshKey, limit, isTrainer, fetchBookings]);

  useEffect(() => {
    if (!uid) return;

    const unique = `rt-bookings-${uid}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const channel = supabase.channel(unique);

    channel.on(
      "postgres_changes",
      { event: "*", schema: "public", table: "trainer_bookings" },
      (payload) => {
        const b = payload?.new;
        if (!b) return;
        if (b.user_id === uid || b.trainer_id === uid) {
          fetchBookings(uid, limit, isTrainer);
        }
      }
    );

    channel.subscribe();

    return () => {
      try {
        channel.unsubscribe?.();
      } catch {}
      try {
        supabase.removeChannel(channel);
      } catch {}
    };
  }, [uid, limit, isTrainer, fetchBookings]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const base = !needle
      ? rows
      : rows.filter((b) => {
          const tn = b?.trainer?.full_name || b?.trainer_name || "";
          const un = b?.user?.full_name || b?.user_name || "";
          const dateLabel = toLocalDateLabel(b.date);
          const statusLabel = statusMeta(b.status).label;
          const payLabel = paymentStatusGR(b.payment_status).label;

          return (
            String(tn).toLowerCase().includes(needle) ||
            String(un).toLowerCase().includes(needle) ||
            String(dateLabel).toLowerCase().includes(needle) ||
            String(statusLabel).toLowerCase().includes(needle) ||
            String(hhmm(b.start_time)).toLowerCase().includes(needle) ||
            String(paymentMethodGR(b.payment_method)).toLowerCase().includes(needle) ||
            String(payLabel).toLowerCase().includes(needle)
          );
        });

    if (statusFilter === "all") return base;
    return base.filter((b) => normalizeStatus(b.status) === statusFilter);
  }, [rows, q, statusFilter]);

  const prepared = useMemo(() => {
    return filtered.map((b) => {
      const counterparty = isTrainer
        ? {
            id: b.user_id,
            name: b?.user?.full_name || b.user_name || "Πελάτης",
            avatar: b?.user?.avatar_url || null,
            label: "Πελάτης",
          }
        : {
            id: b.trainer_id,
            name: b?.trainer?.full_name || b.trainer_name || "Trainer",
            avatar: b?.trainer?.avatar_url || null,
            label: "Trainer",
          };

      return { ...b, counterparty };
    });
  }, [filtered, isTrainer]);

  const grouped = useMemo(() => {
    const map = new Map();

    for (const b of prepared) {
      const cp = b.counterparty;
      const key = cp?.id || "unknown";

      if (!map.has(key)) {
        map.set(key, {
          id: key,
          name: cp?.name || "—",
          avatar: cp?.avatar || null,
          rows: [],
        });
      }

      map.get(key).rows.push(b);
    }

    const arr = [...map.values()];

    for (const g of arr) {
      g.rows.sort((a, b) => {
        const ad = String(a.date || "");
        const bd = String(b.date || "");
        if (ad !== bd) return bd.localeCompare(ad);
        return String(b.start_time || "").localeCompare(String(a.start_time || ""));
      });
    }

    arr.sort((A, B) => {
      const a = A.rows[0];
      const b = B.rows[0];
      const ad = String(a?.date || "");
      const bd = String(b?.date || "");
      if (ad !== bd) return bd.localeCompare(ad);
      return String(b?.start_time || "").localeCompare(String(a?.start_time || ""));
    });

    return arr;
  }, [prepared]);

  const counts = useMemo(() => {
    let pending = 0;
    let accepted = 0;
    let declined = 0;

    for (const b of rows) {
      const s = normalizeStatus(b.status);
      if (s === "accepted") accepted++;
      else if (s === "declined") declined++;
      else pending++;
    }

    return { all: rows.length, pending, accepted, declined };
  }, [rows]);

  const openModal = (b) => {
    setSelected(b);
    setSelectedCounterparty(b.counterparty || null);
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setSelected(null);
    setSelectedCounterparty(null);
  };

  const title = "Οι κρατήσεις μου";
  const subtitle = isTrainer
    ? "Ομαδοποιημένες ανά πελάτη και ανά κατάσταση"
    : "Ομαδοποιημένες ανά trainer και ανά κατάσταση";

  const roleLabel = isTrainer ? "Πελάτης" : "Trainer";

  if (authLoading) {
    return (
      <div className="relative min-h-screen lg:pl-[var(--side-w)]" style={{ "--side-w": "280px" }}>
        <BaseBackground />
        <Menu />
        <div className="relative z-10 mx-auto w-full max-w-5xl px-4 lg:px-6">
          <PageSpinner label="Φόρτωση προφίλ..." />
        </div>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen lg:pl-[var(--side-w)]" style={{ "--side-w": "280px" }}>
      <BaseBackground />
      <Menu />

      <div className="relative z-10 mx-auto w-full max-w-[1600px] px-4 pb-28 pt-0 lg:px-8 lg:pb-16 lg:pt-4">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          className="pt-0"
        >
          <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-start gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-white/6">
                <History className="h-6 w-6 text-white" />
              </div>

<div>
  <h1 className="text-[28px] sm:text-4xl font-extrabold tracking-tight text-white leading-tight">
    {title}
  </h1>
  <p className="mt-1 text-sm sm:text-base text-zinc-400">
    {subtitle}
  </p>
</div>
            </div>

            <div className="flex w-full items-center gap-2 sm:w-auto">
              <button
                onClick={() => setRefreshKey((k) => k + 1)}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-white/10 bg-[#0f1115] px-3 text-white hover:bg-[#171a20]"
                title="Ανανέωση"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="text-sm font-semibold">Ανανέωση</span>
              </button>

              <div className="relative flex-1 sm:flex-none">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/55" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Αναζήτηση (όνομα, ημερομηνία, πληρωμή...)"
                  className="h-10 w-full rounded-xl border border-white/10 bg-[#1a1d23] pl-9 pr-3 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-white/15 sm:w-[360px]"
                />
              </div>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard
              active={statusFilter === "all"}
              title="Όλες"
              value={counts.all}
              tone="zinc"
              onClick={() => setStatusFilter("all")}
            />
            <StatCard
              active={statusFilter === "pending"}
              title="Σε αναμονή"
              value={counts.pending}
              tone="amber"
              onClick={() => setStatusFilter("pending")}
            />
            <StatCard
              active={statusFilter === "accepted"}
              title="Εγκεκριμένες"
              value={counts.accepted}
              tone="emerald"
              onClick={() => setStatusFilter("accepted")}
            />
            <StatCard
              active={statusFilter === "declined"}
              title="Απορριφθείσες"
              value={counts.declined}
              tone="rose"
              onClick={() => setStatusFilter("declined")}
            />
          </div>
        </motion.div>

        <main className="mt-6">
          {loading ? (
            <PageSpinner label="Φόρτωση κρατήσεων..." />
          ) : err ? (
            <Glass className="border border-rose-500/25 p-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-0.5 h-6 w-6 text-rose-300" />
                <div className="min-w-0">
                  <p className="font-semibold text-white">Σφάλμα</p>
                  <p className="mt-1 text-sm text-white/70">{err}</p>
                  <button
                    onClick={() => setRefreshKey((k) => k + 1)}
                    className="mt-4 h-10 rounded-xl border border-white/10 bg-white/6 px-4 text-white hover:bg-white/10"
                  >
                    Προσπάθησε ξανά
                  </button>
                </div>
              </div>
            </Glass>
          ) : grouped.length === 0 ? (
            <div className="flex flex-col items-center gap-4 py-20 text-zinc-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <Calendar className="h-10 w-10 text-zinc-300" />
              </div>
              <div className="space-y-1 text-center">
                <p className="text-base font-semibold text-white">Δεν βρέθηκαν κρατήσεις</p>
                <p className="max-w-md text-sm text-white/65">
                  Εάν υπάρχουν κρατήσεις αλλά εμφανίζεται 0, ενδέχεται τα δεδομένα να μην είναι διαθέσιμα λόγω περιορισμού πρόσβασης.
                </p>
                <p className="mt-3 text-xs text-white/45">
                  UID: {uid ? String(uid).slice(0, 8) + "…" : "—"} • Ρόλος:{" "}
                  {isTrainer ? "trainer" : "user"}
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {grouped.map((g) => (
                <GroupSection
                  key={g.id}
                  group={g}
                  statusFilter={statusFilter}
                  onOpen={openModal}
                  roleLabel={roleLabel}
                />
              ))}

              {prepared.length >= limit && (
                <div className="flex justify-center pt-2">
                  <button
                    onClick={() => setLimit((v) => v + pageSize)}
                    className="h-11 rounded-xl border border-white/10 bg-white/6 px-5 font-semibold text-white hover:bg-white/10"
                  >
                    Φόρτωσε περισσότερα
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <AnimatePresence>
        {modalOpen && (
          <BookingModal
            open={modalOpen}
            booking={selected}
            counterpartyName={selectedCounterparty?.name}
            counterpartyAvatar={selectedCounterparty?.avatar}
            onClose={closeModal}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ----------------------------- Stat Card ----------------------------- */
function StatCard({ title, value, tone = "zinc", active = false, onClick }) {
  const toneMap = {
    zinc: {
      ring: "ring-white/10",
      bg: "bg-white/[.04]",
      title: "text-white/70",
      value: "text-white",
    },
    amber: {
      ring: "ring-amber-400/20",
      bg: "bg-amber-500/10",
      title: "text-amber-200/85",
      value: "text-amber-100",
    },
    emerald: {
      ring: "ring-emerald-400/20",
      bg: "bg-emerald-500/10",
      title: "text-emerald-200/85",
      value: "text-emerald-100",
    },
    rose: {
      ring: "ring-rose-400/20",
      bg: "bg-rose-500/10",
      title: "text-rose-200/85",
      value: "text-rose-100",
    },
  };

  const t = toneMap[tone] || toneMap.zinc;

  return (
    <button type="button" onClick={onClick} className="text-left">
      <div
        className={[
          "relative rounded-2xl border border-white/10 p-4 transition",
          "bg-[rgba(17,18,21,.55)] backdrop-blur-xl",
          "shadow-[inset_0_1px_0_rgba(255,255,255,.04),0_8px_24px_rgba(0,0,0,.35)]",
          active ? `ring-2 ${t.ring}` : "hover:ring-1 hover:ring-white/15",
        ].join(" ")}
      >
        <div className={["absolute inset-0 rounded-2xl", t.bg].join(" ")} style={{ opacity: 0.8 }} />
        <div className="relative">
          <p className={["text-xs font-semibold", t.title].join(" ")}>{title}</p>
          <p className={["mt-1 text-2xl font-bold", t.value].join(" ")}>{value}</p>
          <p className="mt-1 text-[11px] text-white/45">Πάτα για φίλτρο</p>
        </div>
      </div>
    </button>
  );
}