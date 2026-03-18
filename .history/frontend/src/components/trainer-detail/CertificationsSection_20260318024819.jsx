"use client"

import { Award, BadgeCheck, ExternalLink, Shield } from "lucide-react"

import { PremiumCard, isUrl, normalizeCerts } from "./shared.jsx"

export default function CertificationsSection({ diplomaUrl, certifications }) {
  const certs = normalizeCerts(certifications)
  const hasDiploma = Boolean(diplomaUrl?.trim())
  const hasAny = hasDiploma || certs.length > 0

  if (!hasAny) return null

  return (
    <PremiumCard
      className={[
        // mobile: full bleed, no card/container feel
        "relative left-1/2 right-1/2 -ml-[50vw] -mr-[50vw] w-screen max-w-none rounded-none border-x-0 bg-transparent shadow-none",
        // desktop+: restore normal card look
        "sm:static sm:left-auto sm:right-auto sm:ml-0 sm:mr-0 sm:w-full sm:max-w-none sm:rounded-[28px] sm:border-x sm:bg-inherit sm:shadow-[inherit]",
      ].join(" ")}
    >
      <div className="px-4 py-5 sm:p-6 lg:p-8 xl:p-9">
        <div className="mb-6 flex items-start gap-3 sm:gap-4 lg:mb-8">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-green-600/15 to-emerald-700/10 sm:h-14 sm:w-14">
            <Shield className="h-6 w-6 text-green-300 sm:h-7 sm:w-7" />
          </div>

          <div className="min-w-0">
            <h2 className="text-2xl font-bold leading-tight text-zinc-100 sm:text-3xl lg:text-4xl">
              Πιστοποιήσεις & Προσόντα
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base lg:text-lg">
              Εκπαίδευση, πιστοποιήσεις και επαγγελματική αναγνώριση.
            </p>
          </div>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {hasDiploma && (
            <div className="rounded-2xl bg-zinc-900/35 p-3 shadow-sm backdrop-blur-sm sm:p-4 lg:p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-green-500/10 sm:h-11 sm:w-11">
                    <Award className="h-5 w-5 text-green-300" />
                  </div>

                  <div className="min-w-0">
                    <h3 className="text-base font-semibold leading-tight text-zinc-100 sm:text-lg">
                      Επίσημο Δίπλωμα
                    </h3>
                    <p className="mt-1 text-sm leading-relaxed text-zinc-400 sm:text-[15px]">
                      Έχει προστεθεί αποδεικτικό εκπαίδευσης ή πιστοποίησης.
                    </p>
                  </div>
                </div>

                {isUrl(diplomaUrl) && (
                  <a
                    href={diplomaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-zinc-800/70 px-4 py-2.5 text-sm font-medium text-zinc-200 transition-colors hover:bg-zinc-700/70 sm:w-auto"
                  >
                    Προβολή
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          )}

          {certs.length > 0 && (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {certs.map((cert, idx) => (
                <div
                  key={`${cert}-${idx}`}
                  className="rounded-2xl border border-white/8 bg-zinc-900/35 p-3 shadow-sm backdrop-blur-sm sm:p-4"
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-500/10">
                      <BadgeCheck className="h-5 w-5 text-blue-300" />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="break-words text-sm leading-relaxed text-zinc-200 sm:text-base lg:text-lg">
                        {cert}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PremiumCard>
  )
}