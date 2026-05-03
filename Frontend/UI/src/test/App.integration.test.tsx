import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "../App";

const hoisted = vi.hoisted(() => {
  return {
    mockMonitoringValue: {
      controls: {
        hvacMode: "balanced",
        windowsOpen: false,
        occupancyBias: 1,
        speedMs: 1800,
      },
      dataSource: "api",
      hydrateError: null,
      injectReading: vi.fn(),
      isHydrated: true,
      isRefreshing: false,
      isRunning: true,
      isStaleData: false,
      lastReadingTimestampIso: new Date().toISOString(),
      lastSuccessfulSyncIso: new Date().toISOString(),
      refreshFromApi: vi.fn(),
      selectedRoom: "north-open-plan",
      setIsRunning: vi.fn(),
      setSelectedRoom: vi.fn(),
      syncWarning: null,
      updateControls: vi.fn(),
      state: {
        readings: [],
        latestReadings: [],
        kpis: {
          averageTempC: 0,
          averageHumidityPct: 0,
          averageCo2Ppm: 0,
          averageComfort: 0,
          averageAirQuality: 0,
          averageEnergy: 0,
          averageSustainability: 0,
        },
        attentionAlerts: [],
        forecasts: [],
      },
    },
  };
});

vi.mock("../hooks/useEnvironmentalMonitor", () => ({
  useEnvironmentalMonitor: () => hoisted.mockMonitoringValue,
}));

describe("App routes and auth integration", () => {
  beforeEach(() => {
    sessionStorage.clear();
    hoisted.mockMonitoringValue.dataSource = "api";
    hoisted.mockMonitoringValue.state.attentionAlerts = [];
    window.history.pushState({}, "", "/login");
  });

  it("redirects unauthenticated users to login when visiting dashboard", async () => {
    window.history.pushState({}, "", "/dashboard");
    render(<App />);

    expect(
      await screen.findByRole("heading", { name: "Sign in" }),
    ).toBeInTheDocument();
  });

  it("allows login and navigates to dashboard", async () => {
    render(<App />);
    const user = userEvent.setup();

    await user.type(
      screen.getByLabelText("Email address"),
      "facilities@greenoffice.io",
    );
    await user.type(screen.getByLabelText("Password"), "GreenOffice2026");
    await user.click(screen.getByRole("button", { name: "Sign in" }));

    expect(
      await screen.findByRole("heading", { name: "Dashboard" }),
    ).toBeInTheDocument();
  });

  it("prevents occupant role from opening scenario planner URL directly", async () => {
    sessionStorage.setItem(
      "em_auth_user",
      JSON.stringify({
        name: "Sam Taylor",
        email: "occupant@greenoffice.io",
        role: "Occupant",
        avatarInitials: "ST",
      }),
    );
    window.history.pushState({}, "", "/simulate");

    render(<App />);

    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: "Dashboard" }),
      ).toBeInTheDocument();
    });
  });

  it("disables CSV export when running in local data mode", async () => {
    hoisted.mockMonitoringValue.dataSource = "local";

    sessionStorage.setItem(
      "em_auth_user",
      JSON.stringify({
        name: "Alex Chen",
        email: "facilities@greenoffice.io",
        role: "FacilitiesManager",
        avatarInitials: "AC",
      }),
    );
    window.history.pushState({}, "", "/reports");

    render(<App />);

    const exportButton = await screen.findByRole("button", {
      name: /download csv/i,
    });
    expect(exportButton).toBeDisabled();
  });
});
