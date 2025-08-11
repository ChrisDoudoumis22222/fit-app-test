"use client"
import { lazy, Suspense, useEffect, memo, useState, useMemo } from "react"
import { Loader2, Calendar, Users, Clock, TrendingUp, AlertCircle } from "lucide-react"
import { useAuth } from "../AuthProvider"
import { motion } from "framer-motion"
import { supabase } from "../supabaseClient"

/* lazy components */
const TrainerMenu = lazy(() => import("../components/TrainerMenu"))
const TrainerBookings = lazy(() => import("../components/TrainerBookings"))

/* ---------- Background Components (unchanged) ---------- */
const BaseBackground = memo(() => (
  <div className="fixed inset-0 -z-50">
    <div className="absolute inset-0 bg-black" />
    <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-900 to-black opacity-90" />
  </div>
))

const AthleticBackground = memo(() => (
  <>
    <style>{`
      @keyframes pulse-performance {
         0%, 100% { opacity: 0.1; transform: scale(1); }
         50% { opacity: 0.3; transform: scale(1.05); }
       }
      @keyframes drift-metrics {
         0% { transform: translateX(-100px) translateY(0px); }
         50% { transform: translateX(50px) translateY(-30px); }
         100% { transform: translateX(100px) translateY(0px); }
       }
      @keyframes athletic-grid {
         0% { transform: translate(0, 0) rotate(0deg); }
         100% { transform: translate(60px, 60px) rotate(0.5deg); }
       }
      @keyframes float-particles {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(180deg); }
      }
      @keyframes data-flow {
         0% { transform: translateX(-100%) translateY(0px); opacity: 0; }
         50% { opacity: 0.3; }
         100% { transform: translateX(100vw) translateY(-20px); opacity: 0; }
       }
    `}</style>

    {/* Animated grid */}
    <div
      className="fixed inset-0 -z-40 pointer-events-none opacity-[0.15]"
      style={{
        backgroundImage: `
          linear-gradient(rgba(113,113,122,0.08) 1px, transparent 1px),
          linear-gradient(90deg, rgba(113,113,122,0.08) 1px, transparent 1px)
        `,
        backgroundSize: "60px 60px",
        animation: "athletic-grid 25s linear infinite",
        maskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 75%)",
        WebkitMaskImage: "radial-gradient(circle at 50% 50%, black 0%, transparent 75%)",
      }}
    />

    {/* Floating orbs */}
    <div className="fixed inset-0 -z-40 pointer-events-none overflow-hidden">
      <div
        className="absolute top-1/5 left-1/5 w-[300px] h-[300px] sm:w-[500px] sm:h-[500px] bg-blue-600/8 rounded-full blur-3xl"
        style={{ animation: "pulse-performance 12s ease-in-out infinite" }}
      />
      <div
        className="absolute top-3/5 right-1/5 w-[250px] h-[250px] sm:w-[400px] sm:h-[400px] bg-purple-700/8 rounded-full blur-3xl"
        style={{ animation: "pulse-performance 15s ease-in-out infinite reverse" }}
      />
      <div
        className="absolute top-1/2 left-1/2 w-[200px] h-[200px] sm:w-[300px] sm:h-[300px] bg-zinc-800/8 rounded-full blur-3xl"
        style={{ animation: "drift-metrics 20s ease-in-out infinite" }}
      />
    </div>

    {/* Floating particles */}
    <div className="fixed inset-0 -z-40 pointer-events-none">
      {[...Array(15)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-blue-400/30 rounded-full"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animation: `float-particles ${3 + Math.random() * 4}s ease-in-out infinite`,
            animationDelay: `${Math.random() * 2}s`,
          }}
        />
      ))}
    </div>

    {/* Data flow lines */}
    <div className="fixed inset-0 -z-40 pointer-events-none">
      {[...Array(5)].map((_, i) => (
        <div
          key={i}
          className="absolute w-2 h-0.5 bg-gradient-to-r from-transparent via-blue-500/20 to-transparent"
          style={{
            top: `${20 + i * 15}%`,
            animation: `data-flow ${8 + i * 2}s linear infinite`,
            animationDelay: `${i * 1.5}s`,
          }}
        />
      ))}
    </div>
  </>
))

/* ---------- Reusable Cards ---------- */
const GlassCard = memo(({ children, className = "", hover = false, ...props }) => (
  <motion.div
    className={`relative overflow-hidden rounded-3xl backdrop-blur-xl ${hover ? "hover:scale-[1.02] transition-all duration-500" : ""} ${className}`}
    style={{
      background: "rgba(20,20,20,0.5)",
      WebkitBackdropFilter: "blur(20px) saturate(160%)",
      backdropFilter: "blur(20px) saturate(160%)",
      boxShadow: "0 8px 32px rgba(0,0,0,0.3)",
    }}
    {...props}
  >
    <div className="relative">{children}</div>
  </motion.div>
))

/** Solid color card with no border/black ring — used for stats and bookings list */
const ColorCard = memo(({ color = "blue", className = "", children, ...props }) => {
  const gradientMap = {
    blue: "from-blue-600 to-blue-700",
    green: "from-green-600 to-green-700",
    purple: "from-purple-600 to-purple-700",
    emerald: "from-emerald-600 to-emerald-700",
    zinc: "from-zinc-700 to-zinc-800",
    slate: "from-slate-700 to-slate-800",
    red: "from-red-600 to-red-700",
  }
  const gradient = gradientMap[color] || "from-zinc-700 to-zinc-800"

  return (
    <motion.div
      whileHover={{ scale: 1.04, y: -2 }}
      className={`relative overflow-hidden rounded-3xl p-6 shadow-xl text-white bg-gradient-to-br ${gradient} ${className}`}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-20"
        style={{ backgroundImage: "radial-gradient(circle at 30% -10%, white, transparent 40%)" }}
      />
      <div className="relative">{children}</div>
    </motion.div>
  )
})

/* ---------- Spinner ---------- */
function Spinner({ full = false }) {
  if (full) {
    return (
      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />
        <div className="relative z-10 flex items-center justify-center h-screen">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center gap-6 p-8 rounded-3xl"
            style={{
              background: "rgba(20,20,20,0.5)",
              WebkitBackdropFilter: "blur(20px) saturate(160%)",
              backdropFilter: "blur(20px) saturate(160%)",
            }}
          >
            <div className="relative">
              <Loader2 className="h-12 w-12 animate-spin text-blue-200" />
              <div className="absolute inset-0 h-12 w-12 animate-ping rounded-full bg-white/20" />
            </div>
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold text-white">Φόρτωση κρατήσεων</h3>
              <p className="text-white/70">Προετοιμασία των δεδομένων...</p>
            </div>
          </motion.div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-center py-20">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center gap-4 p-6 rounded-2xl"
        style={{
          background: "rgba(20,20,20,0.5)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          backdropFilter: "blur(20px) saturate(160%)",
        }}
      >
        <div className="relative">
          <Loader2 className="h-8 w-8 animate-spin text-blue-200" />
          <div className="absolute inset-0 h-8 w-8 animate-ping rounded-full bg-white/20" />
        </div>
        <p className="text-white/70">Φόρτωση...</p>
      </motion.div>
    </div>
  )
}

/* ---------- Animated Counter ---------- */
const AnimatedCounter = memo(({ value, duration = 1000 }) => {
  const [count, setCount] = useState(0)

  useEffect(() => {
    const end = Number.parseInt(value) || 0
    if (end === 0) {
      setCount(0)
      return
    }
    let start = 0
    const step = Math.max(1, Math.ceil(end / (duration / 16)))
    const id = setInterval(() => {
      start = Math.min(end, start + step)
      setCount(start)
      if (start >= end) clearInterval(id)
    }, 16)
    return () => clearInterval(id)
  }, [value, duration])

  return <span>{count}</span>
})

/* ---------- Stats Cards ---------- */
const StatsCards = memo(({ trainerId }) => {
  const [stats, setStats] = useState({
    todayBookings: 0,
    activeClients: 0,
    totalHours: 0,
    monthlyRevenue: 0,
    loading: true,
    error: null,
  })

  useEffect(() => {
    const fetchStats = async () => {
      if (!trainerId) return
      try {
        setStats((p) => ({ ...p, loading: true, error: null }))
        const now = new Date()
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
        const startOfDayStr = startOfDay.toISOString().slice(0, 10)
        const endOfDayStr = endOfDay.toISOString().slice(0, 10)
        const startOfMonthStr = startOfMonth.toISOString().slice(0, 10)

        const { data: todayBookingsData, error: todayError } = await supabase
          .from("bookings")
          .select("id, status")
          .eq("trainer_id", trainerId)
          .gte("booking_date", startOfDayStr)
          .lt("booking_date", endOfDayStr)
        if (todayError) throw todayError

        const { data: monthlyBookingsData, error: monthlyError } = await supabase
          .from("bookings")
          .select(`
            id,
            status,
            booking_date,
            service:services(
              price,
              duration_minutes,
              duration
            )
          `)
          .eq("trainer_id", trainerId)
          .gte("booking_date", startOfMonthStr)
        if (monthlyError) throw monthlyError

        const { data: clientsData, error: clientsError } = await supabase
          .from("bookings")
          .select("user_id")
          .eq("trainer_id", trainerId)
          .gte("booking_date", startOfMonthStr)
        if (clientsError) throw clientsError

        const todayBookings = (todayBookingsData ?? []).filter((b) => b.status !== "cancelled").length
        const activeClients = new Set((clientsData ?? []).map((b) => b.user_id)).size

        const completed = (monthlyBookingsData ?? []).filter((b) => b.status === "completed")
        const totalMinutes = completed.reduce((sum, b) => {
          const dm = b.service?.duration_minutes
          const d = b.service?.duration
          const m = typeof dm === "number" ? dm : typeof d === "number" ? d : 60
          return sum + m
        }, 0)
        const totalHours = Math.round(totalMinutes / 60)
        const monthlyRevenue = completed.reduce((sum, b) => sum + (Number(b.service?.price) || 0), 0)

        setStats({
          todayBookings,
          activeClients,
          totalHours,
          monthlyRevenue,
          loading: false,
          error: null,
        })
      } catch (e) {
        console.error("Error fetching booking stats:", e)
        setStats((p) => ({ ...p, loading: false, error: e.message }))
      }
    }

    fetchStats()
  }, [trainerId])

  const statsConfig = useMemo(
    () => [
      { icon: Calendar, label: "Σημερινές Κρατήσεις", value: stats.todayBookings, color: "blue" },
      { icon: Users, label: "Ενεργοί Πελάτες", value: stats.activeClients, color: "green" },
      { icon: Clock, label: "Ώρες Προπόνησης", value: stats.totalHours, color: "purple" },
      {
        icon: TrendingUp,
        label: "Μηνιαία Έσοδα",
        value: `€${Number(stats.monthlyRevenue).toLocaleString("el-GR")}`,
        color: "emerald",
      },
    ],
    [stats]
  )

  if (stats.error) {
    return (
      <div className="mb-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="p-6 rounded-2xl bg-red-900/40 text-red-100">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5" />
            <p>Σφάλμα φόρτωσης στατιστικών: {stats.error}</p>
          </div>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {statsConfig.map((stat, i) => (
        <ColorCard
          key={stat.label}
          color={stat.color}
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.06, duration: 0.5 }}
        >
          <div className="flex items-center justify-center mb-4">
            <div className="p-3 rounded-xl bg-white/15">
              <stat.icon className="h-6 w-6" />
            </div>
          </div>
          <p className="text-sm/5 text-white/80 mb-2">{stat.label}</p>
          <div className="flex items-center justify-center gap-2">
            {stats.loading ? (
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-white/80">...</span>
              </div>
            ) : (
              <p className="text-2xl font-bold">
                {typeof stat.value === "string" ? stat.value : <AnimatedCounter value={stat.value} />}
              </p>
            )}
          </div>
        </ColorCard>
      ))}
    </div>
  )
})

/* ---------- Main Component ---------- */
export default function TrainerBookingsPage() {
  useEffect(() => {
    document.documentElement.classList.add("bg-black")
    document.body.classList.add("bg-black")
    return () => {
      document.documentElement.classList.remove("bg-black")
      document.body.classList.remove("bg-black")
    }
  }, [])

  const { profile, loading } = useAuth()
  const [authUserId, setAuthUserId] = useState(null)

  useEffect(() => {
    const getAuthUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setAuthUserId(user?.id ?? null)
    }
    getAuthUser()
  }, [])

  const trainerId = profile?.id ?? authUserId

  if (loading) return <Spinner full />

  if (!profile || profile.role !== "trainer") {
    return (
      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />
        <div className="relative z-10 flex items-center justify-center h-screen">
          <ColorCard color="red" className="text-center p-8 max-w-md">
            <div className="p-4 rounded-full bg-white/15 w-fit mx-auto mb-4">
              <Users className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-semibold mb-2">Μη εξουσιοδοτημένη πρόσβαση</h2>
            <p className="text-white/80">Δεν έχετε δικαίωμα πρόσβασης σε αυτή τη σελίδα.</p>
          </ColorCard>
        </div>
      </div>
    )
  }

  return (
    <>
      <title>Κρατήσεις Πελατών • TrainerHub</title>

      <div className="relative min-h-screen text-gray-100">
        <BaseBackground />
        <AthleticBackground />

        <div className="min-h-screen overflow-x-hidden pt-14 lg:pt-0 lg:pl-[var(--side-w)] relative z-10">
          {/* Side-rail */}
          <Suspense fallback={<></>}>
            <TrainerMenu />
          </Suspense>

          {/* ---- Transparent header section (no blue background) ---- */}
          <motion.div
            className="mx-4 mt-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="relative p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="p-3 rounded-2xl bg-white/15">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-white">Κρατήσεις Πελατών</h1>
                  <p className="text-white/80 mt-1">Διαχειριστείτε τις κρατήσεις και τα ραντεβού σας</p>
                </div>
              </div>

              {/* Colored stats cards remain */}
              <StatsCards trainerId={trainerId} />
            </div>
          </motion.div>

          {/* Main content — bookings list in a solid neutral card */}
          <main className="mx-auto w-full max-w-none px-4 py-8">
            <Suspense fallback={<Spinner />}>
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.2 }}>
                <ColorCard color="zinc" className="p-6">
                  <TrainerBookings trainerId={trainerId} />
                </ColorCard>
              </motion.div>
            </Suspense>
          </main>
        </div>
      </div>
    </>
  )
}
