import TuneIcon from "@mui/icons-material/Tune";
import RestartAltIcon from "@mui/icons-material/RestartAlt";

import { useMonitoring } from "../monitoring/MonitoringContext";
import { DEFAULT_THRESHOLDS } from "../types";
import type { AlertThresholds } from "../types";

interface ThresholdRowProps {
  label: string;
  description: string;
  field: keyof AlertThresholds;
  unit: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (field: keyof AlertThresholds, value: number) => void;
  severity: "attention" | "critical";
  reference?: string;
}

const ThresholdRow = ({
  label,
  description,
  field,
  unit,
  min,
  max,
  step,
  value,
  onChange,
  severity,
  reference,
}: ThresholdRowProps) => (
  <div className="threshold-row">
    <div className="threshold-row__info">
      <div className="threshold-row__label-row">
        <span className="threshold-row__label">{label}</span>
        <span
          className={`threshold-row__severity-pill threshold-row__severity-pill--${severity}`}
        >
          {severity}
        </span>
      </div>
      <p className="threshold-row__desc">{description}</p>
      {reference && (
        <p className="threshold-row__reference">Standard: {reference}</p>
      )}
    </div>
    <div className="threshold-row__controls">
      <input
        type="range"
        className="threshold-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(field, parseFloat(e.target.value))}
        aria-label={label}
      />
      <div className="threshold-row__value-row">
        <span className="threshold-row__range-label">
          {min}
          {unit}
        </span>
        <span className="threshold-row__current-value">
          {value}
          {unit}
        </span>
        <span className="threshold-row__range-label threshold-row__range-label--right">
          {max}
          {unit}
        </span>
      </div>
    </div>
  </div>
);

export const SettingsPage = () => {
  const { thresholds, updateThresholds, resetThresholds } = useMonitoring();

  const handleChange = (field: keyof AlertThresholds, value: number) => {
    updateThresholds({ [field]: value });
  };

  const isModified =
    JSON.stringify(thresholds) !== JSON.stringify(DEFAULT_THRESHOLDS);

  const orderingErrors: string[] = [];
  if (thresholds.co2AttentionPpm >= thresholds.co2CriticalPpm) {
    orderingErrors.push(
      "CO₂ attention threshold must be below the critical threshold.",
    );
  }
  if (thresholds.tempMinAttentionC <= thresholds.tempMinCriticalC) {
    orderingErrors.push(
      "Temperature minimum attention must be above the critical minimum.",
    );
  }
  if (thresholds.tempMaxAttentionC >= thresholds.tempMaxCriticalC) {
    orderingErrors.push(
      "Temperature maximum attention must be below the critical maximum.",
    );
  }
  if (thresholds.humidityMinAttention <= thresholds.humidityMinCritical) {
    orderingErrors.push(
      "Humidity minimum attention must be above the critical minimum.",
    );
  }
  if (thresholds.humidityMaxAttention >= thresholds.humidityMaxCritical) {
    orderingErrors.push(
      "Humidity maximum attention must be below the critical maximum.",
    );
  }

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <TuneIcon
              sx={{
                fontSize: "1.5rem",
                verticalAlign: "middle",
                marginRight: "0.4rem",
                color: "var(--accent)",
              }}
            />
            Alert Thresholds
          </h1>
          <p className="page-subtitle">
            Configure the environmental limits that trigger attention and
            critical alerts across all rooms. Thresholds are saved to this
            browser and persist across sessions. Defaults follow CIBSE TM40
            guidance and the WELL Building Standard.
          </p>
        </div>
        {isModified && (
          <div className="page-header__actions">
            <button
              type="button"
              className="btn btn--secondary"
              onClick={resetThresholds}
            >
              <RestartAltIcon sx={{ fontSize: "1rem" }} /> Reset to defaults
            </button>
          </div>
        )}
      </div>

      {isModified && (
        <div className="settings-modified-banner">
          <span>
            ⚙ Custom thresholds active — alerts may differ from CIBSE defaults
          </span>
        </div>
      )}

      {orderingErrors.length > 0 && (
        <div className="settings-ordering-error" role="alert">
          <strong>⚠ Threshold conflict detected</strong>
          <ul>
            {orderingErrors.map((err) => (
              <li key={err}>{err}</li>
            ))}
          </ul>
          <p>
            When attention and critical thresholds overlap, the attention band
            cannot fire. Reset to defaults or adjust the sliders to resolve.
          </p>
        </div>
      )}

      <div className="panel">
        <h2 className="panel__title">CO₂ Concentration</h2>
        <p className="panel__subtitle">
          CO₂ accumulates from occupant breathing. Elevated CO₂ impairs
          cognitive performance; critical levels require immediate ventilation.
        </p>
        <div className="threshold-list">
          <ThresholdRow
            label="Attention threshold"
            description="Rooms above this level will show an attention alert. CIBSE TM40 recommends 900 ppm as the limit for acceptable office air quality."
            field="co2AttentionPpm"
            unit=" ppm"
            min={600}
            max={1200}
            step={50}
            value={thresholds.co2AttentionPpm}
            onChange={handleChange}
            severity="attention"
            reference="CIBSE TM40 — 900 ppm"
          />
          <ThresholdRow
            label="Critical threshold"
            description="Rooms above this level will show a critical alert and trigger evacuation recommendations. HSE considers levels above 1500 ppm as potentially unsafe for prolonged exposure."
            field="co2CriticalPpm"
            unit=" ppm"
            min={900}
            max={2000}
            step={50}
            value={thresholds.co2CriticalPpm}
            onChange={handleChange}
            severity="critical"
            reference="HSE EH40 — 5000 ppm WEL; 1500 ppm practical limit"
          />
        </div>
      </div>

      <div className="panel">
        <h2 className="panel__title">Temperature</h2>
        <p className="panel__subtitle">
          CIBSE Guide A defines the thermal comfort band for sedentary office
          work as 20–24°C. Statutory minimums (Workplace Regulations 1992) set
          16°C for light physical work.
        </p>
        <div className="threshold-list">
          <ThresholdRow
            label="Attention — minimum"
            description="Rooms below this temperature trigger an attention alert. CIBSE recommends 20°C as the lower comfort limit."
            field="tempMinAttentionC"
            unit="°C"
            min={15}
            max={22}
            step={0.5}
            value={thresholds.tempMinAttentionC}
            onChange={handleChange}
            severity="attention"
            reference="CIBSE Guide A — 20°C lower comfort limit"
          />
          <ThresholdRow
            label="Attention — maximum"
            description="Rooms above this temperature trigger an attention alert. CIBSE recommends 24°C as the upper comfort limit."
            field="tempMaxAttentionC"
            unit="°C"
            min={22}
            max={30}
            step={0.5}
            value={thresholds.tempMaxAttentionC}
            onChange={handleChange}
            severity="attention"
            reference="CIBSE Guide A — 24°C upper comfort limit"
          />
          <ThresholdRow
            label="Critical — minimum"
            description="Rooms below this temperature trigger a critical alert. Below 16°C constitutes a health and safety breach for office environments."
            field="tempMinCriticalC"
            unit="°C"
            min={13}
            max={19}
            step={0.5}
            value={thresholds.tempMinCriticalC}
            onChange={handleChange}
            severity="critical"
            reference="Workplace Regulations 1992 — 16°C minimum"
          />
          <ThresholdRow
            label="Critical — maximum"
            description="Rooms above this temperature trigger a critical alert. Above 28°C presents heat-stress risk per HSE guidance."
            field="tempMaxCriticalC"
            unit="°C"
            min={26}
            max={35}
            step={0.5}
            value={thresholds.tempMaxCriticalC}
            onChange={handleChange}
            severity="critical"
            reference="HSE — 28°C heat-stress risk threshold"
          />
        </div>
      </div>

      <div className="panel">
        <h2 className="panel__title">Relative Humidity</h2>
        <p className="panel__subtitle">
          The WELL Building Standard specifies 30–60% RH as the acceptable range
          for healthy indoor environments. Low humidity causes respiratory
          irritation; high humidity promotes mould growth.
        </p>
        <div className="threshold-list">
          <ThresholdRow
            label="Attention — minimum"
            description="Below this level, dry air causes eye and respiratory irritation and increases static electricity incidents."
            field="humidityMinAttention"
            unit="%"
            min={20}
            max={45}
            step={1}
            value={thresholds.humidityMinAttention}
            onChange={handleChange}
            severity="attention"
            reference="WELL Building Standard — 30% lower limit"
          />
          <ThresholdRow
            label="Attention — maximum"
            description="Above this level, discomfort increases and condensation on surfaces becomes a risk."
            field="humidityMaxAttention"
            unit="%"
            min={50}
            max={75}
            step={1}
            value={thresholds.humidityMaxAttention}
            onChange={handleChange}
            severity="attention"
            reference="WELL Building Standard — 60% upper limit"
          />
          <ThresholdRow
            label="Critical — minimum"
            description="Very low humidity may damage equipment and significantly impairs occupant comfort and health."
            field="humidityMinCritical"
            unit="%"
            min={10}
            max={35}
            step={1}
            value={thresholds.humidityMinCritical}
            onChange={handleChange}
            severity="critical"
            reference="ASHRAE 62.1 — 20% lower bound"
          />
          <ThresholdRow
            label="Critical — maximum"
            description="Above this level, mould growth risk becomes significant and HVAC capacity must be reviewed."
            field="humidityMaxCritical"
            unit="%"
            min={60}
            max={90}
            step={1}
            value={thresholds.humidityMaxCritical}
            onChange={handleChange}
            severity="critical"
            reference="CIBSE Guide A — 70% upper limit"
          />
        </div>
      </div>
    </>
  );
};
