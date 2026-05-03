import type { EnvironmentalReading } from "../types";

interface RoomStatusTableProps {
  rows: EnvironmentalReading[];
}

export const RoomStatusTable = ({ rows }: RoomStatusTableProps) => {
  return (
    <section className="room-table-wrap">
      <h3>Live Office Snapshot</h3>
      <table className="room-table">
        <thead>
          <tr>
            <th>Room</th>
            <th>Temp</th>
            <th>Humidity</th>
            <th>CO2</th>
            <th>Occupancy</th>
            <th>Sustainability</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.roomLabel}</td>
              <td>{row.temperatureC.toFixed(1)} C</td>
              <td>{row.humidityPct.toFixed(1)}%</td>
              <td>{row.co2Ppm} ppm</td>
              <td>{row.occupancyPct.toFixed(0)}%</td>
              <td>{row.sustainabilityScore.toFixed(1)}</td>
              <td>
                <span className={`status-pill status-pill--${row.alertLevel}`}>
                  {row.alertLevel}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
};
