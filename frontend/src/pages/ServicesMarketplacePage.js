/* ------------------------------------------------------------------
   ServicesMarketplacePage.jsx  — 20 Jul 2025
   • Silver theme
   • Whole card is clickable (stopPropagation on inner controls)
   • Improved list layout + uniform grid height
   • ✱ NEW ✱  full‑tag display + detail‑style avatar placeholder
------------------------------------------------------------------ */

"use client"

import { lazy, Suspense, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search,
  Filter,
  Star,
  MapPin,
  Globe,
  Euro,
  ChevronDown,
  ChevronRight,
  Heart,
  Zap,
  TrendingUp,
  Award,
  X,
  Play,
  LayoutGrid,
  ListIcon,
  Calendar,
  Clock,
  CheckCircle,
  Timer,
  Sparkles,   // ✱ added
  User,       // ✱ added
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import UserMenu from "../components/UserMenu"
import TrainerMenu from "../components/TrainerMenu"
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg"

const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar"

const AcceptPopup  = lazy(() => import("../components/AcceptBookingPopup"))
const DeclinePopup = lazy(() => import("../components/DeclineBookingPopup"))

/* ───────────────── helper: human‑friendly slot label ───────────── */
const fmt = (d) => {
  try {
    const date       = new Date(d)
    const today      = new Date()
    const tomorrow   = new Date(Date.now() + 86_400_000)
    const isToday    = date.toDateString() === today.toDateString()
    const isTomorrow = date.toDateString() === tomorrow.toDateString()
    let label        = date.toLocaleDateString("el-GR", {
      weekday: "short",
      day: "numeric",
      month: "short",
    })
    if (isToday)    label = "Σήμερα"
    else if (isTomorrow) label = "Αύριο"
    const time = date.toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
    return `${label} στις ${time}`
  } catch {
    return "Μη έγκυρη ημερομηνία"
  }
}

/* ═════════════════════════════ PAGE ════════════════════════════ */
export default function ServicesMarketplacePage() {
  /* force black BG for the whole doc */
  useEffect(() => {
    document.documentElement.classList.add("bg-black")
    document.body.classList.add("bg-black")
    return () => {
      document.documentElement.classList.remove("bg-black")
      document.body.classList.remove("bg-black")
    }
  }, [])

  /* auth + nav */
  const { profile, loading } = useAuth()
  const navigate      = useNavigate()
  const MenuComponent = profile?.role === "trainer" ? TrainerMenu : UserMenu

  /* ───────── state ───────── */
  const [services,       setServices]       = useState([])
  const [filtered,       setFiltered]       = useState([])
  const [selectedSlots,  setSelectedSlots]  = useState({})
  const [searchTerm,     setSearchTerm]     = useState("")
  const [viewMode,       setViewMode]       = useState("grid")
  const [sortBy,         setSortBy]         = useState("newest")
  const [filterCategory, setFilterCategory] = useState("all")
  const [showFilters,    setShowFilters]    = useState(false)
  const [bookingLoading, setBookingLoading] = useState(null)
  const [acceptOpen,     setAcceptOpen]     = useState(false)
  const [declineOpen,    setDeclineOpen]    = useState({ open: false, message: "" })

  /* ───────── fetch services once ───────── */
  useEffect(() => {
    ;(async () => {
      const { data: svcData, error } = await supabase
        .from("services")
        .select(
          `*, trainer:profiles(id, full_name, avatar_url), service_slots(id, starts_at, booked), service_extras(id)`,
        )
        .order("created_at", { ascending: false })

      if (error) {
        setDeclineOpen({ open: true, message: error.message })
        return
      }

      const { data: imgData } = await supabase.from("service_images").select("service_id, url")
      const imgsBySvc = (imgData ?? []).reduce((m, { service_id, url }) => {
        ;(m[service_id] ||= []).push(url)
        return m
      }, {})

      const merged = (svcData ?? []).map((s) => ({
        ...s,
        service_images: imgsBySvc[s.id] ?? [],
        mainImage: (imgsBySvc[s.id] ?? [])[0] || SERVICE_PLACEHOLDER,
        tags: s.tags ?? [],
        service_slots: s.service_slots ?? [],
        service_extras: s.service_extras ?? [],
      }))

      setServices(merged)
      setFiltered(merged)
    })()
  }, [])

  /* ───────── search / filter / sort ───────── */
  useEffect(() => {
    let out = [...services]

    /* search term */
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      out = out.filter(
        (s) =>
          (s.title ?? "").toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q) ||
          (s.trainer?.full_name ?? "").toLowerCase().includes(q) ||
          (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      )
    }

    /* category */
    if (filterCategory !== "all") {
      out = out.filter((s) => {
        if (filterCategory === "virtual") return s.is_virtual
        if (filterCategory === "in-person") return !s.is_virtual
        return (s.tags ?? []).some((t) => t.toLowerCase().includes(filterCategory))
      })
    }

    /* sort */
    out.sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return (a.price || 0) - (b.price || 0)
        case "price-high":
          return (b.price || 0) - (a.price || 0)
        case "name":
          return (a.title || "").localeCompare(b.title || "")
        case "trainer":
          return (a.trainer?.full_name || "").localeCompare(b.trainer?.full_name || "")
        default:
          return new Date(b.created_at || 0) - new Date(a.created_at || 0)
      }
    })

    setFiltered(out)
  }, [searchTerm, services, sortBy, filterCategory])

  /* slot select */
  const handleSlotChange = (svcId, slotId) => setSelectedSlots((p) => ({ ...p, [svcId]: slotId }))

  /* ───────── booking action ───────── */
  const book = async (serviceId) => {
    const slotId = selectedSlots[serviceId]
    if (!slotId) {
      setDeclineOpen({ open: true, message: "⚠️ Επιλέξτε ώρα πρώτα" })
      return
    }

    const svc = services.find((s) => s.id === serviceId)
    if (!svc?.trainer?.id) {
      setDeclineOpen({ open: true, message: "⚠️ Δεν βρέθηκε προπονητής" })
      return
    }

    setBookingLoading(serviceId)

    const { error } = await supabase.from("bookings").insert({
      service_id: serviceId,
      user_id: profile.id,
      trainer_id: svc.trainer.id,
      slot_id: slotId,
      booking_date: new Date().toISOString(),
      status: "pending",
    })

    setBookingLoading(null)

    if (error) {
      setDeclineOpen({ open: true, message: error.message })
      return
    }

    /* optimistic: mark slot booked */
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? { ...s, service_slots: s.service_slots.map((sl) => (sl.id === slotId ? { ...sl, booked: true } : sl)) }
          : s,
      ),
    )

    setAcceptOpen(true)
  }

  /* loading splash */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white">Φόρτωση…</div>
      </div>
    )
  }

  /* ═════════════════════════ UI ══════════════════════════════ */
  return (
    <>
      <div className="min-h-screen bg-black text-gray-200 overflow-x-hidden relative">
        {/* soft grey blobs */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-gray-500/5 rounded-full blur-3xl animate-pulse" />
          <div
            className="absolute bottom-0 right-1/4 w-80 h-80 bg-gray-500/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "2s" }}
          />
          <div
            className="absolute top-1/3 right-1/3 w-64 h-64 bg-gray-500/5 rounded-full blur-3xl animate-pulse"
            style={{ animationDelay: "4s" }}
          />
        </div>

        <div className="relative z-10">
          <MenuComponent />

          <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
            {/* ------------ CONTROLS BAR ------------ */}
            <Controls
              search={searchTerm}
              setSearch={setSearchTerm}
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              view={viewMode}
              setView={setViewMode}
              sort={sortBy}
              setSort={setSortBy}
              cat={filterCategory}
              setCat={setFilterCategory}
              results={filtered.length}
            />

            {/* ------------ RESULTS GRID / LIST ------------ */}
            {filtered.length === 0 ? (
              <Empty search={searchTerm} />
            ) : viewMode === "grid" ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6 lg:gap-8 auto-rows-fr"
              >
                {filtered.map((s, i) => (
                  <motion.div
                    key={s.id}
                    className="h-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                  >
                    <Card
                      service={s}
                      selected={selectedSlots[s.id]}
                      onSelect={(slotId) => handleSlotChange(s.id, slotId)}
                      onBook={book}
                      onNavigate={navigate}
                      loading={bookingLoading === s.id}
                    />
                  </motion.div>
                ))}
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}>
                {filtered.map((s, i) => (
                  <motion.div
                    key={s.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.5 }}
                    className="mb-6"
                  >
                    <Card
                      list
                      service={s}
                      selected={selectedSlots[s.id]}
                      onSelect={(slotId) => handleSlotChange(s.id, slotId)}
                      onBook={book}
                      onNavigate={navigate}
                      loading={bookingLoading === s.id}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </main>
        </div>
      </div>

      {/* pop‑ups */}
      <Suspense fallback={null}>
        {acceptOpen && <AcceptPopup onClose={() => setAcceptOpen(false)} />}
        {declineOpen.open && (
          <DeclinePopup message={declineOpen.message} onClose={() => setDeclineOpen({ open: false, message: "" })} />
        )}
      </Suspense>
    </>
  )
}

/* ─────────────────────────── CONTROLS BAR ────────────────────────── */
function Controls({
  search,
  setSearch,
  showFilters,
  setShowFilters,
  view,
  setView,
  sort,
  setSort,
  cat,
  setCat,
  results,
}) {
  return (
    <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-12 lg:mb-16">
      <div className="rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 overflow-hidden">
        <div className="p-6 lg:p-8">
          <h2 className="text-xl font-semibold text-white mb-6">
            {results} {results === 1 ? "υπηρεσία" : "υπηρεσίες"} βρέθηκαν
          </h2>

          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 mb-6">
            {/* search */}
            <div className="relative flex-1">
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Αναζήτηση υπηρεσιών, προπονητών..."
                className="w-full pl-14 pr-10 py-4 lg:py-5 bg-white/5 border border-white/10 rounded-2xl text-white placeholder-gray-400 focus:ring-gray-400/50 focus:border-gray-400/50"
              />
              {search && (
                <button
                  onClick={() => setSearch("")}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* actions */}
            <div className="flex gap-3 flex-wrap lg:flex-nowrap">
              {/* filters */}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-5 py-4 lg:py-5 rounded-2xl font-medium ${
                  showFilters
                    ? "bg-gray-400 text-black shadow-lg shadow-gray-400/20"
                    : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
                }`}
              >
                <Filter className="h-4 w-4" />
                Φίλτρα
                {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>

              {/* view toggle */}
              <div className="flex rounded-2xl overflow-hidden border border-white/10 bg-white/5">
                <button
                  onClick={() => setView("grid")}
                  className={`px-4 py-4 lg:py-5 ${
                    view === "grid" ? "bg-gray-400 text-black" : "text-gray-300"
                  } transition`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`px-4 py-4 lg:py-5 border-l border-white/10 ${
                    view === "list" ? "bg-gray-400 text-black" : "text-gray-300"
                  } transition`}
                >
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>

              {/* sort */}
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="px-5 py-4 lg:py-5 bg-white/5 border border-white/10 rounded-2xl text-white min-w-[180px] appearance-none cursor-pointer"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")",
                  backgroundPosition: "right .5rem center",
                  backgroundSize: "1.5em 1.5em",
                  backgroundRepeat: "no-repeat",
                }}
              >
                <option value="newest" className="bg-black text-white">
                  Νεότερες πρώτα
                </option>
                <option value="price-low" className="bg-black text-white">
                  Τιμή: Χαμηλή → Υψηλή
                </option>
                <option value="price-high" className="bg-black text-white">
                  Τιμή: Υψηλή → Χαμηλή
                </option>
                <option value="name" className="bg-black text-white">
                  Όνομα A‑Z
                </option>
                <option value="trainer" className="bg-black text-white">
                  Προπονητής A‑Z
                </option>
              </select>
            </div>
          </div>

          {/* filters panel */}
          <AnimatePresence>{showFilters && <Filters cat={cat} setCat={setCat} />}</AnimatePresence>
        </div>
      </div>
    </motion.section>
  )
}

/* ────────────────────────────── FILTERS PANEL ───────────────────── */
function Filters({ cat, setCat }) {
  const C = [
    { id: "all", label: "Όλες", icon: Star },
    { id: "fitness", label: "Fitness", icon: Zap },
    { id: "yoga", label: "Yoga", icon: Heart },
    { id: "nutrition", label: "Διατροφή", icon: Award },
    { id: "strength", label: "Strength", icon: TrendingUp },
    { id: "cardio", label: "Cardio", icon: Play },
    { id: "virtual", label: "Online", icon: Globe },
    { id: "in-person", label: "Από κοντά", icon: MapPin },
  ]
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className="border-t border-white/10 pt-6"
    >
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {C.map(({ id, label, icon: Icon }, i) => (
          <motion.button
            key={id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => setCat(id)}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl font-medium ${
              cat === id
                ? "bg-gray-400 text-black shadow-lg shadow-gray-400/20"
                : "bg-white/5 text-gray-300 hover:bg-white/10 border border-white/10"
            }`}
          >
            <Icon className="h-5 w-5" />
            <span className="text-xs">{label}</span>
          </motion.button>
        ))}
      </div>
    </motion.div>
  )
}

/* ────────────────────────────── EMPTY STATE ─────────────────────── */
const Empty = ({ search }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20 lg:py-32">
    <Search className="mx-auto h-16 w-16 text-gray-600 mb-6" />
    <h3 className="text-3xl font-bold text-white mb-2">
      {search ? `Δεν βρέθηκαν αποτελέσματα για "${search}"` : "Δεν βρέθηκαν υπηρεσίες"}
    </h3>
    <p className="text-gray-400 mb-6">
      {search
        ? "Δοκιμάστε διαφορετικούς όρους αναζήτησης ή αλλάξτε τα φίλτρα σας."
        : "Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης ή τα φίλτρα σας."}
    </p>
    <button onClick={() => window.location.reload()} className="px-6 py-3 bg-gray-400 text-black rounded-xl">
      Εξερευνήστε όλες
    </button>
  </motion.div>
)

/* ─────────────────────────────── BADGE ──────────────────────────── */
const Badge = ({ color, icon: Icon, label }) => {
  const clr =
    color === "emerald"
      ? "bg-emerald-500 text-white"
      : "bg-gray-400 text-black" // amber → silver
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold ${clr}`}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  )
}

/* ──────────────────────── FULLY BOOKED NOTICE ───────────────────── */
const Booked = () => (
  <div className="text-center py-6">
    <div className="p-6 rounded-xl bg-red-500/10 border border-red-500/20">
      <Clock className="mx-auto h-6 w-6 text-red-400 mb-3" />
      <h4 className="font-semibold text-red-300">Πλήρως Κλεισμένο</h4>
      <p className="text-sm text-red-400 mb-4">Όλα τα ραντεβού έχουν κλειστεί</p>
      <button disabled className="w-full px-4 py-2.5 bg-red-500/20 text-red-400 rounded-lg cursor-not-allowed">
        Μη διαθέσιμο
      </button>
    </div>
  </div>
)

/* ─────────────────────────────── CARD ───────────────────────────── */
function Card({ list = false, service, selected, onSelect, onBook, onNavigate, loading }) {
  const free = service.service_slots.filter((s) => !s.booked)
  const stop = (e) => e.stopPropagation() // for inner controls only

  return (
    <article
      onClick={() => onNavigate(`/service/${service.id}`)}
      className={`relative overflow-hidden rounded-2xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-white/20 transition ${
        list ? "flex flex-col lg:flex-row min-h-[12rem]" : "flex flex-col h-full"
      }`}
      style={{ cursor: "pointer" }}
    >
      {/* image / thumb */}
      <div className={list ? "relative h-48 lg:h-auto lg:w-60 shrink-0" : "relative h-48"}>
        <img
          src={service.mainImage}
          alt={service.title}
          onError={(e) => {
            e.currentTarget.onerror = null
            e.currentTarget.src = SERVICE_PLACEHOLDER
          }}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div
          className={list ? "absolute inset-0 lg:bg-gradient-to-r" : "absolute inset-0"}
          style={{ background: "linear-gradient(180deg,rgba(0,0,0,.6),transparent)" }}
        />
        <div className="absolute top-3 left-3">
          {service.is_virtual ? (
            <Badge color="emerald" icon={Globe} label="Online" />
          ) : (
            <Badge color="amber" icon={MapPin} label="Από κοντά" />
          )}
        </div>
        <div className="absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-black/80 text-white text-sm font-semibold flex items-center gap-1">
          <Euro className="h-3.5 w-3.5" />
          {service.price}
        </div>
      </div>

      {/* content */}
      <div className={`${list ? "flex flex-col flex-1 p-6" : "flex flex-col flex-1 p-5"}`} onClick={stop}>
        <div className="flex-1">
          <h3 className={`${list ? "text-xl" : "text-lg"} font-semibold text-white mb-1`}>{service.title}</h3>

          {/* avatar row (detail‑style) */}
          <div className="flex items-center gap-2 text-gray-400 mb-2">
            <div className="w-5 h-5 rounded-full bg-white/10 overflow-hidden flex items-center justify-center">
              {service.trainer?.avatar_url ? (
                <img
                  src={service.trainer.avatar_url}
                  alt={service.trainer.full_name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.onerror = null
                    e.currentTarget.src = AVATAR_PLACEHOLDER
                  }}
                />
              ) : (
                <User className="h-4 w-4" />
              )}
            </div>
            <span className="text-sm">{service.trainer?.full_name || "Trainer"}</span>
          </div>

          <p className="text-gray-300 text-sm leading-relaxed line-clamp-2">{service.description}</p>

          {/* all tags, sparkle‑pill style */}
          {service.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {service.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white/10 border border-white/20 text-gray-300 text-xs"
                >
                  <Sparkles className="h-3 w-3" />
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* booking */}
        <div className="pt-4 border-t border-white/10">
          {free.length > 0 ? (
            <>
              <select
                value={selected || ""}
                onChange={(e) => {
                  stop(e)
                  onSelect(e.target.value)
                }}
                className="w-full px-3 py-2.5 mb-3 bg-white/5 border border-white/10 rounded-lg text-white text-sm appearance-none"
                style={{
                  backgroundImage:
                    "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='m6 8 4 4 4-4'/%3e%3c/svg%3e\")",
                  backgroundPosition: "right .5rem center",
                  backgroundRepeat: "no-repeat",
                  backgroundSize: "1.5em 1.5em",
                }}
              >
                <option value="" disabled className="bg-black text-white">
                  Επιλέξτε διαθέσιμη ώρα
                </option>
                {free.map((sl) => (
                  <option key={sl.id} value={sl.id} className="bg-black text-white">
                    {fmt(sl.starts_at)}
                  </option>
                ))}
              </select>

              <button
                onClick={(e) => {
                  stop(e)
                  onBook(service.id)
                }}
                disabled={!selected || loading}
                className={`w-full px-4 py-2.5 rounded-lg font-semibold flex items-center justify-center gap-2 ${
                  selected && !loading
                    ? "bg-gray-400 text-black hover:bg-gray-300"
                    : "bg-white/10 text-gray-500 cursor-not-allowed"
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                    Κράτηση…
                  </>
                ) : selected ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Κράτηση
                  </>
                ) : (
                  <>
                    <Timer className="h-4 w-4" />
                    Επιλέξτε ώρα
                  </>
                )}
              </button>
            </>
          ) : (
            <Booked />
          )}
        </div>
      </div>
    </article>
  )
}
