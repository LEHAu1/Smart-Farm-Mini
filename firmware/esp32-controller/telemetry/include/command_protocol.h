#pragma once

#include <array>
#include <cstddef>
#include <cstdint>
#include <cstring>
#include <string_view>

namespace smartfarm::commands {

constexpr int64_t DefaultCommandMaxAgeSeconds = 10 * 60;
constexpr int64_t AllowedFutureClockSkewSeconds = 60;
constexpr size_t CommandLedgerCapacity = 32;

struct CommandRequest {
  char commandId[37] = {};
  char action[32] = {};
  char createdAtUtc[32] = {};
  int64_t createdAtEpoch = 0;
};

struct AckRecord {
  char commandId[37] = {};
  char status[16] = {};
  char errorMessage[96] = {};
  int64_t expiresAtEpoch = 0;
};

struct LedgerEntry {
  bool valid = false;
  AckRecord acknowledgement;
};

inline bool isValidCommandId(const char* value);
inline bool parseUtcTimestamp(const char* value, int64_t& epochSeconds);

// Fixed-size and trivially copyable so the complete deduplication window can
// be persisted atomically in ESP32 NVS without dynamic allocation.
struct CommandLedger {
  std::array<LedgerEntry, CommandLedgerCapacity> entries{};

  bool find(const char* commandId, int64_t nowEpoch, AckRecord& result) const {
    if (!isValidCommandId(commandId)) return false;
    for (const auto& entry : entries) {
      if (entry.valid && entry.acknowledgement.expiresAtEpoch > nowEpoch &&
          std::strcmp(entry.acknowledgement.commandId, commandId) == 0) {
        result = entry.acknowledgement;
        return true;
      }
    }
    return false;
  }

  bool remember(const AckRecord& acknowledgement, int64_t nowEpoch) {
    if (!isValidCommandId(acknowledgement.commandId) ||
        acknowledgement.expiresAtEpoch <= nowEpoch) {
      return false;
    }

    LedgerEntry* available = nullptr;
    for (auto& entry : entries) {
      if (entry.valid &&
          std::strcmp(entry.acknowledgement.commandId, acknowledgement.commandId) == 0) {
        available = &entry;
        break;
      }
      if (!available && (!entry.valid || entry.acknowledgement.expiresAtEpoch <= nowEpoch))
        available = &entry;
    }
    if (!available) return false;

    available->acknowledgement = acknowledgement;
    available->valid = true;
    return true;
  }
};

class JsonReader {
 public:
  explicit JsonReader(std::string_view input) : input_(input) {}

  bool parseCommand(CommandRequest& output) {
    skipWhitespace();
    if (!consume('{')) return false;

    bool hasId = false;
    bool hasAction = false;
    bool hasCreatedAt = false;
    skipWhitespace();
    if (consume('}')) return false;

    while (position_ < input_.size()) {
      char key[32] = {};
      if (!parseString(key, sizeof(key))) return false;
      skipWhitespace();
      if (!consume(':')) return false;
      skipWhitespace();

      if (std::strcmp(key, "commandId") == 0) {
        if (hasId || !parseString(output.commandId, sizeof(output.commandId))) return false;
        hasId = true;
      } else if (std::strcmp(key, "action") == 0) {
        if (hasAction || !parseString(output.action, sizeof(output.action))) return false;
        hasAction = true;
      } else if (std::strcmp(key, "createdAtUtc") == 0) {
        if (hasCreatedAt || !parseString(output.createdAtUtc, sizeof(output.createdAtUtc))) return false;
        hasCreatedAt = true;
      } else if (!skipValue(0)) {
        return false;
      }

      skipWhitespace();
      if (consume('}')) break;
      if (!consume(',')) return false;
      skipWhitespace();
    }

    skipWhitespace();
    return position_ == input_.size() && hasId && hasAction && hasCreatedAt &&
           isValidCommandId(output.commandId) && output.action[0] != '\0' &&
           parseUtcTimestamp(output.createdAtUtc, output.createdAtEpoch);
  }

 private:
  bool consume(char expected) {
    if (position_ >= input_.size() || input_[position_] != expected) return false;
    ++position_;
    return true;
  }

  void skipWhitespace() {
    while (position_ < input_.size() &&
           (input_[position_] == ' ' || input_[position_] == '\t' ||
            input_[position_] == '\r' || input_[position_] == '\n')) {
      ++position_;
    }
  }

  static int hexValue(char value) {
    if (value >= '0' && value <= '9') return value - '0';
    if (value >= 'a' && value <= 'f') return value - 'a' + 10;
    if (value >= 'A' && value <= 'F') return value - 'A' + 10;
    return -1;
  }

  bool parseString(char* output, size_t capacity) {
    if (!output || capacity == 0 || !consume('"')) return false;
    size_t written = 0;
    while (position_ < input_.size()) {
      unsigned char character = static_cast<unsigned char>(input_[position_++]);
      if (character == '"') {
        output[written] = '\0';
        return true;
      }
      if (character < 0x20) return false;
      if (character == '\\') {
        if (position_ >= input_.size()) return false;
        const char escaped = input_[position_++];
        switch (escaped) {
          case '"': character = '"'; break;
          case '\\': character = '\\'; break;
          case '/': character = '/'; break;
          case 'b': character = '\b'; break;
          case 'f': character = '\f'; break;
          case 'n': character = '\n'; break;
          case 'r': character = '\r'; break;
          case 't': character = '\t'; break;
          case 'u': {
            if (position_ + 4 > input_.size()) return false;
            int codepoint = 0;
            for (int index = 0; index < 4; ++index) {
              const int digit = hexValue(input_[position_++]);
              if (digit < 0) return false;
              codepoint = codepoint * 16 + digit;
            }
            // Command identifiers, actions, and timestamps are ASCII. Reject
            // escaped non-ASCII values rather than mis-decoding them.
            if (codepoint < 0x20 || codepoint > 0x7e) return false;
            character = static_cast<unsigned char>(codepoint);
            break;
          }
          default: return false;
        }
      }
      if (written + 1 >= capacity) return false;
      output[written++] = static_cast<char>(character);
    }
    return false;
  }

  bool skipString() {
    if (!consume('"')) return false;
    while (position_ < input_.size()) {
      const unsigned char character = static_cast<unsigned char>(input_[position_++]);
      if (character == '"') return true;
      if (character < 0x20) return false;
      if (character == '\\') {
        if (position_ >= input_.size()) return false;
        const char escaped = input_[position_++];
        if (escaped == 'u') {
          if (position_ + 4 > input_.size()) return false;
          for (int index = 0; index < 4; ++index) {
            if (hexValue(input_[position_++]) < 0) return false;
          }
        } else if (escaped != '"' && escaped != '\\' && escaped != '/' &&
                   escaped != 'b' && escaped != 'f' && escaped != 'n' &&
                   escaped != 'r' && escaped != 't') {
          return false;
        }
      }
    }
    return false;
  }

  bool skipValue(uint8_t depth) {
    if (depth > 8 || position_ >= input_.size()) return false;
    skipWhitespace();
    if (position_ >= input_.size()) return false;
    if (input_[position_] == '"') return skipString();

    if (consume('{')) {
      skipWhitespace();
      if (consume('}')) return true;
      while (position_ < input_.size()) {
        if (!skipString()) return false;
        skipWhitespace();
        if (!consume(':')) return false;
        if (!skipValue(static_cast<uint8_t>(depth + 1))) return false;
        skipWhitespace();
        if (consume('}')) return true;
        if (!consume(',')) return false;
        skipWhitespace();
      }
      return false;
    }

    if (consume('[')) {
      skipWhitespace();
      if (consume(']')) return true;
      while (position_ < input_.size()) {
        if (!skipValue(static_cast<uint8_t>(depth + 1))) return false;
        skipWhitespace();
        if (consume(']')) return true;
        if (!consume(',')) return false;
        skipWhitespace();
      }
      return false;
    }

    const size_t start = position_;
    while (position_ < input_.size() && input_[position_] != ',' &&
           input_[position_] != '}' && input_[position_] != ']' &&
           input_[position_] != ' ' && input_[position_] != '\t' &&
           input_[position_] != '\r' && input_[position_] != '\n') {
      ++position_;
    }
    return position_ > start;
  }

  std::string_view input_;
  size_t position_ = 0;
};

inline bool isValidCommandId(const char* value) {
  if (!value || std::strlen(value) != 36) return false;
  for (size_t index = 0; index < 36; ++index) {
    if (index == 8 || index == 13 || index == 18 || index == 23) {
      if (value[index] != '-') return false;
    } else {
      const char character = value[index];
      if (!((character >= '0' && character <= '9') ||
            (character >= 'a' && character <= 'f') ||
            (character >= 'A' && character <= 'F'))) {
        return false;
      }
    }
  }
  return true;
}

inline bool isSupportedAction(const char* action) {
  if (!action) return false;
  constexpr std::array<const char*, 6> supported{
      "START_PUMP", "STOP_PUMP", "PUMP_ON", "PUMP_OFF", "EMERGENCY_STOP", "RESET_SYSTEM"};
  for (const char* candidate : supported) {
    size_t index = 0;
    while (action[index] && candidate[index]) {
      const char left = action[index] >= 'a' && action[index] <= 'z'
                            ? static_cast<char>(action[index] - 'a' + 'A')
                            : action[index];
      if (left != candidate[index]) break;
      ++index;
    }
    if (action[index] == '\0' && candidate[index] == '\0') return true;
  }
  return false;
}

inline bool parseUtcTimestamp(const char* value, int64_t& epochSeconds) {
  if (!value || std::strlen(value) < 20) return false;
  const int expectedSeparators[] = {4, 7, 10, 13, 16};
  const char separatorValues[] = {'-', '-', 'T', ':', ':'};
  for (size_t index = 0; index < 5; ++index) {
    if (value[expectedSeparators[index]] != separatorValues[index]) return false;
  }

  auto digits = [value](size_t start, size_t count, int& result) {
    result = 0;
    for (size_t index = 0; index < count; ++index) {
      const char digit = value[start + index];
      if (digit < '0' || digit > '9') return false;
      result = result * 10 + digit - '0';
    }
    return true;
  };

  int year, month, day, hour, minute, second;
  if (!digits(0, 4, year) || !digits(5, 2, month) || !digits(8, 2, day) ||
      !digits(11, 2, hour) || !digits(14, 2, minute) || !digits(17, 2, second)) {
    return false;
  }
  if (year < 1970 || month < 1 || month > 12 || hour > 23 || minute > 59 || second > 59)
    return false;

  constexpr int daysPerMonth[] = {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
  const bool leapYear = (year % 4 == 0 && year % 100 != 0) || year % 400 == 0;
  const int maximumDay = month == 2 && leapYear ? 29 : daysPerMonth[month - 1];
  if (day < 1 || day > maximumDay) return false;

  size_t suffix = 19;
  if (value[suffix] == '.') {
    ++suffix;
    const size_t fractionStart = suffix;
    while (value[suffix] >= '0' && value[suffix] <= '9') ++suffix;
    if (suffix == fractionStart) return false;
  }
  if (std::strcmp(value + suffix, "Z") != 0 &&
      std::strcmp(value + suffix, "+00:00") != 0 &&
      std::strcmp(value + suffix, "-00:00") != 0) {
    return false;
  }

  int adjustedYear = year - (month <= 2 ? 1 : 0);
  const int era = (adjustedYear >= 0 ? adjustedYear : adjustedYear - 399) / 400;
  const unsigned yearOfEra = static_cast<unsigned>(adjustedYear - era * 400);
  const unsigned adjustedMonth = static_cast<unsigned>(month + (month > 2 ? -3 : 9));
  const unsigned dayOfYear = (153 * adjustedMonth + 2) / 5 + static_cast<unsigned>(day - 1);
  const unsigned dayOfEra = yearOfEra * 365 + yearOfEra / 4 - yearOfEra / 100 + dayOfYear;
  const int64_t daysSinceEpoch = static_cast<int64_t>(era) * 146097 + dayOfEra - 719468;
  epochSeconds = daysSinceEpoch * 86400 + hour * 3600 + minute * 60 + second;
  return true;
}

enum class TimestampValidity : uint8_t { Valid, Expired, TooFarInFuture };

inline TimestampValidity validateTimestamp(
    int64_t createdAtEpoch,
    int64_t nowEpoch,
    int64_t maxAgeSeconds = DefaultCommandMaxAgeSeconds) {
  if (createdAtEpoch > nowEpoch + AllowedFutureClockSkewSeconds)
    return TimestampValidity::TooFarInFuture;
  if (nowEpoch - createdAtEpoch > maxAgeSeconds) return TimestampValidity::Expired;
  return TimestampValidity::Valid;
}

}  // namespace smartfarm::commands
