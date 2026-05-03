import type { EnvironmentalReading } from "../types";

const STORAGE_KEY = "smart-env-monitoring-readings-v1";

const readStorage = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(STORAGE_KEY);
};

export const loadReadings = (): EnvironmentalReading[] => {
  try {
    const raw = readStorage();
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed as EnvironmentalReading[];
  } catch {
    return [];
  }
};

export const saveReadings = (readings: EnvironmentalReading[]) => {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(readings));
};

export const limitReadings = (
  readings: EnvironmentalReading[],
  maxPoints: number,
) => {
  if (readings.length <= maxPoints) {
    return readings;
  }

  return readings.slice(-maxPoints);
};
