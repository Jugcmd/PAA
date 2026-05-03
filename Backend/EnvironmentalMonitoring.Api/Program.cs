using EnvironmentalMonitoring.Api.Contracts;
using EnvironmentalMonitoring.Api.Data;
using EnvironmentalMonitoring.Api.Models;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.RateLimiting;
using Scalar.AspNetCore;
using System.Text;
using System.Threading.RateLimiting;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddOpenApi();
builder.Services.AddDbContext<MonitoringDbContext>(options =>
{
    options.UseSqlite(builder.Configuration.GetConnectionString("MonitoringDatabase"));
});

var allowedOrigins = builder.Configuration
    .GetSection("AllowedCorsOrigins")
    .Get<string[]>() ?? ["http://localhost:5173"];

builder.Services.AddCors(options =>
{
    options.AddDefaultPolicy(policy =>
    {
        policy
            .AllowAnyHeader()
            .AllowAnyMethod()
            .WithOrigins(allowedOrigins);
    });
});

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    options.AddFixedWindowLimiter("ingest", limiterOptions =>
    {
        limiterOptions.PermitLimit = 120;
        limiterOptions.Window = TimeSpan.FromMinutes(1);
        limiterOptions.QueueLimit = 0;
        limiterOptions.QueueProcessingOrder = QueueProcessingOrder.OldestFirst;
    });
});

var app = builder.Build();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
    app.MapScalarApiReference(options =>
    {
        options.Title = "Environmental Monitoring API";
        options.Theme = ScalarTheme.Purple;
    });
}

app.UseCors();
app.UseRateLimiter();

using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<MonitoringDbContext>();
    db.Database.EnsureCreated();
}

app.MapGet("/api/health", () => Results.Ok(new { ok = true, timestamp = DateTime.UtcNow }));

app.MapGet("/api/readings", async (
    MonitoringDbContext db,
    ILogger<Program> logger,
    string? roomId,
    DateTime? from,
    DateTime? to,
    int? take) =>
{
    var requestedTake = take is > 0 and <= 5000 ? take.Value : 1200;

    var query = db.Readings.AsNoTracking().AsQueryable();

    if (!string.IsNullOrWhiteSpace(roomId))
    {
        query = query.Where(item => item.RoomId == roomId);
    }

    if (from is not null)
    {
        var fromUtc = DateTime.SpecifyKind(from.Value, DateTimeKind.Utc);
        query = query.Where(item => item.TimestampUtc >= fromUtc);
    }

    if (to is not null)
    {
        var toUtc = DateTime.SpecifyKind(to.Value, DateTimeKind.Utc);
        query = query.Where(item => item.TimestampUtc <= toUtc);
    }

    var rows = await query
        .OrderByDescending(item => item.TimestampUtc)
        .Take(requestedTake)
        .ToListAsync();

    var dto = rows
        .OrderBy(item => item.TimestampUtc)
        .Select(MapToDto)
        .ToArray();

    logger.LogInformation("Readings query completed. roomId={RoomId}, from={From}, to={To}, requestedTake={Take}, returned={Returned}",
        roomId,
        from,
        to,
        requestedTake,
        dto.Length);

    return Results.Ok(dto);
});

app.MapGet("/api/rooms/latest", async (MonitoringDbContext db, ILogger<Program> logger) =>
{
    var latestTimestampsByRoom = db.Readings
        .GroupBy(item => item.RoomId)
        .Select(group => new
        {
            RoomId = group.Key,
            TimestampUtc = group.Max(item => item.TimestampUtc)
        });

    var latestRows = await db.Readings
        .AsNoTracking()
        .Join(
            latestTimestampsByRoom,
            reading => new { reading.RoomId, reading.TimestampUtc },
            latest => new { latest.RoomId, latest.TimestampUtc },
            (reading, _) => reading
        )
        .OrderBy(item => item.RoomLabel)
        .ToListAsync();

    var dto = latestRows.Select(MapToDto).ToArray();
    logger.LogInformation("Latest rooms query completed. returned={Returned}", dto.Length);
    return Results.Ok(dto);
});

app.MapPost("/api/readings", async (MonitoringDbContext db, ILogger<Program> logger, EnvironmentalReadingDto dto) =>
{
    var validationErrors = ValidateReading(dto);
    if (validationErrors.Count > 0)
    {
        logger.LogWarning("Single reading rejected due to validation failure. id={ReadingId}, errors={Errors}", dto.Id, string.Join("; ", validationErrors));
        return Results.BadRequest(new { message = "Invalid reading payload.", errors = validationErrors });
    }

    var entity = MapToEntity(dto);
    db.Readings.Add(entity);

    try
    {
        await db.SaveChangesAsync();
        logger.LogInformation("Single reading inserted. id={ReadingId}, roomId={RoomId}, timestamp={TimestampUtc}", entity.ExternalId, entity.RoomId, entity.TimestampUtc);
        return Results.Created($"/api/readings/{entity.ExternalId}", MapToDto(entity));
    }
    catch (DbUpdateException)
    {
        logger.LogWarning("Single reading conflict. id={ReadingId}", entity.ExternalId);
        return Results.Conflict(new { message = "Reading with the same id already exists." });
    }
}).RequireRateLimiting("ingest");

app.MapGet("/api/readings/export", async (MonitoringDbContext db, ILogger<Program> logger, string? roomId) =>
{
    var query = db.Readings.AsNoTracking().AsQueryable();

    if (!string.IsNullOrWhiteSpace(roomId))
    {
        query = query.Where(item => item.RoomId == roomId);
    }

    var rows = await query
        .OrderBy(item => item.TimestampUtc)
        .Take(10000)
        .ToListAsync();

    var csv = new StringBuilder();
    csv.AppendLine("Id,RoomId,RoomLabel,TimestampUtc,TemperatureC,HumidityPct,Co2Ppm,OccupancyPct,ComfortScore,AirQualityScore,EnergyScore,SustainabilityScore,AlertLevel");

    foreach (var row in rows)
    {
        csv.AppendLine(
            $"{row.ExternalId},{row.RoomId},{EscapeCsv(row.RoomLabel)},{row.TimestampUtc:o}," +
            $"{row.TemperatureC},{row.HumidityPct},{row.Co2Ppm},{row.OccupancyPct}," +
            $"{row.ComfortScore},{row.AirQualityScore},{row.EnergyScore},{row.SustainabilityScore},{row.AlertLevel}"
        );
    }

    var bytes = Encoding.UTF8.GetBytes(csv.ToString());
    var filename = $"environmental-readings-{DateTime.UtcNow:yyyy-MM-dd}.csv";

    logger.LogInformation("CSV export generated. roomId={RoomId}, rows={Rows}", roomId, rows.Count);

    return Results.File(bytes, "text/csv", filename);
});

app.MapGet("/api/anomalies", async (MonitoringDbContext db, ILogger<Program> logger) =>
{
    // For each room, compute rolling statistics from the last 60 readings and flag anomalies
    var roomIds = await db.Readings
        .AsNoTracking()
        .Select(item => item.RoomId)
        .Distinct()
        .ToListAsync();

    var anomalies = new List<object>();

    foreach (var room in roomIds)
    {
        var recent = await db.Readings
            .AsNoTracking()
            .Where(item => item.RoomId == room)
            .OrderByDescending(item => item.TimestampUtc)
            .Take(60)
            .ToListAsync();

        if (recent.Count < 6)
        {
            continue;
        }

        var co2Values = recent.Select(item => (double)item.Co2Ppm).ToArray();
        var mean = co2Values.Average();
        var variance = co2Values.Select(v => (v - mean) * (v - mean)).Average();
        var stdDev = Math.Sqrt(variance);

        var latest = recent[0];
        var zScore = stdDev > 0 ? (latest.Co2Ppm - mean) / stdDev : 0;

        // Compute linear trend over last 12 readings
        var trendWindow = recent.Take(12).Reverse().ToArray();
        var n = trendWindow.Length;
        var xMean = (n - 1) / 2.0;
        var yMean = trendWindow.Select(r => (double)r.Co2Ppm).Average();
        var numerator = trendWindow.Select((r, i) => (i - xMean) * (r.Co2Ppm - yMean)).Sum();
        var denominator = Enumerable.Range(0, n).Select(i => (i - xMean) * (i - xMean)).Sum();
        var slope = denominator > 0 ? numerator / denominator : 0;
        var forecastCo2 = Math.Max(380, latest.Co2Ppm + slope * 5);
        var trend = Math.Abs(slope) < 5 ? "stable" : slope > 0 ? "rising" : "falling";

        anomalies.Add(new
        {
            roomId = latest.RoomId,
            roomLabel = latest.RoomLabel,
            currentCo2Ppm = latest.Co2Ppm,
            meanCo2Ppm = Math.Round(mean, 1),
            stdDevCo2 = Math.Round(stdDev, 1),
            zScore = Math.Round(zScore, 2),
            isAnomalous = zScore > 1.5,
            trend,
            forecastCo2Ppm = (int)Math.Round(forecastCo2),
            alertLevel = latest.AlertLevel,
            samplesAnalysed = recent.Count
        });
    }

    var result = anomalies.OrderByDescending(a => ((dynamic)a).zScore).ToArray();
    logger.LogInformation("Anomaly detection completed. roomCount={RoomCount}, flagged={FlaggedCount}", roomIds.Count, result.Count(a => ((dynamic)a).isAnomalous));
    return Results.Ok(result);
});

app.MapPost("/api/readings/batch", async (MonitoringDbContext db, ILogger<Program> logger, EnvironmentalReadingDto[] payload) =>
{
    if (payload.Length == 0)
    {
        return Results.BadRequest(new { message = "Batch payload cannot be empty." });
    }

    if (payload.Length > 500)
    {
        logger.LogWarning("Batch rejected because it exceeded size limit. count={Count}", payload.Length);
        return Results.BadRequest(new { message = "Batch payload exceeds max size of 500 readings." });
    }

    var invalid = payload
        .Select((item, index) => new { index, errors = ValidateReading(item) })
        .Where(item => item.errors.Count > 0)
        .ToArray();

    if (invalid.Length > 0)
    {
        logger.LogWarning("Batch rejected due to validation errors. invalidItems={InvalidCount}, total={Total}", invalid.Length, payload.Length);
        return Results.BadRequest(new
        {
            message = "Batch payload contains invalid readings.",
            errors = invalid.Select(item => new { index = item.index, errors = item.errors })
        });
    }

    var entities = payload.Select(MapToEntity).ToArray();
    db.Readings.AddRange(entities);

    try
    {
        await db.SaveChangesAsync();
        logger.LogInformation("Batch inserted. count={Count}, firstId={FirstId}", entities.Length, entities[0].ExternalId);
        return Results.Ok(new { inserted = entities.Length });
    }
    catch (DbUpdateException)
    {
        logger.LogWarning("Batch conflict detected while inserting {Count} items.", entities.Length);
        return Results.Conflict(new { message = "One or more readings already exist." });
    }
}).RequireRateLimiting("ingest");

app.Run();

static string EscapeCsv(string value)
{
    if (value.Contains(',') || value.Contains('"') || value.Contains('\n'))
    {
        return $"\"{value.Replace("\"", "\"\"")}\""; 
    }
    return value;
}

static EnvironmentalReadingDto MapToDto(EnvironmentalReadingEntity entity)
{
    return new EnvironmentalReadingDto(
        entity.ExternalId,
        entity.RoomId,
        entity.RoomLabel,
        DateTime.SpecifyKind(entity.TimestampUtc, DateTimeKind.Utc),
        entity.TemperatureC,
        entity.HumidityPct,
        entity.Co2Ppm,
        entity.OccupancyPct,
        entity.ComfortScore,
        entity.AirQualityScore,
        entity.EnergyScore,
        entity.SustainabilityScore,
        entity.AlertLevel
    );
}

static EnvironmentalReadingEntity MapToEntity(EnvironmentalReadingDto dto)
{
    return new EnvironmentalReadingEntity
    {
        ExternalId = dto.Id,
        RoomId = dto.RoomId,
        RoomLabel = dto.RoomLabel,
        TimestampUtc = DateTime.SpecifyKind(dto.TimestampIso, DateTimeKind.Utc),
        TemperatureC = dto.TemperatureC,
        HumidityPct = dto.HumidityPct,
        Co2Ppm = dto.Co2Ppm,
        OccupancyPct = dto.OccupancyPct,
        ComfortScore = dto.ComfortScore,
        AirQualityScore = dto.AirQualityScore,
        EnergyScore = dto.EnergyScore,
        SustainabilityScore = dto.SustainabilityScore,
        AlertLevel = dto.AlertLevel,
        CreatedUtc = DateTime.UtcNow
    };
}

static List<string> ValidateReading(EnvironmentalReadingDto dto)
{
    var errors = new List<string>();

    if (string.IsNullOrWhiteSpace(dto.Id)) errors.Add("id is required.");
    if (string.IsNullOrWhiteSpace(dto.RoomId)) errors.Add("roomId is required.");
    if (string.IsNullOrWhiteSpace(dto.RoomLabel)) errors.Add("roomLabel is required.");

    if (dto.TimestampIso == default)
    {
        errors.Add("timestampIso must be provided.");
    }
    else
    {
        var timestamp = DateTime.SpecifyKind(dto.TimestampIso, DateTimeKind.Utc);
        if (timestamp > DateTime.UtcNow.AddMinutes(10))
        {
            errors.Add("timestampIso cannot be too far in the future.");
        }
    }

    if (dto.TemperatureC is < -20 or > 60) errors.Add("temperatureC must be between -20 and 60.");
    if (dto.HumidityPct is < 0 or > 100) errors.Add("humidityPct must be between 0 and 100.");
    if (dto.Co2Ppm is < 250 or > 10_000) errors.Add("co2Ppm must be between 250 and 10000.");
    if (dto.OccupancyPct is < 0 or > 100) errors.Add("occupancyPct must be between 0 and 100.");
    if (dto.ComfortScore is < 0 or > 100) errors.Add("comfortScore must be between 0 and 100.");
    if (dto.AirQualityScore is < 0 or > 100) errors.Add("airQualityScore must be between 0 and 100.");
    if (dto.EnergyScore is < 0 or > 100) errors.Add("energyScore must be between 0 and 100.");
    if (dto.SustainabilityScore is < 0 or > 100) errors.Add("sustainabilityScore must be between 0 and 100.");

    var allowedAlertLevels = new[] { "normal", "attention", "critical" };
    if (!allowedAlertLevels.Contains(dto.AlertLevel, StringComparer.OrdinalIgnoreCase))
    {
        errors.Add("alertLevel must be one of: normal, attention, critical.");
    }

    return errors;
}

public partial class Program;
