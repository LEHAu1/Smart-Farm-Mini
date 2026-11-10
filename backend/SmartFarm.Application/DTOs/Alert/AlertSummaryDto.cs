namespace SmartFarm.Application.DTOs.Alert
{
    public sealed record AlertSummaryDto(int Total, int Critical, int Warning, int Info, int Unresolved);
}
