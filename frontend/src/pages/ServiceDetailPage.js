"use client"

import { useEffect, useState } from "react"
import { useParams, useNavigate } from "react-router-dom"
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Phone,
  Award,
  Clock,
  Share2,
  User,
  Sparkles,
  CheckCircle,
  AlertCircle,
  Euro,
  Video,
  Zap,
  Shield,
  Loader2,
} from "lucide-react"

import { supabase } from "../supabaseClient"
import { useAuth } from "../AuthProvider"
import UserMenu from "../components/UserMenu"
import TrainerMenu from "../components/TrainerMenu"
import { SERVICE_PLACEHOLDER } from "../utils/placeholderServiceImg"

const AVATAR_PLACEHOLDER = "/placeholder.svg?height=120&width=120&text=Avatar"

export default function ServiceDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, loading: authLoading } = useAuth()

  const [svc, setSvc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [msg, setMsg] = useState("")
  const [selected, setSelected] = useState(null)
  const [isBooking, setIsBooking] = useState(false)

  const Menu = profile?.role === "trainer" ? TrainerMenu : UserMenu

  useEffect(() => {
    const fetchService = async () => {
      try {
        const { data, error } = await supabase
          .from("services")
          .select(`
            *,
            trainer:profiles!services_trainer_id_fkey(*),
            service_extras:service_extras!service_extras_service_id_fkey(*),
            service_slots(id,starts_at,booked,duration_minutes)
          `)
          .eq("id", id)
          .single()

        if (error) {
          setError(error.message)
        } else {
          setSvc(data)
        }
      } catch (err) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchService()
  }, [id])

  const handleBooking = async () => {
    setMsg("")
    if (!profile) {
      setMsg("Παρακαλώ συνδεθείτε για να κάνετε κράτηση.")
      return
    }
    if (profile.role === "trainer") {
      setMsg("Οι προπονητές δεν μπορούν να κάνουν κρατήσεις.")
      return
    }
    if (!selected) {
      setMsg("Παρακαλώ επιλέξτε ένα διαθέσιμο ραντεβού.")
      return
    }

    setIsBooking(true)

    try {
      const { error } = await supabase.from("bookings").insert({
        service_id: svc.id,
        user_id: profile.id,
        slot_id: selected,
      })

      if (error) {
        setMsg(error.message)
        return
      }

      await supabase.from("service_slots").update({ booked: true }).eq("id", selected)

      // Optimistic UI update
      setSvc((prev) => ({
        ...prev,
        service_slots: prev.service_slots.map((sl) => (sl.id === selected ? { ...sl, booked: true } : sl)),
      }))

      setSelected(null)
      setMsg("✅ Η κράτηση επιβεβαιώθηκε επιτυχώς!")
    } catch (err) {
      setMsg("Σφάλμα κατά την κράτηση. Παρακαλώ δοκιμάστε ξανά.")
    } finally {
      setIsBooking(false)
    }
  }

  const handleShare = async () => {
    const shareData = {
      title: svc.title,
      text: svc.description,
      url: window.location.href,
    }

    try {
      if (navigator.share && navigator.canShare && navigator.canShare(shareData)) {
        await navigator.share(shareData)
      } else {
        await navigator.clipboard.writeText(window.location.href)
        alert("Ο σύνδεσμος αντιγράφηκε στο clipboard!")
      }
    } catch (err) {
      console.error("Error sharing:", err)
      try {
        await navigator.clipboard.writeText(window.location.href)
        alert("Ο σύνδεσμος αντιγράφηκε στο clipboard!")
      } catch (clipboardErr) {
        alert("Δεν ήταν δυνατή η κοινοποίηση")
      }
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("el-GR", {
      weekday: "long",
      day: "numeric",
      month: "long",
    })
  }

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString("el-GR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-white">
        <Menu />
        <div className="flex items-center justify-center h-[75vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            <p className="text-gray-500">Φόρτωση υπηρεσίας...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white">
        <Menu />
        <div className="flex items-center justify-center h-[75vh]">
          <div className="text-center p-8 rounded-2xl bg-red-50 border border-red-200 max-w-md">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-red-800 mb-2">Σφάλμα φόρτωσης</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={() => navigate(-1)}
              className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-medium"
            >
              Επιστροφή
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!svc) {
    return (
      <div className="min-h-screen bg-white">
        <Menu />
        <div className="flex items-center justify-center h-[75vh]">
          <div className="text-center">
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Η υπηρεσία δεν βρέθηκε</h3>
            <p className="text-gray-500 mb-4">Η υπηρεσία που ψάχνετε δεν υπάρχει ή έχει διαγραφεί.</p>
            <button
              onClick={() => navigate("/services")}
              className="px-6 py-3 bg-gray-800 text-white rounded-xl hover:bg-gray-700 transition-colors font-medium"
            >
              Προβολή όλων των υπηρεσιών
            </button>
          </div>
        </div>
      </div>
    )
  }

  const trainer = svc.trainer ?? {}
  const joinedDate = trainer.created_at ? new Date(trainer.created_at).toLocaleDateString("el-GR") : "—"

  const freeSlots = svc.service_slots?.filter((s) => !s.booked) || []
  const groupedSlots = freeSlots.reduce((acc, slot) => {
    const day = slot.starts_at.slice(0, 10)
    if (!acc[day]) acc[day] = []
    acc[day].push(slot)
    return acc
  }, {})

  return (
    <div className="min-h-screen bg-white">
      <Menu />

      <main className="mx-auto max-w-4xl px-4 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 mb-6 px-4 py-2 bg-white/80 backdrop-blur-sm border border-gray-200 rounded-xl hover:bg-white hover:shadow-md transition-all duration-200 text-gray-700 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          Επιστροφή
        </button>

        {/* Main Service Card */}
        <article
          className="relative overflow-hidden rounded-3xl shadow-xl ring-1 ring-gray-200 mb-8"
          style={{
            background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            boxShadow: "0 10px 30px -5px rgba(0, 0, 0, 0.1), 0 0 0 1px rgba(0, 0, 0, 0.05)",
          }}
        >
          {/* Hero Image Section */}
          <div className="relative h-96 overflow-hidden">
            <img src={svc.image_url || SERVICE_PLACEHOLDER} alt={svc.title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

            {/* Virtual Badge */}
            {svc.is_virtual && (
              <div className="absolute top-4 right-4">
                <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/90 backdrop-blur-sm text-white text-sm font-medium shadow-lg">
                  <Video className="h-4 w-4" />
                  Virtual
                </span>
              </div>
            )}

            {/* Price Badge */}
            <div className="absolute top-4 left-4">
              <span className="inline-flex items-center gap-1 px-4 py-2 rounded-full bg-green-500/90 backdrop-blur-sm text-white text-lg font-bold shadow-lg">
                <Euro className="h-5 w-5" />
                {svc.price}
              </span>
            </div>

            {/* Title Overlay */}
            <div className="absolute bottom-6 left-6 right-6">
              <h1 className="text-4xl font-bold text-white leading-tight mb-2">{svc.title}</h1>
            </div>
          </div>

          {/* Content */}
          <div className="p-8">
            {/* Tags */}
            {svc.tags?.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                {svc.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full bg-gradient-to-r from-gray-50 to-gray-100 ring-1 ring-gray-200/50 text-sm font-medium text-gray-700"
                  >
                    <Sparkles className="h-3 w-3" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Description */}
            <div className="prose prose-lg max-w-none mb-8">
              <p className="text-gray-600 leading-relaxed text-lg whitespace-pre-wrap">{svc.description}</p>
            </div>

            {/* Service Extras */}
            {svc.service_extras?.length > 0 && (
              <div className="mb-8">
                <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Zap className="h-5 w-5 text-yellow-500" />
                  Πρόσθετες Υπηρεσίες
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {svc.service_extras.map((extra) => (
                    <div
                      key={extra.id}
                      className="flex items-center justify-between p-4 rounded-xl bg-gradient-to-r from-blue-50 to-blue-100 ring-1 ring-blue-200/50"
                    >
                      <div className="flex items-center gap-3">
                        <CheckCircle className="h-5 w-5 text-blue-600" />
                        <span className="font-medium text-blue-900">{extra.title}</span>
                      </div>
                      <span className="font-bold text-blue-700">€{extra.price}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-4 mb-8 pb-8 border-b border-gray-200">
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-6 py-3 bg-green-100 text-green-700 rounded-xl hover:bg-green-200 transition-all duration-200 font-medium"
              >
                <Share2 className="h-5 w-5" />
                Κοινοποίηση
              </button>

              <button
                onClick={() => document.getElementById("booking")?.scrollIntoView({ behavior: "smooth" })}
                className="flex items-center gap-2 px-6 py-3 bg-blue-100 text-blue-700 rounded-xl hover:bg-blue-200 transition-all duration-200 font-medium"
              >
                <Calendar className="h-5 w-5" />
                Κράτηση Ραντεβού
              </button>
            </div>

            {/* Trainer Card */}
            <div
              className="relative overflow-hidden rounded-2xl shadow-lg ring-1 ring-gray-200 p-6 mb-8"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%)",
                backdropFilter: "blur(20px) saturate(180%)",
                WebkitBackdropFilter: "blur(20px) saturate(180%)",
              }}
            >
              <div className="flex items-start gap-6">
                <div className="relative">
                  <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden ring-4 ring-white shadow-lg">
                    {trainer.avatar_url ? (
                      <img
                        src={trainer.avatar_url || AVATAR_PLACEHOLDER}
                        alt={trainer.full_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-green-500 rounded-full border-2 border-white flex items-center justify-center">
                    <Award className="h-3 w-3 text-white" />
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">
                    {trainer.full_name || trainer.email || "Προπονητής"}
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                    {trainer.specialty && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Award className="h-4 w-4 text-blue-500" />
                        <span>{trainer.specialty}</span>
                      </div>
                    )}

                    {trainer.experience_years && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Clock className="h-4 w-4 text-green-500" />
                        <span>{trainer.experience_years} χρόνια εμπειρίας</span>
                      </div>
                    )}

                    {trainer.location && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <MapPin className="h-4 w-4 text-red-500" />
                        <span>{trainer.location}</span>
                      </div>
                    )}

                    {trainer.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <Phone className="h-4 w-4 text-purple-500" />
                        <span>{trainer.phone}</span>
                      </div>
                    )}
                  </div>

                  {trainer.bio && <p className="text-gray-600 text-sm leading-relaxed mb-4 italic">{trainer.bio}</p>}

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Shield className="h-4 w-4" />
                      <span>Μέλος από: {joinedDate}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Booking Section */}
            <div id="booking">
              <h3 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-3">
                <Calendar className="h-6 w-6 text-blue-600" />
                Κράτηση Ραντεβού
              </h3>

              {Object.keys(groupedSlots).length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                    {Object.entries(groupedSlots).map(([day, slots]) => (
                      <div
                        key={day}
                        className="p-6 rounded-2xl bg-gradient-to-br from-white to-gray-50 ring-1 ring-gray-200 shadow-sm"
                      >
                        <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-blue-500" />
                          {formatDate(day)}
                        </h4>
                        <div className="space-y-2">
                          {slots.map((slot) => {
                            const isSelected = selected === slot.id
                            return (
                              <button
                                key={slot.id}
                                onClick={() => setSelected(slot.id)}
                                className={`w-full p-3 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
                                  isSelected
                                    ? "bg-blue-600 text-white shadow-lg"
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                                }`}
                              >
                                <Clock className="h-4 w-4" />
                                {formatTime(slot.starts_at)}
                                {slot.duration_minutes && (
                                  <span className="text-xs opacity-75">({slot.duration_minutes}λ)</span>
                                )}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="text-center">
                    <button
                      onClick={handleBooking}
                      disabled={!selected || isBooking}
                      className={`px-8 py-4 rounded-2xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl flex items-center gap-3 mx-auto ${
                        selected && !isBooking
                          ? "bg-blue-600 text-white hover:bg-blue-700"
                          : "bg-gray-300 text-gray-500 cursor-not-allowed"
                      }`}
                    >
                      {isBooking ? (
                        <>
                          <Loader2 className="h-5 w-5 animate-spin" />
                          Επεξεργασία...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-5 w-5" />
                          Επιβεβαίωση Κράτησης
                        </>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                <div className="text-center p-8 rounded-2xl bg-yellow-50 border border-yellow-200">
                  <AlertCircle className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-yellow-800 mb-2">Δεν υπάρχουν διαθέσιμα ραντεβού</h4>
                  <p className="text-yellow-600">
                    Λυπούμαστε, δεν υπάρχουν διαθέσιμα ραντεβού αυτή τη στιγμή. Παρακαλώ ελέγξτε άλλες υπηρεσίες ή
                    επικοινωνήστε με τον προπονητή.
                  </p>
                </div>
              )}

              {/* Message Display */}
              {msg && (
                <div
                  className={`mt-6 p-4 rounded-xl text-center font-medium ${
                    msg.includes("✅")
                      ? "bg-green-50 text-green-700 border border-green-200"
                      : "bg-red-50 text-red-700 border border-red-200"
                  }`}
                >
                  {msg}
                </div>
              )}
            </div>
          </div>
        </article>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button
            onClick={() => navigate("/services")}
            className="px-8 py-4 bg-gray-800 text-white rounded-2xl hover:bg-gray-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
          >
            Προβολή όλων των υπηρεσιών
          </button>
          {profile?.role === "user" && (
            <button
              onClick={() => navigate("/posts")}
              className="px-8 py-4 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all duration-200 font-medium shadow-lg hover:shadow-xl"
            >
              Περιήγηση αναρτήσεων
            </button>
          )}
        </div>
      </main>
    </div>
  )
}
