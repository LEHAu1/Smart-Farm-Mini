using Microsoft.EntityFrameworkCore;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Domain.Entities;
using SmartFarm.Domain.Enums;
using SmartFarm.Infrastructure.Persistence.Data;

namespace SmartFarm.Infrastructure.Persistence.Repositories
{
    /// <summary>
    /// Hiện thực hóa DeviceCommand Repository sử dụng Entity Framework Core
    /// </summary>
    public class DeviceCommandRepository : IDeviceCommandRepository
    {
        private readonly SmartFarmDbContext _context;

        public DeviceCommandRepository(SmartFarmDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<DeviceCommand?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _context.DeviceCommands
                .FirstOrDefaultAsync(c => c.Id == id, cancellationToken);
        }

        public async Task<DeviceCommand?> GetByCommandCodeAsync(string commandCode, CancellationToken cancellationToken = default)
        {
            return await _context.DeviceCommands
                .FirstOrDefaultAsync(c => c.CommandCode == commandCode, cancellationToken);
        }

        public async Task<IReadOnlyList<DeviceCommand>> GetPendingCommandsByDeviceIdAsync(
            Guid deviceId,
            CancellationToken cancellationToken = default)
        {
            return await _context.DeviceCommands
                .Where(c => c.DeviceId == deviceId && c.Status == CommandStatus.Pending)
                .OrderBy(c => c.CreatedAtUtc)
                .ToListAsync(cancellationToken);
        }

        public async Task<IReadOnlyList<DeviceCommand>> GetRecentByDeviceIdAsync(
            Guid deviceId,
            int limit = 20,
            CancellationToken cancellationToken = default)
        {
            return await _context.DeviceCommands
                .AsNoTracking()
                .Where(c => c.DeviceId == deviceId)
                .OrderByDescending(c => c.CreatedAtUtc)
                .Take(limit)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(DeviceCommand command, CancellationToken cancellationToken = default)
        {
            await _context.DeviceCommands.AddAsync(command, cancellationToken);
        }

        public Task UpdateAsync(DeviceCommand command, CancellationToken cancellationToken = default)
        {
            _context.DeviceCommands.Update(command);
            return Task.CompletedTask;
        }

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
