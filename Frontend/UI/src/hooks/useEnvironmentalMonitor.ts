import { average, roundTo } from "@programmingandapps/components";
import { useCallback, useEffect, useMemo, useState } from "react";

import { fetchReadings, postReadingsBatch } from "../data/api";
import { generateReadingsTick, ROOM_PROFILES } from "../data/simulator";
import { limitReadings, loadReadings, saveReadings } from "../data/store";
import { trackEvent } from "../lib/telemetry";
import type {
  AlertThresholds,
  EnvironmentalReading,
  MonitoringState,
  RoomForecast,
  RoomId,
  SimulationControls,
  TrendDirection,
} from "../types";
import { DEFAULT_THRESHOLDS } from "../types";

const THRESHOLDS_KEY = "greenoffice_thresholds";

const MAX_HISTORY_POINTS = 1200;
const STALE_THRESHOLD_MS = 90_000;

const defaultControls: SimulationControls = {
  hvacMode: "balanced",
  windowsOpen: false,
  occupancyBias: 1,
  speedMs: 1800,
};

const createSeedData = () => {
  const controls = { ...defaultControls };
  const start = new Date(Date.now() - 60 * 60 * 1000);
  const seeded: EnvironmentalReading[] = [];

  for (let minute = 0; minute < 60; minute += 5) {
    const at = new Date(start.getTime() + minute * 60 * 1000);

    const previousByRoom = new Map<RoomId, EnvironmentalReading>();
    const lastRoomReadings = seeded.slice(-ROOM_PROFILES.length);
    for (const reading of lastRoomReadings) {
      previousByRoom.set(reading.roomId, reading);
    }

    seeded.push(...generateReadingsTick(at, controls, previousByRoom));
  }

  return seeded;
};

const mergeReadings = (
  previous: EnvironmentalReading[],
  incoming: EnvironmentalReading[],
) => limitReadings([...previous, ...incoming], MAX_HISTORY_POINTS);

const buildMonitoringState = (
  readings: EnvironmentalReading[],
): MonitoringState => {
  const latestByRoom = new Map<RoomId, EnvironmentalReading>();
  for (let index = readings.length - 1; index >= 0; index -= 1) {
    const reading = readings[index];
    if (!latestByRoom.has(reading.roomId)) {
      latestByRoom.set(reading.roomId, reading);
    }

    if (latestByRoom.size === ROOM_PROFILES.length) {
      break;
    }
  }

  const latestReadings = [...latestByRoom.values()].sort((a, b) =>
    a.roomLabel.localeCompare(b.roomLabel),
  );

  const kpis = {
    averageTempC: roundTo(
      average(latestReadings.map((item) => item.temperatureC)),
      1,
    ),
    averageHumidityPct: roundTo(
      average(latestReadings.map((item) => item.humidityPct)),
      1,
    ),
    averageCo2Ppm: roundTo(
      average(latestReadings.map((item) => item.co2Ppm)),
      0,
    ),
    averageComfort: roundTo(
      average(latestReadings.map((item) => item.comfortScore)),
      1,
    ),
    averageAirQuality: roundTo(
      average(latestReadings.map((item) => item.airQualityScore)),
      1,
    ),
    averageEnergy: roundTo(
      average(latestReadings.map((item) => item.energyScore)),
      1,
    ),
    averageSustainability: roundTo(
      average(latestReadings.map((item) => item.sustainabilityScore)),
      1,
    ),
  };

  const attentionAlerts = latestReadings
    .filter((reading) => reading.alertLevel !== "normal")
    .sort((a, b) => b.co2Ppm - a.co2Ppm);

  const forecasts: RoomForecast[] = ROOM_PROFILES.map((room) => {
    const roomReadings = readings
      .filter((r) => r.roomId === room.id)
      .slice(-14);
    const latest = latestByRoom.get(room.id);

    if (roomReadings.length < 3 || !latest) {
      return {
        roomId: room.id,
        roomLabel: room.label,
        trendDirection: "stable" as TrendDirection,
        currentCo2Ppm: latest?.co2Ppm ?? room.baselineCo2Ppm,
        forecastCo2Ppm: latest?.co2Ppm ?? room.baselineCo2Ppm,
        alertLevel: latest?.alertLevel ?? "normal",
      };
    }

    const n = roomReadings.length;
    const xMean = (n - 1) / 2;
    const yMean = roomReadings.reduce((sum, r) => sum + r.co2Ppm, 0) / n;
    let numerator = 0;
    let denominator = 0;
    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (roomReadings[i].co2Ppm - yMean);
      denominator += (i - xMean) ** 2;
    }
    const slope = denominator !== 0 ? numerator / denominator : 0;
    const forecastCo2Ppm = Math.max(380, Math.round(latest.co2Ppm + slope * 5));
    const trendDirection: TrendDirection =
      Math.abs(slope) < 5 ? "stable" : slope > 0 ? "rising" : "falling";

    return {
      roomId: room.id,
      roomLabel: room.label,
      trendDirection,
      currentCo2Ppm: latest.co2Ppm,
      forecastCo2Ppm,
      alertLevel: latest.alertLevel,
    };
  });

  return {
    readings,
    latestReadings,
    kpis,
    attentionAlerts,
    forecasts,
  };
};

export const useEnvironmentalMonitor = () => {
  const [controls, setControls] = useState<SimulationControls>(defaultControls);
  const [isRunning, setIsRunning] = useState(true);
  const [activeScenarioLabel, setActiveScenarioLabel] = useState<string | null>(
    null,
  );
  // hooks/useEnvironmentalMonitor.ts
  const [thresholds, setThresholdsState] = useState<AlertThresholds>(() => {
    try {
      const saved = localStorage.getItem(THRESHOLDS_KEY);
      return saved
        ? {
            ...DEFAULT_THRESHOLDS,
            ...(JSON.parse(saved) as Partial<AlertThresholds>),
          }
        : DEFAULT_THRESHOLDS;
    } catch {
      return DEFAULT_THRESHOLDS;
    }
  });
  const [selectedRoom, setSelectedRoom] = useState<RoomId>("north-open-plan");
  const [readings, setReadings] = useState<EnvironmentalReading[]>([]);
  const [dataSource, setDataSource] = useState<"api" | "local">("api");
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const [isHydrated, setIsHydrated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastSuccessfulSyncIso, setLastSuccessfulSyncIso] = useState<
    string | null
  >(null);
  const [hydrateError, setHydrateError] = useState<string | null>(null);

  const refreshFromApi = useCallback(async () => {
    setIsRefreshing(true);
    setHydrateError(null);
    try {
      const remote = await fetchReadings(MAX_HISTORY_POINTS);
      if (remote.length > 0) {
        setReadings(remote);
        saveReadings(remote);
      }

      setDataSource("api");
      setSyncWarning(null);
      setLastSuccessfulSyncIso(new Date().toISOString());
      trackEvent("api_refresh_success", { count: remote.length });
    } catch {
      setHydrateError(
        "Unable to refresh from API. Check backend availability and try again.",
      );
      trackEvent("api_refresh_failed");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    let active = true;

    const hydrate = async () => {
      try {
        const remote = await fetchReadings(MAX_HISTORY_POINTS);

        if (remote.length > 0) {
          if (active) {
            setReadings(remote);
            setDataSource("api");
            setSyncWarning(null);
            setHydrateError(null);
            setLastSuccessfulSyncIso(new Date().toISOString());
          }

          saveReadings(remote);
        } else {
          const seeded = createSeedData();
          await postReadingsBatch(seeded);
          if (active) {
            setReadings(seeded);
            setDataSource("api");
            setSyncWarning(null);
            setHydrateError(null);
            setLastSuccessfulSyncIso(new Date().toISOString());
          }

          saveReadings(seeded);
        }
      } catch {
        const loaded = loadReadings();
        const fallback = loaded.length > 0 ? loaded : createSeedData();
        if (active) {
          setReadings(fallback);
          setDataSource("local");
          setSyncWarning("API unavailable. Running in local fallback mode.");
          setHydrateError(
            "Could not connect to backend API. You can keep working in local mode and retry sync anytime.",
          );
        }

        saveReadings(fallback);
      } finally {
        if (active) {
          setIsHydrated(true);
        }
      }
    };

    void hydrate();

    return () => {
      active = false;
    };
  }, []);

  const runTick = useCallback(async () => {
    let nextBatch: EnvironmentalReading[] = [];

    setReadings((previous) => {
      const previousByRoom = new Map<RoomId, EnvironmentalReading>();
      for (let index = previous.length - 1; index >= 0; index -= 1) {
        const item = previous[index];
        if (!previousByRoom.has(item.roomId)) {
          previousByRoom.set(item.roomId, item);
        }

        if (previousByRoom.size === ROOM_PROFILES.length) {
          break;
        }
      }

      const next = generateReadingsTick(
        new Date(),
        controls,
        previousByRoom,
        thresholds,
      );
      nextBatch = next;
      const merged = mergeReadings(previous, next);
      saveReadings(merged);
      return merged;
    });

    if (nextBatch.length === 0) {
      return;
    }

    try {
      await postReadingsBatch(nextBatch);
      setDataSource("api");
      setSyncWarning(null);
      setHydrateError(null);
      setLastSuccessfulSyncIso(new Date().toISOString());
    } catch {
      setDataSource("local");
      setSyncWarning("API sync failed. Continuing in local fallback mode.");
      setHydrateError(
        "Background API sync failed. Data is still available locally.",
      );
    }
  }, [controls, thresholds]);

  useEffect(() => {
    if (!isRunning || !isHydrated) {
      return;
    }

    const timer = window.setInterval(() => {
      void runTick();
    }, controls.speedMs);

    return () => window.clearInterval(timer);
  }, [controls.speedMs, isHydrated, isRunning, runTick]);

  const state = useMemo(() => buildMonitoringState(readings), [readings]);
  const lastReadingTimestampIso =
    state.readings.length > 0
      ? state.readings[state.readings.length - 1].timestampIso
      : null;
  const freshnessAnchorIso = lastSuccessfulSyncIso ?? lastReadingTimestampIso;
  const isStaleData =
    !!freshnessAnchorIso &&
    Date.now() - new Date(freshnessAnchorIso).getTime() > STALE_THRESHOLD_MS;

  return {
    controls,
    activeScenarioLabel,
    setActiveScenarioLabel,
    thresholds,
    dataSource,
    isRunning,
    syncWarning,
    hydrateError,
    isRefreshing,
    isStaleData,
    lastReadingTimestampIso,
    lastSuccessfulSyncIso,
    selectedRoom,
    state,
    setSelectedRoom,
    setIsRunning,
    refreshFromApi,
    updateControls: (patch: Partial<SimulationControls>) => {
      setControls((previous) => ({ ...previous, ...patch }));
    },
    updateThresholds: (patch: Partial<AlertThresholds>) => {
      setThresholdsState((prev) => {
        const next = { ...prev, ...patch };
        localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(next));
        return next;
      });
    },
    resetThresholds: () => {
      setThresholdsState(DEFAULT_THRESHOLDS);
      try {
        localStorage.removeItem(THRESHOLDS_KEY);
      } catch {
        /* ignore */
      }
    },
    injectReading: () => {
      void runTick();
    },
  };
};
