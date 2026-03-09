import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Target, ArrowRight } from "lucide-react";
import GoalStatusBadge from "./GoalStatusBadge";

export default function GoalsCard({ goals }) {
  const navigate = useNavigate();

  const goToGoals = () => navigate("/goals");

  const onKeyToGoals = (e) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      goToGoals();
    }
  };

  return (
    <div className="relative overflow-hidden rounded-3xl bg-black/40 backdrop-blur-xl border border-zinc-700/50 p-6 lg:p-8">
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />

      <div className="relative">
        <div className="flex items-center justify-between mb-6 lg:mb-8">
          <div>
            <h3 className="text-xl lg:text-2xl font-bold text-white mb-1">Οι Στόχοι μου</h3>
            <p className="text-zinc-500 text-sm">Όρισε στόχους. Πέτυχε τους.</p>
          </div>
          <Target className="w-8 h-8 text-blue-400" />
        </div>

        <div className="space-y-4 lg:space-y-6">
          {goals.length > 0 ? (
            goals.map((goal) => (
              <motion.div
                key={goal.id}
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.18 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-zinc-800/30 border border-zinc-700/30 hover:bg-zinc-800/50 transition-all cursor-pointer"
                onClick={goToGoals}
                role="button"
                tabIndex={0}
                onKeyDown={onKeyToGoals}
              >
                <div className="flex-1">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="text-white font-semibold">{goal.title}</h4>
                    <GoalStatusBadge status={goal.status} />
                  </div>

                  <div className="w-full bg-zinc-700 rounded-full h-2 mb-2">
                    <div
                      className="h-2 rounded-full bg-blue-500"
                      style={{ width: `${Math.min(goal.progressPct, 100)}%` }}
                    />
                  </div>

                  <p className="text-xs text-zinc-400">
                    {goal.progressPct.toFixed(0)}% &nbsp;
                    {goal.target_value
                      ? `(${goal.progressPct.toFixed(1)}% από ${goal.target_value}${goal.unit || ""})`
                      : null}
                  </p>

                  {goal.description && (
                    <p className="text-xs text-zinc-500 mt-1">{goal.description}</p>
                  )}
                </div>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8">
              <Target className="w-16 h-16 text-zinc-600 mx-auto mb-6" />
              <h4 className="text-xl font-bold text-white mb-3">Δεν έχεις στόχους ακόμα</h4>
              <p className="text-zinc-400 mb-6">
                Δημιούργησε πραγματικούς στόχους από τη σελίδα Goals.
              </p>

              <motion.button
                onClick={goToGoals}
                whileHover={{ scale: 1.05, y: -2 }}
                whileTap={{ scale: 0.95 }}
                className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-semibold rounded-2xl shadow-lg transition-all duration-300"
              >
                <Target className="w-5 h-5" />
                Δημιούργησε Στόχους
                <ArrowRight className="w-5 h-5" />
              </motion.button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}