interface TrendPoint {
  xLabel: string;
  value: number;
}

interface TrendChartProps {
  points: TrendPoint[];
  metricName: string;
  stroke: string;
}

const toPath = (
  points: TrendPoint[],
  width: number,
  height: number,
  padding: number,
) => {
  if (points.length === 0) {
    return "";
  }

  const min = Math.min(...points.map((point) => point.value));
  const max = Math.max(...points.map((point) => point.value));
  const span = max - min || 1;

  return points
    .map((point, index) => {
      const x =
        padding +
        (index / Math.max(points.length - 1, 1)) * (width - padding * 2);
      const normalized = (point.value - min) / span;
      const y = height - padding - normalized * (height - padding * 2);
      const command = index === 0 ? "M" : "L";
      return `${command}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

export const TrendChart = ({ points, metricName, stroke }: TrendChartProps) => {
  const width = 920;
  const height = 290;
  const padding = 30;
  const path = toPath(points, width, height, padding);

  const values = points.map((point) => point.value);
  const min = values.length > 0 ? Math.min(...values) : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;

  return (
    <section className="chart">
      <header className="chart__header">
        <h3>{metricName} Trend</h3>
        <p>
          Min {min.toFixed(1)} | Max {max.toFixed(1)}
        </p>
      </header>

      <svg
        className="chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${metricName} trend chart`}
      >
        <defs>
          <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.32" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        <g className="chart__grid">
          {[0, 1, 2, 3, 4].map((row) => {
            const y = padding + row * ((height - padding * 2) / 4);
            return (
              <line key={row} x1={padding} y1={y} x2={width - padding} y2={y} />
            );
          })}
        </g>

        {path && (
          <>
            <path
              d={`${path} L ${width - padding},${height - padding} L ${padding},${height - padding} Z`}
              fill="url(#chart-fill)"
            />
            <path
              d={path}
              fill="none"
              stroke={stroke}
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </>
        )}
      </svg>

      <footer className="chart__labels">
        {points
          .filter(
            (_, index) =>
              index % Math.max(Math.floor(points.length / 5), 1) === 0,
          )
          .map((point) => (
            <span key={point.xLabel}>{point.xLabel}</span>
          ))}
      </footer>
    </section>
  );
};
