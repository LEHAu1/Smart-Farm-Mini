using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace SmartFarm.WebAPI.Hubs
{
    [Authorize]
    public sealed class SensorHub : Hub
    {
    }
}
