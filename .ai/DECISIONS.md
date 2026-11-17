# Decisions and Constraints

## Confirmed

1. **Working branch:** Continue on `develop` as explicitly requested earlier. Do not commit or push. This also means no PR/merge action.
2. **Requirement sources:** No separate SRS/use-case document exists in the discovered repository. Use repository documentation and GitHub issue acceptance criteria; record conflicts instead of inventing behavior.
3. **First implementation slice:** SF-8 is the highest-priority independent open software task found. Its issue explicitly requests sensor/device status, responsive UI and mock data. Keep samples visibly marked as demo data.
4. **No hardware side effects:** No pump/relay/ESP32/CAM activation. No MQTT broker connection for this UI task.
5. **No destructive database work:** SQL Server is unavailable in the current local environment. Do not apply migrations or alter persistent data.
6. **Mock/live distinction:** Static UI sample values are demonstration data only. Do not label them as live or wire them to an unverified API.
7. **UI visual language:** Follow `docs/design/stitch_smart_farm_mini_web_ui/agrisense_mini/DESIGN.md` where it matches the issue: Be Vietnam Pro, green primary, water-blue accents, readable metric cards and mobile single-column layout.
8. **Task state discipline:** Only mark tasks `DONE` after their acceptance criteria have test evidence and independent verification. Keep hardware/environment checks `BLOCKED` or `NOT VERIFIED` as appropriate.
9. **Frontend auth storage for AUTH-FE:** Use `sessionStorage` for the tab-scoped access/refresh-token session because the documented API returns both tokens to the SPA and the local login requirement includes session persistence. Do not use `localStorage`; clear tokens on logout or failed refresh. This is a prototype decision, not a claim that browser-readable tokens provide an XSS boundary.
10. **No unverified actuator firmware:** Do not retain pump-control code that assumes relay polarity or omits the documented maximum pump runtime. A transient actuator sketch was removed; the retained sensor-only diagnostic sketch never configures GPIO26 and is not counted as production firmware or hardware verification.
11. **As-built demo vs target:** Use the user's diagram as the reported demo hardware: YL-38/YL-69, DHT11, float, relay 5V and pump 5V on GPIO34/4/27/26 respectively. Keep the README's DHT22/capacitive sensor/DS18B20/OLED as target design requirements; do not fabricate water-temperature telemetry or claim SF-11 acceptance with DHT11.
12. **Sensor-only first firmware step:** Add a diagnostic sketch that reads the actual diagrammed sensors but never drives GPIO26. Pump control remains out until relay trigger polarity, float orientation/fail state, and pump current are confirmed.
13. **Reported actuator details:** User identifies the relay element as SRD-05VDC-SL-C; pump product listing says 200mA. The relay marking identifies the 5V coil/contact family, not the trigger polarity of the module PCB. Treat 200mA as a listing value, not measured start/stall current. Keep pump control disabled until the module IN polarity and real startup behavior are established.
14. **User-reported hardware validation:** User now reports the assembled ESP32 setup was physically tested and runs stably, and supplied sensor serial output. Record that as user-reported hardware evidence; do not state relay/pump current or activation details that were not specified. `soilAdcRaw` remains 4095 in the supplied samples, so soil-moisture measurement is still unresolved. The diagnostic sketch maps open float contact to `waterPresent=true` per the user's reversed-value observation while preserving raw contact state.

## Open decisions

- SQL Server/broker test environment and credentials/ACL are not configured. These are needed for database and MQTT end-to-end acceptance.
- Firmware pin assignments and verified circuit wiring must be confirmed before writing hardware-specific behavior.
- SQL-backed authentication and refresh-token rotation need a configured disposable SQL Server; unit tests alone do not verify this runtime path.
