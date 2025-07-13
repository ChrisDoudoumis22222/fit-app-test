"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  MapPin,
  Video,
  Loader2,
  Send,
  UserCheck,
  UserPlus,
} from "lucide-react"
import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import UserMenu from "../components/UserMenu"
import TrainerMenu from "../components/TrainerMenu"
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg"

const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar"

/**
 * Λεπτομερής σελίδα υπηρεσίας.
 *  - Εμφανίζει extra slots (service_extras) εάν υπάρχουν
 *  - Δείχνει πότε γράφτηκε ο trainer (joined) & πόσες υπηρεσίες προσφέρει
 *  - Αφαιρεθήκαν ψεύτικα reviews και η ενότητα "Χαρακτηριστικά/Περιλαμβάνει"
 *  - Όλα τα strings είναι στα ελληνικά· το κουμπί "Submit" → "Αποστολή"
 */
export default function ServiceDetailPage() {
  /* ---------- Router & Auth ---------- */
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()

  /* ---------- State ---------- */
  const [svc, setSvc] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [msg, setMsg] = useState("")
  const [selected, setSelected] = useState<string | null>(null)
  const [isBooking, setIsBooking] = useState(false)
  const [isGuestMode, setIsGuestMode] = useState(false)
  const [contactForm, setContactForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  })

  /* ---------- Menu ανά ρόλο ---------- */
  const Menu = profile?.role === "trainer" ? TrainerMenu : UserMenu

  /* ---------- Σκοτεινό background σελίδας ---------- */
  useEffect(() => {
    document.documentElement.classList.add("bg-black")
    document.body.classList.add("bg-black")
    document.documentElement.classList.remove("bg-white")
    document.body.classList.remove("bg-white")
    return () => {
      document.documentElement.classList.remove("bg-black")
      document.body.classList.remove("bg-black")
    }
  }, [])

  /* ---------- Prefill φόρμας όταν φορτώνει το profile ---------- */
  useEffect(() => {
    if (profile && !isGuestMode) {
      setContactForm({
        fullName: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        message: "",
      })
    } else if (!profile) {
      setContactForm({ fullName: "", email: "", phone: "", message: "" })
    }
  }, [profile, isGuestMode])

  /* ---------- Fetch Service + count υπηρεσιών trainer ---------- */
  useEffect(() => {
    const fetchService = async () => {
      try {
        /* Βήμα 1: service / extras / slots / trainer */
        const { data, error } = await supabase
          .from("services")
          .select(
            `*,
            trainer:profiles!services_trainer_id_fkey(*),
            service_extras:service_extras!service_extras_service_id_fkey(*),
            service_slots(id,starts_at,booked,duration_minutes)`
          )
          .eq("id", id)
          .single()

        if (error) throw new Error(error.message)
        if (!data) throw new Error("Service not found")

        /* Βήμα 2: πλήθος υπηρεσιών trainer */
        const { count, error: cntErr } = await supabase
          .from("services")
          .select("id", { count: "exact", head: true })
          .eq("trainer_id", data.trainer_id)

        if (cntErr) throw new Error(cntErr.message)

        setSvc({ ...data, trainerServiceCount: count ?? 0 })
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchService()
  }, [id])

  /* ---------- Βοηθητικές ---------- */
  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("el-GR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })

  const formatTime = (dateString: string) =>
    new Date(dateString).toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
    })

  const formatJoinedDate = (dateString?: string) =>
    dateString
      ? new Date(dateString).toLocaleDateString("el-GR", { month: "long", year: "numeric" })
      : "—"

  /* ---------- Booking ---------- */
  const handleBooking = async () => {
    setMsg("")
    if (!profile && !isGuestMode) {
      setMsg("Παρακαλώ συνδεθείτε ή συνεχίστε ως επισκέπτης για να κάνετε κράτηση.")
      return
    }
    if (profile?.role === "trainer") {
      setMsg("Οι προπονητές δεν μπορούν να κάνουν κρατήσεις.")
      return
    }
    if (!selected) {
      setMsg("Παρακαλώ επιλέξτε ένα διαθέσιμο ραντεβού.")
      return
    }

    setIsBooking(true)
    try {
      const bookingData: any = {
        service_id: svc!.id,
        trainer_id: svc!.trainer_id,
        slot_id: selected,
        guest_name: isGuestMode ? contactForm.fullName : null,
        guest_email: isGuestMode ? contactForm.email : null,
        guest_phone: isGuestMode ? contactForm.phone : null,
      }
      if (profile) bookingData.user_id = profile.id

      const { error } = await supabase.from("bookings").insert(bookingData)
      if (error) throw new Error(error.message)

      await supabase.from("service_slots").update({ booked: true }).eq("id", selected)

      setSvc((prev: any) => ({
        ...prev,
        service_slots: prev.service_slots.map((sl: any) => (sl.id === selected ? { ...sl, booked: true } : sl)),
      }))
      setSelected(null)
      setMsg("✅ Η κράτηση επιβεβαιώθηκε επιτυχώς!")
    } catch (err: any) {
      setMsg(err.message || "Σφάλμα κατά την κράτηση. Παρακαλώ δοκιμάστε ξανά.")
    } finally {
      setIsBooking(false)
    }
  }

  /* ---------- Φόρμα Επικοινωνίας ---------- */
  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    console.log("Contact form submitted:", contactForm)
    alert("Το μήνυμά σας στάλθηκε επιτυχώς!")
    setContactForm((prev) => ({ ...prev, message: "" }))
  }

  /* ---------- Guest Mode Toggle ---------- */
  const toggleGuestMode = () => {
    setIsGuestMode(!isGuestMode)
    if (!isGuestMode) {
      setContactForm({ fullName: "", email: "", phone: "", message: "" })
    } else if (profile) {
      setContactForm({
        fullName: profile.full_name || "",
        email: profile.email || "",
        phone: profile.phone || "",
        message: "",
      })
    }
  }

  /* ---------- Φόρτωση / Σφάλμα ---------- */
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-gray-200">
        <Menu />
        <div className="flex items-center justify-center h-[75vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-gray-400">Φόρτωση υπηρεσίας...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error || !svc) {
    return (
      <div className="min-h-screen bg-black text-gray-200">
        <Menu />
        <div className="flex items-center justify-center h-[75vh]">
          <div className="text-center p-8 rounded-2xl bg-red-500/10 border border-red-500/20 backdrop-blur-xl max-w-md">
            <h3 className="text-lg font-semibold text-red-300 mb-2">{error || "Η υπηρεσία δεν βρέθηκε"}</h3>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30 transition-colors font-medium"
            >
              Επιστροφή
            </button>
          </div>
        </div>
      </div>
    )
  }

  /* ---------- Data Ready ---------- */
  const trainer = svc.trainer ?? {}
  const freeSlots = svc.service_slots?.filter((s: any) => !s.booked) || []
  const groupedSlots = freeSlots.reduce((acc: any, slot: any) => {
    const day = slot.starts_at.slice(0, 10)
    if (!acc[day]) acc[day] = []
    acc[day].push(slot)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-black text-gray-200 relative overflow-x-hidden">
      {/* Background εφέ */}
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
        <Menu />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Back */}
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-6 text-gray-400 hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Επιστροφή
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ----------- Αριστερή στήλη ----------- */}
            <div className="lg:col-span-2">
              {/* Εικόνα */}
              <div className="relative mb-6">
                <img
                  src={svc.image_url || SERVICE_PLACEHOLDER}
                  alt={svc.title}
                  className="w-full h-96 object-cover rounded-2xl"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent rounded-2xl" />
                {svc.is_virtual && (
                  <div className="absolute top-4 right-4">
                    <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-sm font-medium">
                      <Video className="h-4 w-4" /> Virtual
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="mb-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h1 className="text-3xl font-bold text-white mb-2">{svc.title}</h1>
                    <div className="flex items-center gap-2 text-gray-400">
                      <MapPin className="h-4 w-4" />
                      <span>{trainer.location || "Online"}</span>
                      <span className="text-gray-500">•</span>
                      <span>Διαθέσιμο τώρα</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-white">€{svc.price}</div>
                    <div className="text-sm text-gray-400">ανά συνεδρία</div>
                  </div>
                </div>

                {/* Περιγραφή */}
                <div className="mb-8">
                  <h3 className="text-lg font-semibold text-white mb-3">Περιγραφή</h3>
                  <p className="text-gray-300 leading-relaxed whitespace-pre-line">{svc.description}</p>
                </div>

                {/* ---- Service Extras ---- */}
                {svc.service_extras?.length > 0 && (
                  <div className="mb-8">
                    <h3 className="text-lg font-semibold text-white mb-4">Πρόσθετες Υπηρεσίες</h3>
                    <div className="space-y-3">
                      {svc.service_extras.map((extra: any) => (
                        <div
                          key={extra.id}
                          className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg"
                        >
                          <span className="font-medium text-gray-200">{extra.title}</span>
                          <span className="font-semibold text-gray-400">€{extra.price}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Κατάσταση & Διαθεσιμότητα */}
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                  <h4 className="font-medium text-white mb-4">Κατάσταση & Διαθεσιμότητα</h4>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="text-sm text-gray-400">Κατάσταση</div>
                      <div className="font-medium text-gray-200">Ενεργή</div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400">Διαθεσιμότητα</div>
                      <div className="font-medium text-gray-200">
                        {freeSlots.length > 0 ? `${freeSlots.length} διαθέσιμα ραντεβού` : "Πλήρως κλεισμένο"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ----------- Δεξιά στήλη ----------- */}
            <div className="lg:col-span-1">
              <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sticky top-8">
                {/* Trainer Info */}
                <div className="flex items-center gap-3 mb-6 pb-6 border-b border-white/10">
                  <img
                    src={trainer.avatar_url || AVATAR_PLACEHOLDER}
                    alt={trainer.full_name}
                    className="w-12 h-12 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-semibold text-white">{trainer.full_name || "Προπονητής"}</div>
                    <div className="text-sm text-gray-400">{trainer.email}</div>
                    <div className="text-sm text-gray-400 mt-1">Μέλος από {formatJoinedDate(trainer.created_at)}</div>
                    <div className="text-sm text-gray-400">Υπηρεσίες: {svc.trainerServiceCount}</div>
                  </div>
                </div>

                {/* Guest Mode toggle (εάν συνδεδεμένος) */}
                {profile && (
                  <div className="mb-6">
                    <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-lg">
                      <div className="flex items-center gap-2">
                        {isGuestMode ? (
                          <UserPlus className="h-4 w-4 text-gray-400" />
                        ) : (
                          <UserCheck className="h-4 w-4 text-green-400" />
                        )}
                        <span className="text-sm text-gray-300">
                          {isGuestMode ? "Λειτουργία επισκέπτη" : "Συνδεδεμένος χρήστης"}
                        </span>
                      </div>
                      <button
                        onClick={toggleGuestMode}
                        className="text-xs text-gray-400 hover:text-gray-200 transition-colors"
                      >
                        {isGuestMode ? "Χρήση προφίλ" : "Ως επισκέπτης"}
                      </button>
                    </div>
                  </div>
                )}

                {/* Booking section */}
                {Object.keys(groupedSlots).length > 0 ? (
                  <div className="mb-6">
                    <h4 className="font-semibold text-white mb-4">Επιλέξτε Ώρα</h4>
                    <select
                      value={selected || ""}
                      onChange={(e) => setSelected(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400 mb-4"
                    >
                      <option value="" disabled>
                        Επιλέξτε διαθέσιμη ώρα
                      </option>
                      {Object.entries(groupedSlots).map(([day, slots]: any) =>
                        slots.map((slot: any) => (
                          <option key={slot.id} value={slot.id} className="bg-black text-white">
                            {formatDate(day)} στις {formatTime(slot.starts_at)}
                          </option>
                        ))
                      )}
                    </select>
                    <button
                      onClick={handleBooking}
                      disabled={!selected || isBooking}
                      className={`w-full py-3 px-4 rounded-lg font-semibold transition-colors ${
                        selected && !isBooking
                          ? "bg-gray-400 text-black hover:bg-gray-300"
                          : "bg-white/10 text-gray-500 cursor-not-allowed border border-white/10"
                      }`}
                    >
                      {isBooking ? (
                        <div className="flex items-center justify-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin" /> Κράτηση...
                        </div>
                      ) : (
                        "Κράτηση Ραντεβού"
                      )}
                    </button>
                  </div>
                ) : (
                  <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="text-sm text-yellow-300">Δεν υπάρχουν διαθέσιμα ραντεβού αυτή τη στιγμή.</div>
                  </div>
                )}

                {/* Φόρμα Επικοινωνίας */}
                <form onSubmit={handleContactSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Πλήρες Όνομα</label>
                    <input
                      type="text"
                      value={contactForm.fullName}
                      onChange={(e) =>
                        setContactForm((prev) => ({ ...prev, fullName: e.target.value }))
                      }
                      placeholder="π.χ. Γιάννης Παπαδόπουλος"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      required
                      disabled={profile && !isGuestMode}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Διεύθυνση Email</label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="giannis@example.com"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      required
                      disabled={profile && !isGuestMode}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Τηλέφωνο</label>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+30 123 456 7890"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-400 focus:border-gray-400"
                      disabled={profile && !isGuestMode}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Μήνυμα</label>
                    <textarea
                      value={contactForm.message}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="Γράψτε εδώ..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gray-400 text-black py-3 px-4 rounded-lg font-semibold hover:bg-gray-300 transition-colors flex items-center justify-center gap-2"
                  >
                    <Send className="h-4 w-4" /> Αποστολή
                  </button>
                </form>

                {/* Μηνύματα */}
                {msg && (
                  <div
                    className={`mt-4 p-3 rounded-lg text-sm ${
                      msg.includes("✅")
                        ? "bg-green-500/10 text-green-300 border border-green-500/20"
                        : "bg-red-500/10 text-red-300 border border-red-500/20"
                    }`}
                  >
                    {msg}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="pb-20"></div>
        </main>
      </div>
    </div>
  )
}
