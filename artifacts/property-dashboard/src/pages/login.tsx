import { useState } from "react";
import { useAuth } from "@/contexts/auth-context";

export default function Login() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(false);
    setLoading(true);
    await new Promise(r => setTimeout(r, 350));
    const ok = login(username, password);
    if (!ok) setError(true);
    setLoading(false);
  };

  return (
    <div
      style={{ background: "#f5f0e6", minHeight: "100vh" }}
      className="flex flex-col items-center justify-center px-4"
    >
      <div className="w-full max-w-sm">
        {/* Crest / Monogram */}
        <div className="flex flex-col items-center mb-10">
          <div
            style={{
              width: 64, height: 64,
              border: "2px solid #9d7c2e",
              display: "flex", alignItems: "center", justifyContent: "center",
              marginBottom: 16,
            }}
          >
            <span
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 28,
                fontWeight: 600,
                color: "#9d7c2e",
                letterSpacing: 2,
                lineHeight: 1,
              }}
            >
              PD
            </span>
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 26,
              fontWeight: 600,
              color: "#1a2744",
              letterSpacing: "0.05em",
              lineHeight: 1.1,
              textAlign: "center",
            }}
          >
            PropDash
          </h1>
          <p
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: 13,
              fontStyle: "italic",
              color: "#7a6a50",
              letterSpacing: "0.1em",
              marginTop: 4,
              textAlign: "center",
            }}
          >
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
            <label
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 12,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#4a3f2f",
              }}
            >
              Username
            </label>
            <input
              type="text"
              value={username}
              onChange={e => { setUsername(e.target.value); setError(false); }}
              autoComplete="username"
              required
              style={{
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${error ? "#8b2020" : "#9d7c2e"}`,
                padding: "8px 0",
                fontSize: 15,
                color: "#1a2744",
                fontFamily: "Inter, sans-serif",
                outline: "none",
                letterSpacing: "0.02em",
                transition: "border-color 0.2s",
              }}
              placeholder="Enter your username"
            />
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <label
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 12,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#4a3f2f",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={e => { setPassword(e.target.value); setError(false); }}
              autoComplete="current-password"
              required
              style={{
                background: "transparent",
                border: "none",
                borderBottom: `1px solid ${error ? "#8b2020" : "#9d7c2e"}`,
                padding: "8px 0",
                fontSize: 15,
                color: "#1a2744",
                fontFamily: "Inter, sans-serif",
                outline: "none",
                letterSpacing: "0.02em",
                transition: "border-color 0.2s",
              }}
              placeholder="Enter your password"
            />
          </div>

          {error && (
            <p
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 13,
                fontStyle: "italic",
                color: "#8b2020",
                textAlign: "center",
                marginTop: -4,
              }}
            >
              Invalid credentials. Please try again.
            </p>
          )}

          <div style={{ marginTop: 8 }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px 0",
                background: loading ? "#4a5a7a" : "#1a2744",
                color: "#e8dfc8",
                border: "none",
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: 14,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                cursor: loading ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#243460"; }}
              onMouseLeave={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = "#1a2744"; }}
            >
              {loading ? "Verifying…" : "Enter Portfolio"}
            </button>
          </div>
        </form>

        {/* Bottom rule */}
        <div style={{ display: "flex", alignItems: "center", marginTop: 32, gap: 12 }}>
          <div style={{ flex: 1, height: 1, background: "#d4c49e" }} />
          <span style={{ color: "#9d7c2e", fontSize: 14 }}>✦</span>
          <div style={{ flex: 1, height: 1, background: "#d4c49e" }} />
        </div>

        <p
          style={{
            textAlign: "center",
            marginTop: 20,
            fontFamily: "'Cormorant Garamond', serif",
            fontSize: 11,
            color: "#9d8c6e",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
          }}
        >
          For authorised parties only
        </p>
      </div>
    </div>
  );
}
