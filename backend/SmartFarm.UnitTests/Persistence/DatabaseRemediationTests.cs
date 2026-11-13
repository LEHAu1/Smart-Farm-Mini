using System.Reflection;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using SmartFarm.Domain.Entities;
using SmartFarm.Infrastructure.Persistence.Data;
using SmartFarm.Infrastructure.Persistence.Migrations;

namespace SmartFarm.UnitTests.Persistence;

public class DatabaseRemediationTests
{
    [Fact]
    public void SensorReadingCompatibilityMigration_AlignsTargetModelAndOperations()
    {
        var options = new DbContextOptionsBuilder<SmartFarmDbContext>()
            .UseSqlServer("Server=localhost;Database=SmartFarmModelOnly;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        using var context = new SmartFarmDbContext(options);

        var entity = context.Model.FindEntityType(typeof(SensorReading));
        Assert.NotNull(entity);
        Assert.NotNull(entity.FindProperty(nameof(SensorReading.MessageId)));

        var messageIndex = Assert.Single(entity.GetIndexes(), index =>
            index.Properties.Select(property => property.Name)
                .SequenceEqual(new[] { nameof(SensorReading.MessageId), nameof(SensorReading.SensorType) }));
        Assert.True(messageIndex.IsUnique);
        Assert.Equal("[MessageId] IS NOT NULL", messageIndex.GetFilter());
        Assert.Equal(DeleteBehavior.Restrict, Assert.Single(entity.GetForeignKeys()).DeleteBehavior);
        Assert.Contains(entity.GetCheckConstraints(), constraint =>
            constraint.Name == "CK_SensorReadings_ReceivedAfterRecorded");

        var migration = new SensorReadingCompatibilityFix();
        var targetEntity = migration.TargetModel.FindEntityType(typeof(SensorReading));
        Assert.NotNull(targetEntity?.FindProperty(nameof(SensorReading.MessageId)));

        var builder = new MigrationBuilder("Microsoft.EntityFrameworkCore.SqlServer");
        var up = migration.GetType().GetMethod("Up", BindingFlags.Instance | BindingFlags.NonPublic);
        Assert.NotNull(up);
        up.Invoke(migration, new object[] { builder });

        Assert.Contains(builder.Operations, operation => operation is AddColumnOperation addColumn
            && addColumn.Table == "SensorReadings" && addColumn.Name == "MessageId" && addColumn.IsNullable);
        Assert.Contains(builder.Operations, operation => operation is CreateIndexOperation createIndex
            && createIndex.Name == "IX_SensorReadings_MessageId_SensorType"
            && createIndex.IsUnique && createIndex.Filter == "[MessageId] IS NOT NULL");
        Assert.Contains(builder.Operations, operation => operation is AddCheckConstraintOperation constraint
            && constraint.Name == "CK_SensorReadings_ReceivedAfterRecorded");
        Assert.Contains(builder.Operations, operation => operation is AddForeignKeyOperation foreignKey
            && foreignKey.Table == "SensorReadings"
            && foreignKey.OnDelete == ReferentialAction.Restrict);
    }
}
