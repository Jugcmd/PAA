interface SeriesPoint {
  xLabel: string;
  value: number;
}

export interface ChartSeries {
  label: string;
  color: string;
  points: SeriesPoint[];
}

interface MultiTrendChartProps {
  series: ChartSeries[];
  metricName: string;
}

const toMultiPath = (
  values: number[],
  globalMin: number,
  globalMax: number,
  width: number,
  height: number,
  padding: number,
): string => {
  const span = globalMax - globalMin || 1;
  return values
    .map((value, index) => {
      const x =
        padding +
        (index / Math.max(values.length - 1, 1)) * (width - padding * 2);
      const normalized = (value - globalMin) / span;
      const y = height - padding - normalized * (height - padding * 2);
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

export const MultiTrendChart = ({
  series,
  metricName,
}: MultiTrendChartProps) => {
  const width = 920;
  const height = 290;
  const padding = 30;

  const allValues = series.flatMap((s) => s.points.map((p) => p.value));
  const globalMin = allValues.length > 0 ? Math.min(...allValues) : 0;
  const globalMax = allValues.length > 0 ? Math.max(...allValues) : 100;

  const longestSeries = series.reduce(
    (a, b) => (a.points.length >= b.points.length ? a : b),
    series[0] ?? { points: [] },
  );
  const xLabels = longestSeries.points
    .filter(
      (_, i) =>
        i % Math.max(Math.floor(longestSeries.points.length / 5), 1) === 0,
    )
    .map((p) => p.xLabel);

  return (
    <section className="chart">
      <header className="chart__header">
        <h3>{metricName} — All Rooms</h3>
        <p>
          Min {globalMin.toFixed(1)} | Max {globalMax.toFixed(1)}
        </p>
      </header>

      <div className="multi-chart-legend">
        {series.map((s) => (
          <span key={s.label} className="multi-chart-legend__item">
            <span
              className="multi-chart-legend__dot"
              style={{ background: s.color }}
            />
            {s.label}
          </span>
        ))}
      </div>

      <svg
        className="chart__svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${metricName} comparison chart across all rooms`}
      >
        <g className="chart__grid">
          {[0, 1, 2, 3, 4].map((row) => {
            const y = padding + row * ((height - padding * 2) / 4);
            return (
              <line key={row} x1={padding} y1={y} x2={width - padding} y2={y} />
            );
          })}
        </g>

        {series.map((s) => {
          const values = s.points.map((p) => p.value);
          if (values.length < 2) return null;
          const path = toMultiPath(
            values,
            globalMin,
            globalMax,
            width,
            height,
            padding,
          );
          return (
            <path
              key={s.label}
              d={path}
              fill="none"
              stroke={s.color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              opacity="0.9"
            />
          );
        })}
      </svg>

      <footer className="chart__labels">
        {xLabels.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </footer>
    </section>
  );
};
