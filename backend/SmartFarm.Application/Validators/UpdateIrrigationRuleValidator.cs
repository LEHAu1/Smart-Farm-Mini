using SmartFarm.Application.DTOs.Irrigation;

namespace SmartFarm.Application.Validators
{
    public class UpdateIrrigationRuleValidator
    {
        public static (bool IsValid, string? ErrorMessage) Validate(UpdateIrrigationRuleRequest request)
        {
            return IrrigationRuleValidator.ValidateUpdate(request);
        }
    }
}
