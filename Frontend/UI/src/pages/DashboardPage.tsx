import { useState } from "react";
import { Link } from "react-router-dom";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CloseIcon from "@mui/icons-material/Close";
import { MetricCard } from "../components/MetricCard";
import { useMonitoring } from "../monitoring/MonitoringContext";
import type { AlertThresholds, EnvironmentalReading } from "../types";
import DeviceThermostat from "@mui/icons-material/DeviceThermostat";
import WavesIcon from "@mui/icons-material/Waves";
import CloudIcon from "@mui/icons-material/Cloud";

const WELCOME_KEY = "greenoffice_welcome_seen";

const RoomStatusCard = ({
  reading,
  thresholds,
}: {
  reading: EnvironmentalReading;
  thresholds: AlertThresholds;
}) => (
  <div className={`room-status-card room-status-card--${reading.alertLevel}`}>
    <div className="room-status-card__header">
      <span className="room-status-card__name">{reading.roomLabel}</span>
      <span className={`status-pill status-pill--${reading.alertLevel}`}>
        {reading.alertLevel}
      </span>
    </div>
    <div className="room-status-card__score">
      {reading.sustainabilityScore.toFixed(0)}
      <span className="room-status-card__score-denom">/100</span>
    </div>
    <div className="room-status-card__score-label">Sustainability Index</div>
    <div className="room-status-card__metrics">
      <div
        className={`room-status-card__metric${reading.temperatureC > thresholds.tempMaxAttentionC || reading.temperatureC < thresholds.tempMinAttentionC ? " room-status-card__metric--warn" : ""}`}
      >
        <DeviceThermostat sx={{ fontSize: "1.2rem", color: "var(--warn)" }} />
        <span>{reading.temperatureC.toFixed(1)}°C</span>
      </div>
      <div
        className={`room-status-card__metric${reading.humidityPct > thresholds.humidityMaxAttention || reading.humidityPct < thresholds.humidityMinAttention ? " room-status-card__metric--warn" : ""}`}
      >
        <WavesIcon sx={{ fontSize: "1.2rem", color: "#3b82f6" }} />
        <span>{reading.humidityPct.toFixed(0)}%</span>
      </div>
      <div
        className={`room-status-card__metric${reading.co2Ppm > thresholds.co2AttentionPpm ? " room-status-card__metric--warn" : ""}`}
      >
        <CloudIcon sx={{ fontSize: "1.2rem", color: "var(--muted)" }} />
        <span>{reading.co2Ppm} ppm</span>
      </div>
    </div>
    <div className="room-status-card__occupancy">
      <div className="room-status-card__occupancy-label">
        <span>Occupancy</span>
        <span>{reading.occupancyPct.toFixed(0)}%</span>
      </div>
      <div className="occupancy-bar">
        <div
          className="occupancy-bar__fill"
          style={{ width: `${reading.occupancyPct}%` }}
        />
      </div>
    </div>
  </div>
);

export const DashboardPage = () => {
  const {
    state,
    dataSource,
    hydrateError,
    isRefreshing,
    isStaleData,
    lastSuccessfulSyncIso,
    refreshFromApi,
    syncWarning,
    thresholds,
  } = useMonitoring();

  const [welcomeDismissed, setWelcomeDismissed] = useState(
    () => sessionStorage.getItem(WELCOME_KEY) === "1",
  );

  const dismissWelcome = () => {
    sessionStorage.setItem(WELCOME_KEY, "1");
    setWelcomeDismissed(true);
  };

  const now = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">
            Office environmental status · {now}
            {dataSource === "api" ? " · Live Sync Active" : " · Offline Mode"}
          </p>
          {lastSuccessfulSyncIso && (
            <p className="page-subtitle">
              Last successful API sync:{" "}
              {new Date(lastSuccessfulSyncIso).toLocaleTimeString()}
            </p>
          )}
          {syncWarning && <p className="sync-warning">{syncWarning}</p>}
          {isStaleData && (
            <p className="sync-warning">
              No fresh telemetry detected recently. Check stream status or
              refresh from API.
            </p>
          )}
          {hydrateError && (
            <div className="inline-error" role="status" aria-live="polite">
              <span>{hydrateError}</span>
              <button
                type="button"
                className="btn btn--secondary"
                disabled={isRefreshing}
                onClick={() => void refreshFromApi()}
              >
                {isRefreshing ? "Retrying..." : "Retry API sync"}
              </button>
            </div>
          )}
        </div>
      </div>

      {!welcomeDismissed && (
        <div className="welcome-banner" role="status">
          <InfoOutlinedIcon
            sx={{ fontSize: "1.4rem", color: "var(--accent)", flexShrink: 0 }}
          />
          <div className="welcome-banner__body">
            <strong>Welcome to GreenOffice</strong>
            <p>
              This dashboard monitors air quality, temperature and
              sustainability across your office in real time. Rooms are
              colour-coded:{" "}
              <span className="welcome-legend welcome-legend--ok">
                green = healthy
              </span>
              ,{" "}
              <span className="welcome-legend welcome-legend--attention">
                amber = attention needed
              </span>
              ,{" "}
              <span className="welcome-legend welcome-legend--critical">
                red = critical — act now
              </span>
              . Use the sidebar to explore rooms, alerts and analytics.
            </p>
          </div>
          <button
            type="button"
            className="btn-icon"
            onClick={dismissWelcome}
            aria-label="Dismiss welcome message"
          >
            <CloseIcon sx={{ fontSize: "1rem" }} />
          </button>
        </div>
      )}

      <div className="metrics-grid">
        <MetricCard
          label="Avg Temperature"
          value={`${state.kpis.averageTempC.toFixed(1)}°C`}
          hint={`Comfort target ${thresholds.tempMinAttentionC}–${thresholds.tempMaxAttentionC}°C · Above ${thresholds.tempMaxAttentionC}°C triggers alerts`}
          tone={
            state.kpis.averageTempC > thresholds.tempMaxAttentionC ||
            state.kpis.averageTempC < thresholds.tempMinAttentionC
              ? "warning"
              : "positive"
          }
        />
        <MetricCard
          label="Avg Humidity"
          value={`${state.kpis.averageHumidityPct.toFixed(1)}%`}
          hint={`Comfort band ${thresholds.humidityMinAttention}–${thresholds.humidityMaxAttention}% · Low humidity dries airways`}
          tone={
            state.kpis.averageHumidityPct > thresholds.humidityMaxAttention ||
            state.kpis.averageHumidityPct < thresholds.humidityMinAttention
              ? "warning"
              : "positive"
          }
        />
        <MetricCard
          label="Avg CO₂"
          value={`${Math.round(state.kpis.averageCo2Ppm)} ppm`}
          hint={
            state.kpis.averageCo2Ppm > thresholds.co2AttentionPpm
              ? `⚠ Above ${thresholds.co2AttentionPpm} ppm — ventilate now`
              : `Below ${thresholds.co2AttentionPpm} ppm — healthy air quality`
          }
          tone={
            state.kpis.averageCo2Ppm > thresholds.co2AttentionPpm
              ? "warning"
              : "positive"
          }
        />
        <MetricCard
          label="Sustainability Index"
          value={`${state.kpis.averageSustainability.toFixed(1)}/100`}
          hint="Composite: comfort + air quality + energy efficiency"
          tone={state.kpis.averageSustainability > 75 ? "positive" : "warning"}
        />
      </div>

      <div className="content-section">
        <h2 className="section-title">Room Status</h2>
        <div className="room-cards-grid">
          {state.latestReadings.map((reading) => (
            <RoomStatusCard
              key={reading.roomId}
              reading={reading}
              thresholds={thresholds}
            />
          ))}
        </div>
      </div>

      <div className="content-section">
        <div className="alert-cta">
          <div className="alert-cta__content">
            <p className="alert-cta__title">Active Environmental Alerts</p>
            <p className="alert-cta__description">
              {state.attentionAlerts.length === 0
                ? "No active alerts. All rooms are performing optimally."
                : `${state.attentionAlerts.length} alert${state.attentionAlerts.length !== 1 ? "s" : ""} requiring your attention`}
            </p>
          </div>
          <Link to="/alerts" className="btn btn--primary">
            View Alerts
          </Link>
        </div>
      </div>
    </>
  );
};
