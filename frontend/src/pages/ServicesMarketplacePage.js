/*  ServicesMarketplacePage.jsx – Glass-Light marketplace v1.6
    ───────────────────────────────────────────────────────────
    • Accept / Decline pop-ups (lazy-loaded)
    • FK-safe booking logic  (slot_id → number, trainer_id, booking_date)
    • All sub-components in one file – just paste & save
*/

"use client";

import {
  lazy, Suspense, useEffect, useState,
} from "react";
import { useNavigate } from "react-router-dom";
import {
  Search, Filter, Grid3X3, List, Calendar, Users, Star, MapPin, Globe, Clock,
  Euro, Tag, Sparkles, ChevronDown, ChevronRight, Heart, BookOpen, Zap,
  TrendingUp, Award, CheckCircle,
} from "lucide-react";

import { supabase }            from "../supabaseClient";
import { useAuth }             from "../AuthProvider";
import UserMenu                from "../components/UserMenu";
import TrainerMenu             from "../components/TrainerMenu";
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg";

/* ── lazy-loaded pop-ups ───────────────────────────────────── */
const AcceptPopup  = lazy(() => import("../components/AcceptBookingPopup"));
const DeclinePopup = lazy(() => import("../components/DeclineBookingPopup"));

/* ════════════════════════════════════════════════════════════ */
export default function ServicesMarketplacePage() {
  const { profile, loading } = useAuth();
  const navigate              = useNavigate();
  const Menu                  = profile?.role === "trainer" ? TrainerMenu : UserMenu;

  /* ── state ──────────────────────────────────────────────── */
  const [services,         setServices]         = useState([]);
  const [filteredServices, setFilteredServices] = useState([]);
  const [searchTerm,       setSearchTerm]       = useState("");
  const [selectedSlots,    setSelectedSlots]    = useState({});
  const [viewMode,         setViewMode]         = useState("grid");
  const [sortBy,           setSortBy]           = useState("newest");
  const [filterCategory,   setFilterCategory]   = useState("all");
  const [showFilters,      setShowFilters]      = useState(false);

  /* pop-up modals */
  const [acceptOpen,  setAcceptOpen]  = useState(false);
  const [declineOpen, setDeclineOpen] = useState({ open: false, message: "" });

  /* ── 1. fetch services once ─────────────────────────────── */
  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          trainer:profiles(id, full_name),
          service_extras(*),
          service_slots(id, starts_at, booked)
        `)
        .order("created_at", { ascending: false });

      if (error) {
        setDeclineOpen({ open: true, message: error.message });
      } else {
        setServices(data ?? []);
        setFilteredServices(data ?? []);
      }
    })();
  }, []);

  /* ── 2. client-side search / filter / sort ─────────────── */
  useEffect(() => {
    let out = [...services];

    /* search */
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      out = out.filter(
        (s) =>
          (s.title ?? "").toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q) ||
          (s.trainer?.full_name ?? "").toLowerCase().includes(q) ||
          (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      );
    }

    /* category */
    if (filterCategory !== "all") {
      out = out.filter((s) => {
        if (filterCategory === "virtual")   return s.is_virtual;
        if (filterCategory === "in-person") return !s.is_virtual;
        if (filterCategory === "available") return s.service_slots.some((sl) => !sl.booked);
        return (s.tags ?? []).some((t) => t.toLowerCase().includes(filterCategory));
      });
    }

    /* sort */
    out.sort((a, b) => {
      switch (sortBy) {
        case "price-low":  return a.price - b.price;
        case "price-high": return b.price - a.price;
        case "name":       return (a.title || "").localeCompare(b.title || "");
        case "trainer":    return (a.trainer?.full_name || "").localeCompare(b.trainer?.full_name || "");
        default:           return new Date(b.created_at) - new Date(a.created_at);
      }
    });

    setFilteredServices(out);
  }, [searchTerm, services, sortBy, filterCategory]);

  /* ── 3. booking action ─────────────────────────────────── */
  const book = async (serviceId, slotIdRaw) => {
    if (!slotIdRaw) {
      setDeclineOpen({ open: true, message: "⚠️ Επιλέξτε ώρα πρώτα" });
      return;
    }

    const slot_id   = Number(slotIdRaw) || slotIdRaw; // FK integer / uuid safe
    const svc       = services.find((s) => s.id === serviceId);
    const trainerId = svc?.trainer?.id;
    if (!trainerId) {
      setDeclineOpen({ open: true, message: "⚠️ Δεν βρέθηκε προπονητής" });
      return;
    }

    const { error } = await supabase.from("bookings").insert({
      service_id:   serviceId,
      user_id:      profile.id,
      trainer_id:   trainerId,
      slot_id,
      booking_date: new Date().toISOString(),
      status:       "pending",
    });

    if (error) {
      setDeclineOpen({ open: true, message: `Error: ${error.message}` });
      return;
    }

    /* mark slot booked both server & local */
    await supabase.from("service_slots").update({ booked: true }).eq("id", slot_id);
    setServices((prev) =>
      prev.map((s) =>
        s.id === serviceId
          ? { ...s, service_slots: s.service_slots.map((sl) =>
              sl.id === slot_id ? { ...sl, booked: true } : sl) }
          : s,
      ),
    );

    setAcceptOpen(true);
  };

  const handleSlotChange = (svcId, slotId) =>
    setSelectedSlots((prev) => ({ ...prev, [svcId]: Number(slotId) || slotId }));

  /* ── 4. loading splash ─────────────────────────────────── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-gray-600" />
      </div>
    );
  }

  /* quick stats */
  const available = services.filter((s) => s.service_slots.some((sl) => !sl.booked));
  const trainers  = new Set(services.map((s) => s.trainer?.full_name)).size;

  /* ── 5. UI ─────────────────────────────────────────────── */
  return (
    <>
      <div className="min-h-screen bg-white">
        <Menu />

        {/* ═══ Hero ═══ */}
        <Hero services={services} available={available.length} trainers={trainers} />

        {/* ═══ Main ═══ */}
        <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
          <Controls
            searchTerm={searchTerm}          setSearchTerm={setSearchTerm}
            showFilters={showFilters}        setShowFilters={setShowFilters}
            viewMode={viewMode}              setViewMode={setViewMode}
            sortBy={sortBy}                  setSortBy={setSortBy}
            filterCategory={filterCategory}  setFilterCategory={setFilterCategory}
          />

          {filteredServices.length === 0 ? (
            <EmptyState />
          ) : (
            <div className={viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"}
            >
              {filteredServices.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  viewMode={viewMode}
                  selectedSlot={selectedSlots[service.id]}
                  onSlotChange={handleSlotChange}
                  onBook={book}
                  onNavigate={navigate}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      {/* ═══ Pop-ups ═══ */}
      <Suspense fallback={null}>
        {acceptOpen && <AcceptPopup onClose={() => setAcceptOpen(false)} />}
        {declineOpen.open && (
          <DeclinePopup
            message={declineOpen.message}
            onClose={() => setDeclineOpen({ open: false, message: "" })}
          />
        )}
      </Suspense>
    </>
  );
}

/* ═════════════════════════ sub-components ══════════════════════ */

/* ---------- Hero ---------- */
function Hero({ services, available, trainers }) {
  return (
    <section
      className="relative overflow-hidden rounded-3xl mx-4 mt-8 shadow-xl ring-1 ring-gray-200"
      style={{
        background:
          "linear-gradient(135deg,rgba(255,255,255,.95)0%,rgba(248,250,252,.9)100%)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 10px 30px -5px rgba(0,0,0,.1),0 0 0 1px rgba(0,0,0,.05)",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gray-100 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gray-200 rounded-full blur-2xl" />
      </div>

      <div className="relative p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Marketplace Υπηρεσιών</h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Ανακαλύψτε και κλείστε ραντεβού με επαγγελματίες προπονητές
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard icon={BookOpen}    color="blue"   label="Συνολικές Υπηρεσίες" value={services.length} />
          <StatCard icon={Users}       color="green"  label="Προπονητές"          value={trainers} />
          <StatCard icon={CheckCircle} color="purple" label="Διαθέσιμες"          value={available} />
          <StatCard
            icon={TrendingUp}
            color="orange"
            label="Πρόσθετα"
            value={services.reduce((a, s) => a + (s.service_extras?.length || 0), 0)}
          />
        </div>
      </div>
    </section>
  );
}

/* small coloured stat card */
function StatCard({ icon: Icon, color, label, value }) {
  const bg  = { blue:"bg-blue-100", green:"bg-green-100", purple:"bg-purple-100", orange:"bg-orange-100" }[color];
  const txt = { blue:"text-blue-600", green:"text-green-600", purple:"text-purple-600", orange:"text-orange-600" }[color];
  return (
    <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200 text-center">
      <div className={`p-2 rounded-lg ${bg} w-fit mx-auto mb-2`}>
        <Icon className={`h-5 w-5 ${txt}`} />
      </div>
      <p className="text-sm text-gray-600">{label}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

/* ---------- Controls (search + view + sort + filters) ---------- */
function Controls({
  searchTerm, setSearchTerm,
  showFilters, setShowFilters,
  viewMode, setViewMode,
  sortBy, setSortBy,
  filterCategory, setFilterCategory,
}) {
  return (
    <section
      className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-gray-200"
      style={{
        background:
          "linear-gradient(135deg,rgba(255,255,255,.95)0%,rgba(248,250,252,.9)100%)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
      }}
    >
      <div className="p-6">
        {/* search row */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6">
          <div className="relative flex-grow">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Αναζήτηση υπηρεσιών, προπονητών, κατηγοριών..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl
                         text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2
                         focus:ring-gray-500 focus:border-transparent transition-all duration-200"
            />
          </div>

          {/* buttons */}
          <div className="flex gap-3 flex-wrap">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                showFilters
                  ? "bg-gray-800 text-white shadow-md"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Filter className="h-4 w-4" /> Φίλτρα{" "}
              {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            </button>

            <div className="flex rounded-xl overflow-hidden border border-gray-300">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex items-center gap-2 px-4 py-3 transition-all duration-200 ${
                  viewMode === "grid" ? "bg-gray-800 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Grid3X3 className="h-4 w-4" /> Grid
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex items-center gap-2 px-4 py-3 transition-all duration-200 border-l border-gray-300 ${
                  viewMode === "list" ? "bg-gray-800 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                }`}
              >
                <List className="h-4 w-4" /> List
              </button>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-800
                         focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent
                         transition-all duration-200"
            >
              <option value="newest">Νεότερες</option>
              <option value="price-low">Τιμή: Χαμηλή → Υψηλή</option>
              <option value="price-high">Τιμή: Υψηλή → Χαμηλή</option>
              <option value="name">Όνομα A-Z</option>
              <option value="trainer">Προπονητής A-Z</option>
            </select>
          </div>
        </div>

        {showFilters && (
          <FiltersPanel filterCategory={filterCategory} setFilterCategory={setFilterCategory} />
        )}

        {(searchTerm || filterCategory !== "all") && (
          <ActiveFilters
            searchTerm={searchTerm}
            filterCategory={filterCategory}
            clear={() => {
              setSearchTerm("");
              setFilterCategory("all");
            }}
          />
        )}
      </div>
    </section>
  );
}

/* ---------- Filters panel ---------- */
function FiltersPanel({ filterCategory, setFilterCategory }) {
  const cats = [
    { id:"all",       label:"Όλες",        icon:Star },
    { id:"virtual",   label:"Online",      icon:Globe },
    { id:"in-person", label:"Από κοντά",   icon:MapPin },
    { id:"available", label:"Διαθέσιμες",  icon:CheckCircle },
    { id:"fitness",   label:"Fitness",     icon:Zap },
    { id:"yoga",      label:"Yoga",        icon:Heart },
    { id:"nutrition", label:"Διατροφή",    icon:Award },
  ];
  return (
    <div className="border-t border-gray-200 pt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Tag className="h-5 w-5" /> Κατηγορίες
      </h3>
      <div className="flex flex-wrap gap-3">
        {cats.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setFilterCategory(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 ${
              filterCategory === id
                ? "bg-gray-800 text-white shadow-md transform scale-105"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
            }`}
          >
            <Icon className="h-4 w-4" /> {label}
          </button>
        ))}
      </div>
    </div>
  );
}

/* active filters pills */
function ActiveFilters({ searchTerm, filterCategory, clear }) {
  return (
    <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
      <span className="text-sm text-gray-600">Ενεργά φίλτρα:</span>
      {searchTerm && (
        <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
          Αναζήτηση: “{searchTerm}”
        </span>
      )}
      {filterCategory !== "all" && (
        <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
          Κατηγορία: {filterCategory}
        </span>
      )}
      <button
        onClick={clear}
        className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
      >
        Καθαρισμός
      </button>
    </div>
  );
}

/* ---------- empty state ---------- */
function EmptyState() {
  return (
    <div className="text-center py-20">
      <div className="p-6 rounded-full bg-gray-100 mb-6 inline-block">
        <Search className="h-12 w-12 text-gray-400" />
      </div>
      <h3 className="text-xl font-semibold text-gray-900 mb-2">Δεν βρέθηκαν υπηρεσίες</h3>
      <p className="text-gray-500 max-w-md mx-auto">
        Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης ή τα φίλτρα σας.
      </p>
    </div>
  );
}

/* ---------- Service card (list + grid) ---------- */
function ServiceCard({
  service,
  viewMode,
  selectedSlot,
  onSlotChange,
  onBook,
  onNavigate,
}) {
  const freeSlots = service.service_slots.filter((sl) => !sl.booked);
  const hasExtras = service.service_extras?.length > 0;

  const clickCard = (e) => {
    const tag = e.target.tagName;
    if (!["BUTTON", "SELECT", "OPTION"].includes(tag)) {
      onNavigate(`/service/${service.id}`);
    }
  };

  /* ─── list view ─── */
  if (viewMode === "list") {
    return (
      <article
        onClick={clickCard}
        className="group flex items-center gap-6 p-6 rounded-2xl cursor-pointer
                   transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
        style={{
          background:
            "linear-gradient(135deg,rgba(255,255,255,.95)0%,rgba(248,250,252,.9)100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          boxShadow: "0 4px 20px -5px rgba(0,0,0,.1),0 0 0 1px rgba(0,0,0,.05)",
        }}
      >
        {/* img */}
        <div className="relative w-32 h-24 rounded-xl overflow-hidden flex-shrink-0">
          <img
            src={service.image_url || SERVICE_PLACEHOLDER}
            alt={service.title}
            className="w-full h-full object-cover"
          />
          {service.is_virtual && (
            <span className="absolute top-2 right-2 p-1 bg-emerald-600 text-white rounded-md">
              <Globe className="h-3 w-3" />
            </span>
          )}
        </div>

        {/* content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{service.title}</h3>
            <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium ml-4">
              <Euro className="h-4 w-4" /> {service.price}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" /> {service.trainer?.full_name || "Trainer"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" /> {freeSlots.length} διαθέσιμα
            </span>
            {hasExtras && (
              <span className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" /> {service.service_extras.length} πρόσθετα
              </span>
            )}
          </div>

          <p className="text-gray-600 text-sm line-clamp-1">{service.description}</p>
        </div>

        {/* actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {freeSlots.length > 0 ? (
            <>
              <select
                value={selectedSlot || ""}
                onChange={(e) => onSlotChange(service.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="">Επιλέξτε ώρα</option>
                {freeSlots.map((sl) => (
                  <option key={sl.id} value={sl.id}>
                    {new Date(sl.starts_at).toLocaleDateString("el-GR")}
                  </option>
                ))}
              </select>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedSlot) onBook(service.id, selectedSlot);
                }}
                disabled={!selectedSlot}
                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                  selectedSlot
                    ? "bg-gray-800 text-white hover:bg-gray-700"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                Κράτηση
              </button>
            </>
          ) : (
            <div className="px-4 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 font-medium flex items-center gap-2">
              <Clock className="h-4 w-4" /> Πλήρως κλεισμένο
            </div>
          )}
        </div>
      </article>
    );
  }

  /* ─── grid view ─── */
  return (
    <article
      onClick={clickCard}
      className="group relative overflow-hidden rounded-3xl cursor-pointer
                 transition-all duration-500 hover:shadow-xl hover:scale-[1.02]"
      style={{
        background:
          "linear-gradient(135deg,rgba(255,255,255,.95)0%,rgba(248,250,252,.9)100%)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 10px 30px -5px rgba(0,0,0,.1),0 0 0 1px rgba(0,0,0,.05)",
      }}
    >
      {/* hero image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={service.image_url || SERVICE_PLACEHOLDER}
          alt={service.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        <div className="absolute top-4 left-4">
          {service.is_virtual
            ? <BadgePill color="emerald" icon={Globe} label="Online" />
            : <BadgePill color="amber"   icon={MapPin} label="Από κοντά" />}
        </div>
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70
                           backdrop-blur-sm text-white text-sm font-bold shadow-lg">
            <Euro className="h-4 w-4" /> {service.price}
          </span>
        </div>

        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white mb-1">{service.title}</h3>
          <p className="text-white/80 text-sm flex items-center gap-2">
            <Users className="h-4 w-4" /> {service.trainer?.full_name || "Trainer"}
          </p>
        </div>
      </div>

      {/* body */}
      <div className="p-6 space-y-4">
        <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{service.description}</p>

        {service.tags?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {service.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                {tag}
              </span>
            ))}
            {service.tags.length > 3 && (
              <span className="px-3 py-1 rounded-full bg-gray-800 text-white text-xs font-medium">
                +{service.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {hasExtras && (
          <div className="p-3 rounded-xl bg-white/60 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">Πρόσθετα διαθέσιμα</span>
            </div>
            <div className="text-xs text-gray-600">
              {service.service_extras.slice(0, 2).map((extra, i) => (
                <span key={extra.id}>
                  {extra.title} (€{extra.price})
                  {i < Math.min(service.service_extras.length, 2) - 1 && ", "}
                </span>
              ))}
              {service.service_extras.length > 2 && (
                <span> +{service.service_extras.length - 2} ακόμη</span>
              )}
            </div>
          </div>
        )}

        {/* booking */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          {freeSlots.length > 0 ? (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" /> {freeSlots.length} διαθέσιμα ραντεβού
              </div>

              <select
                value={selectedSlot || ""}
                onChange={(e) => onSlotChange(service.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm
                           focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent
                           transition-all duration-200"
              >
                <option value="">Επιλέξτε ημερομηνία και ώρα</option>
                {freeSlots.map((sl) => (
                  <option key={sl.id} value={sl.id}>
                    {new Date(sl.starts_at).toLocaleDateString("el-GR")} στις{" "}
                    {new Date(sl.starts_at).toLocaleTimeString("el-GR", { hour:"2-digit", minute:"2-digit" })}
                  </option>
                ))}
              </select>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (selectedSlot) onBook(service.id, selectedSlot);
                }}
                disabled={!selectedSlot}
                className={`w-full px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                  selectedSlot
                    ? "bg-gray-800 text-white hover:bg-gray-700 hover:shadow-lg"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
              >
                {selectedSlot ? "Κλείστε Ραντεβού" : "Επιλέξτε ώρα πρώτα"}
              </button>
            </>
          ) : (
            <FullyBookedNotice />
          )}
        </div>
      </div>
    </article>
  );
}

/* pill badge helper */
function BadgePill({ color, icon: Icon, label }) {
  const bg = color === "emerald" ? "bg-emerald-600/90"
           : color === "amber"   ? "bg-amber-600/90"
           : "bg-gray-600/90";
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full ${bg}
                      backdrop-blur-sm text-white text-sm font-medium shadow-lg`}>
      <Icon className="h-4 w-4" /> {label}
    </span>
  );
}

/* fully-booked notice */
function FullyBookedNotice() {
  return (
    <div className="text-center py-6">
      <div className="relative p-6 rounded-2xl bg-gradient-to-br from-red-50 via-red-25 to-orange-50
                      border border-red-200 overflow-hidden">
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-2 right-2 w-16 h-16 bg-red-100 rounded-full blur-xl opacity-60" />
          <div className="absolute bottom-2 left-2 w-12 h-12 bg-orange-100 rounded-full blur-lg opacity-40" />
        </div>

        <div className="relative">
          <div className="p-3 rounded-full bg-red-100 w-fit mx-auto mb-3">
            <Clock className="h-6 w-6 text-red-600" />
          </div>
          <h4 className="font-semibold text-red-800 mb-2">Πλήρως Κλεισμένο</h4>
          <p className="text-sm text-red-600 mb-4">Όλα τα ραντεβού έχουν κλειστεί</p>

          <button
            disabled
            className="w-full px-4 py-3 bg-gradient-to-r from-red-200 to-red-300 text-red-700
                       rounded-xl cursor-not-allowed font-medium border border-red-300"
          >
            Μη Διαθέσιμο
          </button>
        </div>
      </div>
    </div>
  );
}
