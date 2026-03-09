"use client"

import { motion } from "framer-motion"
import { Award, BadgeCheck, ExternalLink, Shield } from "lucide-react"

import { PremiumCard, ScrollReveal, isUrl, normalizeCerts } from "./shared.jsx"

export default function CertificationsSection({ diplomaUrl, certifications }) {
  const certs = normalizeCerts(certifications)
  const hasDiploma = Boolean(diplomaUrl?.trim())
  const hasAny = hasDiploma || certs.length > 0

  if (!hasAny) return null

  return (
    <PremiumCard>
      <div className="p-5 sm:p-6 lg:p-8 xl:p-9">
        <ScrollReveal>
          <div className="flex items-start gap-3 sm:gap-4 mb-6 lg:mb-8">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-br from-green-600/15 to-emerald-700/10 flex items-center justify-center shrink-0">
              <Shield className="h-6 w-6 sm:h-7 sm:w-7 text-green-300" />
            </div>

            <div className="min-w-0">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-zinc-100 leading-tight">
                Πιστοποιήσεις & Προσόντα
              </h2>
              <p className="mt-2 text-sm sm:text-base lg:text-lg text-zinc-400 leading-relaxed">
                Εκπαίδευση, πιστοποιήσεις και επαγγελματική αναγνώριση.
              </p>
            </div>
          </div>
        </ScrollReveal>

        <div className="space-y-3 sm:space-y-4">
          {hasDiploma && (
            <ScrollReveal delay={0.08}>
              <motion.div
                whileHover={{ y: -2 }}
                className="rounded-2xl p-3 sm:p-4 lg:p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-green-500/10 flex items-center justify-center shrink-0">
                      <Award className="h-5 w-5 text-green-300" />
                    </div>

                    <div className="min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-zinc-100 leading-tight">
                        Επίσημο Δίπλωμα
                      </h3>
                      <p className="mt-1 text-sm sm:text-[15px] text-zinc-400 leading-relaxed">
                        Έχει προστεθεί αποδεικτικό εκπαίδευσης ή πιστοποίησης.
                      </p>
                    </div>
                  </div>

                  {isUrl(diplomaUrl) && (
                    <motion.a
                      href={diplomaUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-2xl bg-zinc-800/70 px-4 py-2.5 text-sm font-medium text-zinc-200 hover:bg-zinc-700/70 transition-colors"
                    >
                      Προβολή
                      <ExternalLink className="h-4 w-4" />
                    </motion.a>
                  )}
                </div>
              </motion.div>
            </ScrollReveal>
          )}

          {certs.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {certs.map((cert, idx) => (
                <ScrollReveal key={`${cert}-${idx}`} delay={0.12 + idx * 0.05}>
                  <motion.div
                    whileHover={{ y: -2 }}
                    className="rounded-2xl p-3 sm:p-4"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-blue-500/10 flex items-center justify-center shrink-0">
                        <BadgeCheck className="h-5 w-5 text-blue-300" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-sm sm:text-base lg:text-lg leading-relaxed text-zinc-200 break-words">
                          {cert}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                </ScrollReveal>
              ))}
            </div>
          )}
        </div>
      </div>
    </PremiumCard>
  )
}