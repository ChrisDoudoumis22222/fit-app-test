"use client"

import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  Search,
  Filter,
  Grid3X3,
  List,
  Calendar,
  Users,
  Star,
  MapPin,
  Globe,
  Clock,
  Euro,
  Tag,
  Sparkles,
  ChevronDown,
  ChevronRight,
  Heart,
  BookOpen,
  Zap,
  TrendingUp,
  Award,
  CheckCircle,
  AlertCircle,
} from "lucide-react"

import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import UserMenu from "../components/UserMenu"
import TrainerMenu from "../components/TrainerMenu"
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg"

export default function ServicesMarketplacePage() {
  const { profile, loading } = useAuth()
  const navigate = useNavigate()
  const Menu = profile?.role === "trainer" ? TrainerMenu : UserMenu

  const [services, setServices] = useState([])
  const [filteredServices, setFilteredServices] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [msg, setMsg] = useState("")
  const [selectedSlots, setSelectedSlots] = useState({})
  const [viewMode, setViewMode] = useState("grid") // grid or list
  const [sortBy, setSortBy] = useState("newest")
  const [filterCategory, setFilterCategory] = useState("all")
  const [showFilters, setShowFilters] = useState(false)

  // Fetch all services once
  useEffect(() => {
    ;(async () => {
      const { data, error } = await supabase
        .from("services")
        .select(`
          *,
          trainer:profiles(full_name),
          service_extras(*),
          service_slots(id,starts_at,booked)
        `)
        .order("created_at", { ascending: false })

      if (error) setMsg(error.message)
      else {
        setServices(data ?? [])
        setFilteredServices(data ?? [])
      }
    })()
  }, [])

  // Filter and sort services
  useEffect(() => {
    let filtered = services

    // Search filter
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase()
      filtered = filtered.filter(
        (s) =>
          (s.title ?? "").toLowerCase().includes(q) ||
          (s.description ?? "").toLowerCase().includes(q) ||
          (s.trainer?.full_name ?? "").toLowerCase().includes(q) ||
          (s.tags ?? []).some((t) => t.toLowerCase().includes(q)),
      )
    }

    // Category filter
    if (filterCategory !== "all") {
      filtered = filtered.filter((s) => {
        if (filterCategory === "virtual") return s.is_virtual
        if (filterCategory === "in-person") return !s.is_virtual
        if (filterCategory === "available") return s.service_slots.some((slot) => !slot.booked)
        return (s.tags ?? []).some((tag) => tag.toLowerCase().includes(filterCategory))
      })
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "price-low":
          return a.price - b.price
        case "price-high":
          return b.price - a.price
        case "name":
          return (a.title || "").localeCompare(b.title || "")
        case "trainer":
          return (a.trainer?.full_name || "").localeCompare(b.trainer?.full_name || "")
        default: // newest
          return new Date(b.created_at) - new Date(a.created_at)
      }
    })

    setFilteredServices(filtered)
  }, [searchTerm, services, sortBy, filterCategory])

  // Booking function
  const book = async (sid, slotId) => {
    if (!slotId) return setMsg("Choose a slot first")

    const { error } = await supabase.from("bookings").insert({ service_id: sid, user_id: profile.id, slot_id: slotId })

    if (error) return setMsg(`Error: ${error.message}`)

    await supabase.from("service_slots").update({ booked: true }).eq("id", slotId)

    setServices((prev) =>
      prev.map((s) =>
        s.id === sid
          ? {
              ...s,
              service_slots: s.service_slots.map((sl) => (sl.id === slotId ? { ...sl, booked: true } : sl)),
            }
          : s,
      ),
    )
    setMsg("✅ Booking created successfully!")
    setTimeout(() => setMsg(""), 4000)
  }

  const handleSlotChange = (serviceId, slotId) => {
    setSelectedSlots((prev) => ({ ...prev, [serviceId]: slotId }))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600"></div>
          <p className="text-gray-500">Φόρτωση υπηρεσιών...</p>
        </div>
      </div>
    )
  }

  const availableServices = services.filter((s) => s.service_slots.some((slot) => !slot.booked))
  const uniqueTrainers = new Set(services.map((s) => s.trainer?.full_name)).size

  return (
    <div className="min-h-screen bg-white">
      <Menu />

      {/* Hero Section */}
      <section
        className="relative overflow-hidden rounded-3xl mx-4 mt-8 shadow-xl ring-1 ring-gray-200"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Background decoration */}
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

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200 text-center">
              <div className="p-2 rounded-lg bg-blue-100 w-fit mx-auto mb-2">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <p className="text-sm text-gray-600">Συνολικές Υπηρεσίες</p>
              <p className="text-2xl font-bold text-gray-900">{services.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200 text-center">
              <div className="p-2 rounded-lg bg-green-100 w-fit mx-auto mb-2">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-sm text-gray-600">Προπονητές</p>
              <p className="text-2xl font-bold text-gray-900">{uniqueTrainers}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200 text-center">
              <div className="p-2 rounded-lg bg-purple-100 w-fit mx-auto mb-2">
                <CheckCircle className="h-5 w-5 text-purple-600" />
              </div>
              <p className="text-sm text-gray-600">Διαθέσιμες</p>
              <p className="text-2xl font-bold text-gray-900">{availableServices.length}</p>
            </div>
            <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200 text-center">
              <div className="p-2 rounded-lg bg-orange-100 w-fit mx-auto mb-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
              </div>
              <p className="text-sm text-gray-600">Πρόσθετα</p>
              <p className="text-2xl font-bold text-gray-900">
                {services.reduce((acc, s) => acc + (s.service_extras?.length || 0), 0)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <main className="mx-auto max-w-7xl px-4 py-8 space-y-6">
        {/* Search and Controls */}
        <section
          className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-gray-200"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
          }}
        >
          <div className="p-6">
            {/* Main Controls */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              {/* Search */}
              <div className="relative flex-grow">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Αναζήτηση υπηρεσιών, προπονητών, κατηγοριών..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {/* Controls Row */}
              <div className="flex gap-3 flex-wrap">
                {/* Filters Toggle */}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 ${
                    showFilters ? "bg-gray-800 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  <Filter className="h-4 w-4" />
                  Φίλτρα
                  {showFilters ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>

                {/* View Mode */}
                <div className="flex rounded-xl overflow-hidden border border-gray-300">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={`flex items-center gap-2 px-4 py-3 transition-all duration-200 ${
                      viewMode === "grid" ? "bg-gray-800 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <Grid3X3 className="h-4 w-4" />
                    Grid
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={`flex items-center gap-2 px-4 py-3 transition-all duration-200 border-l border-gray-300 ${
                      viewMode === "list" ? "bg-gray-800 text-white" : "bg-white text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <List className="h-4 w-4" />
                    List
                  </button>
                </div>

                {/* Sort */}
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="px-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                >
                  <option value="newest">Νεότερες</option>
                  <option value="price-low">Τιμή: Χαμηλή προς Υψηλή</option>
                  <option value="price-high">Τιμή: Υψηλή προς Χαμηλή</option>
                  <option value="name">Όνομα A-Z</option>
                  <option value="trainer">Προπονητής A-Z</option>
                </select>
              </div>
            </div>

            {/* Filters Panel */}
            {showFilters && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Κατηγορίες
                </h3>
                <div className="flex flex-wrap gap-3">
                  {[
                    { id: "all", label: "Όλες", icon: Star },
                    { id: "virtual", label: "Online", icon: Globe },
                    { id: "in-person", label: "Από κοντά", icon: MapPin },
                    { id: "available", label: "Διαθέσιμες", icon: CheckCircle },
                    { id: "fitness", label: "Fitness", icon: Zap },
                    { id: "yoga", label: "Yoga", icon: Heart },
                    { id: "nutrition", label: "Διατροφή", icon: Award },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      onClick={() => setFilterCategory(id)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                        filterCategory === id
                          ? "bg-gray-800 text-white shadow-md transform scale-105"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
                      }`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Active Filters */}
            {(searchTerm || filterCategory !== "all") && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-200">
                <span className="text-sm text-gray-600">Ενεργά φίλτρα:</span>
                {searchTerm && (
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                    Αναζήτηση: "{searchTerm}"
                  </span>
                )}
                {filterCategory !== "all" && (
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
                    Κατηγορία: {filterCategory}
                  </span>
                )}
                <button
                  onClick={() => {
                    setSearchTerm("")
                    setFilterCategory("all")
                  }}
                  className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm hover:bg-gray-200 transition-colors"
                >
                  Καθαρισμός
                </button>
              </div>
            )}
          </div>
        </section>

        {/* Results Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-gray-600" />
            Αποτελέσματα
            <span className="text-lg font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {filteredServices.length}
            </span>
          </h2>
        </div>

        {/* Messages */}
        {msg && (
          <div
            className={`p-4 rounded-xl border ${
              msg.includes("Error") || msg.includes("⚠️")
                ? "bg-red-50 border-red-200 text-red-800"
                : "bg-green-50 border-green-200 text-green-800"
            }`}
          >
            <div className="flex items-center gap-2">
              {msg.includes("Error") || msg.includes("⚠️") ? (
                <AlertCircle className="h-5 w-5" />
              ) : (
                <CheckCircle className="h-5 w-5" />
              )}
              {msg}
            </div>
          </div>
        )}

        {/* Services Grid/List */}
        {filteredServices.length === 0 ? (
          <div className="text-center py-20">
            <div className="p-6 rounded-full bg-gray-100 mb-6 inline-block">
              <Search className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Δεν βρέθηκαν υπηρεσίες</h3>
            <p className="text-gray-500 max-w-md mx-auto">
              Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης ή τα φίλτρα σας.
            </p>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
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
  )
}

/* Enhanced Service Card Component */
function ServiceCard({ service, viewMode, selectedSlot, onSlotChange, onBook, onNavigate }) {
  const freeSlots = service.service_slots.filter((slot) => !slot.booked)
  const hasExtras = service.service_extras?.length > 0

  const handleCardClick = (e) => {
    const target = e.target
    if (!["BUTTON", "SELECT", "OPTION"].includes(target.tagName)) {
      onNavigate(`/service/${service.id}`)
    }
  }

  if (viewMode === "list") {
    return (
      <article
        onClick={handleCardClick}
        className="group flex items-center gap-6 p-6 rounded-2xl cursor-pointer transition-all duration-300 hover:shadow-lg hover:scale-[1.01]"
        style={{
          background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
          backdropFilter: "blur(20px) saturate(180%)",
          WebkitBackdropFilter: "blur(20px) saturate(180%)",
          boxShadow: "0 4px 20px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
        }}
      >
        {/* Image */}
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

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between mb-2">
            <h3 className="text-lg font-semibold text-gray-900 truncate">{service.title}</h3>
            <span className="flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-800 rounded-full text-sm font-medium ml-4">
              <Euro className="h-4 w-4" />
              {service.price}
            </span>
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
            <span className="flex items-center gap-1">
              <Users className="h-4 w-4" />
              {service.trainer?.full_name || "Trainer"}
            </span>
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {freeSlots.length} διαθέσιμα
            </span>
            {hasExtras && (
              <span className="flex items-center gap-1">
                <Sparkles className="h-4 w-4" />
                {service.service_extras.length} πρόσθετα
              </span>
            )}
          </div>

          <p className="text-gray-600 text-sm line-clamp-1">{service.description}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 flex-shrink-0">
          {freeSlots.length > 0 ? (
            <>
              <select
                value={selectedSlot || ""}
                onChange={(e) => onSlotChange(service.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                <option value="">Επιλέξτε ώρα</option>
                {freeSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {new Date(slot.starts_at).toLocaleDateString("el-GR")}
                  </option>
                ))}
              </select>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (selectedSlot) {
                    onBook(service.id, selectedSlot)
                  }
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
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="px-4 py-2 rounded-lg bg-gradient-to-r from-red-50 to-red-100 border border-red-200 text-red-700 font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Πλήρως κλεισμένο
              </div>
            </div>
          )}
        </div>
      </article>
    )
  }

  // Grid View
  return (
    <article
      onClick={handleCardClick}
      className="group relative overflow-hidden rounded-3xl cursor-pointer transition-all duration-500 hover:shadow-xl hover:scale-[1.02]"
      style={{
        background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
      }}
    >
      {/* Hero Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={service.image_url || SERVICE_PLACEHOLDER}
          alt={service.title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Badges */}
        <div className="absolute top-4 left-4">
          {service.is_virtual ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-600/90 backdrop-blur-sm text-white text-sm font-medium shadow-lg">
              <Globe className="h-4 w-4" />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-600/90 backdrop-blur-sm text-white text-sm font-medium shadow-lg">
              <MapPin className="h-4 w-4" />
              Από κοντά
            </span>
          )}
        </div>

        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-sm font-bold shadow-lg">
            <Euro className="h-4 w-4" />
            {service.price}
          </span>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white mb-1">{service.title}</h3>
          <p className="text-white/80 text-sm flex items-center gap-2">
            <Users className="h-4 w-4" />
            {service.trainer?.full_name || "Trainer"}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Description */}
        <p className="text-gray-600 text-sm line-clamp-2 leading-relaxed">{service.description}</p>

        {/* Tags */}
        {service.tags && service.tags.length > 0 && (
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

        {/* Extras */}
        {hasExtras && (
          <div className="p-3 rounded-xl bg-white/60 border border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-purple-600" />
              <span className="text-sm font-medium text-gray-900">Πρόσθετα διαθέσιμα</span>
            </div>
            <div className="text-xs text-gray-600">
              {service.service_extras.slice(0, 2).map((extra, index) => (
                <span key={extra.id}>
                  {extra.title} (€{extra.price}){index < Math.min(service.service_extras.length, 2) - 1 && ", "}
                </span>
              ))}
              {service.service_extras.length > 2 && <span> +{service.service_extras.length - 2} ακόμη</span>}
            </div>
          </div>
        )}

        {/* Booking Section */}
        <div className="space-y-3 pt-4 border-t border-gray-200">
          {freeSlots.length > 0 ? (
            <>
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <Calendar className="h-4 w-4" />
                {freeSlots.length} διαθέσιμα ραντεβού
              </div>
              <select
                value={selectedSlot || ""}
                onChange={(e) => onSlotChange(service.id, e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="w-full px-4 py-3 bg-white border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
              >
                <option value="">Επιλέξτε ημερομηνία και ώρα</option>
                {freeSlots.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {new Date(slot.starts_at).toLocaleDateString("el-GR")} στις{" "}
                    {new Date(slot.starts_at).toLocaleTimeString("el-GR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </option>
                ))}
              </select>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  if (selectedSlot) {
                    onBook(service.id, selectedSlot)
                  }
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
            <div className="text-center py-6">
              <div className="relative p-6 rounded-2xl bg-gradient-to-br from-red-50 via-red-25 to-orange-50 border border-red-200 overflow-hidden">
                {/* Background decoration */}
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

                  <div className="space-y-2">
                    <button
                      disabled
                      className="w-full px-4 py-3 bg-gradient-to-r from-red-200 to-red-300 text-red-700 rounded-xl cursor-not-allowed font-medium border border-red-300"
                    >
                      Μη Διαθέσιμο
                    </button>
                    <p className="text-xs text-red-500">Επικοινωνήστε με τον προπονητή για νέα ραντεβού</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </article>
  )
}
