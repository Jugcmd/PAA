using System.Net;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using Xunit;

namespace EnvironmentalMonitoring.Api.Tests;

public sealed class ApiEndpointsTests : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client;

    public ApiEndpointsTests(ApiFactory factory)
    {
        _client = factory.CreateClient();
    }

    [Fact]
    public async Task Health_ReturnsOk()
    {
        var response = await _client.GetAsync("/api/health");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("ok", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task ReadingsBatch_RejectsEmptyPayload()
    {
        var response = await _client.PostAsJsonAsync("/api/readings/batch", Array.Empty<object>());

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
    }

    [Fact]
    public async Task ReadingsBatch_RejectsInvalidPayload()
    {
        var payload = new[]
        {
            new
            {
                id = "invalid-1",
                roomId = "north-open-plan",
                roomLabel = "North Open Plan",
                timestampIso = DateTime.UtcNow,
                temperatureC = 21.0,
                humidityPct = 48.0,
                co2Ppm = 12000,
                occupancyPct = 35.0,
                comfortScore = 82.0,
                airQualityScore = 78.0,
                energyScore = 80.0,
                sustainabilityScore = 80.0,
                alertLevel = "critical"
            }
        };

        var response = await _client.PostAsJsonAsync("/api/readings/batch", payload);

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        var body = await response.Content.ReadAsStringAsync();
        Assert.Contains("invalid", body, StringComparison.OrdinalIgnoreCase);
    }

    [Fact]
    public async Task Export_ReturnsCsv()
    {
        var payload = new[]
        {
            new
            {
                id = Guid.NewGuid().ToString("N"),
                roomId = "north-open-plan",
                roomLabel = "North Open Plan",
                timestampIso = DateTime.UtcNow,
                temperatureC = 22.1,
                humidityPct = 46.5,
                co2Ppm = 760,
                occupancyPct = 42.0,
                comfortScore = 79.2,
                airQualityScore = 81.1,
                energyScore = 76.9,
                sustainabilityScore = 79.1,
                alertLevel = "normal"
            }
        };

        var insert = await _client.PostAsJsonAsync("/api/readings/batch", payload);
        Assert.Equal(HttpStatusCode.OK, insert.StatusCode);

        var response = await _client.GetAsync("/api/readings/export");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        Assert.Equal("text/csv", response.Content.Headers.ContentType?.MediaType);
        var csv = await response.Content.ReadAsStringAsync();
        Assert.Contains("RoomId", csv);
        Assert.Contains("north-open-plan", csv);
    }
}
