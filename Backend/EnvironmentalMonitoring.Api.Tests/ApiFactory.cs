using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace EnvironmentalMonitoring.Api.Tests;

public sealed class ApiFactory : WebApplicationFactory<Program>
{
    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, config) =>
        {
            var dbFile = Path.Combine(Path.GetTempPath(), $"environmental-monitoring-tests-{Guid.NewGuid():N}.db");
            var settings = new Dictionary<string, string?>
            {
                ["ConnectionStrings:MonitoringDatabase"] = $"Data Source={dbFile}",
                ["AllowedCorsOrigins:0"] = "http://localhost:5173"
            };

            config.AddInMemoryCollection(settings);
        });
    }
}
