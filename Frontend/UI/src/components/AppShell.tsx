import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Dashboard from "@mui/icons-material/Dashboard";
import NotificationsActive from "@mui/icons-material/NotificationsActive";
import Analytics from "@mui/icons-material/AnalyticsOutlined";
import Rooms from "@mui/icons-material/MeetingRoom";
import Report from "@mui/icons-material/DescriptionOutlined";
import Science from "@mui/icons-material/ScienceOutlined";
import Tune from "@mui/icons-material/Tune";
import SpaIcon from "@mui/icons-material/Spa";
import Logout from "@mui/icons-material/LogoutOutlined";
import PlayArrow from "@mui/icons-material/PlayArrow";
import Pause from "@mui/icons-material/Pause";

import { useAuth } from "../auth/AuthContext";
import { useMonitoring } from "../monitoring/MonitoringContext";

interface NavItemDef {
  to: string;
  label: string;
  icon: React.ReactNode;
  managerOnly?: boolean;
}

const NAV_ITEMS: NavItemDef[] = [
  { to: "/dashboard", label: "Dashboard", icon: <Dashboard /> },
  { to: "/alerts", label: "Alerts", icon: <NotificationsActive /> },
  { to: "/analytics", label: "Analytics", icon: <Analytics /> },
  { to: "/rooms", label: "Rooms", icon: <Rooms /> },
  { to: "/reports", label: "Reports", icon: <Report /> },
  {
    to: "/simulate",
    label: "Scenario Planner",
    icon: <Science />,
    managerOnly: true,
  },
  {
    to: "/settings",
    label: "Alert Thresholds",
    icon: <Tune />,
    managerOnly: true,
  },
];

export const AppShell = () => {
  const { user, logout } = useAuth();
  const {
    dataSource,
    isRunning,
    isStaleData,
    lastReadingTimestampIso,
    setIsRunning,
    state,
    activeScenarioLabel,
  } = useMonitoring();
  const navigate = useNavigate();

  const visibleNav = NAV_ITEMS.filter(
    (item) => !item.managerOnly || user?.role === "FacilitiesManager",
  );
  const alertCount = state.attentionAlerts.length;
  const isReadOnly = user?.role === "Occupant";

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__brand">
          <div className="sidebar__logo" aria-hidden="true">
            <SpaIcon sx={{ fontSize: "1.8rem", color: "var(--accent)" }} />
          </div>
          <div className="sidebar__brand-text">
            <span className="sidebar__brand-name">GreenOffice</span>
            <span className="sidebar__brand-tagline">
              Environmental Monitor
            </span>
          </div>
        </div>

        <nav className="sidebar__nav" aria-label="Main navigation">
          {visibleNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar__link${isActive ? " sidebar__link--active" : ""}`
              }
            >
              <span className="sidebar__link-icon" aria-hidden="true">
                {React.cloneElement(item.icon as React.ReactElement<any>, {
                  sx: { fontSize: "1.3rem" } as any,
                })}
              </span>
              <span>{item.label}</span>
              {item.to === "/alerts" && alertCount > 0 && (
                <span className="sidebar__badge">{alertCount}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar__footer">
          <div className="sidebar__user">
            <div className="sidebar__avatar" aria-hidden="true">
              {user?.avatarInitials}
            </div>
            <div className="sidebar__user-info">
              <span className="sidebar__user-name">{user?.name}</span>
              <span className="sidebar__user-role">
                {user?.role === "FacilitiesManager"
                  ? "Facilities Manager"
                  : "Occupant"}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="sidebar__logout-btn"
            onClick={handleLogout}
            title="Sign out"
            aria-label="Sign out"
          >
            <Logout sx={{ fontSize: "1.3rem" }} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar__left">
            <div
              className={`stream-indicator${isRunning ? " stream-indicator--live" : ""}`}
            >
              <span className="stream-indicator__dot" aria-hidden="true" />
              {isRunning ? "Live" : "Paused"}
            </div>
            {activeScenarioLabel && (
              <span className="scenario-active-pill">
                Scenario: {activeScenarioLabel}
              </span>
            )}
            {isStaleData && (
              <span className="stale-pill">Data may be stale</span>
            )}
            {lastReadingTimestampIso && (
              <span className="topbar__timestamp" aria-live="polite">
                Updated {new Date(lastReadingTimestampIso).toLocaleTimeString()}
              </span>
            )}
          </div>
          <div className="topbar__right">
            {isReadOnly && (
              <span className="readonly-pill">Read-only role</span>
            )}
            <span className={`source-badge source-badge--${dataSource}`}>
              {dataSource === "api" ? "API + SQLite" : "Local mode"}
            </span>
            <button
              type="button"
              className="topbar__stream-btn"
              onClick={() => setIsRunning(!isRunning)}
              title={isRunning ? "Pause data stream" : "Resume data stream"}
              aria-label={
                isRunning ? "Pause data stream" : "Resume data stream"
              }
            >
              {isRunning ? (
                <Pause sx={{ fontSize: "1.2rem" }} />
              ) : (
                <PlayArrow sx={{ fontSize: "1.2rem" }} />
              )}
            </button>
          </div>
        </header>

        <main className="page-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
