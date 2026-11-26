using System.Reflection;
using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.EntityFrameworkCore.Migrations.Operations;
using SmartFarm.Domain.Entities;
using SmartFarm.Infrastructure.Persistence.Data;
using SmartFarm.Infrastructure.Persistence.Migrations;

namespace SmartFarm.UnitTests.Persistence;

public class DatabaseRemediationTests
{
    [Fact]
    public void CanonicalSchemaAlignmentMigration_AddsSoftDeleteAndConvergesDomainForeignKeys()
    {
        var migration = new CanonicalSchemaAlignment();
        var builder = new MigrationBuilder("Microsoft.EntityFrameworkCore.SqlServer");
        InvokeUp(migration, builder);

        Assert.Contains(builder.Operations, operation => operation is AddColumnOperation column
            && column.Table == "Devices" && column.Name == "IsDeleted" && !column.IsNullable);
        Assert.Contains(builder.Operations, operation => operation is AddColumnOperation column
            && column.Table == "Devices" && column.Name == "DeletedAtUtc" && column.IsNullable);
        Assert.Contains(builder.Operations, operation => operation is AddForeignKeyOperation foreignKey
            && foreignKey.OnDelete == ReferentialAction.Restrict);
        Assert.Contains(builder.Operations, operation => operation is AddCheckConstraintOperation constraint
            && constraint.Name == "CK_SensorAgg_Values");
        Assert.DoesNotContain(builder.Operations, operation => operation is DropTableOperation or DeleteDataOperation);

        var down = new MigrationBuilder("Microsoft.EntityFrameworkCore.SqlServer");
        InvokeDown(migration, down);
        Assert.DoesNotContain(down.Operations, operation => operation is DropColumnOperation column
            && column.Table == "Devices" && column.Name is "IsDeleted" or "DeletedAtUtc");
    }

    [Fact]
    public void IdentityAndSoftDeleteMigration_GuardsNarrowingAndRebuildsPrimaryKeys()
    {
        var migration = new IdentityKeyAndSoftDeleteIndex();
        var builder = new MigrationBuilder("Microsoft.EntityFrameworkCore.SqlServer");
        InvokeUp(migration, builder);

        Assert.Contains(builder.Operations, operation => operation is SqlOperation sql
            && sql.Sql.Contains("DATALENGTH", StringComparison.Ordinal)
            && sql.Sql.Contains("prevent data loss", StringComparison.OrdinalIgnoreCase));
        Assert.Contains(builder.Operations, operation => operation is DropPrimaryKeyOperation key
            && key.Table == "AspNetUserLogins");
        Assert.Contains(builder.Operations, operation => operation is AddPrimaryKeyOperation key
            && key.Table == "AspNetUserTokens");
        Assert.Equal(4, builder.Operations.OfType<AlterColumnOperation>().Count(operation => operation.MaxLength == 128));
        Assert.Contains(builder.Operations, operation => operation is CreateIndexOperation index
            && index.Name == "IX_Devices_IsDeleted" && index.Table == "Devices");
        Assert.DoesNotContain(builder.Operations, operation => operation is DropTableOperation or DeleteDataOperation);
    }

    [Fact]
    public void DbContext_IdentityKeyWidthsAndRefreshTokenInvariantMatchCanonicalSchema()
    {
        var options = new DbContextOptionsBuilder<SmartFarmDbContext>()
            .UseSqlServer("Server=localhost;Database=SmartFarmModelOnly;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        using var context = new SmartFarmDbContext(options);

        var model = context.GetService<IDesignTimeModel>().Model;
        var userLogin = Assert.IsAssignableFrom<IEntityType>(model.FindEntityType(typeof(IdentityUserLogin<Guid>)));
        var userToken = Assert.IsAssignableFrom<IEntityType>(model.FindEntityType(typeof(IdentityUserToken<Guid>)));
        Assert.Equal(128, userLogin.FindProperty(nameof(IdentityUserLogin<Guid>.LoginProvider))?.GetMaxLength());
        Assert.Equal(128, userLogin.FindProperty(nameof(IdentityUserLogin<Guid>.ProviderKey))?.GetMaxLength());
        Assert.Equal(128, userToken.FindProperty(nameof(IdentityUserToken<Guid>.LoginProvider))?.GetMaxLength());
        Assert.Equal(128, userToken.FindProperty(nameof(IdentityUserToken<Guid>.Name))?.GetMaxLength());

        var refreshToken = model.FindEntityType(typeof(RefreshToken));
        Assert.NotNull(refreshToken);
        Assert.Contains(refreshToken.GetCheckConstraints(), constraint => constraint.Name == "CK_RefreshTokens_Expiry");
    }

    [Fact]
    public void RefreshTokenExpiryMigration_AddsModelInvariant()
    {
        var migration = new RefreshTokenExpiryInvariant();
        var builder = new MigrationBuilder("Microsoft.EntityFrameworkCore.SqlServer");
        InvokeUp(migration, builder);

        Assert.Contains(builder.Operations, operation => operation is AddCheckConstraintOperation constraint
            && constraint.Table == "RefreshTokens"
            && constraint.Name == "CK_RefreshTokens_Expiry"
            && constraint.Sql == "[ExpiresAtUtc] > [CreatedAtUtc]");
    }

    [Fact]
    public void SensorReadingCompatibilityMigration_AlignsTargetModelAndOperations()
    {
        var options = new DbContextOptionsBuilder<SmartFarmDbContext>()
            .UseSqlServer("Server=localhost;Database=SmartFarmModelOnly;Trusted_Connection=True;TrustServerCertificate=True")
            .Options;
        using var context = new SmartFarmDbContext(options);

        var entity = context.GetService<IDesignTimeModel>().Model.FindEntityType(typeof(SensorReading));
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

    private static void InvokeUp(Migration migration, MigrationBuilder builder)
    {
        var up = migration.GetType().GetMethod("Up", BindingFlags.Instance | BindingFlags.NonPublic);
        Assert.NotNull(up);
        up.Invoke(migration, new object[] { builder });
    }

    private static void InvokeDown(Migration migration, MigrationBuilder builder)
    {
        var down = migration.GetType().GetMethod("Down", BindingFlags.Instance | BindingFlags.NonPublic);
        Assert.NotNull(down);
        down.Invoke(migration, new object[] { builder });
    }
}
