import { useState, useEffect } from "react";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import ErrorIcon from "@mui/icons-material/Error";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import HistoryIcon from "@mui/icons-material/History";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";

import { useMonitoring } from "../monitoring/MonitoringContext";
import { DEFAULT_THRESHOLDS } from "../types";
import type {
  AlertLevel,
  AlertThresholds,
  EnvironmentalReading,
} from "../types";

const getRecommendations = (
  alert: EnvironmentalReading,
  t: AlertThresholds = DEFAULT_THRESHOLDS,
): string[] => {
  const recs: string[] = [];
  if (alert.co2Ppm > t.co2CriticalPpm) {
    recs.push(
      "CO₂ critically high — evacuate non-essential staff and open all windows immediately",
    );
  } else if (alert.co2Ppm > t.co2AttentionPpm) {
    recs.push(
      "CO₂ elevated — open windows or switch HVAC to Boost to increase fresh air flow",
    );
  }
  if (alert.temperatureC > t.tempMaxAttentionC) {
    recs.push(
      "Temperature high — switch HVAC to Boost cooling and consider opening windows",
    );
  } else if (alert.temperatureC < t.tempMinAttentionC) {
    recs.push(
      "Temperature low — switch HVAC to Boost heating and close windows to retain warmth",
    );
  }
  if (alert.humidityPct > t.humidityMaxAttention) {
    recs.push(
      "Humidity high — increase ventilation or reduce occupancy to lower moisture load",
    );
  } else if (alert.humidityPct < t.humidityMinAttention) {
    recs.push(
      "Humidity low — close windows; dry air causes fatigue and increases illness risk",
    );
  }
  if (alert.comfortScore < 50 && alert.airQualityScore < 50) {
    recs.push(
      "Multiple metrics critical — initiate full ventilation protocol and review room capacity limits",
    );
  }
  return recs;
};

const ACKED_KEY = "greenoffice_acked_rooms";

const timeAgo = (iso: string): string => {
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 10) return "just now";
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  return `${Math.floor(diff / 3600)}h ago`;
};

const loadAcked = (): Record<string, string> => {
  try {
    return JSON.parse(sessionStorage.getItem(ACKED_KEY) ?? "{}");
  } catch {
    return {};
  }
};

const saveAcked = (acked: Record<string, string>) => {
  sessionStorage.setItem(ACKED_KEY, JSON.stringify(acked));
};

export const AlertsPage = () => {
  const {
    state,
    dataSource,
    hydrateError,
    isRefreshing,
    refreshFromApi,
    thresholds,
  } = useMonitoring();

  // ackedRooms: roomId → alertLevel at time of acknowledgement
  // Once acked, that room is suppressed unless its alertLevel changes to ok and back
  const [ackedRooms, setAckedRooms] =
    useState<Record<string, string>>(loadAcked);
  const [filterLevel, setFilterLevel] = useState<AlertLevel | "all">("all");
  const [, setTick] = useState(0);
  const [confirmingAckAll, setConfirmingAckAll] = useState(false);

  // Re-render every 30s to refresh relative timestamps
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 30_000);
    return () => clearInterval(id);
  }, []);

  const acknowledgeRoom = (roomId: string, level: string) => {
    const next = { ...ackedRooms, [roomId]: level };
    setAckedRooms(next);
    saveAcked(next);
  };

  const unacknowledgeRoom = (roomId: string) => {
    const next = { ...ackedRooms };
    delete next[roomId];
    setAckedRooms(next);
    saveAcked(next);
  };

  const acknowledgeAll = () => {
    const hasCritical = activeAlerts.some((a) => a.alertLevel === "critical");
    if (hasCritical) {
      setConfirmingAckAll(true);
      return;
    }
    doAcknowledgeAll();
  };

  const doAcknowledgeAll = () => {
    setConfirmingAckAll(false);
    const next: Record<string, string> = { ...ackedRooms };
    activeAlerts.forEach((a) => {
      next[a.roomId] = a.alertLevel;
    });
    setAckedRooms(next);
    saveAcked(next);
  };

  // Active = not acked, OR acked at a different level (alert escalated/changed)
  const activeAlerts = state.attentionAlerts.filter(
    (a) => ackedRooms[a.roomId] !== a.alertLevel,
  );
  const ackedAlerts = state.attentionAlerts.filter(
    (a) => ackedRooms[a.roomId] === a.alertLevel,
  );

  const filteredAlerts =
    filterLevel === "all"
      ? activeAlerts
      : activeAlerts.filter((a) => a.alertLevel === filterLevel);

  const now = new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const criticalCount = activeAlerts.filter(
    (a) => a.alertLevel === "critical",
  ).length;
  const attentionCount = activeAlerts.filter(
    (a) => a.alertLevel === "attention",
  ).length;

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Environmental Alerts</h1>
          <p className="page-subtitle">
            Real-time environmental deviations across all monitored rooms ·{" "}
            {now}
            {dataSource === "api" ? " · Live Sync Active" : " · Offline Mode"}
          </p>
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
          <span className="stat-card__value">{activeAlerts.length}</span>
          <span className="stat-card__label">Active Alerts</span>
        </div>
        <div
          className={`stat-card${criticalCount > 0 ? " stat-card--critical" : ""}`}
        >
          <span className="stat-card__value">{criticalCount}</span>
          <span className="stat-card__label">Critical</span>
        </div>
        <div
          className={`stat-card${attentionCount > 0 ? " stat-card--warn" : ""}`}
        >
          <span className="stat-card__value">{attentionCount}</span>
          <span className="stat-card__label">Attention</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{ackedAlerts.length}</span>
          <span className="stat-card__label">Acknowledged</span>
        </div>
      </div>

      <div className="panel">
        <div className="panel__toolbar">
          <h2 className="panel__title">Active Alerts</h2>
          <div className="toolbar-controls">
            <div className="control-group">
              {(["all", "critical", "attention"] as const).map((level) => (
                <button
                  type="button"
                  key={level}
                  className={`range-btn${filterLevel === level ? " range-btn--active" : ""}`}
                  onClick={() => setFilterLevel(level)}
                >
                  {level === "all"
                    ? "All"
                    : level.charAt(0).toUpperCase() + level.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {filteredAlerts.length === 0 ? (
          <div className="empty-state">
            <CheckCircleIcon
              sx={{ fontSize: "2.5rem", color: "var(--accent)" }}
            />
            <p>
              {activeAlerts.length === 0
                ? "No active environmental alerts. All rooms are within acceptable parameters."
                : `No ${filterLevel} level alerts.`}
            </p>
          </div>
        ) : (
          <div className="alerts-detailed-list">
            {filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert-detail-item alert-detail-item--${alert.alertLevel}`}
              >
                <div className="alert-detail-item__header">
                  <div className="alert-detail-item__icon">
                    {alert.alertLevel === "critical" ? (
                      <ErrorIcon
                        sx={{ fontSize: "1.6rem", color: "var(--critical)" }}
                      />
                    ) : (
                      <WarningAmberIcon
                        sx={{ fontSize: "1.6rem", color: "var(--warn)" }}
                      />
                    )}
                  </div>
                  <div className="alert-detail-item__title">
                    <h3 className="alert-detail-item__room">
                      {alert.roomLabel}
                    </h3>
                    <span
                      className={`status-pill status-pill--${alert.alertLevel}`}
                    >
                      {alert.alertLevel}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="btn btn--secondary btn--sm"
                    onClick={() =>
                      acknowledgeRoom(alert.roomId, alert.alertLevel)
                    }
                    title="Acknowledge — hides this alert until conditions change"
                  >
                    Acknowledge
                  </button>
                </div>

                <div className="alert-detail-item__timestamp">
                  <span className="alert-detail-item__label">Detected:</span>
                  <span className="alert-detail-item__value">
                    {timeAgo(alert.timestampIso)} &middot;{" "}
                    {new Date(alert.timestampIso).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                <div className="alert-detail-item__metrics">
                  <div className="alert-metric">
                    <span className="alert-metric__label">Temperature</span>
                    <span
                      className={`alert-metric__value${alert.temperatureC > thresholds.tempMaxAttentionC || alert.temperatureC < thresholds.tempMinAttentionC ? " text-warn" : ""}`}
                    >
                      {alert.temperatureC.toFixed(1)}°C
                    </span>
                    <span className="alert-metric__hint">
                      Target: {thresholds.tempMinAttentionC}–
                      {thresholds.tempMaxAttentionC}°C
                    </span>
                  </div>

                  <div className="alert-metric">
                    <span className="alert-metric__label">Humidity</span>
                    <span
                      className={`alert-metric__value${alert.humidityPct > thresholds.humidityMaxAttention || alert.humidityPct < thresholds.humidityMinAttention ? " text-warn" : ""}`}
                    >
                      {alert.humidityPct.toFixed(1)}%
                    </span>
                    <span className="alert-metric__hint">
                      Target: {thresholds.humidityMinAttention}–
                      {thresholds.humidityMaxAttention}%
                    </span>
                  </div>

                  <div className="alert-metric">
                    <span className="alert-metric__label">CO₂</span>
                    <span
                      className={`alert-metric__value${alert.co2Ppm > thresholds.co2CriticalPpm ? " text-critical" : alert.co2Ppm > thresholds.co2AttentionPpm ? " text-warn" : ""}`}
                    >
                      {alert.co2Ppm} ppm
                    </span>
                    <span className="alert-metric__hint">
                      Target: &lt;{thresholds.co2AttentionPpm} ppm
                    </span>
                  </div>

                  <div className="alert-metric">
                    <span className="alert-metric__label">Occupancy</span>
                    <span className="alert-metric__value">
                      {alert.occupancyPct.toFixed(0)}%
                    </span>
                  </div>
                </div>

                <div className="alert-detail-item__scores">
                  <div className="score-breakdown">
                    <span className="score-breakdown__label">
                      Comfort Score
                    </span>
                    <span
                      className={`score-breakdown__value${alert.comfortScore < 60 ? " text-warn" : ""}`}
                    >
                      {alert.comfortScore.toFixed(1)}/100
                    </span>
                  </div>

                  <div className="score-breakdown">
                    <span className="score-breakdown__label">Air Quality</span>
                    <span
                      className={`score-breakdown__value${alert.airQualityScore < 60 ? " text-warn" : ""}`}
                    >
                      {alert.airQualityScore.toFixed(1)}/100
                    </span>
                  </div>

                  <div className="score-breakdown">
                    <span className="score-breakdown__label">Energy Score</span>
                    <span className="score-breakdown__value">
                      {alert.energyScore.toFixed(1)}/100
                    </span>
                  </div>

                  <div className="score-breakdown">
                    <span className="score-breakdown__label">
                      Sustainability
                    </span>
                    <span
                      className={`score-breakdown__value${alert.sustainabilityScore < 60 ? " text-warn" : ""}`}
                    >
                      {alert.sustainabilityScore.toFixed(1)}/100
                    </span>
                  </div>
                </div>

                {(() => {
                  const recs = getRecommendations(alert, thresholds);
                  if (recs.length === 0) return null;
                  return (
                    <div className="alert-recommendations">
                      <span className="alert-recommendations__label">
                        <LightbulbOutlinedIcon
                          sx={{
                            fontSize: "0.95rem",
                            verticalAlign: "middle",
                            mr: 0.4,
                          }}
                        />
                        Recommended actions
                      </span>
                      <ul className="alert-recommendations__list">
                        {recs.map((rec) => (
                          <li key={rec} className="alert-recommendation">
                            {rec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  );
                })()}
              </div>
            ))}

            {activeAlerts.length > 0 && (
              <div className="alert-bulk-actions">
                {confirmingAckAll ? (
                  <div
                    className="ack-all-confirm"
                    role="alertdialog"
                    aria-label="Confirm acknowledge all"
                  >
                    <span className="ack-all-confirm__text">
                      Silence{" "}
                      {
                        activeAlerts.filter((a) => a.alertLevel === "critical")
                          .length
                      }{" "}
                      critical alert(s)? Alerts reappear automatically if
                      conditions worsen.
                    </span>
                    <button
                      type="button"
                      className="btn btn--danger btn--sm"
                      onClick={doAcknowledgeAll}
                    >
                      Confirm
                    </button>
                    <button
                      type="button"
                      className="btn btn--secondary btn--sm"
                      onClick={() => setConfirmingAckAll(false)}
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    className="btn btn--secondary"
                    onClick={acknowledgeAll}
                  >
                    Acknowledge All
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {ackedAlerts.length > 0 && (
        <div className="panel">
          <div className="panel__toolbar">
            <h2 className="panel__title">
              <HistoryIcon
                sx={{ fontSize: "1.1rem", verticalAlign: "middle", mr: 0.5 }}
              />{" "}
              Acknowledged
            </h2>
            <p className="panel__subtitle">
              These rooms have been reviewed. Alerts will reappear automatically
              if conditions change.
            </p>
          </div>
          <div className="alerts-detailed-list alerts-detailed-list--acked">
            {ackedAlerts.map((alert) => (
              <div
                key={alert.id}
                className="alert-detail-item alert-detail-item--acked"
              >
                <div className="alert-detail-item__header">
                  <div className="alert-detail-item__icon">
                    <CheckCircleIcon
                      sx={{ fontSize: "1.4rem", color: "var(--muted)" }}
                    />
                  </div>
                  <div className="alert-detail-item__title">
                    <h3 className="alert-detail-item__room alert-detail-item__room--acked">
                      {alert.roomLabel}
                    </h3>
                    <span className="status-pill status-pill--ok">
                      acknowledged
                    </span>
                  </div>
                  <div className="alert-acked-meta">
                    <span>{timeAgo(alert.timestampIso)}</span>
                    <button
                      type="button"
                      className="btn btn--ghost btn--sm"
                      onClick={() => unacknowledgeRoom(alert.roomId)}
                      title="Re-open this alert"
                    >
                      Reopen
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
};
