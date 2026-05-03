namespace EnvironmentalMonitoring.Api.Contracts;

public sealed record EnvironmentalReadingDto(
    string Id,
    string RoomId,
    string RoomLabel,
    DateTime TimestampIso,
    double TemperatureC,
    double HumidityPct,
    int Co2Ppm,
    double OccupancyPct,
    double ComfortScore,
    double AirQualityScore,
    double EnergyScore,
    double SustainabilityScore,
    string AlertLevel
);