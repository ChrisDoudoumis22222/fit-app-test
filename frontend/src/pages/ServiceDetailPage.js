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
  Star,
  Clock,
  Users,
  Award,
  CheckCircle,
  Calendar,
  Phone,
  Mail,
  MessageCircle,
  Sparkles,
  TrendingUp,
  Shield,
  AlertCircle,
} from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import UserMenu from "../components/UserMenu"
import TrainerMenu from "../components/TrainerMenu"
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg"

const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar"

export default function ServiceDetailPage() {
  /* -------------------- Router & Auth -------------------- */
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()

  /* --------------------- State --------------------- */
  const [svc, setSvc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [msg, setMsg] = useState("")
  const [selected, setSelected] = useState(null)
  const [isBooking, setIsBooking] = useState(false)
  const [isGuestMode, setIsGuestMode] = useState(false)
  const [contactForm, setContactForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    message: "",
  })

  const Menu = profile?.role === "trainer" ? TrainerMenu : UserMenu

  /* -------------- Dark theme for this page -------------- */
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

  /* -------- Prefill/clear contact form when profile loads -------- */
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

  /* ---------------- Fetch service & trainer stats ---------------- */
  useEffect(() => {
    const fetchService = async () => {
      try {
        const { data, error: svcErr } = await supabase
          .from("services")
          .select(
            `
            *,
            trainer:profiles!services_trainer_id_fkey(*),
            service_extras:service_extras!service_extras_service_id_fkey(*),
            service_slots(id,starts_at,booked,duration_minutes)
          `,
          )
          .eq("id", id)
          .single()

        if (svcErr) throw new Error(svcErr.message)
        if (!data) throw new Error("Service not found")

        const { count, error: cntErr } = await supabase
          .from("services")
          .select("id", { count: "exact", head: true })
          .eq("trainer_id", data.trainer_id)

        if (cntErr) throw new Error(cntErr.message)

        setSvc({ ...data, trainerServiceCount: count ?? 0 })
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchService()
  }, [id])

  /* ------------------------ Helpers ------------------------ */
  const formatDate = (d) =>
    new Date(d).toLocaleDateString("el-GR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })

  const formatTime = (d) =>
    new Date(d).toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
    })

  const formatJoined = (d) => (d ? new Date(d).toLocaleDateString("el-GR", { month: "long", year: "numeric" }) : "—")

  /* ------------------------ Booking ------------------------ */
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
      const bookingData = {
        service_id: svc.id,
        trainer_id: svc.trainer_id,
        slot_id: selected,
        guest_name: isGuestMode ? contactForm.fullName : null,
        guest_email: isGuestMode ? contactForm.email : null,
        guest_phone: isGuestMode ? contactForm.phone : null,
      }
      if (profile) bookingData.user_id = profile.id

      const { error } = await supabase.from("bookings").insert(bookingData)
      if (error) throw new Error(error.message)

      await supabase.from("service_slots").update({ booked: true }).eq("id", selected)

      setSvc((prev) => ({
        ...prev,
        service_slots: prev.service_slots.map((sl) => (sl.id === selected ? { ...sl, booked: true } : sl)),
      }))

      setSelected(null)
      setMsg("✅ Η κράτηση επιβεβαιώθηκε επιτυχώς!")
    } catch (err) {
      setMsg(err.message || "Σφάλμα κατά την κράτηση. Παρακαλώ δοκιμάστε ξανά.")
    } finally {
      setIsBooking(false)
    }
  }

  /* --------------------- Contact form --------------------- */
  const handleContactSubmit = (e) => {
    e.preventDefault()
    console.log("Contact form submitted:", contactForm)
    alert("Το μήνυμά σας στάλθηκε επιτυχώς!")
    setContactForm((prev) => ({ ...prev, message: "" }))
  }

  /* -------------------- Guest mode toggle ------------------- */
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

  /* ---------------- Loading / Error states ----------------- */
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-black text-gray-200">
        <Menu />
        <div className="flex items-center justify-center h-[75vh]">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-4"
          >
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-gray-400" />
              <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-gray-400/20"></div>
            </div>
            <p className="text-gray-400 font-medium">Φόρτωση υπηρεσίας...</p>
          </motion.div>
        </div>
      </div>
    )
  }

  if (error || !svc) {
    return (
      <div className="min-h-screen bg-black text-gray-200">
        <Menu />
        <div className="flex items-center justify-center h-[75vh]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center p-8 rounded-3xl bg-red-500/10 border border-red-500/20 backdrop-blur-xl max-w-md shadow-2xl"
          >
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-xl font-semibold text-red-300 mb-2">{error || "Η υπηρεσία δεν βρέθηκε"}</h3>
            <p className="text-red-400/80 mb-6">Παρουσιάστηκε πρόβλημα κατά τη φόρτωση της υπηρεσίας.</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-red-500/20 text-red-300 rounded-xl hover:bg-red-500/30 transition-all duration-200 font-medium border border-red-500/30"
            >
              Επιστροφή
            </button>
          </motion.div>
        </div>
      </div>
    )
  }

  /* ------------------------ Ready UI ----------------------- */
  const trainer = svc.trainer || {}
  const freeSlots = svc.service_slots?.filter((s) => !s.booked) || []
  const groupedSlots = freeSlots.reduce((acc, slot) => {
    const day = slot.starts_at.slice(0, 10)
    if (!acc[day]) acc[day] = []
    acc[day].push(slot)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-black text-gray-200 relative overflow-x-hidden">
      {/* Enhanced background effects */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-gradient-to-r from-gray-500/5 to-blue-500/5 rounded-full blur-3xl animate-pulse" />
        <div
          className="absolute bottom-0 right-1/4 w-80 h-80 bg-gradient-to-r from-purple-500/5 to-gray-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        />
        <div
          className="absolute top-1/3 right-1/3 w-64 h-64 bg-gradient-to-r from-emerald-500/5 to-gray-500/5 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "4s" }}
        />
      </div>

      <div className="relative z-10">
        <Menu />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Enhanced back button */}
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 mb-8 px-4 py-2 text-gray-400 hover:text-gray-200 transition-all duration-200 hover:bg-white/5 rounded-lg group"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium">Επιστροφή</span>
          </motion.button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* ---------------- Enhanced Left column ---------------- */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="lg:col-span-2"
            >
              {/* Enhanced hero image */}
              <div className="relative mb-8 group">
                <div className="absolute inset-0 bg-gradient-to-r from-gray-500/20 to-blue-500/20 rounded-2xl blur-xl group-hover:blur-2xl transition-all duration-500"></div>
                <div className="relative">
                  <img
                    src={svc.image_url || SERVICE_PLACEHOLDER}
                    alt={svc.title}
                    className="w-full h-96 object-cover rounded-2xl shadow-2xl group-hover:scale-[1.02] transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent rounded-2xl" />

                  {/* Enhanced badges */}
                  {svc.is_virtual && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.3 }}
                      className="absolute top-6 right-6"
                    >
                      <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/90 backdrop-blur-sm text-white text-sm font-semibold shadow-lg border border-emerald-400/30">
                        <Video className="h-4 w-4" />
                        Virtual Session
                      </span>
                    </motion.div>
                  )}

                  {/* Price badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="absolute top-6 left-6"
                  >
                    <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-gray-400/90 backdrop-blur-sm text-black text-lg font-bold shadow-lg">
                      €{svc.price}
                      <span className="text-sm font-medium opacity-80">/session</span>
                    </span>
                  </motion.div>

                  {/* Rating badge */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="absolute bottom-6 right-6"
                  >
                    <div className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/20">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-white text-sm font-medium">4.9</span>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Enhanced service info */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="mb-8"
              >
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <h1 className="text-4xl font-bold text-white mb-3 leading-tight">{svc.title}</h1>
                    <div className="flex items-center gap-3 text-gray-400 mb-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        <span>{trainer.location || "Online"}</span>
                      </div>
                      <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        <span>Διαθέσιμο τώρα</span>
                      </div>
                      <span className="w-1 h-1 bg-gray-500 rounded-full"></span>
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        <span>1-on-1</span>
                      </div>
                    </div>

                    {/* Tags */}
                    {svc.tags?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {svc.tags.map((tag, index) => (
                          <motion.span
                            key={tag}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.3 + index * 0.1 }}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-sm font-medium text-gray-300"
                          >
                            <Sparkles className="h-3 w-3" />
                            {tag}
                          </motion.span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Enhanced description */}
                <div className="mb-8">
                  <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-gray-400" />
                    Περιγραφή
                  </h3>
                  <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-xl p-6">
                    <p className="text-gray-300 leading-relaxed whitespace-pre-line text-lg">{svc.description}</p>
                  </div>
                </div>

                {/* Enhanced service extras */}
                {svc.service_extras?.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-8"
                  >
                    <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-yellow-400" />
                      Πρόσθετες Υπηρεσίες
                    </h3>
                    <div className="grid gap-3">
                      {svc.service_extras.map((extra, index) => (
                        <motion.div
                          key={extra.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: 0.5 + index * 0.1 }}
                          className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-200 group"
                        >
                          <div className="flex items-center gap-3">
                            <CheckCircle className="h-5 w-5 text-green-400" />
                            <span className="font-medium text-gray-200 group-hover:text-white transition-colors">
                              {extra.title}
                            </span>
                          </div>
                          <span className="font-bold text-gray-400 text-lg">€{extra.price}</span>
                        </motion.div>
                      ))}
                    </div>
                  </motion.div>
                )}

                {/* Enhanced status & availability */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  className="bg-gradient-to-r from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-xl p-6"
                >
                  <h4 className="font-semibold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-400" />
                    Κατάσταση & Διαθεσιμότητα
                  </h4>
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Κατάσταση</div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="font-medium text-green-300">Ενεργή</span>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-400 mb-1">Διαθεσιμότητα</div>
                      <div className="font-medium text-gray-200">
                        {freeSlots.length > 0 ? (
                          <span className="text-green-300">{freeSlots.length} διαθέσιμα ραντεβού</span>
                        ) : (
                          <span className="text-red-300">Πλήρως κλεισμένο</span>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </motion.div>

            {/* ---------------- Enhanced Right column ---------------- */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="lg:col-span-1"
            >
              <div className="bg-gradient-to-b from-white/5 to-white/10 backdrop-blur-xl border border-white/10 rounded-2xl p-6 sticky top-8 shadow-2xl">
                {/* Enhanced trainer card */}
                <div className="mb-6 pb-6 border-b border-white/10">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <img
                        src={trainer.avatar_url || AVATAR_PLACEHOLDER}
                        alt={trainer.full_name}
                        className="w-16 h-16 rounded-full object-cover ring-2 ring-white/20 shadow-lg"
                      />
                      <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-400 rounded-full border-2 border-black flex items-center justify-center">
                        <Shield className="h-2.5 w-2.5 text-black" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-white text-lg mb-1">{trainer.full_name || "Προπονητής"}</h4>
                      <div className="space-y-1 text-sm text-gray-400">
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3" />
                          <span>{trainer.email}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3 w-3" />
                          <span>Μέλος από {formatJoined(trainer.created_at)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Award className="h-3 w-3" />
                          <span>{svc.trainerServiceCount} υπηρεσίες</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Enhanced guest/user toggle */}
                {profile && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="mb-6"
                  >
                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-all duration-200">
                      <div className="flex items-center gap-3">
                        {isGuestMode ? (
                          <UserPlus className="h-5 w-5 text-orange-400" />
                        ) : (
                          <UserCheck className="h-5 w-5 text-green-400" />
                        )}
                        <div>
                          <span className="text-sm font-medium text-gray-200">
                            {isGuestMode ? "Λειτουργία επισκέπτη" : "Συνδεδεμένος χρήστης"}
                          </span>
                          <div className="text-xs text-gray-400">
                            {isGuestMode ? "Κράτηση ως επισκέπτης" : "Χρήση προφίλ σας"}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={toggleGuestMode}
                        className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-3 py-1 rounded-lg hover:bg-white/10"
                      >
                        {isGuestMode ? "Χρήση προφίλ" : "Ως επισκέπτης"}
                      </button>
                    </div>
                  </motion.div>
                )}

                {/* Enhanced booking section */}
                {Object.keys(groupedSlots).length > 0 ? (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-6"
                  >
                    <h4 className="font-semibold text-white mb-4 flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-400" />
                      Επιλέξτε Ώρα
                    </h4>
                    <select
                      value={selected || ""}
                      onChange={(e) => setSelected(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-gray-400 focus:border-gray-400 mb-4 transition-all duration-200 hover:bg-white/10"
                    >
                      <option value="" disabled>
                        Επιλέξτε διαθέσιμη ώρα
                      </option>
                      {Object.entries(groupedSlots).map(([day, slots]) =>
                        slots.map((slot) => (
                          <option key={slot.id} value={slot.id} className="bg-black text-white">
                            {formatDate(day)} στις {formatTime(slot.starts_at)}
                          </option>
                        )),
                      )}
                    </select>
                    <button
                      onClick={handleBooking}
                      disabled={!selected || isBooking}
                      className={`w-full py-3 px-4 rounded-xl font-semibold transition-all duration-200 flex items-center justify-center gap-2 ${
                        selected && !isBooking
                          ? "bg-gradient-to-r from-gray-400 to-gray-300 text-black hover:from-gray-300 hover:to-gray-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                          : "bg-white/10 text-gray-500 cursor-not-allowed border border-white/10"
                      }`}
                    >
                      {isBooking ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Κράτηση...
                        </>
                      ) : (
                        <>
                          <Calendar className="h-4 w-4" />
                          Κράτηση Ραντεβού
                        </>
                      )}
                    </button>
                  </motion.div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    className="mb-6 p-4 bg-gradient-to-r from-yellow-500/10 to-orange-500/10 border border-yellow-500/20 rounded-xl"
                  >
                    <div className="text-sm text-yellow-300 font-medium">
                      Δεν υπάρχουν διαθέσιμα ραντεβού αυτή τη στιγμή.
                    </div>
                  </motion.div>
                )}

                {/* Enhanced contact form */}
                <motion.form
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.6 }}
                  onSubmit={handleContactSubmit}
                  className="space-y-4"
                >
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Πλήρες Όνομα
                    </label>
                    <input
                      type="text"
                      value={contactForm.fullName}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, fullName: e.target.value }))}
                      placeholder="π.χ. Γιάννης Παπαδόπουλος"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-200 hover:bg-white/10"
                      required
                      disabled={profile && !isGuestMode}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      Διεύθυνση Email
                    </label>
                    <input
                      type="email"
                      value={contactForm.email}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="giannis@example.com"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 transition-all duration-200 hover:bg-white/10"
                      required
                      disabled={profile && !isGuestMode}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      Τηλέφωνο
                    </label>
                    <input
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="+30 123 456 7890"
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 resize-none transition-all duration-200 hover:bg-white/10"
                      disabled={profile && !isGuestMode}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                      <MessageCircle className="h-4 w-4" />
                      Μήνυμα
                    </label>
                    <textarea
                      value={contactForm.message}
                      onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
                      placeholder="Γράψτε εδώ το μήνυμά σας..."
                      rows={4}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:ring-2 focus:ring-gray-400 focus:border-gray-400 resize-none transition-all duration-200 hover:bg-white/10"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-gray-400 to-gray-300 text-black py-3 px-4 rounded-xl font-semibold hover:from-gray-300 hover:to-gray-200 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    <Send className="h-4 w-4" />
                    Αποστολή Μηνύματος
                  </button>
                </motion.form>

                {/* Enhanced flash messages */}
                <AnimatePresence>
                  {msg && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      className={`mt-4 p-4 rounded-xl text-sm font-medium ${
                        msg.includes("✅")
                          ? "bg-gradient-to-r from-green-500/10 to-emerald-500/10 text-green-300 border border-green-500/20"
                          : "bg-gradient-to-r from-red-500/10 to-pink-500/10 text-red-300 border border-red-500/20"
                      }`}
                    >
                      {msg}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          <div className="pb-20" />
        </main>
      </div>
    </div>
  )
}
