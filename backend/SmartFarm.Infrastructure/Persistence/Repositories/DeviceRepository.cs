using Microsoft.EntityFrameworkCore;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Domain.Entities;
using SmartFarm.Infrastructure.Persistence.Data;

namespace SmartFarm.Infrastructure.Persistence.Repositories
{
    /// <summary>
    /// Hiện thực hóa Device Repository sử dụng Entity Framework Core
    /// </summary>
    public class DeviceRepository : IDeviceRepository
    {
        private readonly SmartFarmDbContext _context;

        public DeviceRepository(SmartFarmDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<Device?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _context.Devices
                .FirstOrDefaultAsync(d => d.Id == id, cancellationToken);
        }

        public async Task<Device?> GetByCodeAsync(string deviceCode, CancellationToken cancellationToken = default)
        {
            return await _context.Devices
                .FirstOrDefaultAsync(d => d.DeviceCode == deviceCode.Trim().ToUpperInvariant(), cancellationToken);
        }

        public async Task<IReadOnlyList<Device>> GetAllAsync(CancellationToken cancellationToken = default)
        {
            return await _context.Devices
                .AsNoTracking()
                .OrderBy(d => d.CreatedAtUtc)
                .ToListAsync(cancellationToken);
        }

        public async Task AddAsync(Device device, CancellationToken cancellationToken = default)
        {
            await _context.Devices.AddAsync(device, cancellationToken);
        }

        public Task UpdateAsync(Device device, CancellationToken cancellationToken = default)
        {
            _context.Devices.Update(device);
            return Task.CompletedTask;
        }

        public Task DeleteAsync(Device device, CancellationToken cancellationToken = default)
        {
            _context.Devices.Remove(device);
            return Task.CompletedTask;
        }

        public async Task<bool> ExistsAsync(string deviceCode, CancellationToken cancellationToken = default)
        {
            var code = deviceCode.Trim().ToUpperInvariant();
            return await _context.Devices
                .AnyAsync(d => d.DeviceCode == code, cancellationToken);
        }

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
