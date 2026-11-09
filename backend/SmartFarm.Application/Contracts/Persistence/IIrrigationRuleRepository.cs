using SmartFarm.Domain.Entities;

namespace SmartFarm.Application.Contracts.Persistence
{
    /// <summary>
    /// Giao diện kho lưu trữ quy tắc tưới tự động (IrrigationRule Repository)
    /// </summary>
    public interface IIrrigationRuleRepository
    {
        Task<IrrigationRule?> GetByIdAsync(Guid id, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<IrrigationRule>> GetByDeviceIdAsync(Guid deviceId, CancellationToken cancellationToken = default);
        Task<IrrigationRule?> GetActiveRuleByDeviceIdAsync(Guid deviceId, CancellationToken cancellationToken = default);
        Task AddAsync(IrrigationRule rule, CancellationToken cancellationToken = default);
        Task UpdateAsync(IrrigationRule rule, CancellationToken cancellationToken = default);
        Task DeleteAsync(IrrigationRule rule, CancellationToken cancellationToken = default);
        Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
    }
}
