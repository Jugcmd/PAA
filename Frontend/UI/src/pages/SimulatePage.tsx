import { useState } from "react";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import BusinessIcon from "@mui/icons-material/Business";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import SpaIcon from "@mui/icons-material/Spa";
import GroupsIcon from "@mui/icons-material/Groups";
import ModeNightIcon from "@mui/icons-material/ModeNight";
import SettingsIcon from "@mui/icons-material/Settings";
import BalanceIcon from "@mui/icons-material/Balance";
import FlashOnIcon from "@mui/icons-material/FlashOn";

import { useAuth } from "../auth/AuthContext";
import { trackEvent } from "../lib/telemetry";
import { useMonitoring } from "../monitoring/MonitoringContext";
import { projectControls } from "../data/simulator";
import type { SimulationControls } from "../types";

interface Preset {
  id: string;
  label: string;
  description: string;
  effect: string[];
  icon: React.ReactNode;
  controls: Partial<SimulationControls> | null;
}

const PRESETS: Preset[] = [
  {
    id: "normal",
    label: "Normal Operations",
    description:
      "Standard weekday baseline with balanced HVAC and typical occupancy",
    effect: ["HVAC: Balanced", "Occupancy: 100%", "Windows: Closed"],
    icon: <BusinessIcon sx={{ fontSize: "2rem" }} />,
    controls: { hvacMode: "balanced", windowsOpen: false, occupancyBias: 1.0 },
  },
  {
    id: "heatwave",
    label: "Summer Heatwave",
    description:
      "Peak occupancy demand with HVAC on full boost to manage rising temperatures",
    effect: ["HVAC: Boost ↑", "Occupancy: 130%", "Windows: Open"],
    icon: (
      <LocalFireDepartmentIcon
        sx={{ fontSize: "2rem", color: "var(--warn)" }}
      />
    ),
    controls: { hvacMode: "boost", windowsOpen: true, occupancyBias: 1.3 },
  },
  {
    id: "green",
    label: "Green Mode",
    description:
      "Maximise energy efficiency with eco HVAC and passive ventilation through open windows",
    effect: ["HVAC: Eco ↓", "Occupancy: 75%", "Windows: Open"],
    icon: <SpaIcon sx={{ fontSize: "2rem", color: "var(--accent)" }} />,
    controls: { hvacMode: "eco", windowsOpen: true, occupancyBias: 0.75 },
  },
  {
    id: "board",
    label: "Board Meeting",
    description:
      "Full meeting suite occupancy requiring active HVAC support for comfort",
    effect: ["HVAC: Boost ↑", "Occupancy: 120%", "Windows: Closed"],
    icon: <GroupsIcon sx={{ fontSize: "2rem" }} />,
    controls: { hvacMode: "boost", windowsOpen: false, occupancyBias: 1.2 },
  },
  {
    id: "eod",
    label: "End of Day",
    description:
      "Low occupancy wind-down period with conservative energy consumption",
    effect: ["HVAC: Eco ↓", "Occupancy: 68%", "Windows: Closed"],
    icon: <ModeNightIcon sx={{ fontSize: "2rem", color: "#64748b" }} />,
    controls: { hvacMode: "eco", windowsOpen: false, occupancyBias: 0.68 },
  },
  {
    id: "custom",
    label: "Custom Scenario",
    description:
      "Configure all environmental variables manually for your specific use case",
    effect: ["Adjust all controls below"],
    icon: <SettingsIcon sx={{ fontSize: "2rem" }} />,
    controls: null,
  },
];

export const SimulatePage = () => {
  const { user } = useAuth();
  const {
    controls,
    updateControls,
    state,
    isRunning,
    setIsRunning,
    injectReading,
    setActiveScenarioLabel,
    thresholds,
  } = useMonitoring();
  const [activePreset, setActivePreset] = useState<string>("normal");

  const applyPreset = (preset: Preset) => {
    setActivePreset(preset.id);
    if (preset.controls) {
      updateControls(preset.controls);
    }
    setActiveScenarioLabel(preset.id === "normal" ? null : preset.label);
    trackEvent("scenario_preset_applied", {
      preset: preset.id,
      role: user?.role,
    });
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Scenario Planner</h1>
          <p className="page-subtitle">
            Simulate environmental conditions to support facilities decisions.
            Changes apply to the live telemetry stream in real time — use the
            preview table below to assess projected impact before committing to
            HVAC adjustments.
          </p>
        </div>
        <div className="page-header__actions">
          <button
            type="button"
            className="btn btn--secondary"
            onClick={() => setIsRunning(!isRunning)}
          >
            {isRunning ? (
              <>
                <PauseIcon sx={{ fontSize: "1rem" }} /> Pause stream
              </>
            ) : (
              <>
                <PlayArrowIcon sx={{ fontSize: "1rem" }} /> Resume stream
              </>
            )}
          </button>
          <button
            type="button"
            className="btn btn--primary"
            onClick={injectReading}
          >
            <FlashOnIcon sx={{ fontSize: "1rem" }} /> Inject reading
          </button>
        </div>
      </div>

      <div className="content-section">
        <h2 className="section-title">Scenario Presets</h2>
        <p className="section-subtitle">
          Select a preset to instantly model a common office scenario, then
          fine-tune below.
        </p>
        <div className="scenario-grid">
          {PRESETS.map((preset) => (
            <button
              type="button"
              key={preset.id}
              className={`scenario-card${activePreset === preset.id ? " scenario-card--active" : ""}`}
              onClick={() => applyPreset(preset)}
              aria-pressed={activePreset === preset.id}
            >
              <span className="scenario-card__icon">{preset.icon}</span>
              <strong className="scenario-card__label">{preset.label}</strong>
              <p className="scenario-card__desc">{preset.description}</p>
              <div className="scenario-card__effects">
                {preset.effect.map((tag) => (
                  <span key={tag} className="scenario-card__effect-tag">
                    {tag}
                  </span>
                ))}
              </div>
              {preset.controls &&
                (() => {
                  const proj = projectControls(preset.controls);
                  return (
                    <div className="scenario-card__projection">
                      <span className="scenario-card__proj-item">
                        <span className="scenario-card__proj-label">
                          Est. CO₂
                        </span>
                        <span
                          className={`scenario-card__proj-value${proj.avgCo2Ppm > thresholds.co2CriticalPpm ? " text-critical" : proj.avgCo2Ppm > thresholds.co2AttentionPpm ? " text-warn" : ""}`}
                        >
                          {proj.avgCo2Ppm} ppm
                        </span>
                      </span>
                      <span className="scenario-card__proj-item">
                        <span className="scenario-card__proj-label">
                          Comfort
                        </span>
                        <span
                          className={`scenario-card__proj-value${proj.avgComfort < 60 ? " text-warn" : ""}`}
                        >
                          {proj.avgComfort.toFixed(0)}/100
                        </span>
                      </span>
                      <span className="scenario-card__proj-item">
                        <span className="scenario-card__proj-label">
                          Sustainability
                        </span>
                        <span
                          className={`scenario-card__proj-value${proj.avgSustainability < 60 ? " text-warn" : ""}`}
                        >
                          {proj.avgSustainability.toFixed(0)}/100
                        </span>
                      </span>
                    </div>
                  );
                })()}
              {activePreset === preset.id && (
                <span className="scenario-card__badge">Active</span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="content-section">
        <h2 className="section-title">Environmental Variables</h2>
        <p className="section-subtitle">
          Fine-tune parameters to model how different conditions affect
          temperature, humidity, CO₂ and energy consumption across all monitored
          rooms.
        </p>
        <div className="simulate-controls">
          <div className="simulate-control">
            <div className="simulate-control__label">
              HVAC Mode
              <span className="simulate-control__desc">
                Heating, ventilation and air conditioning intensity
              </span>
            </div>
            <div className="hvac-buttons">
              {(["eco", "balanced", "boost"] as const).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  className={`hvac-btn${controls.hvacMode === mode ? " hvac-btn--active" : ""}`}
                  onClick={() => {
                    updateControls({ hvacMode: mode });
                    setActivePreset("custom");
                    trackEvent("scenario_manual_change", {
                      field: "hvacMode",
                      value: mode,
                      role: user?.role,
                    });
                  }}
                >
                  {mode === "eco" ? (
                    <>
                      <SpaIcon sx={{ fontSize: "1rem" }} />
                      <span>Eco</span>
                    </>
                  ) : mode === "balanced" ? (
                    <>
                      <BalanceIcon sx={{ fontSize: "1rem" }} />
                      <span>Balanced</span>
                    </>
                  ) : (
                    <>
                      <FlashOnIcon sx={{ fontSize: "1rem" }} />
                      <span>Boost</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div className="simulate-control">
            <div className="simulate-control__label">
              Occupancy Pressure
              <span className="simulate-control__desc">
                {Math.round(controls.occupancyBias * 100)}% — affects CO₂
                generation, humidity and heat load
              </span>
            </div>
            <div className="slider-row">
              <span className="slider-label">Low</span>
              <input
                type="range"
                min="0.65"
                max="1.35"
                step="0.01"
                value={controls.occupancyBias}
                className="slider"
                onChange={(e) => {
                  const next = Number(e.target.value);
                  updateControls({ occupancyBias: next });
                  setActivePreset("custom");
                  trackEvent("scenario_manual_change", {
                    field: "occupancyBias",
                    value: next,
                    role: user?.role,
                  });
                }}
              />
              <span className="slider-label">High</span>
            </div>
          </div>

          <div className="simulate-control simulate-control--toggle">
            <div className="simulate-control__label">
              Passive Ventilation
              <span className="simulate-control__desc">
                Open windows reduce CO₂ and humidity but may affect temperature
                control
              </span>
            </div>
            <label
              className="toggle-switch"
              aria-label="Toggle passive ventilation"
            >
              <input
                type="checkbox"
                checked={controls.windowsOpen}
                onChange={(e) => {
                  const next = e.target.checked;
                  updateControls({ windowsOpen: next });
                  setActivePreset("custom");
                  trackEvent("scenario_manual_change", {
                    field: "windowsOpen",
                    value: next,
                    role: user?.role,
                  });
                }}
              />
              <span className="toggle-switch__track" />
            </label>
          </div>

          <div className="simulate-control">
            <div className="simulate-control__label">
              Telemetry Frequency
              <span className="simulate-control__desc">
                How often sensor readings are generated and persisted to the
                database
              </span>
            </div>
            <div className="hvac-buttons">
              {([1000, 1800, 2500, 3500] as const).map((ms) => (
                <button
                  type="button"
                  key={ms}
                  className={`hvac-btn${controls.speedMs === ms ? " hvac-btn--active" : ""}`}
                  onClick={() => {
                    updateControls({ speedMs: ms });
                    trackEvent("scenario_manual_change", {
                      field: "speedMs",
                      value: ms,
                      role: user?.role,
                    });
                  }}
                >
                  {(ms / 1000).toFixed(1)}s
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="content-section">
        <h2 className="section-title">Live Effect Preview</h2>
        <p className="section-subtitle">
          Current readings under the active scenario. Use this table to assess
          environmental impact before making HVAC decisions.
        </p>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Room</th>
                <th>Temp</th>
                <th>Humidity</th>
                <th>CO₂</th>
                <th>Occupancy</th>
                <th>Comfort</th>
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
                  <td>{r.occupancyPct.toFixed(0)}%</td>
                  <td>{r.comfortScore.toFixed(1)}</td>
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
      </div>
    </>
  );
};
