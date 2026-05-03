using EnvironmentalMonitoring.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace EnvironmentalMonitoring.Api.Data;

public sealed class MonitoringDbContext(DbContextOptions<MonitoringDbContext> options) : DbContext(options)
{
    public DbSet<EnvironmentalReadingEntity> Readings => Set<EnvironmentalReadingEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        var reading = modelBuilder.Entity<EnvironmentalReadingEntity>();
        reading.ToTable("Readings");
        reading.HasKey(item => item.Key);

        reading.Property(item => item.ExternalId).HasMaxLength(120).IsRequired();
        reading.Property(item => item.RoomId).HasMaxLength(80).IsRequired();
        reading.Property(item => item.RoomLabel).HasMaxLength(140).IsRequired();
        reading.Property(item => item.AlertLevel).HasMaxLength(24).IsRequired();

        reading.HasIndex(item => item.ExternalId).IsUnique();
        reading.HasIndex(item => new { item.RoomId, item.TimestampUtc });
        reading.HasIndex(item => item.TimestampUtc);
    }
}