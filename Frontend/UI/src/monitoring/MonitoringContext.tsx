import { createContext, useContext } from "react";
import type { ReactNode } from "react";

import { useEnvironmentalMonitor } from "../hooks/useEnvironmentalMonitor";

type MonitoringContextValue = ReturnType<typeof useEnvironmentalMonitor>;

const MonitoringContext = createContext<MonitoringContextValue | null>(null);

export const MonitoringProvider = ({ children }: { children: ReactNode }) => {
  const monitor = useEnvironmentalMonitor();
  return (
    <MonitoringContext.Provider value={monitor}>
      {children}
    </MonitoringContext.Provider>
  );
};

export const useMonitoring = () => {
  const ctx = useContext(MonitoringContext);
  if (!ctx)
    throw new Error("useMonitoring must be used within MonitoringProvider");
  return ctx;
};
