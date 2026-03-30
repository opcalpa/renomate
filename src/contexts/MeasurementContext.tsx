import { createContext, useContext, ReactNode } from "react";
import { useMeasurementSystem } from "@/hooks/useMeasurementSystem";
import type { MeasurementSystem } from "@/components/floormap/types";

interface MeasurementContextValue {
  system: MeasurementSystem;
  isImperial: boolean;
  updateSystem: (s: MeasurementSystem) => Promise<void>;
  fmtLength: (mm: number) => string;
  fmtArea: (mmSq: number) => string;
  fmtCoverage: (sqmPerLiter: number) => string;
  areaLabel: string;
}

const MeasurementContext = createContext<MeasurementContextValue | null>(null);

export function MeasurementProvider({ children }: { children: ReactNode }) {
  const value = useMeasurementSystem();
  return (
    <MeasurementContext.Provider value={value}>
      {children}
    </MeasurementContext.Provider>
  );
}

/** Use measurement system from context. Falls back to metric if no provider. */
export function useMeasurement(): MeasurementContextValue {
  const ctx = useContext(MeasurementContext);
  if (ctx) return ctx;
  // Fallback for components outside provider
  return {
    system: "metric",
    isImperial: false,
    updateSystem: async () => {},
    fmtLength: (mm) => {
      if (mm < 10) return `${mm.toFixed(1)} mm`;
      if (mm < 1000) return `${(mm / 10).toFixed(1)} cm`;
      return `${(mm / 1000).toFixed(2)} m`;
    },
    fmtArea: (mmSq) => `${(mmSq * 1e-6).toFixed(1)} m²`,
    fmtCoverage: (v) => `${v.toFixed(1)} m²/L`,
    areaLabel: "m²",
  };
}
