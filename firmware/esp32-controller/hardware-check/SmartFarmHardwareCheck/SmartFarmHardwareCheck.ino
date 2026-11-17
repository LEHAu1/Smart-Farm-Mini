#include <DHT.h>

// Wiring from the user's assembled demo diagram. This is a sensor-only
// diagnostic sketch: it never configures or writes GPIO26 (relay input).
constexpr uint8_t SoilAnalogPin = 34;
constexpr uint8_t DhtDataPin = 4;
constexpr uint8_t FloatSwitchPin = 27;
// User observed the float's water-level meaning is inverted: an open contact
// indicates water present, while a closed contact indicates low/no water.
// Change this to true if physical testing shows the opposite for this float.
constexpr bool FloatClosedMeansWaterPresent = false;
constexpr uint32_t SampleIntervalMs = 2000;
constexpr uint8_t SoilSamples = 8;

DHT dht(DhtDataPin, DHT11);
uint32_t lastSampleAt = 0;

uint16_t readSoilAdcAverage() {
  uint32_t sum = 0;
  for (uint8_t sample = 0; sample < SoilSamples; ++sample) {
    sum += analogRead(SoilAnalogPin);
    delay(5);
  }
  return static_cast<uint16_t>(sum / SoilSamples);
}

void printNullableFloat(float value, uint8_t decimals) {
  if (isnan(value)) {
    Serial.print("null");
  } else {
    Serial.print(value, decimals);
  }
}

void setup() {
  Serial.begin(115200);
  analogReadResolution(12);
  pinMode(FloatSwitchPin, INPUT_PULLUP);
  dht.begin();

  Serial.println();
  Serial.println("Smart Farm Mini hardware check (sensor-only)");
  Serial.println("Format: soilAdcRaw, floatContactClosed, waterPresent, airTemperatureC, airHumidityPercent");
  Serial.println("GPIO26 relay is intentionally not configured; no pump command is available.");
}

void loop() {
  const uint32_t now = millis();
  if (now - lastSampleAt < SampleIntervalMs) return;
  lastSampleAt = now;

  const uint16_t soilAdcRaw = readSoilAdcAverage();
  // With INPUT_PULLUP and the switch wired to GND, LOW means the contacts
  // are closed. The separate waterPresent mapping accounts for the observed
  // float polarity and can be changed above if physical testing differs.
  const bool floatContactClosed = digitalRead(FloatSwitchPin) == LOW;
  const bool waterPresent = floatContactClosed == FloatClosedMeansWaterPresent;
  const float airTemperatureC = dht.readTemperature();
  const float airHumidityPercent = dht.readHumidity();

  Serial.print("{\"soilAdcRaw\":");
  Serial.print(soilAdcRaw);
  Serial.print(",\"floatContactClosed\":");
  Serial.print(floatContactClosed ? "true" : "false");
  Serial.print(",\"waterPresent\":");
  Serial.print(waterPresent ? "true" : "false");
  Serial.print(",\"airTemperatureC\":");
  printNullableFloat(airTemperatureC, 1);
  Serial.print(",\"airHumidityPercent\":");
  printNullableFloat(airHumidityPercent, 1);
  Serial.println("}");
}
