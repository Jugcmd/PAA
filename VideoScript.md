# GreenOffice — 5-Minute Video Script

---

## [0:00 – 0:35] Opening — The Problem

_Screen: browser at login page, app not yet signed in_

> "Modern offices generate enormous amounts of environmental data — CO₂ levels, temperature, humidity — but most of that data goes unread until someone complains or HVAC costs spike. GreenOffice is a real-time environmental monitoring dashboard I built for my organisation to turn that raw IoT telemetry into clear, actionable intelligence for both facilities managers and everyday occupants. I'll walk through the full application in the next five minutes."

_Click the Facilities Manager demo card to fill credentials, then click Sign in_

> "I'll start as the facilities manager. The application supports two distinct roles with different levels of access."

---

## [0:35 – 1:25] Dashboard

_Screen: Dashboard, welcome banner visible_

> "The first thing a new user sees is this onboarding banner, which explains the colour language — green is healthy, amber needs attention, red is critical — so no prior knowledge is needed to interpret the interface. I'll dismiss it now as a returning user."

_Dismiss the banner_

> "The four KPI cards at the top reflect live averages across all monitored rooms. Each one responds dynamically — CO₂ shows a warning hint if we're above the configured threshold, and the card itself turns amber. Same for temperature and humidity — these aren't static labels."

_Point to the room status cards grid_

> "Below that, each room card shows sustainability score, live temperature, humidity, and CO₂. CO₂ turns amber at the attention threshold and red at critical — consistent colouring everywhere in the application, so staff always know what level of urgency they're looking at."

_Point to the 'View Alerts' CTA_

> "The alert count here routes directly to the alerts page. Let's go there now."

---

## [1:25 – 2:10] Alerts Page

_Screen: Alerts page_

> "Active alerts are filtered by severity. The stat cards at the top show a live count — critical, attention, and acknowledged. Each alert expands to show all three metrics and, crucially, a tailored recommendations panel. If CO₂ is critically high the recommendation is to evacuate non-essential staff and open windows — specific, actionable language."

_Show the filter toggle: switch to Critical only_

> "I can filter to critical alerts only if I need to prioritise."

_Scroll to Acknowledge All button, click it with a critical alert present_

> "When I acknowledge all alerts and there are active criticals, the application shows an inline confirmation — no browser popup, everything stays within the design — to make sure I'm intentionally silencing something urgent."

_Click Confirm_

> "Acknowledged alerts move to a separate section and will automatically resurface if conditions worsen."

---

## [2:10 – 2:50] Rooms Page

_Screen: Rooms page, expand one room with attention or critical status_

> "The Rooms page gives a room-by-room breakdown. Expanding a room shows the exact reason an alert was triggered — for example 'CO₂ at 1,240 ppm, target below 900 ppm' — along with a live CO₂ trend chart for the current session. Every metric hint reflects the thresholds that are actually configured, not hardcoded values — I'll show that in a moment."

---

## [2:50 – 3:25] Analytics Page

_Screen: Analytics page, switch between rooms and metrics_

> "The Analytics page provides historical trending across all four rooms. I can select temperature, humidity, CO₂, or the composite sustainability score, and filter by the last hour, three hours, or all session data."

_Click Compare Rooms toggle_

> "Compare mode overlays all four rooms on one chart — useful for spotting which room is consistently the worst performer."

_Scroll to the Forecast Panel_

> "Below the chart, a linear trend panel projects where CO₂ is heading based on the current session trajectory. This is the kind of forward intelligence that allows a manager to intervene before an alert fires, not after."

---

## [3:25 – 4:05] Scenario Planner + Configurable Thresholds

_Screen: Scenario Planner_

> "The Scenario Planner is manager-only. I can apply presets — Summer Heatwave, Green Mode, Crowded Event — and each card shows projected CO₂, comfort, and sustainability before I commit. CO₂ projection turns amber at the attention threshold and red if it would breach the critical threshold."

_Apply the Heatwave preset, observe live table change. Then navigate to Settings._

> "Alert Thresholds is also manager-only. I can adjust all ten thresholds — CO₂, temperature, humidity, each with attention and critical tiers — using sliders with CIBSE and WELL Building Standard references. The application validates ordering — attention can't exceed critical — and every single colour and hint across the entire app updates immediately."

_Change CO₂ attention slider slightly, navigate back to Dashboard to show hint text updated_

---

## [4:05 – 4:30] Reports + Occupant Role

_Screen: Reports page, manager view_

> "Reports shows a room performance table, session audit log of every manager action, and a CSV export for analysis in Excel or BI tools."

_Click Sign out, sign in as Occupant_

> "Switching to the occupant role — the Scenario Planner and Alert Thresholds pages are hidden entirely. Reports shows a simplified occupant summary with clear plain-language advice. The sidebar badge still shows active alert count so occupants know something requires their attention even without access to the full alert detail."

---

## [4:30 – 5:00] Closing

_Screen: Dashboard as Occupant_

> "GreenOffice demonstrates how IoT sensor telemetry can be surfaced meaningfully for two very different audiences. The architecture uses a React TypeScript frontend with a live simulation engine feeding a real ASP.NET backend with SQLite persistence — giving it genuine extensibility for production IoT integration. Every design decision was made to ensure the application is self-explanatory with no prior knowledge required — which is the measure I held myself to throughout development. Thank you."

---

**Total approximate runtime: 4 min 45 sec – 5 min 00 sec**

## Recording Tips

- Start the simulation engine before recording so rooms already have data and at least one alert is active — the demo is flat without live colour differences
- Manually inject a reading (Scenario Planner → Inject reading) if you need to force a critical alert before demonstrating Acknowledge All
- Record at 1920×1080, zoom browser to 110% so text is legible in the recording
- Keep the sidebar visible throughout — the alert badge count changing live is a strong visual
