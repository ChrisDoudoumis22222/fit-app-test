import React, { useState, useEffect, useRef, memo, Fragment, useCallback } from "react";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  Target,
  Trophy,
  Rocket,
} from "lucide-react";

/* -------------------- Typewriter -------------------- */
const TypewriterText = memo(function TypewriterText({
  text,
  delay = 0,
  speed = 50,
}) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const timerRef = useRef(null);

  useEffect(() => {
    setDisplayedText("");
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (!text) {
      setDisplayedText("");
      return;
    }

    timerRef.current = setTimeout(
      () => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          setCurrentIndex((prev) => prev + 1);
        }
      },
      currentIndex === 0 ? delay : speed
    );

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentIndex, text, delay, speed]);

  return <span>{displayedText}</span>;
});

/* -------------------- Περιεχόμενο βημάτων -------------------- */
const tutorialSteps = [
  {
    id: 1,
    title: "Παρακολούθηση Απόδοσης",
    subtitle: "Δες την πρόοδό σου με ακρίβεια",
    description:
      "Ζωντανές μετρήσεις για προπονήσεις, παλμούς και επιδόσεις. Παρακολούθησε την εξέλιξή σου και ανακάλυψε μοτίβα που σε οδηγούν σε καλύτερα αποτελέσματα.",
    icon: BarChart3,
  },
  {
    id: 2,
    title: "Εξατομικευμένη Προπόνηση",
    subtitle: "Πλάνο κομμένο και ραμμένο σε εσένα",
    description:
      "Πρόγραμμα με βάση το επίπεδό σου, τους στόχους και τις προτιμήσεις σου. Η AI προσαρμόζεται ώστε κάθε σετ να σε πηγαίνει ένα βήμα πιο κοντά στο στόχο.",
    icon: Target,
  },
  {
    id: 3,
    title: "Κοινότητα & Προκλήσεις",
    subtitle: "Σύνδεση με ανθρώπους που σε ανεβάζουν",
    description:
      "Μπες σε προκλήσεις, μοιράσου επιτεύγματα και άντλησε κίνητρο από άλλους αθλητές. Κέρδισε badges, levels και βραβεία.",
    icon: Trophy,
  },
  {
    id: 4,
    title: "Ξεκίνα την Άνοδό σου",
    subtitle: "Η καλύτερη εκδοχή σου σε περιμένει",
    description:
      "Η εμπειρία Peak Velocity είναι έτοιμη. Πάτα εκκίνηση και κάνε το πρώτο βήμα προς κορυφαία απόδοση.",
    icon: Rocket,
  },
];

/* -------------------- Λογότυπο (responsive) -------------------- */
const PeakVelocityLogo = memo(function PeakVelocityLogo() {
  return (
    <div className="flex items-center gap-2 md:gap-3">
      <div className="relative flex items-center justify-center w-10 h-10 md:w-12 md:h-12 rounded-xl bg-white/95 ring-1 ring-white/15 shadow-[0_6px_22px_rgba(0,0,0,0.28)] overflow-hidden">
        <img
          src="https://peakvelocity.gr/wp-content/uploads/2024/03/Logo-chris-black-1.png"
          alt="Peak Velocity"
          className="w-7 h-7 md:w-8 md:h-8 object-contain"
          loading="lazy"
          decoding="async"
        />
      </div>
      <span className="font-semibold text-base md:text-lg tracking-wide text-white">
        Peak Velocity
      </span>
    </div>
  );
});

/* -------------------- Stepper (centered + responsive) -------------------- */
function Stepper({ steps, current, prev, onGoTo }) {
  return (
    <div className="flex items-center w-full max-w-xl mx-auto select-none">
      {steps.map((s, i) => {
        const Icon = s.icon;
        const active = i === current;
        const done = i < current;
        const animateConnector = i === prev && current === prev + 1;

        return (
          <Fragment key={s.id}>
            <button
              type="button"
              onClick={() => onGoTo(i)}
              aria-label={`Βήμα ${i + 1}: ${s.title}`}
              title={s.title}
              className={[
                "relative grid place-items-center w-8 h-8 md:w-10 md:h-10 rounded-full transition",
                done
                  ? "bg-white text-black"
                  : active
                  ? "bg-white/90 text-black"
                  : "bg-white/15 text-white border border-white/25",
                "hover:scale-105",
              ].join(" ")}
            >
              {active && (
                <svg
                  viewBox="0 0 48 48"
                  className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 pointer-events-none"
                  preserveAspectRatio="xMidYMid meet"
                  shapeRendering="geometricPrecision"
                  aria-hidden="true"
                >
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="rgba(255,255,255,0.25)"
                    strokeWidth="3"
                    vectorEffect="non-scaling-stroke"
                  />
                  <circle
                    cx="24"
                    cy="24"
                    r="20"
                    fill="none"
                    stroke="white"
                    strokeWidth="3"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                    pathLength="100"
                    className="pv-progress"
                    style={{ strokeDasharray: 100, strokeDashoffset: 100 }}
                  />
                </svg>
              )}
              <Icon className="w-4 h-4 md:w-5 md:h-5" />
            </button>

            {i < steps.length - 1 && (
              <div className="relative flex-1 h-0.5 mx-2 md:mx-3">
                <div className="absolute inset-0 rounded-full bg-white/25" />
                <div
                  className={[
                    "absolute inset-y-0 left-0 rounded-full bg-white",
                    i < current ? "w-full" : "w-0",
                    animateConnector ? "pv-connector-anim" : "",
                  ].join(" ")}
                />
              </div>
            )}
          </Fragment>
        );
      })}
    </div>
  );
}

/* ==================== Κύρια σελίδα Onboarding ==================== */
export default function WelcomeOnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const prevStepRef = useRef(0);
  const transitionTimeoutRef = useRef(null);

  const step = tutorialSteps[currentStep];
  const StepIcon = step.icon;

  const goTo = useCallback(
    (idx) => {
      if (idx === currentStep) return;

      prevStepRef.current = currentStep;
      setIsAnimating(true);

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      transitionTimeoutRef.current = setTimeout(() => {
        setCurrentStep(idx);
        setIsAnimating(false);
      }, 160);
    },
    [currentStep]
  );

  const handleNext = useCallback(() => {
    if (currentStep < tutorialSteps.length - 1) {
      goTo(currentStep + 1);
    }
  }, [currentStep, goTo]);

  const handlePrevious = useCallback(() => {
    if (currentStep > 0) {
      goTo(currentStep - 1);
    }
  }, [currentStep, goTo]);

  const handleSkipTutorial = useCallback(() => {
    setIsAnimating(true);

    if (transitionTimeoutRef.current) {
      clearTimeout(transitionTimeoutRef.current);
    }

    transitionTimeoutRef.current = setTimeout(() => {
      console.log("[PV] Παραλείφθηκε ο οδηγός");
      setIsAnimating(false);
    }, 220);
  }, []);

  /* ---- YouTube background ---- */
  const VIDEO_ID = "Sc7LUjbKBHw";
  const START_AT = 0;
  const END_AT = 30;

  const playerHostRef = useRef(null);
  const ytPlayerRef = useRef(null);
  const loopTickerRef = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let isMounted = true;
    let previousReadyHandler = null;
    let currentReadyHandler = null;

    const clearLoop = () => {
      if (loopTickerRef.current) {
        clearInterval(loopTickerRef.current);
        loopTickerRef.current = null;
      }
    };

    const startLoopWatcher = (playerInstance) => {
      clearLoop();

      loopTickerRef.current = window.setInterval(() => {
        try {
          const t = playerInstance?.getCurrentTime?.() ?? 0;
          if (t >= END_AT - 0.25) {
            playerInstance.seekTo(START_AT, true);
          }
        } catch {
          /* ignore */
        }
      }, 250);
    };

    const mountPlayer = () => {
      if (!isMounted || !playerHostRef.current || !window.YT || !window.YT.Player) return;

      try {
        ytPlayerRef.current = new window.YT.Player(playerHostRef.current, {
          videoId: VIDEO_ID,
          width: "100%",
          height: "100%",
          playerVars: {
            autoplay: 1,
            controls: 0,
            mute: 1,
            playsinline: 1,
            rel: 0,
            modestbranding: 1,
            start: START_AT,
            end: END_AT,
            loop: 1,
            playlist: VIDEO_ID,
            origin: window.location.origin,
          },
          events: {
            onReady: (e) => {
              try {
                e.target.mute();
                e.target.playVideo();
              } catch {
                /* ignore */
              }

              startLoopWatcher(e.target);
            },
            onStateChange: (e) => {
              if (e.data === window.YT.PlayerState.ENDED) {
                try {
                  e.target.seekTo(START_AT, true);
                  e.target.playVideo();
                } catch {
                  /* ignore */
                }
              }
            },
          },
        });
      } catch {
        /* ignore */
      }
    };

    const ensureAPI = () => {
      if (window.YT && window.YT.Player) {
        mountPlayer();
        return;
      }

      const existingScript = document.querySelector(
        'script[src="https://www.youtube.com/iframe_api"]'
      );

      if (!existingScript) {
        const tag = document.createElement("script");
        tag.src = "https://www.youtube.com/iframe_api";
        document.body.appendChild(tag);
      }

      previousReadyHandler = window.onYouTubeIframeAPIReady;

      currentReadyHandler = () => {
        if (typeof previousReadyHandler === "function") {
          previousReadyHandler();
        }
        mountPlayer();
      };

      window.onYouTubeIframeAPIReady = currentReadyHandler;
    };

    ensureAPI();

    return () => {
      isMounted = false;
      clearLoop();

      if (transitionTimeoutRef.current) {
        clearTimeout(transitionTimeoutRef.current);
      }

      try {
        ytPlayerRef.current?.destroy?.();
      } catch {
        /* ignore */
      }

      if (window.onYouTubeIframeAPIReady === currentReadyHandler) {
        window.onYouTubeIframeAPIReady =
          typeof previousReadyHandler === "function" ? previousReadyHandler : null;
      }
    };
  }, []);

  return (
    <div className="relative min-h-[100svh] text-white overflow-hidden">
      <div className="fixed inset-0 -z-10">
        <div className="absolute inset-0 overflow-hidden">
          <div id="pv-bg" ref={playerHostRef} className="yt-cover" />
          <div className="pointer-events-none absolute top-0 left-0 w-24 h-24 bg-gradient-to-br from-black/70 to-transparent" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-black/75 via-black/40 to-black/85" />
      </div>

      <style>{`
        .yt-cover {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 177.78vh;
          height: 100vh;
        }

        @media (min-aspect-ratio: 16/9) {
          .yt-cover {
            width: 100vw;
            height: 56.25vw;
          }
        }

        .yt-cover iframe {
          width: 100%;
          height: 100%;
          pointer-events: none;
          background: black;
        }

        @keyframes textSlideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-text-slide-up {
          animation: textSlideUp 0.7s ease-out forwards;
        }

        @keyframes pv-dash {
          from {
            stroke-dashoffset: 100;
          }
          to {
            stroke-dashoffset: 0;
          }
        }

        .pv-progress {
          animation: pv-dash 1.1s linear forwards;
          filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.45));
        }

        @keyframes pv-connector {
          from {
            width: 0%;
          }
          to {
            width: 100%;
          }
        }

        .pv-connector-anim {
          animation: pv-connector 420ms ease forwards;
        }
      `}</style>

      <main className="relative z-10 px-4 md:px-6 pt-6 md:pt-8 pb-6 md:pb-8 min-h-[100svh] flex flex-col justify-between max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-4 md:mb-6">
          <PeakVelocityLogo />
          <div className="w-8 md:w-10" />
        </div>

        <div
          className={`max-w-2xl transition-all duration-500 ${
            isAnimating ? "translate-y-1 opacity-90" : "translate-y-0 opacity-100"
          }`}
        >
          <p
            className="text-white/90 text-sm md:text-lg font-medium mb-1.5 md:mb-2 animate-text-slide-up opacity-0"
            style={{ animationDelay: "0.1s" }}
          >
            <TypewriterText
              text={`Βήμα ${step.id} από ${tutorialSteps.length}`}
              delay={150}
              speed={95}
            />
          </p>

          <div className="flex items-center gap-2.5 md:gap-3 mb-1">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl grid place-items-center bg-white/10 border border-white/20 backdrop-blur-sm shrink-0">
              <StepIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>

            <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
              <TypewriterText text={step.title} delay={150} speed={25} />
            </h1>
          </div>

          <p
            className="text-white text-base md:text-lg font-medium mb-3 md:mb-4 opacity-0 animate-text-slide-up"
            style={{ animationDelay: "0.35s" }}
          >
            <TypewriterText text={step.subtitle} delay={200} speed={25} />
          </p>

          <p
            className="text-white/90 text-sm md:text-base leading-relaxed mb-4 md:mb-6 opacity-0 animate-text-slide-up"
            style={{ animationDelay: "0.6s" }}
          >
            <TypewriterText text={step.description} delay={900} speed={40} />
          </p>

          <div
            className="flex items-center gap-2 text-white/90 mb-4 md:mb-6 opacity-0 animate-text-slide-up"
            style={{ animationDelay: "0.8s" }}
          >
            <Clock className="h-4 w-4" />
            <span className="text-xs md:text-sm">Χρόνος οδηγού: &lt; 2 λεπτά</span>
          </div>
        </div>

        <div className="space-y-3 md:space-y-4">
          <Stepper
            steps={tutorialSteps}
            current={currentStep}
            prev={prevStepRef.current}
            onGoTo={goTo}
          />

          <div className="grid grid-cols-2 gap-2.5 md:gap-3 w-full max-w-xl mx-auto">
            <button
              type="button"
              onClick={handlePrevious}
              disabled={currentStep === 0}
              aria-disabled={currentStep === 0}
              className={[
                "h-11 md:h-14 w-full rounded-xl border shadow-lg transition text-sm md:text-base",
                currentStep === 0
                  ? "bg-white/10 text-white/45 border-white/10 cursor-not-allowed"
                  : "bg-gradient-to-r from-gray-900/70 to-gray-800/70 backdrop-blur-sm text-white border-white/10 hover:scale-105 active:scale-95",
              ].join(" ")}
            >
              <span className="inline-flex items-center justify-center gap-1.5 md:gap-2">
                <ChevronLeft className="h-4 w-4 md:h-5 md:w-5" />
                Προηγούμενο
              </span>
            </button>

            {currentStep < tutorialSteps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                className="h-11 md:h-14 w-full rounded-xl bg-white text-black font-bold border-2 border-gray-300 shadow-xl hover:scale-[1.02] active:scale-[0.98] hover:shadow-2xl hover:border-gray-400 hover:bg-gray-50 transition text-sm md:text-base"
              >
                <span className="inline-flex items-center justify-center gap-1.5 md:gap-2">
                  Επόμενο
                  <ChevronRight className="h-4 w-4 md:h-5 md:w-5" />
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => console.log("[PV] Ξεκινάμε!")}
                className="h-11 md:h-14 w-full rounded-xl bg-white text-black font-bold border-2 border-gray-300 shadow-xl hover:scale-[1.02] active:scale-[0.98] hover:shadow-2xl hover:border-gray-400 hover:bg-gray-50 transition text-sm md:text-base"
              >
                Ξεκινάμε
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={handleSkipTutorial}
            className="w-full py-2.5 md:py-3 text-center font-medium text-white/85 hover:text-white transition hover:bg-white/5 rounded-lg underline underline-offset-4 decoration-white/70 text-sm md:text-base"
          >
            Παράλειψη οδηγού
          </button>
        </div>
      </main>
    </div>
  );
}