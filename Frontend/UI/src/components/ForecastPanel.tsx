import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import TrendingDownIcon from "@mui/icons-material/TrendingDown";
import TrendingFlatIcon from "@mui/icons-material/TrendingFlat";
import type { RoomForecast } from "../types";

interface ForecastPanelProps {
  forecasts: RoomForecast[];
}

const TrendIcon = ({
  direction,
}: {
  direction: RoomForecast["trendDirection"];
}) => {
  if (direction === "rising")
    return (
      <TrendingUpIcon sx={{ fontSize: "1.6rem", color: "var(--critical)" }} />
    );
  if (direction === "falling")
    return (
      <TrendingDownIcon sx={{ fontSize: "1.6rem", color: "var(--accent)" }} />
    );
  return (
    <TrendingFlatIcon sx={{ fontSize: "1.6rem", color: "var(--muted)" }} />
  );
};

export const ForecastPanel = ({ forecasts }: ForecastPanelProps) => {
  return (
    <section className="forecast-panel">
      <h3>CO₂ 5-Minute Forecast</h3>
      <p className="forecast-subheading">
        Linear trend regression over the last 14 readings per room. A{" "}
        <strong>rising</strong> trend means CO₂ is increasing — consider
        ventilating. <strong>Falling</strong> means air quality is improving.
      </p>
      <div className="forecast-grid">
        {forecasts.map((forecast) => (
          <div
            key={forecast.roomId}
            className={`forecast-card forecast-card--${forecast.trendDirection}`}
          >
            <div className="forecast-card__room">{forecast.roomLabel}</div>
            <div className="forecast-card__now">
              <span className="forecast-card__label">Now</span>
              <span className="forecast-card__value">
                {forecast.currentCo2Ppm} ppm
              </span>
            </div>
            <div
              className={`forecast-card__arrow forecast-card__arrow--${forecast.trendDirection}`}
            >
              <TrendIcon direction={forecast.trendDirection} />
            </div>
            <div className="forecast-card__future">
              <span className="forecast-card__label">+5 min</span>
              <span className="forecast-card__value">
                {forecast.forecastCo2Ppm} ppm
              </span>
            </div>
            <span
              className={`status-pill status-pill--${forecast.alertLevel} forecast-card__pill`}
            >
              {forecast.trendDirection}
            </span>
          </div>
        ))}
      </div>
    </section>
  );
};
