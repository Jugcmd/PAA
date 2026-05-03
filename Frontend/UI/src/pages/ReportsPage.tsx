import { useState } from "react";

import { useAuth } from "../auth/AuthContext";
import { downloadReadingsCsv } from "../data/api";
import { getTelemetryEvents } from "../lib/telemetry";
import { trackEvent } from "../lib/telemetry";
import { useMonitoring } from "../monitoring/MonitoringContext";

const ACRONYMS = new Set(["api", "csv", "hvac", "co2", "ui"]);

const formatEventName = (eventName: string): string => {
  const words = eventName.split("_");
  return words
    .map((word) =>
      ACRONYMS.has(word)
        ? word.toUpperCase()
        : word.charAt(0).toUpperCase() + word.slice(1),
    )
    .join(" ");
};

export const ReportsPage = () => {
  const {
    state,
    dataSource,
    hydrateError,
    isRefreshing,
    lastSuccessfulSyncIso,
    refreshFromApi,
    thresholds,
  } = useMonitoring();
  const { user } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const handleExport = async () => {
    trackEvent("report_export_attempt", { role: user?.role, dataSource });
    setIsExporting(true);
    setExportError(null);
    try {
      await downloadReadingsCsv();
      setExportSuccess(true);
      trackEvent("report_export_success", { role: user?.role });
      setTimeout(() => setExportSuccess(false), 3000);
    } catch {
      setExportError("Export failed. Please verify backend API availability.");
      trackEvent("report_export_failed", { role: user?.role });
    } finally {
      setIsExporting(false);
    }
  };

  const totalReadings = state.readings.length;
  const earliest = state.readings[0]?.timestampIso;
  const latest = state.readings[state.readings.length - 1]?.timestampIso;
  const criticalCount = state.readings.filter(
    (r) => r.alertLevel === "critical",
  ).length;
  const attentionCount = state.readings.filter(
    (r) => r.alertLevel === "attention",
  ).length;
  const coverageHours =
    earliest && latest
      ? Math.round(
          ((new Date(latest).getTime() - new Date(earliest).getTime()) /
            (1000 * 60 * 60)) *
            10,
        ) / 10
      : 0;
  const avgSustainability =
    state.latestReadings.length > 0
      ? (
          state.latestReadings.reduce(
            (sum, r) => sum + r.sustainabilityScore,
            0,
          ) / state.latestReadings.length
        ).toFixed(1)
      : "—";
  const telemetryEvents = getTelemetryEvents();
  const latestTelemetry =
    telemetryEvents.length > 0
      ? telemetryEvents[telemetryEvents.length - 1]
      : null;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="page-subtitle">
            Snapshots of room performance across the current session, raw data
            export for analysis in external tools, and an audit log of
            facilities manager actions taken during this session.
          </p>
          {user?.role === "Occupant" && (
            <p className="readonly-note">
              You are signed in with a read-only role. CSV data export is
              restricted to facilities managers.
            </p>
          )}
          {lastSuccessfulSyncIso && (
            <p className="page-subtitle">
              Last successful API sync:{" "}
              {new Date(lastSuccessfulSyncIso).toLocaleTimeString()}
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

      <div className="stat-cards-grid">
        <div className="stat-card">
          <span className="stat-card__value">
            {totalReadings.toLocaleString()}
          </span>
          <span className="stat-card__label">Total Readings</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{coverageHours}h</span>
          <span className="stat-card__label">Data Coverage</span>
        </div>
        <div
          className={`stat-card${attentionCount > 0 ? " stat-card--warn" : ""}`}
        >
          <span className="stat-card__value">{attentionCount}</span>
          <span className="stat-card__label">Attention Events</span>
        </div>
        <div
          className={`stat-card${criticalCount > 0 ? " stat-card--critical" : ""}`}
        >
          <span className="stat-card__value">{criticalCount}</span>
          <span className="stat-card__label">Critical Events</span>
        </div>
      </div>

      <div className="panel">
        <h2 className="panel__title">Room Performance Summary</h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Temp</th>
                <th>Humidity</th>
                <th>CO₂</th>
                <th>Comfort</th>
                <th>Air Quality</th>
                <th>Energy</th>
                <th>Sustainability</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {state.latestReadings.map((r) => (
                <tr key={r.roomId}>
                  <td>
                    <strong>{r.roomLabel}</strong>
                  </td>
                  <td>{r.temperatureC.toFixed(1)}°C</td>
                  <td>{r.humidityPct.toFixed(1)}%</td>
                  <td
                    className={
                      r.co2Ppm > thresholds.co2CriticalPpm
                        ? "text-critical"
                        : r.co2Ppm > thresholds.co2AttentionPpm
                          ? "text-warn"
                          : ""
                    }
                  >
                    {r.co2Ppm} ppm
                  </td>
                  <td>{r.comfortScore.toFixed(1)}</td>
                  <td>{r.airQualityScore.toFixed(1)}</td>
                  <td>{r.energyScore.toFixed(1)}</td>
                  <td>{r.sustainabilityScore.toFixed(1)}</td>
                  <td>
                    <span
                      className={`status-pill status-pill--${r.alertLevel}`}
                    >
                      {r.alertLevel}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel__footer-note">
          Average sustainability index across all rooms:{" "}
          <strong>{avgSustainability}</strong>
        </p>
      </div>

      {user?.role === "Occupant" ? (
        <div className="panel">
          <h2 className="panel__title">Your Session Summary</h2>
          <p className="panel__subtitle">
            A summary of current environmental conditions visible to you as an
            occupant. CSV data export and scenario planning are available to
            facilities managers only.
          </p>
          <div className="occupant-summary-grid">
            {state.latestReadings.length === 0 ? (
              <p className="empty-state-inline">
                No room data yet — readings will appear once the simulation or
                API sync starts.
              </p>
            ) : (
              state.latestReadings.map((r) => (
                <div key={r.roomId} className="occupant-summary-card">
                  <div className="occupant-summary-card__header">
                    <span className="occupant-summary-card__room">
                      {r.roomLabel}
                    </span>
                    <span
                      className={`status-pill status-pill--${r.alertLevel}`}
                    >
                      {r.alertLevel}
                    </span>
                  </div>
                  <div className="occupant-summary-card__score">
                    {r.sustainabilityScore.toFixed(0)}
                    <span className="occupant-summary-card__denom">/100</span>
                  </div>
                  <p className="occupant-summary-card__score-label">
                    Sustainability Index
                  </p>
                  <div className="occupant-summary-card__metrics">
                    <span>🌡 {r.temperatureC.toFixed(1)}°C</span>
                    <span>💧 {r.humidityPct.toFixed(0)}%</span>
                    <span
                      className={
                        r.co2Ppm > thresholds.co2CriticalPpm
                          ? "text-critical"
                          : r.co2Ppm > thresholds.co2AttentionPpm
                            ? "text-warn"
                            : ""
                      }
                    >
                      ☁ {r.co2Ppm} ppm CO₂
                    </span>
                  </div>
                  {r.alertLevel !== "normal" && (
                    <p className="occupant-summary-card__advice">
                      {r.alertLevel === "critical"
                        ? "⚠ Critical conditions — report to facilities manager immediately."
                        : "Conditions require attention — speak to your facilities manager."}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
          <p className="panel__footer-note">
            To adjust alert thresholds or export raw data, contact your
            facilities manager or sign in with a manager account.
          </p>
        </div>
      ) : (
        <div className="panel">
          <h2 className="panel__title">Data Export</h2>
          <div className="export-section">
            <div className="export-info">
              <p>
                <strong>Historical CSV Export</strong>
              </p>
              <p className="export-desc">
                Exports up to 10,000 readings in CSV format — timestamp, room,
                temperature, humidity, CO₂, occupancy, all scoring metrics and
                alert levels. Suitable for Excel or BI tools.
              </p>
              {dataSource === "local" && (
                <p className="export-warning">
                  ⚠️ API is unavailable. Start the ASP.NET backend to enable CSV
                  export.
                </p>
              )}
            </div>
            <button
              type="button"
              className="btn btn--primary"
              onClick={() => void handleExport()}
              disabled={isExporting || dataSource === "local"}
            >
              {isExporting
                ? "Exporting…"
                : exportSuccess
                  ? "✓ Downloaded!"
                  : "⬇ Download CSV"}
            </button>
          </div>
          {exportError && (
            <p className="inline-error-text" role="alert">
              {exportError}
            </p>
          )}
        </div>
      )}

      <div className="panel">
        <h2 className="panel__title">Session Audit Log</h2>
        <p className="panel__subtitle">
          User interactions recorded during this session — alert
          acknowledgements, scenario changes, data exports, and manual readings
          injected. Resets on page refresh. Use the CSV export above to persist
          sensor data across sessions.
        </p>
        {telemetryEvents.length === 0 ? (
          <p className="empty-state-inline">
            No events recorded yet. Navigate the app to generate activity.
          </p>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Event</th>
                </tr>
              </thead>
              <tbody>
                {[...telemetryEvents].reverse().map((ev, i) => (
                  <tr key={i}>
                    <td className="text-muted">
                      {new Date(ev.atIso).toLocaleTimeString()}
                    </td>
                    <td>{formatEventName(ev.name)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="panel">
        <h2 className="panel__title">System Information</h2>
        <div className="system-info-grid">
          <div className="system-info-item">
            <span className="system-info-item__label">Data source</span>
            <span className={`source-badge source-badge--${dataSource}`}>
              {dataSource === "api" ? "Live Sync Active" : "Offline Mode"}
            </span>
          </div>
          <div className="system-info-item">
            <span className="system-info-item__label">Signed in as</span>
            <span>
              {user?.name} ·{" "}
              {user?.role === "FacilitiesManager"
                ? "Facilities Manager"
                : "Occupant"}
            </span>
          </div>
          <div className="system-info-item">
            <span className="system-info-item__label">Rooms monitored</span>
            <span>{state.latestReadings.length} of 4</span>
          </div>
          {dataSource === "api" && (
            <div className="system-info-item">
              <span className="system-info-item__label">API reference</span>
              <a
                href="http://localhost:5281/scalar/v1"
                target="_blank"
                rel="noreferrer"
                className="link"
              >
                Open Scalar API Docs ↗
              </a>
            </div>
          )}
          <div className="system-info-item">
            <span className="system-info-item__label">Telemetry events</span>
            <span>{telemetryEvents.length} captured in this session</span>
          </div>
          {latestTelemetry && (
            <div className="system-info-item">
              <span className="system-info-item__label">Latest activity</span>
              <span>
                {formatEventName(latestTelemetry.name)} ·{" "}
                {new Date(latestTelemetry.atIso).toLocaleTimeString()}
              </span>
            </div>
          )}
        </div>
      </div>
    </>
  );
};
