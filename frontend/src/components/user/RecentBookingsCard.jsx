import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Activity, ArrowRight, Plus } from "lucide-react";

export default function RecentBookingsCard({ bookings, totalBookings }) {
  const navigate = useNavigate();

  const goToManage = () => navigate("/services");

  const handleCTA = () => {
    if (totalBookings > 0) {
      goToManage();
    } else {
      navigate("/services");
    }
  };

  const onKeyToManage = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToManage();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/50 p-6 lg:px-8 lg:py-8">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />

      <div className="relative">
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div>
            <h3 className="text-xl lg:text-2xl font-bold text-white mb-1">Πρόσφατες Κρατήσεις</h3>
            <p className="text-zinc-500 text-sm">
              Δες τις τελευταίες σου συνεδρίες με μια ματιά
            </p>
          </div>
          <Activity className="w-8 h-8 text-purple-400" />
        </div>

        <div className="space-y-4">
          {bookings.length > 0 ? (
            <>
              {bookings.map((booking, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/50 transition-all cursor-pointer"
                  onClick={goToManage}
                  role="button"
                  tabIndex={0}
                  onKeyDown={onKeyToManage}
                >
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-r from-purple-600/20 to-purple-700/20 flex items-center justify-center">
                    <Activity className="w-6 h-6 text-purple-400" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <h4 className="text-white font-semibold truncate">{booking.name}</h4>
                    <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400 mt-1">
                      <span className="truncate">με {booking.trainer}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{booking.date}</span>
                      <span className="hidden sm:inline">•</span>
                      <span>{booking.time}</span>
                    </div>
                  </div>

                  <div
                    className={`text-xs px-2 py-1 rounded-full whitespace-nowrap ${
                      (booking.status || "").toLowerCase() === "confirmed" ||
                      (booking.status || "").toLowerCase() === "accepted"
                        ? "bg-green-400/10 text-green-400"
                        : (booking.status || "").toLowerCase() === "pending"
                        ? "bg-yellow-400/10 text-yellow-400"
                        : (booking.status || "").toLowerCase() === "completed"
                        ? "bg-sky-400/10 text-sky-400"
                        : "bg-red-400/10 text-red-400"
                    }`}
                  >
                    {(booking.status || "").toLowerCase() === "confirmed" ||
                    (booking.status || "").toLowerCase() === "accepted"
                      ? "Επιβεβαιωμένη"
                      : (booking.status || "").toLowerCase() === "pending"
                      ? "Εκκρεμής"
                      : (booking.status || "").toLowerCase() === "completed"
                      ? "Ολοκληρώθηκε"
                      : "Ακυρωμένη"}
                  </div>
                </motion.div>
              ))}

              <div className="pt-6 text-center">
                <motion.button
                  onClick={handleCTA}
                  whileHover={{ scale: 1.05, y: -2 }}
                  whileTap={{ scale: 0.95 }}
                  className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-2xl shadow-lg transition-all duration-300"
                >
                  Διαχείριση Κρατήσεων
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <Activity className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
              <h4 className="text-xl font-bold text-white mb-3">Κλείσε την Πρώτη σου Προπόνηση</h4>
              <p className="text-zinc-400 mb-6">
                Ό,τι βλέπεις εδώ έρχεται από την πραγματική σου δραστηριότητα.
              </p>

              <motion.button
                onClick={handleCTA}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 text-white font-semibold rounded-2xl shadow-lg transition-all duration-300"
              >
                <Plus className="w-5 h-5" />
                Κλείσε Προπόνηση
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}