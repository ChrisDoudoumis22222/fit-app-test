"use client"

import { useEffect, useMemo, useState } from "react"
import {
  TrashIcon,
  PencilIcon,
  ClockIcon,
  PlusIcon,
  SearchIcon,
  GlobeIcon,
  PinIcon,
  Calendar,
  Euro,
  Tag,
  Settings,
  ChevronDown,
  ChevronRight,
  Sparkles,
  Zap,
  Users,
  Star,
} from "lucide-react"

import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"

import TrainerMenu from "../components/TrainerMenu"
import AddExtraModal from "../components/AddExtraModal"
import CreateServiceModal from "../components/CreateServiceModal"
import SlotCalendarManager from "../components/SlotCalendarManager"
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg"

/* helper ─ "a, b" → ["a","b"] */
const tagArray = (csv = "") =>
  csv
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)

export default function TrainerServicesPage() {
  /* ───── auth ───── */
  const { profile, profileLoaded } = useAuth()

  /* ───── server state ───── */
  const [services, setServices] = useState([])
  const [slots, setSlots] = useState({})
  const [extras, setExtras] = useState({})

  /* ───── draft/new-service state ───── */
  const [draft, setDraft] = useState({ title: "", description: "", price: "", tags: "", is_virtual: false })
  const [draftImage, setDraftImage] = useState(null)
  const [draftExtras, setDraftExtras] = useState([])
  const [draftSlots, setDraftSlots] = useState([])

  /* ───── modal flags ───── */
  const [extraModalOpen, setExtraModalOpen] = useState(false)
  const [extraModalTarget, setExtraModalTarget] = useState(null) // null → draft
  const [createModalOpen, setCreateModalOpen] = useState(false)

  /* ───── SEARCH UI state ───── */
  const [q, setQ] = useState("")
  const [tagFilter, setTags] = useState([])

  /* ───── expanded cards state ───── */
  const [expandedCards, setExpandedCards] = useState({})

  /* ───── initial fetch ───── */
  useEffect(() => {
    if (!profile?.id) return
    ;(async () => {
      const { data, error } = await supabase
        .from("services")
        .select("*, service_slots(*), service_extras(*)")
        .eq("trainer_id", profile.id)
        .order("created_at", { ascending: false })

      if (error) {
        console.error(error)
        return
      }

      const slotMap = {}
      const extraMap = {}
      ;(data || []).forEach((srv) => {
        slotMap[srv.id] = srv.service_slots
        extraMap[srv.id] = srv.service_extras
      })

      setServices(data || [])
      setSlots(slotMap)
      setExtras(extraMap)
    })()
  }, [profile?.id])

  /* ───── all distinct tags (memo) ───── */
  const allTags = useMemo(() => [...new Set(services.flatMap((s) => s.tags || []))], [services])

  /* ───── filtered list (memo) ───── */
  const filtered = useMemo(() => {
    if (!q && tagFilter.length === 0) return services

    const qLower = q.toLowerCase()
    return services.filter((s) => {
      const textMatch = !q || s.title.toLowerCase().includes(qLower) || s.description.toLowerCase().includes(qLower)

      const tagMatch = tagFilter.length === 0 || (s.tags || []).some((t) => tagFilter.includes(t))

      return textMatch && tagMatch
    })
  }, [services, q, tagFilter])

  const toggleTag = (tag) => setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]))

  const clearFilters = () => {
    setQ("")
    setTags([])
  }

  const toggleCardExpansion = (serviceId) => {
    setExpandedCards((prev) => ({
      ...prev,
      [serviceId]: !prev[serviceId],
    }))
  }

  /* ───── modal helpers ───── */
  const openExtraModal = (serviceId) => {
    setExtraModalTarget(serviceId)
    setExtraModalOpen(true)
  }

  const handleSaveExtra = async (title, price) => {
    setExtraModalOpen(false)

    /* draft */
    if (extraModalTarget === null) {
      setDraftExtras((pr) => [...pr, { title, price }])
      return
    }

    /* live */
    const { data, error } = await supabase
      .from("service_extras")
      .insert({ service_id: extraModalTarget, title, price })
      .select("*")
      .single()

    if (error) {
      alert(error.message)
      return
    }

    setExtras((pr) => ({
      ...pr,
      [extraModalTarget]: [data, ...(pr[extraModalTarget] || [])],
    }))
  }

  /* ───── slot merge helper ───── */
  const mergeSlots = (serviceId, incoming, action) =>
    setSlots((pr) => ({
      ...pr,
      [serviceId]:
        action === "add"
          ? [...incoming, ...(pr[serviceId] || [])]
          : pr[serviceId].filter((sl) => !incoming.includes(sl.id)),
    }))

  /* ───── CRUD helpers ──────────────── */
  const deleteService = async (id) => {
    if (!confirm("Διαγραφή αυτής της υπηρεσίας;")) return
    await supabase.from("services").delete().eq("id", id)
    setServices((pr) => pr.filter((s) => s.id !== id))
  }

  const deleteSlot = async (slotId, serviceId) => {
    if (!confirm("Διαγραφή αυτού του slot;")) return
    await supabase.from("service_slots").delete().eq("id", slotId)
    setSlots((pr) => ({
      ...pr,
      [serviceId]: pr[serviceId].filter((sl) => sl.id !== slotId),
    }))
  }

  const changeDuration = async (slot, serviceId) => {
    const minutes = Number(prompt("Νέα διάρκεια (λ.)", slot.duration_minutes))
    if (!minutes) return
    await supabase.from("service_slots").update({ duration_minutes: minutes }).eq("id", slot.id)
    setSlots((pr) => ({
      ...pr,
      [serviceId]: pr[serviceId].map((s) => (s.id === slot.id ? { ...s, duration_minutes: minutes } : s)),
    }))
  }

  const changeStart = async (slot, serviceId) => {
    const curr = new Date(slot.starts_at).toISOString().slice(0, 16)
    const inpt = prompt("Νέα ημερομηνία-ώρα (YYYY-MM-DDThh:mm)", curr)
    if (!inpt) return
    const dt = new Date(inpt)
    if (Number.isNaN(dt)) return alert("Μη έγκυρη ημερομηνία")
    await supabase.from("service_slots").update({ starts_at: dt.toISOString() }).eq("id", slot.id)
    setSlots((pr) => ({
      ...pr,
      [serviceId]: pr[serviceId].map((s) => (s.id === slot.id ? { ...s, starts_at: dt.toISOString() } : s)),
    }))
  }

  /* ───── draft: add quick slot ───── */
  const addDraftSlot = () => {
    const dt = prompt("Ώρα έναρξης (YYYY-MM-DDThh:mm)")
    if (!dt) return
    const start = new Date(dt)
    if (Number.isNaN(start)) return alert("Μη έγκυρη ημερομηνία")
    const dur = Number(prompt("Διάρκεια (λ.)", 60))
    if (Number.isNaN(dur) || dur <= 0) return alert("Μη έγκυρη διάρκεια")
    setDraftSlots((pr) => [...pr, { starts_at: start.toISOString(), duration_minutes: dur }])
  }

  const removeLiveExtra = async (exId, serviceId) => {
    await supabase.from("service_extras").delete().eq("id", exId)
    setExtras((pr) => ({
      ...pr,
      [serviceId]: pr[serviceId].filter((e) => e.id !== exId),
    }))
  }

  /* ───── CREATE service (unchanged) ───── */
  const createService = async (e) => {
    e.preventDefault()

    const { data: service, error } = await supabase
      .from("services")
      .insert({
        trainer_id: profile.id,
        ...draft,
        price: Number(draft.price),
        tags: tagArray(draft.tags),
      })
      .select("*")
      .single()
    if (error) {
      alert(error.message)
      return
    }

    /* upload image + extras + slots … same as earlier code */
    /* … */
  }
  const handleCreateService = async (e) => {
    await createService(e)
    setCreateModalOpen(false)
  }

  /* ───── guards ───── */
  if (!profileLoaded) {
    return (
      <>
        <TrainerMenu />
        <div className="flex h-[75vh] items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-600"></div>
            <p className="text-gray-500">Φόρτωση…</p>
          </div>
        </div>
      </>
    )
  }
  if (!profile || profile.role !== "trainer") {
    return (
      <>
        <TrainerMenu />
        <div className="flex h-[75vh] items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-red-500 mb-2">Δεν έχετε άδεια πρόσβασης</h2>
            <p className="text-gray-500">Δεν είστε εξουσιοδοτημένοι να δείτε αυτή τη σελίδα.</p>
          </div>
        </div>
      </>
    )
  }

  /* ───── UI ───── */
  return (
    <div className="min-h-screen bg-white">
      <TrainerMenu />

      {/* modals */}
      <AddExtraModal open={extraModalOpen} onClose={() => setExtraModalOpen(false)} onSave={handleSaveExtra} />
      <CreateServiceModal
        open={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        draft={draft}
        setDraft={setDraft}
        draftImage={draftImage}
        setDraftImage={setDraftImage}
        draftExtras={draftExtras}
        setDraftExtras={setDraftExtras}
        draftSlots={draftSlots}
        setDraftSlots={setDraftSlots}
        handleCreateService={handleCreateService}
        openExtraModal={openExtraModal}
        addDraftSlot={addDraftSlot}
      />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8">
        {/* Hero Section */}
        <section
          className="relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-gray-200"
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
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-2xl bg-gradient-to-r from-gray-100 to-gray-200">
                  <Settings className="h-6 w-6 text-gray-700" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-gray-900">Διαχείριση Υπηρεσιών</h1>
                  <p className="text-gray-600 mt-1">Δημιουργήστε και διαχειριστείτε τις υπηρεσίες σας</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-gray-800 to-gray-700 text-white font-medium transition-all duration-300 hover:from-gray-700 hover:to-gray-600 hover:shadow-lg"
              >
                <PlusIcon className="h-5 w-5" />
                Νέα Υπηρεσία
              </button>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-blue-100">
                    <Star className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Συνολικές Υπηρεσίες</p>
                    <p className="text-xl font-bold text-gray-900">{services.length}</p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-green-100">
                    <Users className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Ενεργά Slots</p>
                    <p className="text-xl font-bold text-gray-900">
                      {
                        Object.values(slots)
                          .flat()
                          .filter((slot) => !slot.booked).length
                      }
                    </p>
                  </div>
                </div>
              </div>
              <div className="p-4 rounded-xl bg-white/60 backdrop-blur-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-purple-100">
                    <Zap className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Πρόσθετα</p>
                    <p className="text-xl font-bold text-gray-900">{Object.values(extras).flat().length}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Enhanced Search Section */}
        <section
          className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-gray-200"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
          }}
        >
          <div className="p-6">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="relative flex-grow">
                <SearchIcon className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Αναζήτηση υπηρεσιών..."
                  className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-transparent transition-all duration-200"
                />
              </div>

              {(q || tagFilter.length > 0) && (
                <button
                  onClick={clearFilters}
                  className="px-4 py-3 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
                >
                  Καθαρισμός
                </button>
              )}
            </div>

            {/* Enhanced Tag Chips */}
            {allTags.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Φίλτρα κατηγοριών
                </h3>
                <div className="flex flex-wrap gap-2">
                  {allTags.map((tag) => {
                    const active = tagFilter.includes(tag)
                    return (
                      <button
                        key={tag}
                        onClick={() => toggleTag(tag)}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                          active
                            ? "bg-gray-800 text-white shadow-md transform scale-105"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-sm"
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Services Grid */}
        <section>
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <Sparkles className="h-6 w-6 text-gray-600" />
              Οι Υπηρεσίες Μου
              <span className="text-lg font-normal text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                {filtered.length}
              </span>
            </h2>
          </div>

          {filtered.length === 0 ? (
            <div className="text-center py-20">
              <div className="p-6 rounded-full bg-gray-100 mb-6 inline-block">
                <Settings className="h-12 w-12 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Δεν βρέθηκαν υπηρεσίες</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                {services.length === 0
                  ? "Ξεκινήστε δημιουργώντας την πρώτη σας υπηρεσία."
                  : "Δοκιμάστε να αλλάξετε τα κριτήρια αναζήτησης."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {filtered.map((service) => (
                <ServiceCard
                  key={service.id}
                  service={service}
                  slots={slots[service.id] || []}
                  extras={extras[service.id] || []}
                  expanded={expandedCards[service.id]}
                  onToggleExpansion={() => toggleCardExpansion(service.id)}
                  onDeleteService={deleteService}
                  onDeleteSlot={deleteSlot}
                  onChangeDuration={changeDuration}
                  onChangeStart={changeStart}
                  onOpenExtraModal={openExtraModal}
                  onRemoveLiveExtra={removeLiveExtra}
                  onMergeSlots={mergeSlots}
                />
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}

/* Enhanced Service Card Component */
function ServiceCard({
  service,
  slots,
  extras,
  expanded,
  onToggleExpansion,
  onDeleteService,
  onDeleteSlot,
  onChangeDuration,
  onChangeStart,
  onOpenExtraModal,
  onRemoveLiveExtra,
  onMergeSlots,
}) {
  const availableSlots = slots.filter((slot) => !slot.booked)
  const bookedSlots = slots.filter((slot) => slot.booked)

  return (
    <article
      className="group relative overflow-hidden rounded-3xl shadow-lg ring-1 ring-gray-200 transition-all duration-500 hover:shadow-xl hover:scale-[1.02]"
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
          className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Service Type Badge */}
        <div className="absolute top-4 left-4">
          {service.is_virtual ? (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-600/90 backdrop-blur-sm text-white text-sm font-medium shadow-lg">
              <GlobeIcon className="h-4 w-4" />
              Online
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-600/90 backdrop-blur-sm text-white text-sm font-medium shadow-lg">
              <PinIcon className="h-4 w-4" />
              Από κοντά
            </span>
          )}
        </div>

        {/* Price Badge */}
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/70 backdrop-blur-sm text-white text-sm font-bold shadow-lg">
            <Euro className="h-4 w-4" />
            {service.price}
          </span>
        </div>

        {/* Title Overlay */}
        <div className="absolute bottom-4 left-4 right-4">
          <h3 className="text-xl font-bold text-white mb-1">{service.title}</h3>
          <p className="text-white/80 text-sm line-clamp-2">{service.description}</p>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Tags */}
        {service.tags && service.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {service.tags.map((tag) => (
              <span key={tag} className="px-3 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-xl bg-white/60 border border-gray-200">
            <Calendar className="h-5 w-5 text-gray-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Διαθέσιμα</p>
            <p className="text-lg font-bold text-gray-900">{availableSlots.length}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/60 border border-gray-200">
            <Users className="h-5 w-5 text-gray-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Κρατήσεις</p>
            <p className="text-lg font-bold text-gray-900">{bookedSlots.length}</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-white/60 border border-gray-200">
            <Sparkles className="h-5 w-5 text-gray-600 mx-auto mb-1" />
            <p className="text-xs text-gray-600">Πρόσθετα</p>
            <p className="text-lg font-bold text-gray-900">{extras.length}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <button
            onClick={onToggleExpansion}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors font-medium"
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
            {expanded ? "Λιγότερα" : "Περισσότερα"}
          </button>
          <button
            onClick={() => onDeleteService(service.id)}
            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
          >
            <TrashIcon className="h-4 w-4" />
          </button>
        </div>

        {/* Expanded Content */}
        {expanded && (
          <div className="space-y-4 pt-4 border-t border-gray-200">
            {/* Extras Management */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Πρόσθετα ({extras.length})
                </h4>
                <button
                  onClick={() => onOpenExtraModal(service.id)}
                  className="px-3 py-1 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  <PlusIcon className="h-4 w-4" />
                </button>
              </div>

              {extras.length > 0 ? (
                <div className="space-y-2">
                  {extras.map((extra) => (
                    <div
                      key={extra.id}
                      className="flex items-center justify-between p-3 bg-white/60 rounded-lg border border-gray-200"
                    >
                      <span className="text-sm font-medium text-gray-900">
                        {extra.title} - €{extra.price}
                      </span>
                      <button
                        onClick={() => onRemoveLiveExtra(extra.id, service.id)}
                        className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                      >
                        <TrashIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">Δεν υπάρχουν πρόσθετα</p>
              )}
            </div>

            {/* Slots Management */}
            <div className="space-y-3">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClockIcon className="h-4 w-4" />
                Διαχείριση Ωρών ({slots.length})
              </h4>

              <SlotCalendarManager
                serviceId={service.id}
                onSlotsChange={(payload, action) => onMergeSlots(service.id, payload, action)}
              />

              {slots.length > 0 && (
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {slots.map((slot) => (
                    <div
                      key={slot.id}
                      className={`flex items-center justify-between p-3 rounded-lg border ${
                        slot.booked ? "bg-green-50 border-green-200" : "bg-white/60 border-gray-200"
                      }`}
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {new Date(slot.starts_at).toLocaleString("el-GR", {
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        <p className="text-xs text-gray-600">
                          {slot.duration_minutes} λεπτά
                          {slot.booked && <span className="ml-2 text-green-600 font-medium">(Κρατημένο)</span>}
                        </p>
                      </div>

                      {!slot.booked && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => onDeleteSlot(slot.id, service.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                          >
                            <TrashIcon className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => onChangeDuration(slot, service.id)}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                          >
                            <PencilIcon className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => onChangeStart(slot, service.id)}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded transition-colors"
                          >
                            <ClockIcon className="h-3 w-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </article>
  )
}
