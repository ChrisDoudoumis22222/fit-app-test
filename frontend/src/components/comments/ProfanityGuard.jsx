"use client"

import { memo } from "react"
import { AlertTriangle, X } from "lucide-react"

/* ──────────────────────────────────────────────────────────────────────
   Profanity filtering
   ────────────────────────────────────────────────────────────────────── */

const PROFANITY_GREEK = [
  "μαλακ",
  "μαλακια",
  "μαλακες",
  "μαλακισ",
  "μαλακισμεν",
  "μαλακας",
  "μαλακω",
  "γαμω",
  "γαμο",
  "γαμι",
  "γαμησ",
  "γαμησε",
  "γαμησου",
  "γαμημεν",
  "γαμιολ",
  "γαμωτο",
  "σκατ",
  "σκατα",
  "σκατο",
  "σκασε",
  "χεστ",
  "χεστηκ",
  "πουστ",
  "πουτ",
  "πουτσα",
  "πουτσ",
  "πουτσο",
  "πουτσος",
  "πουτσοτρ",
  "μουν",
  "μουνι",
  "μουνο",
  "μουνοπαν",
  "μουνοσκυλ",
  "πουταν",
  "πουτανια",
  "τσουλ",
  "τσογλ",
  "ξεκωλ",
  "αρχιδ",
  "ψωλ",
  "ψωλη",
  "καυλ",
  "καβλ",
  "κωλο",
  "κωλαρ",
  "κωλογ",
  "κωλοπαιδ",
  "κωλοτρυπ",
  "παπαρ",
  "ηλιθ",
  "βλακ",
  "βλαμ",
  "ζωον",
  "σιχαμ",
  "βρομ",
  "ξεφτιλ",
  "καραγκιοζ",
  "καργιολ",
  "καριολ",
  "ρουφι",
  "ρεζιλ",
  "σκυλ",
  "σκροφ",
]

const PROFANITY_LATIN = [
  "malak",
  "malaka",
  "malakas",
  "malakia",
  "malakism",
  "malakismen",
  "gamw",
  "gamo",
  "gami",
  "gamis",
  "gamise",
  "gamisou",
  "gamim",
  "gamiol",
  "gamhs",
  "gamhto",
  "gamot",
  "gamoto",
  "skata",
  "skato",
  "skase",
  "xesto",
  "xestes",
  "poust",
  "poutan",
  "poutana",
  "poutanes",
  "poutania",
  "poutsa",
  "poutso",
  "poutses",
  "poutsotr",
  "moun",
  "mouni",
  "mouno",
  "mounopan",
  "mounoskyl",
  "arxid",
  "arhidi",
  "psol",
  "pswli",
  "kavl",
  "kavla",
  "kaul",
  "kaula",
  "kwlo",
  "kolo",
  "kolopaid",
  "kolotryp",
  "papar",
  "vlak",
  "vlakent",
  "zwo",
  "sixam",
  "vrom",
  "kseftil",
  "karagioz",
  "kargiol",
  "kariol",
  "roufi",
  "rezil",
  "fuck",
  "fucking",
  "fucker",
  "motherfucker",
  "mf",
  "wtf",
  "shit",
  "shitty",
  "bullshit",
  "bitch",
  "bitches",
  "ass",
  "asshole",
  "bastard",
  "dick",
  "dickhead",
  "pussy",
  "cunt",
  "jerk",
  "moron",
  "idiot",
  "loser",
  "slut",
  "whore",
  "dipshit",
  "dumbass",
  "jackass",
  "f*ck",
  "f**k",
  "sh*t",
  "b*tch",
  "a**hole",
  "b@stard",
]

const stripDiacritics = (s) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
const collapseRepeats = (s) => s.replace(/([a-z\u0370-\u03ff])\1{2,}/gi, "$1$1")

const greekToLatin = (s) => {
  const map = {
    α: "a",
    β: "v",
    γ: "g",
    δ: "d",
    ε: "e",
    ζ: "z",
    η: "i",
    θ: "th",
    ι: "i",
    κ: "k",
    λ: "l",
    μ: "m",
    ν: "n",
    ξ: "x",
    ο: "o",
    π: "p",
    ρ: "r",
    σ: "s",
    ς: "s",
    τ: "t",
    υ: "y",
    φ: "f",
    χ: "x",
    ψ: "ps",
    ω: "o",
  }

  return s.replace(/[\u0370-\u03ff]/g, (ch) => map[ch] ?? ch)
}

const cleanSeparators = (s) => s.replace(/[^\p{L}\p{N} ]+/gu, " ")
const squashAllNonAlnum = (s) => s.replace(/[^\p{L}\p{N}]+/gu, "")
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const normalizeGreek = (text) => {
  let s = text.toLowerCase()
  s = stripDiacritics(s)
  s = cleanSeparators(s)
  s = collapseRepeats(s)
  return s
}

const normalizeLatin = (text) => {
  let s = text.toLowerCase()
  s = stripDiacritics(s)
  s = greekToLatin(s)
  s = cleanSeparators(s)
  s = collapseRepeats(s)
  return s
}

const normalizeProfanityTermGreek = (term) =>
  squashAllNonAlnum(normalizeGreek(String(term || "")))

const normalizeProfanityTermLatin = (term) =>
  squashAllNonAlnum(normalizeLatin(String(term || "")))

const NORMALIZED_PROFANITY_GREEK = [
  ...new Set(PROFANITY_GREEK.map(normalizeProfanityTermGreek).filter(Boolean)),
]

const NORMALIZED_PROFANITY_LATIN = [
  ...new Set(PROFANITY_LATIN.map(normalizeProfanityTermLatin).filter(Boolean)),
]

const makeFuzzy = (term) => {
  const safe = squashAllNonAlnum(String(term || "").toLowerCase())
  if (!safe) return null

  const separator = "[^\\p{L}\\p{N}]{0,2}"
  const pattern = safe
    .split("")
    .map((ch) => `${escapeRegex(ch)}+`)
    .join(separator)

  return new RegExp(pattern, "iu")
}

const FUZZY_PROFANITY_GREEK = NORMALIZED_PROFANITY_GREEK.map(makeFuzzy).filter(Boolean)
const FUZZY_PROFANITY_LATIN = NORMALIZED_PROFANITY_LATIN.map(makeFuzzy).filter(Boolean)

export const containsProfanity = (text) => {
  const g1 = normalizeGreek(text)
  const g2 = squashAllNonAlnum(g1)
  const l1 = normalizeLatin(text)
  const l2 = squashAllNonAlnum(l1)

  const hitGreek = NORMALIZED_PROFANITY_GREEK.some((t) => g1.includes(t) || g2.includes(t))
  if (hitGreek) return true

  const hitLatin = NORMALIZED_PROFANITY_LATIN.some((t) => l1.includes(t) || l2.includes(t))
  if (hitLatin) return true

  const greekRegexHit = FUZZY_PROFANITY_GREEK.some((rx) => rx.test(g1) || rx.test(g2))
  if (greekRegexHit) return true

  const latinRegexHit = FUZZY_PROFANITY_LATIN.some((rx) => rx.test(l1) || rx.test(l2))
  if (latinRegexHit) return true

  return false
}

/* ──────────────────────────────────────────────────────────────────────
   Popup Component
   ────────────────────────────────────────────────────────────────────── */

export const ProfanityWarningPopup = memo(function ProfanityWarningPopup({
  open,
  onClose,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
      <div
        className="relative w-full max-w-md overflow-hidden rounded-[28px] border p-6 shadow-2xl sm:p-7"
        style={{
          background: "rgba(7,7,8,0.96)",
          borderColor: "rgba(239,68,68,0.22)",
          backdropFilter: "blur(20px) saturate(150%)",
          WebkitBackdropFilter: "blur(20px) saturate(150%)",
          boxShadow:
            "0 30px 80px -28px rgba(239,68,68,0.35), 0 0 0 1px rgba(255,255,255,0.02) inset",
        }}
      >
        <div
          className="pointer-events-none absolute inset-x-8 bottom-0 h-16 rounded-full blur-3xl"
          style={{ background: "rgba(239,68,68,0.16)" }}
        />

        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/45 transition hover:border-white/15 hover:bg-white/[0.08] hover:text-white/80"
          aria-label="Κλείσιμο"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="relative z-10">
          <div className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-red-400/20 bg-red-500/10 shadow-[0_0_0_1px_rgba(255,255,255,0.02)_inset]">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>

          <h3 className="mb-2 text-2xl font-semibold tracking-tight text-white">
            Προσοχή
          </h3>

          <p className="mb-2 text-[15px] leading-7 text-zinc-300">
            Συγγνώμη, αλλά δεν επιτρέπεται υβριστικό περιεχόμενο. 😅
          </p>

          <p className="mb-7 text-sm leading-6 text-zinc-400">
            Κρατήστε έναν ευγενικό και σεβαστό τόνο στα σχόλιά σας.
          </p>

          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-red-500/25 bg-red-600 px-4 py-3.5 text-base font-semibold text-white shadow-[0_12px_30px_-12px_rgba(220,38,38,0.8)] transition hover:bg-red-500 active:scale-[0.99]"
          >
            Κατάλαβα
          </button>
        </div>
      </div>
    </div>
  )
})