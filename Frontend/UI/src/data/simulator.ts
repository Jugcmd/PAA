import { average, clamp, roundTo } from "@programmingandapps/components";

import type {
  AlertLevel,
  AlertThresholds,
  EnvironmentalReading,
  RoomId,
  RoomProfile,
  SimulationControls,
} from "../types";
import { DEFAULT_THRESHOLDS } from "../types";

export const ROOM_PROFILES: RoomProfile[] = [
  {
    id: "north-open-plan",
    label: "North Open Plan",
    capacity: 42,
    baselineTempC: 21.5,
    baselineHumidity: 46,
    baselineCo2Ppm: 460,
  },
  {
    id: "south-open-plan",
    label: "South Open Plan",
    capacity: 38,
    baselineTempC: 22,
    baselineHumidity: 44,
    baselineCo2Ppm: 480,
  },
  {
    id: "meeting-suite",
    label: "Meeting Suite",
    capacity: 18,
    baselineTempC: 21,
    baselineHumidity: 45,
    baselineCo2Ppm: 500,
  },
  {
    id: "server-room",
    label: "Server Room",
    capacity: 6,
    baselineTempC: 19,
    baselineHumidity: 39,
    baselineCo2Ppm: 430,
  },
];

const HVAC_CO2_FACTOR: Record<SimulationControls["hvacMode"], number> = {
  eco: 1.15,
  balanced: 1,
  boost: 0.82,
};

const HVAC_TEMP_FACTOR: Record<SimulationControls["hvacMode"], number> = {
  eco: 1.18,
  balanced: 1,
  boost: 0.88,
};

const randomJitter = (span: number) => (Math.random() * 2 - 1) * span;

const gaussianPulse = (hour: number, center: number, width: number) => {
  const offset = hour - center;
  return Math.exp(-(offset * offset) / (2 * width * width));
};

const roomBias: Record<RoomId, number> = {
  "north-open-plan": 1,
  "south-open-plan": 1.06,
  "meeting-suite": 0.92,
  "server-room": 0.48,
};

const occupancyForRoom = (
  hour: number,
  controls: SimulationControls,
  room: RoomProfile,
) => {
  const morning = gaussianPulse(hour, 9.3, 1.5);
  const lunch = gaussianPulse(hour, 13.2, 1.2);
  const afternoon = gaussianPulse(hour, 15.6, 1.8);

  const dailyCurve = clamp(
    morning * 0.55 + lunch * 0.2 + afternoon * 0.42,
    0.08,
    1,
  );
  const weekendPenalty = [0, 6].includes(new Date().getDay()) ? 0.35 : 1;

  const occupancy =
    dailyCurve * roomBias[room.id] * controls.occupancyBias * weekendPenalty +
    randomJitter(0.045);

  return clamp(occupancy, 0.04, 1);
};

const scoreComfort = (
  temperatureC: number,
  humidityPct: number,
  co2Ppm: number,
) => {
  const tempPenalty = Math.abs(21.8 - temperatureC) * 6;
  const humidityPenalty = Math.abs(47 - humidityPct) * 1.3;
  const co2Penalty = Math.max(0, co2Ppm - 700) / 30;

  return clamp(100 - tempPenalty - humidityPenalty - co2Penalty, 0, 100);
};

const scoreAirQuality = (co2Ppm: number, humidityPct: number) => {
  const co2Penalty = Math.max(0, co2Ppm - 600) / 8;
  const humidityPenalty = Math.max(0, Math.abs(45 - humidityPct) - 10) * 1.8;
  return clamp(100 - co2Penalty - humidityPenalty, 0, 100);
};

const scoreEnergy = (
  controls: SimulationControls,
  occupancyPct: number,
  indoorTempC: number,
  baselineTempC: number,
) => {
  const hvacBase =
    controls.hvacMode === "eco"
      ? 95
      : controls.hvacMode === "balanced"
        ? 82
        : 68;
  const openWindowBonus = controls.windowsOpen ? 4 : 0;
  const occupancyAdjustment = (1 - occupancyPct) * 12;
  const tempDeviationPenalty = Math.abs(indoorTempC - baselineTempC) * 5;
  return clamp(
    hvacBase + openWindowBonus + occupancyAdjustment - tempDeviationPenalty,
    0,
    100,
  );
};

//data/simulator.ts
const inferAlertLevel = (
  temperatureC: number,
  humidityPct: number,
  co2Ppm: number,
  t: AlertThresholds = DEFAULT_THRESHOLDS,
): AlertLevel => {
  const critical =
    temperatureC < t.tempMinCriticalC ||
    temperatureC > t.tempMaxCriticalC ||
    humidityPct < t.humidityMinCritical ||
    humidityPct > t.humidityMaxCritical ||
    co2Ppm > t.co2CriticalPpm;
  if (critical) {
    return "critical";
  }

  const attention =
    temperatureC < t.tempMinAttentionC ||
    temperatureC > t.tempMaxAttentionC ||
    humidityPct < t.humidityMinAttention ||
    humidityPct > t.humidityMaxAttention ||
    co2Ppm > t.co2AttentionPpm;
  if (attention) {
    return "attention";
  }

  return "normal";
};

const HVAC_CO2_FACTOR_PROJ: Record<SimulationControls["hvacMode"], number> = {
  eco: 1.15,
  balanced: 1,
  boost: 0.82,
};
const HVAC_TEMP_FACTOR_PROJ: Record<SimulationControls["hvacMode"], number> = {
  eco: 1.18,
  balanced: 1,
  boost: 0.88,
};

/** Pure steady-state estimate of avg metrics under given controls (no randomness). */
export const projectControls = (
  controls: Partial<SimulationControls>,
): {
  avgCo2Ppm: number;
  avgComfort: number;
  avgAirQuality: number;
  avgEnergy: number;
  avgSustainability: number;
} => {
  const hvacMode = controls.hvacMode ?? "balanced";
  const occupancyBias = controls.occupancyBias ?? 1;
  const windowsOpen = controls.windowsOpen ?? false;
  // Assume typical daytime occupancy (afternoon peak ≈ 68% of bias)
  const occupancyPct = clamp(occupancyBias * 0.68, 0.04, 1);

  const roomEstimates = ROOM_PROFILES.map((room) => {
    const co2 = clamp(
      room.baselineCo2Ppm +
        occupancyPct * 760 * HVAC_CO2_FACTOR_PROJ[hvacMode] +
        (windowsOpen ? -110 : 30),
      380,
      1800,
    );
    const temp = clamp(
      room.baselineTempC +
        occupancyPct * 2.2 -
        (1 - HVAC_TEMP_FACTOR_PROJ[hvacMode]) * 2 -
        (windowsOpen ? 0.9 : 0),
      16,
      30,
    );
    const humidity = clamp(
      room.baselineHumidity + occupancyPct * 7 + (windowsOpen ? -3.5 : 1.5),
      20,
      76,
    );
    const comfort = scoreComfort(temp, humidity, co2);
    const airQuality = scoreAirQuality(co2, humidity);
    const energy = scoreEnergy(
      { hvacMode, windowsOpen, occupancyBias, speedMs: 1800 },
      occupancyPct,
      temp,
      room.baselineTempC,
    );
    const sustainability = average([comfort, airQuality, energy]);
    return { co2, comfort, airQuality, energy, sustainability };
  });

  const avg = (key: keyof (typeof roomEstimates)[0]) =>
    roomEstimates.reduce((s, r) => s + r[key], 0) / roomEstimates.length;

  return {
    avgCo2Ppm: Math.round(avg("co2")),
    avgComfort: roundTo(avg("comfort"), 1),
    avgAirQuality: roundTo(avg("airQuality"), 1),
    avgEnergy: roundTo(avg("energy"), 1),
    avgSustainability: roundTo(avg("sustainability"), 1),
  };
};

export const generateReadingsTick = (
  at: Date,
  controls: SimulationControls,
  previousByRoom: Map<RoomId, EnvironmentalReading>,
  thresholds: AlertThresholds = DEFAULT_THRESHOLDS,
) => {
  const hour = at.getHours() + at.getMinutes() / 60;

  return ROOM_PROFILES.map((room) => {
    const previous = previousByRoom.get(room.id);
    const occupancyPct = occupancyForRoom(hour, controls, room);

    const tempDriftFromPeople = occupancyPct * 2.2;
    const hvacTempCorrection = (1 - HVAC_TEMP_FACTOR[controls.hvacMode]) * 2;
    const windowCooling = controls.windowsOpen ? 0.9 : 0;

    const temperatureC = clamp(
      (previous?.temperatureC ?? room.baselineTempC) * 0.68 +
        (room.baselineTempC +
          tempDriftFromPeople -
          hvacTempCorrection -
          windowCooling +
          randomJitter(0.55)) *
          0.32,
      16,
      30,
    );

    const humidityPct = clamp(
      (previous?.humidityPct ?? room.baselineHumidity) * 0.62 +
        (room.baselineHumidity +
          occupancyPct * 7 +
          (controls.windowsOpen ? -3.5 : 1.5) +
          randomJitter(2.5)) *
          0.38,
      20,
      76,
    );

    const co2Ppm = clamp(
      (previous?.co2Ppm ?? room.baselineCo2Ppm) * 0.58 +
        (room.baselineCo2Ppm +
          occupancyPct * 760 * HVAC_CO2_FACTOR[controls.hvacMode] +
          (controls.windowsOpen ? -110 : 30) +
          randomJitter(60)) *
          0.42,
      380,
      1800,
    );

    const comfortScore = scoreComfort(temperatureC, humidityPct, co2Ppm);
    const airQualityScore = scoreAirQuality(co2Ppm, humidityPct);
    const energyScore = scoreEnergy(
      controls,
      occupancyPct,
      temperatureC,
      room.baselineTempC,
    );
    const sustainabilityScore = average([
      comfortScore,
      airQualityScore,
      energyScore,
    ]);
    const alertLevel = inferAlertLevel(
      temperatureC,
      humidityPct,
      co2Ppm,
      thresholds,
    );

    return {
      id: `${at.getTime()}-${room.id}`,
      roomId: room.id,
      roomLabel: room.label,
      timestampIso: at.toISOString(),
      temperatureC: roundTo(temperatureC, 1),
      humidityPct: roundTo(humidityPct, 1),
      co2Ppm: Math.round(co2Ppm),
      occupancyPct: roundTo(occupancyPct * 100, 1),
      comfortScore: roundTo(comfortScore, 1),
      airQualityScore: roundTo(airQualityScore, 1),
      energyScore: roundTo(energyScore, 1),
      sustainabilityScore: roundTo(sustainabilityScore, 1),
      alertLevel,
    } satisfies EnvironmentalReading;
  });
};
