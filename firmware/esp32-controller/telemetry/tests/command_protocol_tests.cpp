#include "../include/command_protocol.h"

#include <cassert>
#include <cstring>

using namespace smartfarm::commands;

int main() {
  constexpr char validPayload[] =
      R"({"commandId":"e1fb09ea-22b6-4cbe-adc5-340ba31fac92","commandCode":"CMD-1","action":"START_PUMP","payload":{"createdAtUtc":"untrusted nested value"},"createdAtUtc":"2026-11-25T00:00:00+00:00"})";
  CommandRequest command{};
  assert(JsonReader(validPayload).parseCommand(command));
  assert(std::strcmp(command.commandId, "e1fb09ea-22b6-4cbe-adc5-340ba31fac92") == 0);
  assert(std::strcmp(command.action, "START_PUMP") == 0);
  assert(command.createdAtEpoch == 1795564800);
  assert(isSupportedAction("pump_on"));
  assert(!isSupportedAction("OPEN_VALVE"));

  CommandRequest missingExpiry{};
  constexpr char noTimestamp[] =
      R"({"commandId":"e1fb09ea-22b6-4cbe-adc5-340ba31fac92","action":"STOP_PUMP"})";
  assert(!JsonReader(noTimestamp).parseCommand(missingExpiry));

  int64_t epoch = 0;
  assert(parseUtcTimestamp("2026-01-01T00:00:00.123Z", epoch));
  assert(epoch == 1767225600);
  assert(!parseUtcTimestamp("2026-02-30T00:00:00Z", epoch));
  assert(validateTimestamp(1000, 1000) == TimestampValidity::Valid);
  assert(validateTimestamp(1000, 1000 + DefaultCommandMaxAgeSeconds + 1) ==
         TimestampValidity::Expired);
  assert(validateTimestamp(1000 + AllowedFutureClockSkewSeconds + 1, 1000) ==
         TimestampValidity::TooFarInFuture);

  CommandLedger ledger{};
  AckRecord failure{};
  std::strcpy(failure.commandId, command.commandId);
  std::strcpy(failure.status, "Failed");
  std::strcpy(failure.errorMessage, "Actuator control is unavailable.");
  failure.expiresAtEpoch = 2000;
  assert(ledger.remember(failure, 1000));

  AckRecord duplicate{};
  assert(ledger.find(command.commandId, 1999, duplicate));
  assert(std::strcmp(duplicate.status, "Failed") == 0);
  assert(!ledger.find(command.commandId, 2000, duplicate));
  return 0;
}
