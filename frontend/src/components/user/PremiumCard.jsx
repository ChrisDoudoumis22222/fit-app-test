import { motion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "../ui/card";

const cardGlass = {
  background: "rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(20px) saturate(160%)",
  WebkitBackdropFilter: "blur(20px) saturate(160%)",
  border: "1px solid rgba(113, 113, 122, 0.15)",
};

export default function PremiumCard({ title, icon: Icon, description, children }) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden rounded-3xl"
      style={cardGlass}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-zinc-600/10 via-transparent to-transparent" />
      <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-zinc-600 via-zinc-500 to-zinc-600" />

      <Card className="relative bg-transparent border-none shadow-none">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-4 text-white">
            <div className="p-3 rounded-2xl bg-gradient-to-r from-zinc-700/50 to-zinc-800/50 border border-zinc-600/30">
              <Icon className="w-6 h-6 text-zinc-300" />
            </div>

            <div className="flex-1 min-w-0">
              <span className="text-xl font-bold">{title}</span>
              <p className="text-sm text-zinc-400 font-normal mt-1">{description}</p>
            </div>

            <ChevronRight className="w-5 h-5 text-zinc-500 flex-shrink-0" />
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-8 pb-8">{children}</CardContent>
      </Card>
    </motion.div>
  );
}