import { useState, useEffect } from "react";
import type { FormEvent } from "react";
import { getNotifications, markNotificationRead } from "./api/api";
import type { Notification } from "./api/api";
import { useAuth } from "./auth/AuthContext";
import { BuildingsPage } from "./pages/Buildings";
import { RoomsPage } from "./pages/Rooms";
import { BookingRequestsPage } from "./pages/BookingRequests";
import { BookingsPage } from "./pages/Bookings";
import { AvailabilityPage } from "./pages/Availability";
import { UsersPage } from "./pages/Users";
import { NotificationsPage } from "./pages/Notifications";
import { TimetablePage } from "./pages/Timetable";
import { SchedulePage } from "./pages/Schedule";

type PageKey = "buildings" | "rooms" | "bookingRequests" | "bookings" | "availability" | "users" | "notifications" | "timetable" | "schedule";

type NavEntry = {
  key: PageKey;
  label: string;
  icon: string;
  roles?: string[]; // if set, only show for these roles
};

const NAV_ITEMS: NavEntry[] = [
  { key: "buildings", label: "Buildings", icon: "🏢" },
  { key: "rooms", label: "Rooms", icon: "🚪" },
  { key: "availability", label: "Availability", icon: "🔍" },
  { key: "notifications", label: "Notifications", icon: "🔔" },
  { key: "bookingRequests", label: "Requests", icon: "📋" },
  { key: "schedule", label: "My Schedule", icon: "📆", roles: ["STUDENT", "FACULTY"] },
  { key: "timetable", label: "Timetables", icon: "🕒", roles: ["ADMIN", "STAFF"] },
  { key: "users", label: "Users", icon: "👥", roles: ["ADMIN"] },
];

function PageRenderer({ page }: { page: PageKey }) {
  switch (page) {
    case "buildings": return <BuildingsPage />;
    case "rooms": return <RoomsPage />;
    case "bookingRequests": return <BookingRequestsPage />;
    case "bookings": return <BookingsPage />;
    case "availability": return <AvailabilityPage />;
    case "users": return <UsersPage />;
    case "notifications": return <NotificationsPage />;
    case "timetable": return <TimetablePage />;
    case "schedule": return <SchedulePage />;
  }
}

function App() {
  const { user, login, logout } = useAuth();
  const [activePage, setActivePage] = useState<PageKey>("buildings");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Global Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    if (user) {
      void loadNotifications();
      const interval = setInterval(() => { void loadNotifications(); }, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  const loadNotifications = async () => {
    try {
      setNotifications(await getNotifications());
    } catch (e) {
      console.error("Failed to fetch notifications", e);
    }
  };

  const handleMarkRead = async (id: number) => {
    try {
      await markNotificationRead(id);
      await loadNotifications();
    } catch (e) {
      console.error(e);
    }
  };

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Login state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setAuthError("Email and password are required");
      return;
    }
    setAuthLoading(true);
    setAuthError(null);
    try {
      await login(trimmedEmail, password);
      setPassword("");
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setAuthLoading(false);
    }
  };

  // ——— Login screen ———
  if (!user) {
    return (
      <div className="login-page">
        <form className="login-card" onSubmit={handleLogin}>
          <h1>Room Booking System</h1>
          <p className="subtitle">Sign in to manage rooms and bookings</p>

          <div className="form-grid">
            <div className="form-field">
              <label htmlFor="loginEmail">Email</label>
              <input
                id="loginEmail"
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@university.edu"
                disabled={authLoading}
                autoFocus
              />
            </div>
            <div className="form-field">
              <label htmlFor="loginPassword">Password</label>
              <input
                id="loginPassword"
                className="input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={authLoading}
              />
            </div>
          </div>

          <button type="submit" className="btn btn-primary" disabled={authLoading}>
            {authLoading ? "Signing in…" : "Sign In"}
          </button>

          {authError && <div className="alert alert-error" style={{ marginTop: "var(--space-4)" }}>{authError}</div>}
        </form>
      </div>
    );
  }

  // ——— Authenticated shell ———
  const visibleNavItems = NAV_ITEMS.filter(
    (item) => !item.roles || item.roles.includes(user.role),
  );

  const initials = user.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="app-layout">
      {/* Mobile toggle */}
      <button
        type="button"
        className="sidebar-toggle"
        onClick={() => setSidebarOpen((o) => !o)}
        aria-label="Toggle navigation"
      >
        ☰
      </button>

      {/* Overlay for mobile */}
      <div
        className={`sidebar-overlay ${sidebarOpen ? "visible" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${sidebarOpen ? "open" : ""}`}>
        <div className="sidebar-brand">
          <h1>Room Booking</h1>
          <p>College Allocation System</p>
        </div>

        <nav className="sidebar-nav" aria-label="Primary navigation">
          {visibleNavItems.map((item) => (
            <button
              key={item.key}
              type="button"
              className={`nav-item ${activePage === item.key ? "active" : ""}`}
              onClick={() => {
                setActivePage(item.key);
                setSidebarOpen(false);
              }}
            >
              <span className="nav-icon">{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-badge">
            <div className="user-avatar">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user.name}</div>
              <div className="user-role">{user.role}</div>
            </div>
          </div>
          <button type="button" className="btn-logout" onClick={logout}>
            Sign Out
          </button>
        </div>
      </aside>

      {/* Page content */}
      <main className="main-area" style={{ display: "flex", flexDirection: "column" }}>

        {/* Top Navbar */}
        <header style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", padding: "1rem 2rem", background: "var(--surface)", borderBottom: "1px solid var(--border)", position: "relative" }}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={() => setShowNotifications(!showNotifications)}
              style={{ padding: "0.5rem", fontSize: "1.2rem", position: "relative" }}
              aria-label="Toggle notifications"
            >
              🔔
              {unreadCount > 0 && (
                <span className="badge badge-error" style={{ position: "absolute", top: 0, right: 0, borderRadius: "50%", padding: "0.15rem 0.4rem", fontSize: "0.7rem", transform: "translate(25%, -25%)" }}>
                  {unreadCount}
                </span>
              )}
            </button>
            {showNotifications && (
              <div className="card shadow-lg" style={{ position: "absolute", top: "calc(100% + 0.5rem)", right: 0, width: "320px", zIndex: 100, padding: 0, overflow: "hidden" }}>
                <div style={{ padding: "1rem", borderBottom: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h4 style={{ margin: 0 }}>Notifications</h4>
                </div>
                {notifications.length === 0 ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--text-muted)" }}>You're all caught up!</div>
                ) : (
                  <div style={{ maxHeight: "350px", overflowY: "auto" }}>
                    {notifications.slice(0, 5).map(n => (
                      <div key={n.id} style={{ padding: "1rem", borderBottom: "1px solid var(--surface-100)", background: n.isRead ? "transparent" : "var(--surface-50)" }}>
                        <div style={{ fontWeight: n.isRead ? "normal" : "600", fontSize: "0.9rem", color: "var(--text)" }}>{n.message}</div>
                        <div style={{ marginTop: "0.5rem", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                          <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{new Date(n.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}</span>
                          {!n.isRead && (
                            <button className="btn btn-ghost btn-sm" onClick={() => void handleMarkRead(n.id)} style={{ padding: "0.2rem 0.5rem", fontSize: "0.75rem" }}>
                              Mark Read
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                    {notifications.length > 5 && (
                      <div style={{ padding: "0.5rem", textAlign: "center", background: "var(--surface-50)", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                        +{notifications.length - 5} older notifications
                      </div>
                    )}
                    <button className="btn btn-ghost" style={{ width: "100%", borderRadius: 0, padding: "0.75rem", borderTop: "1px solid var(--border)", fontWeight: "bold" }} onClick={() => { setShowNotifications(false); setActivePage("notifications"); }}>
                      View Full Inbox
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Dynamic Page Router */}
        <div style={{ padding: "2rem", overflowY: "auto", flex: 1 }}>
          <PageRenderer page={activePage} />
        </div>
      </main>
    </div>
  );
}

export default App;
