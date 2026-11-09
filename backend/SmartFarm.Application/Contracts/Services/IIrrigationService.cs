using SmartFarm.Application.DTOs.Irrigation;

namespace SmartFarm.Application.Contracts.Services
{
    /// <summary>
    /// Giao diện dịch vụ nghiệp vụ tưới nước và quy tắc tưới (Irrigation Service)
    /// </summary>
    public interface IIrrigationService
    {
        // ── Quản lý quy tắc tưới (Irrigation Rules) ────────────────
        Task<IrrigationRuleDto> CreateRuleAsync(CreateIrrigationRuleRequest request, CancellationToken cancellationToken = default);
        Task<IrrigationRuleDto> UpdateRuleAsync(Guid ruleId, UpdateIrrigationRuleRequest request, CancellationToken cancellationToken = default);
        Task<IrrigationRuleDto?> GetRuleByIdAsync(Guid ruleId, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<IrrigationRuleDto>> GetRulesByDeviceIdAsync(Guid deviceId, CancellationToken cancellationToken = default);
        Task<IrrigationRuleDto> ToggleRuleAsync(Guid ruleId, bool isEnabled, CancellationToken cancellationToken = default);
        Task DeleteRuleAsync(Guid ruleId, CancellationToken cancellationToken = default);

        // ── Quản lý nhật ký và trạng thái tưới (Irrigation Logs) ─────
        Task<IrrigationLogDto> StartIrrigationAsync(CreateIrrigationLogRequest request, CancellationToken cancellationToken = default);
        Task<IrrigationLogDto> CompleteIrrigationAsync(Guid logId, CompleteIrrigationLogRequest request, CancellationToken cancellationToken = default);
        Task<IReadOnlyList<IrrigationLogDto>> GetLogsByDeviceIdAsync(Guid deviceId, int limit = 20, CancellationToken cancellationToken = default);
        Task<IrrigationStatusDto> GetCurrentStatusAsync(Guid deviceId, CancellationToken cancellationToken = default);
    }
}
