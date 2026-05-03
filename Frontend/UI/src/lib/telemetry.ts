type TelemetryEvent = {
  name: string;
  atIso: string;
  data?: Record<string, unknown>;
};

const STORAGE_KEY = "em_telemetry_events";
const MAX_EVENTS = 250;

const loadEvents = (): TelemetryEvent[] => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as TelemetryEvent[]) : [];
  } catch {
    return [];
  }
};

const saveEvents = (events: TelemetryEvent[]) => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(events));
  } catch {
    // Ignore telemetry persistence failures.
  }
};

export const trackEvent = (name: string, data?: Record<string, unknown>) => {
  const event: TelemetryEvent = {
    name,
    atIso: new Date().toISOString(),
    data,
  };

  const next = [...loadEvents(), event].slice(-MAX_EVENTS);
  saveEvents(next);

  // Keep a lightweight browser-visible log for demo/report evidence.
  console.info("[telemetry]", event.name, event);
};

export const getTelemetryEvents = () => loadEvents();
