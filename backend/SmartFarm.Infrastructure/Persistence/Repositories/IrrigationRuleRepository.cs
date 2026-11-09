using Microsoft.EntityFrameworkCore;
using SmartFarm.Application.Contracts.Persistence;
using SmartFarm.Domain.Entities;
using SmartFarm.Infrastructure.Persistence.Data;

namespace SmartFarm.Infrastructure.Persistence.Repositories
{
    /// <summary>
    /// Hiện thực hóa IrrigationRule Repository sử dụng Entity Framework Core
    /// </summary>
    public class IrrigationRuleRepository : IIrrigationRuleRepository
    {
        private readonly SmartFarmDbContext _context;

        public IrrigationRuleRepository(SmartFarmDbContext context)
        {
            _context = context ?? throw new ArgumentNullException(nameof(context));
        }

        public async Task<IrrigationRule?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default)
        {
            return await _context.IrrigationRules
                .FirstOrDefaultAsync(r => r.Id == id, cancellationToken);
        }

        public async Task<IReadOnlyList<IrrigationRule>> GetByDeviceIdAsync(Guid deviceId, CancellationToken cancellationToken = default)
        {
            return await _context.IrrigationRules
                .AsNoTracking()
                .Where(r => r.DeviceId == deviceId)
                .OrderBy(r => r.CreatedAtUtc)
                .ToListAsync(cancellationToken);
        }

        public async Task<IrrigationRule?> GetActiveRuleByDeviceIdAsync(Guid deviceId, CancellationToken cancellationToken = default)
        {
            return await _context.IrrigationRules
                .FirstOrDefaultAsync(r => r.DeviceId == deviceId && r.IsEnabled, cancellationToken);
        }

        public async Task AddAsync(IrrigationRule rule, CancellationToken cancellationToken = default)
        {
            await _context.IrrigationRules.AddAsync(rule, cancellationToken);
        }

        public Task UpdateAsync(IrrigationRule rule, CancellationToken cancellationToken = default)
        {
            _context.IrrigationRules.Update(rule);
            return Task.CompletedTask;
        }

        public Task DeleteAsync(IrrigationRule rule, CancellationToken cancellationToken = default)
        {
            _context.IrrigationRules.Remove(rule);
            return Task.CompletedTask;
        }

        public async Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
        {
            return await _context.SaveChangesAsync(cancellationToken);
        }
    }
}
