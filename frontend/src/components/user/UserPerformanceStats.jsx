import { useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, Calendar, Clock, Trophy } from "lucide-react";
import { useAuth } from "../../AuthProvider";
import UserNotificationsFeed from "./UserNotificationsFeed";

export default function UserPerformanceStats({
  performanceData,
  loading = false,
}) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleStatClick = useCallback(() => {
    navigate("/user/bookings");
  }, [navigate]);

  const stats = useMemo(
    () => [
      {
        label: "Σημερινές Προπονήσεις",
        value: loading ? "..." : performanceData.todayStats.workoutsCompleted,
        icon: Activity,
        trend: loading
          ? "..."
          : performanceData.todayStats.workoutsCompleted > 0
          ? `+${performanceData.todayStats.workoutsCompleted}`
          : "0",
        color: "from-blue-600/20 to-blue-700/20",
        borderColor: "border-blue-500/30",
      },
      {
        label: "Συνολικές Κρατήσεις",
        value: loading ? "..." : performanceData.todayStats.totalBookings,
        icon: Calendar,
        trend: loading ? "..." : `+${performanceData.todayStats.totalBookings}`,
        color: "from-green-600/20 to-green-700/20",
        borderColor: "border-green-500/30",
      },
      {
        label: "Επερχόμενες",
        value: loading ? "..." : performanceData.todayStats.upcomingBookings,
        icon: Clock,
        trend: loading
          ? "..."
          : performanceData.todayStats.upcomingBookings > 0
          ? "Ενεργός"
          : "—",
        color: "from-orange-600/20 to-orange-700/20",
        borderColor: "border-orange-500/30",
      },
      {
        label: "Ολοκληρωμένες",
        value: loading ? "..." : performanceData.todayStats.completedBookings,
        icon: Trophy,
        trend: loading ? "..." : `${performanceData.todayStats.completedBookings}`,
        color: "from-purple-600/20 to-purple-700/20",
        borderColor: "border-purple-500/30",
      },
    ],
    [performanceData, loading]
  );

  return (
    <div className="w-full">
      <div className="mb-6 sm:mb-8">
        <UserNotificationsFeed
          userId={user?.id}
          postsTable="trainer_posts"
          buildPostHref={(post) => `/trainer-post/${post.id}`}
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {stats.map((stat, index) => (
          <motion.button
            key={stat.label}
            type="button"
            onClick={handleStatClick}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.5 }}
            whileHover={{ y: -4, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`relative overflow-hidden rounded-xl sm:rounded-2xl bg-black/40 backdrop-blur-xl border ${stat.borderColor} p-4 sm:p-6 text-left w-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-white/20`}
          >
            <div className={`absolute inset-0 bg-gradient-to-br ${stat.color}`} />
            <div className="relative">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <stat.icon className="w-6 h-6 sm:w-8 sm:h-8 text-zinc-300" />
                <span className="text-xs font-semibold text-green-400 bg-green-400/10 px-2 py-1 rounded-full">
                  {stat.trend}
                </span>
              </div>

              <div className="text-2xl sm:text-3xl font-bold text-zinc-100 mb-1">
                {stat.value}
              </div>

              <div className="text-xs sm:text-sm text-zinc-400">
                {stat.label}
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}