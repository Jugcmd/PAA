import { useState } from "react";
import { Link } from "react-router-dom";
import BarChartIcon from "@mui/icons-material/BarChart";
import CompareArrowsIcon from "@mui/icons-material/CompareArrows";

import { ForecastPanel } from "../components/ForecastPanel";
import { TrendChart } from "../components/TrendChart";
import { MultiTrendChart } from "../components/MultiTrendChart";
import { ROOM_PROFILES } from "../data/simulator";
import { useMonitoring } from "../monitoring/MonitoringContext";
import type { RoomId } from "../types";

type ChartMetric =
  | "temperatureC"
  | "humidityPct"
  | "co2Ppm"
  | "sustainabilityScore";
type TimeRange = "1h" | "3h" | "all";

const chartMetricMeta: Record<
  ChartMetric,
  { label: string; color: string; unit: string }
> = {
  temperatureC: { label: "Temperature", color: "#f07c44", unit: "°C" },
  humidityPct: { label: "Humidity", color: "#4d8df9", unit: "%" },
  co2Ppm: { label: "CO₂", color: "#ffb117", unit: "ppm" },
  sustainabilityScore: {
    label: "Sustainability",
    color: "#36b989",
    unit: "/100",
  },
};

const ROOM_COLORS: Record<string, string> = {
  "north-open-plan": "#10b981",
  "south-open-plan": "#3b82f6",
  "meeting-suite": "#f59e0b",
  "server-room": "#8b5cf6",
};

const asClock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

const cutoffFor = (range: TimeRange): number => {
  const now = Date.now();
  if (range === "1h") return now - 60 * 60 * 1000;
  if (range === "3h") return now - 3 * 60 * 60 * 1000;
  return 0;
};

export const AnalyticsPage = () => {
  const { state } = useMonitoring();
  const [room, setRoom] = useState<RoomId>("north-open-plan");
  const [metric, setMetric] = useState<ChartMetric>("temperatureC");
  const [timeRange, setTimeRange] = useState<TimeRange>("all");
  const [compare, setCompare] = useState(false);

  const cutoff = cutoffFor(timeRange);
  const filteredReadings = state.readings.filter(
    (r) => r.roomId === room && new Date(r.timestampIso).getTime() >= cutoff,
  );

  const chartPoints = filteredReadings.slice(-80).map((r) => ({
    xLabel: asClock(r.timestampIso),
    value: r[metric] as number,
  }));

  const compareSeries = ROOM_PROFILES.map((profile) => {
    const roomReadings = state.readings
      .filter((r) => r.roomId === profile.id)
      .slice(-80);
    return {
      label: profile.label,
      color: ROOM_COLORS[profile.id] ?? "#888",
      points: roomReadings.map((r) => ({
        xLabel: asClock(r.timestampIso),
        value: r[metric] as number,
      })),
    };
  });

  const chartInfo = chartMetricMeta[metric];

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">
            Historical trends and CO₂ forecasting across all rooms
          </p>
        </div>
      </div>

      <div className="room-tabs">
        {ROOM_PROFILES.map((profile) => (
          <button
            type="button"
            key={profile.id}
            className={`room-tab${room === profile.id ? " room-tab--active" : ""}${compare ? " room-tab--dimmed" : ""}`}
            onClick={() => {
              setRoom(profile.id);
              setCompare(false);
            }}
          >
            {profile.label}
          </button>
        ))}
      </div>

      <div className="panel">
        <div className="panel__toolbar">
          <h2 className="panel__title">
            {compare
              ? `${chartInfo.label} — All Rooms`
              : `${chartInfo.label} · ${ROOM_PROFILES.find((p) => p.id === room)?.label}`}
          </h2>
          <div className="toolbar-controls">
            {!compare && (
              <div className="control-group">
                {(["1h", "3h", "all"] as TimeRange[]).map((r) => (
                  <button
                    type="button"
                    key={r}
                    className={`range-btn${timeRange === r ? " range-btn--active" : ""}`}
                    onClick={() => setTimeRange(r)}
                  >
                    {r === "all" ? "All data" : `Last ${r}`}
                  </button>
                ))}
              </div>
            )}
            <select
              className="form-select"
              value={metric}
              onChange={(e) => setMetric(e.target.value as ChartMetric)}
            >
              {Object.entries(chartMetricMeta).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.label} ({v.unit})
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`btn btn--secondary btn--sm${compare ? " btn--compare-active" : ""}`}
              onClick={() => setCompare((c) => !c)}
              title="Overlay all rooms on a single chart for direct comparison"
            >
              <CompareArrowsIcon sx={{ fontSize: "1rem", mr: 0.4 }} />
              {compare ? "Single room" : "Compare rooms"}
            </button>
          </div>
        </div>

        {compare ? (
          compareSeries.some((s) => s.points.length > 1) ? (
            <MultiTrendChart
              series={compareSeries}
              metricName={`${chartInfo.label} (${chartInfo.unit})`}
            />
          ) : (
            <div className="empty-state">
              <BarChartIcon
                sx={{ fontSize: "2.5rem", color: "var(--muted)" }}
              />
              <p>Not enough data yet to compare rooms.</p>
            </div>
          )
        ) : chartPoints.length > 1 ? (
          <TrendChart
            points={chartPoints}
            metricName={`${chartInfo.label} (${chartInfo.unit})`}
            stroke={chartInfo.color}
          />
        ) : (
          <div className="empty-state">
            <BarChartIcon sx={{ fontSize: "2.5rem", color: "var(--muted)" }} />
            <p>Not enough data for this time range yet.</p>
            <p className="empty-state__hint">
              Select <strong>All data</strong> above, or go to the{" "}
              <Link to="/simulate" className="inline-link">
                Scenario Planner
              </Link>{" "}
              and click <em>Inject reading</em> to generate readings
              immediately.
            </p>
          </div>
        )}
      </div>

      <div className="panel">
        <h2 className="panel__title">
          Cross-Room Comparison — {chartInfo.label}
        </h2>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Current</th>
                <th>Status</th>
                <th>Comfort</th>
                <th>Air Quality</th>
                <th>Energy</th>
              </tr>
            </thead>
            <tbody>
              {state.latestReadings.map((r) => (
                <tr
                  key={r.roomId}
                  className={
                    room === r.roomId ? "data-table__row--highlight" : ""
                  }
                >
                  <td>
                    <strong>{r.roomLabel}</strong>
                  </td>
                  <td>
                    {(r[metric] as number).toFixed(metric === "co2Ppm" ? 0 : 1)}{" "}
                    {chartInfo.unit}
                  </td>
                  <td>
                    <span
                      className={`status-pill status-pill--${r.alertLevel}`}
                    >
                      {r.alertLevel}
                    </span>
                  </td>
                  <td>{r.comfortScore.toFixed(1)}</td>
                  <td>{r.airQualityScore.toFixed(1)}</td>
                  <td>{r.energyScore.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <ForecastPanel forecasts={state.forecasts} />
    </>
  );
};
