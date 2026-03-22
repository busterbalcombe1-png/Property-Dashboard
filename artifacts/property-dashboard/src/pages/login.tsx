import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/contexts/auth-context";

const LOAD_DURATION = 3600;
const CREDENTIALS: Record<string, string> = { admin: "propdash", james: "propdash", charlesbalcombe: "A7@k3s9gs" };

function LoadingScreen({ onComplete }: { onComplete: () => void }) {
  const [progress, setProgress] = useState(0);
  const [phase, setPhase] = useState(0);
  const [statusText, setStatusText] = useState("Authenticating");
  const startRef = useRef(Date.now());
  const rafRef = useRef<number>(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 700),
      setTimeout(() => setPhase(3), 1100),
      setTimeout(() => setStatusText("Retrieving portfolio"), 1300),
      setTimeout(() => setStatusText("Loading assets"), 2300),
      setTimeout(() => setStatusText("Welcome"), 3100),
    ];

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const raw = elapsed / LOAD_DURATION;
      const eased = 1 - Math.pow(1 - Math.min(raw, 1), 2.2);
      setProgress(eased * 100);
      if (raw < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        setProgress(100);
        setTimeout(onComplete, 250);
      }
    };
    rafRef.current = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafRef.current);
      timers.forEach(clearTimeout);
    };
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, background: "#080f1e", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 9999 }}>
      <style>{`
        @keyframes pd-fadein { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes pd-pulse  { 0%,100% { opacity:1; } 50% { opacity:0.45; } }
        .pd-fi  { animation: pd-fadein 0.7s ease forwards; }
        .pd-pul { animation: pd-pulse 2.8s ease-in-out infinite; }
      `}</style>

      {/* Crest */}
      <div
        className={phase >= 0 ? "pd-fi" : ""}
        style={{ width: 84, height: 84, border: "1.5px solid #7a6020", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 28, opacity: 0, position: "relative" }}
      >
        {/* Hairline corners */}
        {[{ top: -5, left: -5 }, { top: -5, right: -5 }, { bottom: -5, left: -5 }, { bottom: -5, right: -5 }].map((pos, i) => (
          <div key={i} style={{ position: "absolute", width: 7, height: 7, border: "1px solid #7a6020", background: "#080f1e", ...pos }} />
        ))}
        <span className="pd-pul" style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 34, fontWeight: 500, color: "#c9a84c", letterSpacing: 4, lineHeight: 1 }}>
          PD
        </span>
      </div>

      {/* Title */}
      <div style={{ opacity: 0, animation: phase >= 1 ? "pd-fadein 0.8s ease 0.1s forwards" : "none", textAlign: "center", marginBottom: 5 }}>
        <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 32, fontWeight: 600, color: "#e8dfc8", letterSpacing: "0.08em", margin: 0, lineHeight: 1.1 }}>
          PropDash
        </h1>
      </div>

      {/* Subtitle */}
      <div style={{ opacity: 0, animation: phase >= 1 ? "pd-fadein 0.8s ease 0.3s forwards" : "none", textAlign: "center", marginBottom: 44 }}>
        <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: "italic", color: "#6a5a34", letterSpacing: "0.14em", margin: 0 }}>
          Private Portfolio Management
        </p>
      </div>

      {/* Progress bar */}
      <div style={{ opacity: 0, animation: phase >= 2 ? "pd-fadein 0.6s ease forwards" : "none", width: 200, marginBottom: 18 }}>
        <div style={{ width: "100%", height: 1, background: "#12203a", position: "relative", overflow: "hidden" }}>
          <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${progress}%`, background: "linear-gradient(90deg, #5a4010, #c9a84c, #ead08a)" }} />
        </div>
      </div>

      {/* Status */}
      <div style={{ opacity: 0, animation: phase >= 3 ? "pd-fadein 0.5s ease forwards" : "none", height: 18 }}>
        <p key={statusText} style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 11, color: "#3a4e68", letterSpacing: "0.22em", textTransform: "uppercase", margin: 0, animation: "pd-fadein 0.4s ease forwards" }}>
          {statusText}
        </p>
      </div>

      {/* Bottom ornament */}
      <div style={{ position: "absolute", bottom: 44, display: "flex", alignItems: "center", gap: 14, width: 220, opacity: 0, animation: phase >= 1 ? "pd-fadein 1s ease 0.8s forwards" : "none" }}>
        <div style={{ flex: 1, height: 1, background: "#141e30" }} />
        <span style={{ color: "#1e2e46", fontSize: 10 }}>✦</span>
        <div style={{ flex: 1, height: 1, background: "#141e30" }} />
      </div>
    </div>
  );
}

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setVerifying(true);
    await new Promise(r => setTimeout(r, 380));
    const lc = username.trim().toLowerCase();
    if (CREDENTIALS[lc] !== password) {
      setError(true);
      setVerifying(false);
      return;
    }
    setVerifying(false);
    setShowLoader(true);
  };

  if (showLoader) {
    return <LoadingScreen onComplete={() => login(username, password)} />;
  }

  return (
    <div style={{ background: "#f5f0e6", minHeight: "100vh" }} className="flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Crest */}
        <div className="flex flex-col items-center mb-10">
          <div style={{ width: 64, height: 64, border: "2px solid #9d7c2e", display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
            <span style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 28, fontWeight: 600, color: "#9d7c2e", letterSpacing: 2, lineHeight: 1 }}>PD</span>
          </div>
          <h1 style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 26, fontWeight: 600, color: "#1a2744", letterSpacing: "0.05em", lineHeight: 1.1, textAlign: "center" }}>BlackRidge PropertyGroup</h1>
          <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: "italic", color: "#7a6a50", letterSpacing: "0.1em", marginTop: 4, textAlign: "center" }}>
            Private Portfolio Management
          </p>
        </div>

        {/* Divider */}
        <div style={{ display: "flex", alignItems: "center", marginBottom: 28, gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#d4c49e" }} />
          <span style={{ color: "#9d7c2e", fontSize: 14 }}>✦</span>
          <div style={{ flex: 1, height: 1, background: "#d4c49e" }} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "#4a3f2f" }}>
              Username
            </label>
            <input
              type="text" value={username} onChange={e => { setUsername(e.target.value); setError(false); }}
              autoComplete="username" required
              style={{ background: "transparent", border: "none", borderBottom: `1px solid ${error ? "#8b2020" : "#9d7c2e"}`, padding: "8px 0", fontSize: 15, color: "#1a2744", fontFamily: "Inter, sans-serif", outline: "none", letterSpacing: "0.02em", transition: "border-color 0.2s" }}
              placeholder="Enter your username"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 12, letterSpacing: "0.15em", textTransform: "uppercase", color: "#4a3f2f" }}>
              Password
            </label>
            <input
              type="password" value={password} onChange={e => { setPassword(e.target.value); setError(false); }}
              autoComplete="current-password" required
              style={{ background: "transparent", border: "none", borderBottom: `1px solid ${error ? "#8b2020" : "#9d7c2e"}`, padding: "8px 0", fontSize: 15, color: "#1a2744", fontFamily: "Inter, sans-serif", outline: "none", letterSpacing: "0.02em", transition: "border-color 0.2s" }}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: 13, fontStyle: "italic", color: "#8b2020", textAlign: "center", marginTop: -4 }}>
              Invalid credentials. Please try again.
            </p>
          )}

          <div style={{ marginTop: 8 }}>
            <button
              type="submit" disabled={verifying}
              style={{ width: "100%", padding: "12px 0", background: verifying ? "#4a5a7a" : "#1a2744", color: "#e8dfc8", border: "none", fontFamily: "'Cormorant Garamond', serif", fontSize: 14, letterSpacing: "0.2em", textTransform: "uppercase", cursor: verifying ? "not-allowed" : "pointer", transition: "background 0.2s" }}
              onMouseEnter={e => { if (!verifying) (e.currentTarget as HTMLButtonElement).style.background = "#243460"; }}
              onMouseLeave={e => { if (!verifying) (e.currentTarget as HTMLButtonElement).style.background = "#1a2744"; }}
            >
              {verifying ? "Verifying…" : "Enter Portfolio"}
            </button>
          </div>
        </form>

        {/* Bottom rule */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 32, gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#d4c49e" }} />
          <span style={{ color: "#9d7c2e", fontSize: 14 }}>✦</span>
          <div style={{ flex: 1, height: 1, background: "#d4c49e" }} />
        </div>
        <p style={{ textAlign: "center", marginTop: 20, fontFamily: "'Cormorant Garamond', serif", fontSize: 11, color: "#9d8c6e", letterSpacing: "0.1em", textTransform: "uppercase" }}>
          For authorised parties only
        </p>
      </div>
    </div>
  );
}
