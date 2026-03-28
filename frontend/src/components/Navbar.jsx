import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

import logo from "../assets/images/logo.png";
import openIcon from "../assets/images/icons/open.svg"; 
import closeIcon from "../assets/images/icons/close.svg";

export default function Navbar() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const tabWrapRef = useRef(null);
  const pillRef = useRef(null);

  const items = useMemo(
    () => [
      { key: "dashboard", label: "Dashboard", to: "/dashboard" },
      { key: "schedule", label: "Schedule", to: "/schedule" },
      { key: "tasks", label: "Tasks", to: "/tasks" },
      { key: "progress", label: "Progress", to: "/progress" },
      { key: "notes", label: "Notes", to: "/notes" },
      { key: "habits", label: "Habits", to: "/habits" },
      { key: "achievements", label: "Achievements", to: "/achievements" },
    ],
    []
  );

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  useEffect(() => {
    setMobileOpen(false);
    setProfileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    const onDown = (e) => {
      if (!e.target.closest?.("[data-profile-dropdown]")) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const activeIndex = useMemo(() => {
    const path = location.pathname;
    const idx = items.findIndex((it) => path === it.to || path.startsWith(it.to + "/"));
    return idx >= 0 ? idx : 0;
  }, [items, location.pathname]);

  const syncPillToEl = (el) => {
    const pill = pillRef.current;
    if (!pill || !el) return;

    pill.style.transform = `translate(${el.offsetLeft}px, ${el.offsetTop}px)`;
    pill.style.width = `${el.offsetWidth}px`;
    pill.style.height = `${el.offsetHeight}px`;
    pill.style.opacity = "1";
  };

  const syncPillToActive = () => {
    const wrap = tabWrapRef.current;
    if (!wrap) return;
    const anchors = wrap.querySelectorAll("[data-tab]");
    const el = anchors[activeIndex];
    if (el) syncPillToEl(el);
  };

  useEffect(() => {
    // Small timeout to ensure DOM is ready and dimensions are calculated
    const timer = setTimeout(syncPillToActive, 0);
    const onResize = () => syncPillToActive();
    window.addEventListener("resize", onResize);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", onResize);
    };
  }, [activeIndex]);

  const avatarLetter =
    (user?.name?.trim?.()?.[0] || user?.email?.trim?.()?.[0] || "U").toUpperCase();

  return (
    <nav className="bg-black border-b border-[#5AB3F0] sticky top-0 z-50">
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* NAVBAR CONTENT WRAPPER */}
      <div className="w-full px-4 sm:px-6 lg:px-8 relative z-50">
        <div className="flex items-center justify-between h-16 gap-4">
          <div className="flex items-center gap-3 shrink-0">
            <Link to="/dashboard" className="flex items-center gap-2 group">
              <img
                src={logo}
                alt="Lantern Logo"
                className="h-9 w-auto transition-opacity duration-200 group-hover:opacity-90"
              />
              <span className="hidden sm:block font-logo text-[1.875rem] tracking-[0.15em] text-[#6EC1FF] transition-colors duration-200 group-hover:text-[#89D0FF]">
                LANTERN
              </span>
            </Link>
          </div>

          {/* DESKTOP NAVIGATION TABS */}
          <div className="hidden xl:flex flex-1 justify-center">
            <div
              ref={tabWrapRef}
              className="relative flex items-center gap-4 rounded-2xl bg-[#111111] p-1.5 shadow-sm ring-1 ring-[#2B2B2B]"
            >
              <div
                ref={pillRef}
                className="absolute left-0 top-0 rounded-xl bg-[#1F2937] shadow-sm transition-all duration-300 ease-out opacity-0"
                style={{ width: 0, height: 0 }}
                aria-hidden="true"
              />

              {items.map((item, idx) => (
                <NavLink
                  key={item.key}
                  to={item.to}
                  data-tab
                  onMouseEnter={(e) => syncPillToEl(e.currentTarget)}
                  onFocus={(e) => syncPillToEl(e.currentTarget)}
                  onMouseLeave={syncPillToActive}
                  onBlur={syncPillToActive}
                  className={({ isActive }) =>
                    [
                      "relative z-10 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap",
                      "transition-all duration-300 ease-out",
                      isActive ? "text-[#6EC1FF]" : "text-white",
                    ].join(" ")
                  }
                >
                  <span className="relative">
                    <span>{item.label}</span>

                    <span
                      className={[
                        "absolute left-0 -bottom-1 h-[2px] w-full origin-left rounded-full transition-transform duration-300 ease-out",
                        idx === activeIndex ? "scale-x-100 bg-[#6EC1FF]" : "scale-x-0 bg-gray-700/40",
                      ].join(" ")}
                    />
                  </span>
                </NavLink>
              ))}
            </div>
          </div>

          {/* PROFILE DROPDOWN (desktop) */}
          <div className="hidden xl:flex items-center gap-3 shrink-0 mr-4" data-profile-dropdown>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="group inline-flex items-center justify-center h-10 w-10 rounded-full
                         border-2 border-blue-400 text-blue-400 font-semibold
                         hover:border-[#6EC1FF] hover:text-[#6EC1FF]
                         transition-all duration-300"
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
            >
              {avatarLetter}
            </button>

            {profileOpen && (
              <div className="absolute right-6 top-16">
                <div className="rounded-2xl bg-[#111111] p-2 shadow-xl ring-1 ring-[#2B2B2B] min-w-48">
                  <NavLink
                    to="/profile"
                    className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2F2F2F] transition"
                  >
                    Profile
                  </NavLink>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left block rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2F2F2F] transition"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* MOBILE: profile + hamburger */}
          <div className="flex items-center gap-3 xl:hidden" data-profile-dropdown>
            <button
              onClick={() => setProfileOpen((v) => !v)}
              className="group inline-flex items-center justify-center h-10 w-10 rounded-full
                         border-2 border-blue-400 text-blue-400 font-semibold
                         hover:border-[#6EC1FF] hover:text-[#6EC1FF]
                         transition-all duration-300"
              aria-label="Open profile menu"
              aria-expanded={profileOpen}
            >
              {avatarLetter}
            </button>

            {profileOpen && (
              <div className="absolute right-4 top-16">
                <div className="rounded-2xl bg-[#111111] p-2 shadow-xl ring-1 ring-[#2B2B2B] min-w-48">
                  <NavLink
                    to="/profile"
                    className="block rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2F2F2F] transition"
                  >
                    Profile
                  </NavLink>

                  <button
                    onClick={handleLogout}
                    className="w-full text-left block rounded-xl px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#2F2F2F] transition"
                  >
                    Log Out
                  </button>
                </div>
              </div>
            )}

            {/* hamburger */}
            <button
              onClick={() => setMobileOpen((v) => !v)}
              className="flex items-center justify-center w-11 h-11 rounded-xl
                         bg-[#111111] ring-1 ring-[#2B2B2B] shadow-sm
                         hover:bg-[#161616] hover:ring-[#3A3A3A]
                         transition-all duration-300"
              aria-label="Toggle menu"
              aria-expanded={mobileOpen}
            >
              <img
                src={mobileOpen ? closeIcon : openIcon}
                alt={mobileOpen ? "Close menu" : "Open menu"}
                className="w-6 h-6 select-none"
              />
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE NAVIGATION MENU */}
      <div
        className={[
          "xl:hidden border-t border-[#5AB3F0] bg-black relative z-50 overflow-y-auto",
          mobileOpen ? "max-h-[calc(100vh-64px)] opacity-100 translate-y-0" : "max-h-0 opacity-0 -translate-y-2",
          "transition-all duration-300 ease-out",
        ].join(" ")}
      >
        <div className="px-4 py-4 space-y-2">
          {items.map((item) => {
            const isActive =
              location.pathname === item.to || location.pathname.startsWith(item.to + "/");

            return (
              <NavLink
                key={"m-" + item.key}
                to={item.to}
                className={[
                  "flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold",
                  "transition-all duration-300",
                  "text-white hover:bg-[#111111] ring-1 ring-transparent hover:ring-[#2B2B2B]",
                  isActive ? "bg-[#111111] ring-1 ring-[#2B2B2B]" : "",
                ].join(" ")}
              >
                <span>{item.label}</span>
                <span
                  className={[
                    "h-[2px] w-10 rounded-full transition-transform duration-300 origin-left",
                    isActive ? "scale-x-100 bg-[#6EC1FF]" : "scale-x-0 bg-[#6EC1FF]/50",
                  ].join(" ")}
                />
              </NavLink>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
