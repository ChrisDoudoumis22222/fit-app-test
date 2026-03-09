export default function AthleticBackground() {
  return (
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
        @keyframes performance-wave {
          0% { transform: translateY(0px) scaleY(1); }
          50% { transform: translateY(-10px) scaleY(1.1); }
          100% { transform: translateY(0px) scaleY(1); }
        }
        @keyframes data-flow { 
          0% { transform: translateX(-100%) translateY(0px); opacity: 0; } 
          50% { opacity: 0.3; } 
          100% { transform: translateX(100vw) translateY(-20px); opacity: 0; } 
        }
      `}</style>

      <div
        className="fixed inset-0 z-0 pointer-events-none opacity-15"
        style={{
          backgroundImage: `
            linear-gradient(rgba(113,113,122,0.08) 1px, transparent 1px),
            linear-gradient(90deg, rgba(113,113,122,0.08) 1px, transparent 1px)
          `,
          backgroundSize: "60px 60px",
          animation: "athletic-grid 25s linear infinite",
          maskImage:
            "radial-gradient(circle at 50% 50%, black 0%, transparent 75%)",
        }}
      />

      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div
          className="absolute top-1/5 left-1/5 w-[500px] h-[500px] bg-zinc-600/8 rounded-full blur-3xl"
          style={{ animation: "pulse-performance 12s ease-in-out infinite" }}
        />
        <div
          className="absolute top-3/5 right-1/5 w-[400px] h-[400px] bg-gray-700/8 rounded-full blur-3xl"
          style={{ animation: "pulse-performance 15s ease-in-out infinite reverse" }}
        />
        <div
          className="absolute top-1/2 left-1/2 w-[300px] h-[300px] bg-zinc-800/8 rounded-full blur-3xl"
          style={{ animation: "drift-metrics 20s ease-in-out infinite" }}
        />
      </div>

      <div className="fixed inset-0 z-0 pointer-events-none">
        <svg className="w-full h-full opacity-5" viewBox="0 0 1200 800">
          <path
            d="M0,400 Q300,350 600,400 T1200,400"
            stroke="rgba(113,113,122,0.3)"
            strokeWidth="2"
            fill="none"
            style={{ animation: "performance-wave 8s ease-in-out infinite" }}
          />
          <path
            d="M0,450 Q300,400 600,450 T1200,450"
            stroke="rgba(113,113,122,0.2)"
            strokeWidth="1"
            fill="none"
            style={{ animation: "performance-wave 10s ease-in-out infinite reverse" }}
          />
        </svg>
      </div>

      <div className="fixed inset-0 z-0 pointer-events-none">
        {[...Array(5)].map((_, i) => (
          <div
            key={i}
            className="absolute w-2 h-0.5 bg-gradient-to-r from-transparent via-zinc-500/20 to-transparent"
            style={{
              top: `${20 + i * 15}%`,
              animation: `data-flow ${8 + i * 2}s linear infinite`,
              animationDelay: `${i * 1.5}s`,
            }}
          />
        ))}
      </div>
    </>
  );
}