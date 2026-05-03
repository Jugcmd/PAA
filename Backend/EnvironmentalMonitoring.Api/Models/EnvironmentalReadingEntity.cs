namespace EnvironmentalMonitoring.Api.Models;

public sealed class EnvironmentalReadingEntity
{
    public int Key { get; set; }
    public required string ExternalId { get; set; }
    public required string RoomId { get; set; }
    public required string RoomLabel { get; set; }
    public DateTime TimestampUtc { get; set; }
    public double TemperatureC { get; set; }
    public double HumidityPct { get; set; }
    public int Co2Ppm { get; set; }
    public double OccupancyPct { get; set; }
    public double ComfortScore { get; set; }
    public double AirQualityScore { get; set; }
    public double EnergyScore { get; set; }
    public double SustainabilityScore { get; set; }
    public required string AlertLevel { get; set; }
    public DateTime CreatedUtc { get; set; }
}