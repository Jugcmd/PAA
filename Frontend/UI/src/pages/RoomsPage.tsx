import { useState } from "react";
import ThermostatIcon from "@mui/icons-material/DeviceThermostat";
import WavesIcon from "@mui/icons-material/Waves";
import CloudIcon from "@mui/icons-material/Cloud";
import PeopleOutlineIcon from "@mui/icons-material/PeopleOutline";

import { TrendChart } from "../components/TrendChart";
import { ROOM_PROFILES } from "../data/simulator";
import { useMonitoring } from "../monitoring/MonitoringContext";
import { DEFAULT_THRESHOLDS } from "../types";
import type { EnvironmentalReading, RoomId, AlertThresholds } from "../types";

const asClock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const getAlertReasons = (
  reading: EnvironmentalReading,
  t: AlertThresholds = DEFAULT_THRESHOLDS,
): string[] => {
  const reasons: string[] = [];
  if (
    reading.temperatureC > t.tempMaxAttentionC ||
    reading.temperatureC < t.tempMinAttentionC
  ) {
    reasons.push(
      `Temperature ${reading.temperatureC.toFixed(1)}°C (target ${t.tempMinAttentionC}–${t.tempMaxAttentionC}°C)`,
    );
  }
  if (
    reading.humidityPct > t.humidityMaxAttention ||
    reading.humidityPct < t.humidityMinAttention
  ) {
    reasons.push(
      `Humidity ${reading.humidityPct.toFixed(1)}% (target ${t.humidityMinAttention}–${t.humidityMaxAttention}%)`,
    );
  }
  if (reading.co2Ppm > t.co2AttentionPpm) {
    reasons.push(
      `CO₂ ${reading.co2Ppm} ppm (target <${t.co2AttentionPpm} ppm)`,
    );
  }
  if (reading.comfortScore < 60) {
    reasons.push(`Low comfort score (${reading.comfortScore.toFixed(1)}/100)`);
  }
  if (reading.airQualityScore < 60) {
    reasons.push(
      `Poor air quality (${reading.airQualityScore.toFixed(1)}/100)`,
    );
  }
  return reasons;
};

const RoomDetail = ({
  reading,
  history,
  thresholds,
}: {
  reading: EnvironmentalReading;
  history: EnvironmentalReading[];
  thresholds: AlertThresholds;
}) => {
  const chartPoints = history
    .slice(-40)
    .map((r) => ({ xLabel: asClock(r.timestampIso), value: r.co2Ppm }));

  const metrics = [
    {
      label: "Temperature",
      value: `${reading.temperatureC.toFixed(1)}°C`,
      hint: `Target ${thresholds.tempMinAttentionC}–${thresholds.tempMaxAttentionC}°C`,
      warn:
        reading.temperatureC > thresholds.tempMaxAttentionC ||
        reading.temperatureC < thresholds.tempMinAttentionC,
    },
    {
      label: "Humidity",
      value: `${reading.humidityPct.toFixed(1)}%`,
      hint: `Comfort band ${thresholds.humidityMinAttention}–${thresholds.humidityMaxAttention}%`,
      warn:
        reading.humidityPct > thresholds.humidityMaxAttention ||
        reading.humidityPct < thresholds.humidityMinAttention,
    },
    {
      label: "CO₂",
      value: `${reading.co2Ppm} ppm`,
      hint:
        reading.co2Ppm > thresholds.co2AttentionPpm
          ? "⚠ Ventilate — above safe threshold"
          : `Below ${thresholds.co2AttentionPpm} ppm — healthy`,
      warn: reading.co2Ppm > thresholds.co2AttentionPpm,
    },
    {
      label: "Occupancy",
      value: `${reading.occupancyPct.toFixed(0)}%`,
      hint: "Estimated room utilisation",
      warn: false,
    },
    {
      label: "Comfort Score",
      value: `${reading.comfortScore.toFixed(1)}/100`,
      hint: "Thermal comfort based on temp & humidity",
      warn: reading.comfortScore < 60,
    },
    {
      label: "Air Quality",
      value: `${reading.airQualityScore.toFixed(1)}/100`,
      hint: "Derived from CO₂ and ventilation levels",
      warn: reading.airQualityScore < 60,
    },
    {
      label: "Energy Score",
      value: `${reading.energyScore.toFixed(1)}/100`,
      hint: "Efficiency of HVAC vs environmental demand",
      warn: false,
    },
    {
      label: "Sustainability",
      value: `${reading.sustainabilityScore.toFixed(1)}/100`,
      hint: "Composite: comfort + air quality + energy",
      warn: reading.sustainabilityScore < 60,
    },
  ];

  return (
    <div className="room-detail">
      <div className="room-detail__metrics">
        {metrics.map((m) => (
          <div key={m.label} className="room-detail__metric">
            <span className="room-detail__metric-label">{m.label}</span>
            <span
              className={`room-detail__metric-value${m.warn ? " text-warn" : ""}`}
            >
              {m.value}
            </span>
            <span className="room-detail__metric-hint">{m.hint}</span>
          </div>
        ))}
      </div>
      {chartPoints.length > 1 && (
        <div className="room-detail__chart">
          <p className="room-detail__chart-label">
            CO₂ trend (last {chartPoints.length} readings)
          </p>
          <TrendChart
            points={chartPoints}
            metricName="CO₂ (ppm)"
            stroke="#ffb117"
          />
        </div>
      )}
    </div>
  );
};

export const RoomsPage = () => {
  const { state, thresholds } = useMonitoring();
  const [expandedRoom, setExpandedRoom] = useState<RoomId | null>(null);

  const toggle = (id: RoomId) =>
    setExpandedRoom((prev) => (prev === id ? null : id));

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Rooms</h1>
          <p className="page-subtitle">
            Individual room environmental profiles — click a room to expand
            details
          </p>
        </div>
      </div>

      <div className="rooms-grid">
        {ROOM_PROFILES.map((profile) => {
          const reading = state.latestReadings.find(
            (r) => r.roomId === profile.id,
          );
          const history = state.readings.filter((r) => r.roomId === profile.id);
          const isExpanded = expandedRoom === profile.id;

          if (!reading) return null;

          return (
            <div
              key={profile.id}
              className={`room-card room-card--${reading.alertLevel}${isExpanded ? " room-card--expanded" : ""}`}
            >
              <button
                className="room-card__header"
                onClick={() => toggle(profile.id)}
                type="button"
                aria-expanded={isExpanded}
                aria-controls={`room-detail-${profile.id}`}
              >
                <div className="room-card__title-row">
                  <div>
                    <h3 className="room-card__name">{profile.label}</h3>
                    <p className="room-card__capacity">
                      Capacity: {profile.capacity} people
                    </p>
                    {reading.alertLevel !== "normal" && (
                      <p className="room-card__alert-reason">
                        {getAlertReasons(reading, thresholds).join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="room-card__right">
                    <span
                      className={`status-pill status-pill--${reading.alertLevel}`}
                    >
                      {reading.alertLevel}
                    </span>
                    <span className="room-card__chevron">
                      {isExpanded ? "▲" : "▼"}
                    </span>
                  </div>
                </div>

                <div className="room-card__score-row">
                  <div className="room-card__score">
                    <span className="room-card__score-value">
                      {reading.sustainabilityScore.toFixed(0)}
                    </span>
                    <span className="room-card__score-label">
                      Sustainability
                    </span>
                  </div>
                  <div className="room-card__metric-chips">
                    <span className="metric-chip">
                      <ThermostatIcon
                        sx={{ fontSize: "1rem", color: "var(--warn)" }}
                      />{" "}
                      {reading.temperatureC.toFixed(1)}°C
                    </span>
                    <span className="metric-chip">
                      <WavesIcon sx={{ fontSize: "1rem", color: "#3b82f6" }} />{" "}
                      {reading.humidityPct.toFixed(0)}%
                    </span>
                    <span
                      className={`metric-chip${reading.co2Ppm > thresholds.co2AttentionPpm ? " metric-chip--warn" : ""}`}
                    >
                      <CloudIcon
                        sx={{ fontSize: "1rem", color: "var(--muted)" }}
                      />{" "}
                      {reading.co2Ppm} ppm
                    </span>
                    <span className="metric-chip">
                      <PeopleOutlineIcon
                        sx={{ fontSize: "1rem", color: "var(--muted)" }}
                      />{" "}
                      {reading.occupancyPct.toFixed(0)}%
                    </span>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div id={`room-detail-${profile.id}`}>
                  <RoomDetail
                    reading={reading}
                    history={history}
                    thresholds={thresholds}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </>
  );
};
