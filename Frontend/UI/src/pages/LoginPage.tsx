import { useState } from "react";
import { useNavigate } from "react-router-dom";
import SpaIcon from "@mui/icons-material/Spa";

import { useAuth } from "../auth/AuthContext";

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);
    await new Promise((r) => setTimeout(r, 500));
    const ok = login(email, password);
    setIsLoading(false);
    if (ok) {
      navigate("/dashboard", { replace: true });
    } else {
      setError("Invalid credentials. Use a demo account below.");
    }
  };

  const fill = (role: "manager" | "occupant") => {
    if (role === "manager") {
      setEmail("facilities@greenoffice.io");
      setPassword("GreenOffice2026");
    } else {
      setEmail("occupant@greenoffice.io");
      setPassword("Occupant2026");
    }
    setError("");
  };

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <SpaIcon sx={{ fontSize: "2rem", color: "var(--accent)" }} />
          <span className="login-brand__name">GreenOffice</span>
        </div>
        <h1 className="login-tagline">
          Smart Environmental
          <br />
          Monitoring
        </h1>
        <p className="login-description">
          Real-time air quality, temperature and sustainability intelligence for
          modern office environments.
        </p>
        <ul className="login-features">
          <li>Live IoT sensor telemetry across all rooms</li>
          <li>CO₂, temperature and humidity trending</li>
          <li>Automated alerts and threshold monitoring</li>
          <li>Scenario planning for facilities managers</li>
          <li>Historical analytics and CSV reporting</li>
        </ul>
      </div>

      <div className="login-right">
        <div className="login-form-card">
          <h2 className="login-form-card__title">Sign in</h2>
          <p className="login-form-card__subtitle">
            Access your environmental dashboard
          </p>

          {error && (
            <div className="login-error" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={(e) => void handleSubmit(e)} className="login-form">
            <div className="form-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@greenoffice.io"
                required
                autoComplete="email"
              />
            </div>
            <div className="form-group">
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                required
                autoComplete="current-password"
              />
            </div>
            <button
              type="submit"
              className="btn btn--primary btn--full"
              disabled={isLoading}
            >
              {isLoading ? "Signing in…" : "Sign in"}
            </button>
          </form>

          <div className="login-demo">
            <p className="login-demo__label">Demo accounts — click to fill</p>
            <div className="login-demo__cards">
              <button
                type="button"
                className="login-demo__card"
                onClick={() => fill("manager")}
              >
                <strong>Facilities Manager</strong>
                <span>facilities@greenoffice.io</span>
                <span className="login-demo__card-perms">
                  Full access · Scenario Planner
                </span>
              </button>
              <button
                type="button"
                className="login-demo__card"
                onClick={() => fill("occupant")}
              >
                <strong>Occupant</strong>
                <span>occupant@greenoffice.io</span>
                <span className="login-demo__card-perms">
                  Read-only · Dashboard &amp; Analytics
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
