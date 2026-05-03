export type RoomId =
  | "north-open-plan"
  | "south-open-plan"
  | "meeting-suite"
  | "server-room";

export type HvacMode = "eco" | "balanced" | "boost";

export type AlertLevel = "normal" | "attention" | "critical";

export type TrendDirection = "rising" | "stable" | "falling";

export interface RoomProfile {
  id: RoomId;
  label: string;
  capacity: number;
  baselineTempC: number;
  baselineHumidity: number;
  baselineCo2Ppm: number;
}

export interface EnvironmentalReading {
  id: string;
  roomId: RoomId;
  roomLabel: string;
  timestampIso: string;
  temperatureC: number;
  humidityPct: number;
  co2Ppm: number;
  occupancyPct: number;
  comfortScore: number;
  airQualityScore: number;
  energyScore: number;
  sustainabilityScore: number;
  alertLevel: AlertLevel;
}

export interface RoomForecast {
  roomId: RoomId;
  roomLabel: string;
  trendDirection: TrendDirection;
  currentCo2Ppm: number;
  forecastCo2Ppm: number;
  alertLevel: AlertLevel;
}

export interface SimulationControls {
  hvacMode: HvacMode;
  windowsOpen: boolean;
  occupancyBias: number;
  speedMs: number;
}

/** Configurable alert trigger thresholds — defaults match CIBSE TM40 / WELL Building Standard. */
export interface AlertThresholds {
  co2AttentionPpm: number; // default 900  — CIBSE TM40 recommended limit
  co2CriticalPpm: number; // default 1450 — HSE unsafe accumulation
  tempMinAttentionC: number; // default 19   — CIBSE lower comfort band
  tempMaxAttentionC: number; // default 25   — CIBSE upper comfort band
  tempMinCriticalC: number; // default 17.5 — below statutory minimum
  tempMaxCriticalC: number; // default 28   — heat-stress risk threshold
  humidityMinAttention: number; // default 35   — dry air irritation
  humidityMaxAttention: number; // default 62   — WELL Building Standard upper
  humidityMinCritical: number; // default 25   — static electricity / damage risk
  humidityMaxCritical: number; // default 70   — mould growth risk
}

export const DEFAULT_THRESHOLDS: AlertThresholds = {
  co2AttentionPpm: 900,
  co2CriticalPpm: 1450,
  tempMinAttentionC: 19,
  tempMaxAttentionC: 25,
  tempMinCriticalC: 17.5,
  tempMaxCriticalC: 28,
  humidityMinAttention: 35,
  humidityMaxAttention: 62,
  humidityMinCritical: 25,
  humidityMaxCritical: 70,
};

export interface DashboardKpis {
  averageTempC: number;
  averageHumidityPct: number;
  averageCo2Ppm: number;
  averageComfort: number;
  averageAirQuality: number;
  averageEnergy: number;
  averageSustainability: number;
}

export interface MonitoringState {
  readings: EnvironmentalReading[];
  latestReadings: EnvironmentalReading[];
  kpis: DashboardKpis;
  attentionAlerts: EnvironmentalReading[];
  forecasts: RoomForecast[];
}
