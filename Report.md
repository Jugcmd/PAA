# GreenOffice: A Role-Differentiated Environmental Monitoring Application

**Module:** Programming and Application Development  
**Level:** 7  
**Term:** January 2026

---

## Contents

1. [Introduction](#1-introduction)
2. [Requirements Analysis](#2-requirements-analysis)
3. [Architecture and Design](#3-architecture-and-design)
4. [UI/UX Design Principles](#4-uiux-design-principles)
5. [IoT Integration](#5-iot-integration)
6. [Future Developments](#6-future-developments)
7. [Conclusion](#7-conclusion)
8. [References](#8-references)

---

## 1. Introduction

Most commercial offices rely on annual HVAC service reports and reactive occupant complaints to identify environmental problems. The Carbon Trust (2011) estimates uncontrolled HVAC accounts for up to 40% of a building's energy consumption, and elevated CO₂ has been empirically linked to measurable cognitive decline (Allen et al., 2016), yet no statutory indoor temperature minimum exists for offices (HSE, 2021).

GreenOffice aggregates real-time CO₂, temperature, humidity, and occupancy data across four office zones through a role-differentiated interface: facilities managers receive full diagnostic and configuration access; occupants receive plain-language situational awareness. This report defends the architectural decisions, evaluates the gap to production, and considers IoT integration.

GreenOffice was initially conceived as a single shared dashboard. Consultation with the facilities team revealed this as a design defect — exposing threshold configuration to occupants creates confusion rather than clarity. That discovery shaped the architecture described throughout. Formative feedback reinforced this, identifying the need for requirements analysis before technology discussion — a structural revision that substantially improved analytical rigour.

---

## 2. Requirements Analysis

Functional and non-functional requirements were derived through engagement with the facilities team and grounded in standards. CIBSE Guide A (2015) recommends indoor CO₂ below 1,000 ppm; WELL v2 prescribes 19–27°C and 30–60% humidity (IWBI, 2020). Using recognised professional bodies gives thresholds institutional legitimacy and an evidence base for justifying HVAC policy.

Six functional requirements were derived:

| ID  | Requirement                                                                                             |
| --- | ------------------------------------------------------------------------------------------------------- |
| FR1 | Monitor CO₂, temperature, humidity, and occupancy per room in real time                                 |
| FR2 | Classify each reading against configurable attention and critical thresholds                            |
| FR3 | Permit facilities managers to modify thresholds without code changes                                    |
| FR4 | Provide role-appropriate views: full diagnostic access for managers, simplified summaries for occupants |
| FR5 | Enable pre-implementation scenario modelling of HVAC configurations                                     |
| FR6 | Provide historical trend analysis and forward CO₂ trajectory forecasting                                |

Non-functional requirements included zero-training usability (Nielsen, 1994), strict TypeScript typing, and a modular monorepo structure. Sommerville (2016) argues requirements elicitation is the most defect-expensive phase to skip — borne out here: FR4 was absent from the initial draft. Role-differentiation emerged only through structured consultation; had technology selection preceded that conversation, the Context structure, routing guards, and visibility logic would have been built for the wrong problem.

---

## 3. Architecture and Design

### 3.1 Frontend Architecture

The frontend uses React 19 and TypeScript 5.9 strict mode, bundled by Vite 8. React was evaluated against Vue.js and Angular: Angular's module system would have introduced ceremony disproportionate to a single-team prototype; Vue's optional typing was judged insufficient for safety-critical threshold classification logic, where an untyped value passed to a comparison function could silently produce an incorrect alert level. React's hook model directly supported a custom `useEnvironmentalMonitor` hook encapsulating all sensor state, threshold persistence, and alert classification.

The codebase is a **pnpm workspace monorepo**: `UI/` (application shell), `Components/` (pure utilities: `average`, `clamp`, `roundTo`), and `Types/` (shared interfaces). Mirroring the micro-frontend boundary pattern (Fowler, 2019), `Components/` has no React or DOM dependency, making it testable in isolation. State is managed via React Context rather than Redux or Zustand — the single coherent data domain carries no cross-cutting async side-effects that would justify Redux's indirection; migration to Zustand as the application grows would be localised to the hook.

The threshold system is the most architecturally significant feature. Configuration is persisted in `localStorage`, initialised with a safe merge fallback against `DEFAULT_THRESHOLDS` to preserve upgrade safety when new threshold keys are added:

```typescript
// hooks/useEnvironmentalMonitor.ts
const [thresholds, setThresholdsState] = useState<AlertThresholds>(() => {
  try {
    const saved = localStorage.getItem(THRESHOLDS_KEY);
    return saved
      ? {
          ...DEFAULT_THRESHOLDS,
          ...(JSON.parse(saved) as Partial<AlertThresholds>),
        }
      : DEFAULT_THRESHOLDS;
  } catch {
    return DEFAULT_THRESHOLDS;
  }
});
```

This lazy initialisation is consistent with the Offline First principle (Kleppmann, 2017). The `updateThresholds` function merges and persists atomically in a single state setter, preventing intermediate inconsistent renders:

```typescript
updateThresholds: (patch: Partial<AlertThresholds>) => {
  setThresholdsState((prev) => {
    const next = { ...prev, ...patch };
    localStorage.setItem(THRESHOLDS_KEY, JSON.stringify(next));
    return next;
  });
},
```

The alert classification function demonstrates the **Strategy pattern** (Gamma et al., 1994): the threshold object is a parameter, not a module-level singleton, making the algorithm configurable at runtime and testable with arbitrary boundary values:

```typescript
// data/simulator.ts
const inferAlertLevel = (
  temperatureC: number,
  humidityPct: number,
  co2Ppm: number,
  t: AlertThresholds = DEFAULT_THRESHOLDS,
): AlertLevel => {
  const critical =
    temperatureC < t.tempMinCriticalC ||
    temperatureC > t.tempMaxCriticalC ||
    humidityPct < t.humidityMinCritical ||
    humidityPct > t.humidityMaxCritical ||
    co2Ppm > t.co2CriticalPpm;
  if (critical) return "critical";

  const attention =
    temperatureC < t.tempMinAttentionC ||
    temperatureC > t.tempMaxAttentionC ||
    humidityPct < t.humidityMinAttention ||
    humidityPct > t.humidityMaxAttention ||
    co2Ppm > t.co2AttentionPpm;
  if (attention) return "attention";

  return "normal";
};
```

Passing `t` explicitly aligns with dependency inversion (Martin, 2017) and enables inline threshold construction in tests without mocking. Boundary conditions are the highest-risk logic — a one-unit CO₂ difference determines whether an alert fires — so testability was treated as an architectural constraint. A full test suite was not written due to timeline constraints; a testable architecture can be covered retrospectively, whereas one that conflates side effects with domain logic requires structural changes before tests become reliable. Prioritising testable design over implemented tests was intentional but would be reversed first in a production cycle, as the formative feedback identified.

The `AlertLevel` type is a string union (`'normal' | 'attention' | 'critical'`): the compiler statically verifies every conditional expression handles all three states exhaustively. The `AlertThresholds` interface replaces magic numbers with named typed fields — a hardcoded `900` becomes `t.co2AttentionPpm` — making incorrect threshold wiring a compile-time error rather than a silent runtime defect. TypeScript strict mode was an architectural decision with measurable safety benefits.

An `ErrorBoundary` class component implements the **Bulkhead pattern** (Nygard, 2018): isolating failure within a bounded container prevents a single unexpected data shape from cascading to render the entire application unusable — critical in a monitoring context where a sensor data anomaly must never leave a manager without dashboard access. The UI employs a **design token system** via CSS custom properties (`--accent`, `--critical`, `--warn`, `--muted`) rather than Tailwind or MUI: this provides full control over the three-tier colour language without inheriting semantic conventions from a third-party design system that would conflict with the environmental alert context.

### 3.2 Backend Architecture

The backend is ASP.NET Core 8 with SQLite via Entity Framework Core. SQLite was chosen over PostgreSQL for prototype portability — no external infrastructure, embedded in the server process. This is an acknowledged trade-off: SQLite's file-locking model is unsuitable for concurrent write workloads at scale, and PostgreSQL migration is the first backend task in Section 6. The frontend includes a **data source abstraction layer**: if the API is unreachable, the application falls back to a client-side simulation engine and surfaces a "stale data" indicator — the **graceful degradation** pattern (Nygard, 2018) ensuring the prototype remains demonstrable in disconnected environments.

### 3.3 System Architecture

```
┌──────────────────────────────────────────────────────────┐
│                   Browser (React SPA)                    │
│  ┌──────────────┐  ┌─────────────────┐  ┌────────────┐  │
│  │  Page Layer  │  │ MonitoringContext│  │ AuthContext │  │
│  └──────┬───────┘  └────────┬────────┘  └─────┬──────┘  │
│         └───────────────────┴──────────────────┘         │
│                             │                            │
│                  useEnvironmentalMonitor                 │
│                       ┌─────┴──────┐                    │
│                API ok? │            │ API unreachable    │
│               ┌────────▼───┐  ┌────▼────────────┐       │
│               │  API Layer │  │ Simulation Engine│       │
│               └────────┬───┘  └─────────────────┘       │
└────────────────────────┼─────────────────────────────────┘
                         │ HTTP / REST
              ┌──────────▼──────────────┐
              │   ASP.NET Core 8 API    │
              │  ┌───────────────────┐  │
              │  │ SQLite (EF Core)  │  │
              │  └───────────────────┘  │
              └─────────────────────────┘
```

---

## 4. UI/UX Design Principles

Norman's (2013) principle of **affordance** guided every interface decision. The three-tier colour language (green: healthy, amber: attention, red: critical) is introduced via a sessionStorage-backed onboarding banner and applied without exception across dashboard metric cards, alert badges, CO₂ values in tables, and scenario projection cells — meaning a user with no environmental monitoring background can interpret any screen state without documentation.

The two-role model enforces Nielsen's (1994) heuristic of **match between system and the real world**: occupants see plain-language summaries and are never presented with threshold configuration or scenario planning controls, because those tasks carry no operational meaning in their context. Role-differentiated routing is enforced at both shell level (conditional navigation items) and via route guards (`SettingsGuard`, `SimulateGuard`) that redirect unauthorised attempts — removing confusion at source rather than through disabled controls.

The inline acknowledgement panel — replacing `window.confirm()` — exemplifies **error prevention**: it surfaces only when critical alerts are present, forcing deliberate confirmation before silencing high-priority notifications. It renders as an in-DOM element with `role="alertdialog"` and ARIA labelling per WCAG 2.1 AA (W3C, 2018). Every interactive element carries explicit `aria-label` or `role` annotations — a non-negotiable requirement for any system in a regulated environment.

---

## 5. IoT Integration

A production GreenOffice deployment would replace the simulation engine with Sensirion SCD40 CO₂/temperature/humidity modules on ESP32 microcontrollers publishing to AWS IoT Core or Azure IoT Hub (Ashton, 2009).

MQTT was selected over alternatives after deliberate evaluation. AMQP overhead is inappropriate for RAM-constrained embedded devices. CoAP lacks the broker ecosystem MQTT enjoys. HTTP polling does not scale to hundreds of nodes. MQTT's QoS levels allow per-message trade-offs: comfort readings use QoS 0; critical breaches warrant QoS 2 (exactly-once delivery), ensuring no alert-triggering reading is silently lost (Banks and Gupta, 2019). A node losing WiFi must not discard readings: the ESP32's flash buffers hours of data in a circular write strategy, replaying on reconnection — the **store-and-forward** pattern, essential for analytics integrity. OTA firmware updates via AWS IoT Jobs or Azure Device Update (with rollback on failure) are operationally underestimated at scale (Guth et al., 2016).

BACnet (ISO 16784-1), the dominant BMS protocol, is natively supported by most enterprise HVAC controllers (ASHRAE, 2016). A fully integrated deployment would read from BACnet sensors and write actuation commands back to variable-speed fans, completing the sense–analyse–act loop inside existing infrastructure.

Edge computing is a hard constraint, not a preference. A 200–800 ms cloud round-trip is unacceptable for critical CO₂ breaches; the ESP32 runs `inferAlertLevel` locally and triggers a GPIO relay in milliseconds, while the cloud handles aggregation and display (Microsoft, 2023).

This substitution is architecturally anticipated. The `dataSource` flag in `useEnvironmentalMonitor` switches between API-backed and simulated modes; MQTT-over-WebSocket replaces only the data ingestion layer. This is the **ports and adapters** pattern (Evans, 2003): IoT transport is an adapter on a defined port. McKinsey Global Institute (2015) estimates IoT in commercial buildings could generate $100–$300 billion annually — a return GreenOffice is positioned to contribute to through its Scenario Planner.

---

## 6. Future Developments

**Real sensor integration** is the most substantive gap: hardware procurement, ESP32 firmware, MQTT broker with TLS mutual authentication, and validation against BS EN 13779:2007 (BSI, 2007). Estimated effort for a four-room pilot: three to four months.

**Authentication hardening** is the primary security priority. Role data in `sessionStorage` does not withstand adversarial access. Production requires server-side session validation, OAuth 2.0/OIDC integration (most likely Azure Active Directory), and row-level API security per the OWASP API Security Top 10 (OWASP, 2023).

**Backend scalability** requires migrating from SQLite to PostgreSQL with TimescaleDB, providing hypertable partitioning on `recorded_at` and significantly faster analytical queries (Timescale, 2023). PgBouncer connection pooling would support concurrent peak-occupancy consumers.

**Automated testing** is absent. Required: unit tests for all `inferAlertLevel` boundary conditions, API integration tests, and Playwright end-to-end tests for the alert acknowledgement lifecycle. The Strategy pattern means classification tests need no mocking.

**Push alerting** must extend beyond the browser session — a critical CO₂ breach generates no escalation if no user is logged in. Production requires web push via the Notifications API or SMS via Twilio.

**Data governance** is mandatory. Occupancy percentages can constitute personal data under UK GDPR in low-headcount rooms (ICO, 2021), requiring a DPIA, data minimisation policies, configurable retention with automated purging, and DPO registration.

**CI/CD** requires a GitHub Actions pipeline executing type-checking, linting, and tests before deploying a Docker image built via a multi-stage Dockerfile that separates the build and runtime layers (Docker, 2023).

**Observability** requires Azure Application Insights or OpenTelemetry providing distributed tracing and proactive alerting when the ingestion endpoint fails — itself a safety-relevant signal indicating sensor connectivity loss.

---

## 7. Conclusion

GreenOffice demonstrates that a well-architected prototype can meaningfully address a real organisational problem within a constrained timeline. The threshold parameterisation system — threading live configuration through every classification function, UI colour decision, and recommendation string — reflects a commitment to internal consistency that distinguishes it from a superficially functional prototype. The role-differentiated interface, graceful API fallback, inline confirmation patterns, and ARIA annotations collectively reflect design discipline informed by established UX research.

The hardest decisions were not technical but contextual. Surfacing a stale data indicator, replacing `window.confirm()` with an inline ARIA dialog, and validating threshold ordering before persisting — none required sophisticated engineering, but each required modelling the expectations of a real user under pressure. That understanding came from domain consultation, not technical research. In a future iteration, automated testing would be introduced from day one: the absence of a test suite was the single largest constraint on development confidence, and the Strategy pattern on `inferAlertLevel` was a deliberate acknowledgement of that debt.

The path to production is tractable. Ports-and-adapters means IoT integration is additive. The prototype's value is the validated design: it proves the concept, surfaces UX requirements, and de-risks production investment.

---

## 8. References

Allen, J.G. et al. (2016) 'Associations of cognitive function scores with carbon dioxide, ventilation, and volatile organic compound exposures in office workers', _Environmental Health Perspectives_, 124(6), pp. 805–812. https://doi.org/10.1289/ehp.1510037

ASHRAE (2016) _ANSI/ASHRAE Standard 135-2016: BACnet — A Data Communication Protocol for Building Automation and Control Networks_. Atlanta: American Society of Heating, Refrigerating and Air-Conditioning Engineers.

Ashton, K. (2009) 'That "Internet of Things" thing', _RFID Journal_, 22(7), pp. 97–114.

Banks, A. and Gupta, R. (eds.) (2019) _MQTT Version 5.0_. OASIS Standard. Available at: https://docs.oasis-open.org/mqtt/mqtt/v5.0/mqtt-v5.0.html (Accessed: 3 May 2026).

BSI (2007) _BS EN 13779:2007: Ventilation for non-residential buildings — Performance requirements for ventilation and room-conditioning systems_. London: British Standards Institution.

Carbon Trust (2011) _Heating, ventilation and air conditioning: How to improve performance_. London: Carbon Trust. Available at: https://www.carbontrust.com (Accessed: 3 May 2026).

CIBSE (2015) _CIBSE Guide A: Environmental Design_. 8th edn. London: Chartered Institution of Building Services Engineers.

Docker (2023) _Multi-stage builds_. Available at: https://docs.docker.com/build/building/multi-stage/ (Accessed: 3 May 2026).

Evans, E. (2003) _Domain-Driven Design: Tackling Complexity in the Heart of Software_. Boston: Addison-Wesley.

Fowler, M. (2019) _Micro Frontends_. Available at: https://martinfowler.com/articles/micro-frontends.html (Accessed: 3 May 2026).

Gamma, E. et al. (1994) _Design Patterns: Elements of Reusable Object-Oriented Software_. Boston: Addison-Wesley.

Gubbi, J. et al. (2013) 'Internet of Things (IoT): A vision, architectural elements, and future directions', _Future Generation Computer Systems_, 29(7), pp. 1645–1660. https://doi.org/10.1016/j.future.2013.01.010

Guth, J. et al. (2016) 'A detailed analysis of IoT platform architectures: Concepts, similarities, and differences', in _Proceedings of the 2016 IEEE International Conference on Internet of Things_. Piscataway: IEEE, pp. 1–8. https://doi.org/10.1109/iThings-GreenCom-CPSCom-SmartData.2016.46

HSE (2021) _Thermal Comfort in the Workplace_. Available at: https://www.hse.gov.uk/temperature/thermal/ (Accessed: 3 May 2026).

ICO (2021) _What is personal data?_ Information Commissioner's Office. Available at: https://ico.org.uk/for-organisations/uk-gdpr-guidance-and-resources/personal-information-what-is-it/ (Accessed: 3 May 2026).

IWBI (2020) _WELL Building Standard v2_. New York: International WELL Building Institute. Available at: https://v2.wellcertified.com (Accessed: 3 May 2026).

Kleppmann, M. (2017) _Designing Data-Intensive Applications_. Sebastopol: O'Reilly Media.

Martin, R.C. (2017) _Clean Architecture: A Craftsman's Guide to Software Structure and Design_. Boston: Prentice Hall.

McKinsey Global Institute (2015) _The Internet of Things: Mapping the Value Beyond the Hype_. McKinsey & Company. Available at: https://www.mckinsey.com (Accessed: 3 May 2026).

Microsoft (2023) _Azure IoT Reference Architecture_. Available at: https://learn.microsoft.com/en-us/azure/architecture/reference-architectures/iot (Accessed: 3 May 2026).

Nielsen, J. (1994) _Usability Engineering_. San Francisco: Morgan Kaufmann.

Norman, D. (2013) _The Design of Everyday Things_. Revised edn. New York: Basic Books.

Nygard, M.T. (2018) _Release It!: Design and Deploy Production-Ready Software_. 2nd edn. Raleigh: Pragmatic Bookshelf.

OWASP (2023) _OWASP API Security Top 10_. Available at: https://owasp.org/www-project-api-security/ (Accessed: 3 May 2026).

Sommerville, I. (2016) _Software Engineering_. 10th edn. Harlow: Pearson.

Timescale (2023) _TimescaleDB Documentation_. Available at: https://docs.timescale.com (Accessed: 3 May 2026).

W3C (2018) _Web Content Accessibility Guidelines (WCAG) 2.1_. Available at: https://www.w3.org/TR/WCAG21/ (Accessed: 3 May 2026).
