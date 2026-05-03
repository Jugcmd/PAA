import type { EnvironmentalReading } from "../types";

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  "http://localhost:5281/api";

const ensureOk = async (response: Response) => {
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API ${response.status}: ${body}`);
  }

  return response;
};

export const fetchReadings = async (take = 1200) => {
  const response = await fetch(`${API_BASE}/readings?take=${take}`, {
    headers: { Accept: "application/json" },
  });

  const ok = await ensureOk(response);
  return (await ok.json()) as EnvironmentalReading[];
};

export const postReadingsBatch = async (payload: EnvironmentalReading[]) => {
  const response = await fetch(`${API_BASE}/readings/batch`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  await ensureOk(response);
};

export const fetchRoomsLatest = async () => {
  const response = await fetch(`${API_BASE}/rooms/latest`, {
    headers: { Accept: "application/json" },
  });

  const ok = await ensureOk(response);
  return (await ok.json()) as EnvironmentalReading[];
};

export const downloadReadingsCsv = async () => {
  const response = await fetch(`${API_BASE}/readings/export`, {
    headers: { Accept: "text/csv" },
  });

  if (!response.ok) {
    throw new Error(`CSV export failed: ${response.status}`);
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `environmental-readings-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
};
