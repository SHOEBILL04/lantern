import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";

import logo from "../../assets/images/logo.png";
import openIcon from "../../assets/images/icons/open.svg";
import arrowDown from "../../assets/images/icons/arrow-down.svg";

import "./Welcome.css";

export default function Welcome() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showArrow, setShowArrow] = useState(true);
  const [loading, setLoading] = useState(true);
  const year = useMemo(() => new Date().getFullYear(), []);

  useEffect(() => {
    const cls = ["font-body", "bg-dynamic", "overflow-x-hidden", "welcome"];
    document.body.classList.add(...cls);
    return () => document.body.classList.remove(...cls);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => setLoading(false), 650);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.target.classList.toggle("active", e.isIntersecting)),
      { threshold: 0.2 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    const onScroll = () => setShowArrow(window.scrollY <= 100);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e) => e.key === "Escape" && setMenuOpen(false);
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [menuOpen]);

  const scrollNext = () => {
    window.scrollTo({ top: window.innerHeight, behavior: "smooth" });
    setShowArrow(false);
  };

  return (
    <>
      {/* LOADER */}
      {loading && (
        <div id="page-loader" aria-label="Page loading">
          <div className="loader-wrap">
            <h1 className="font-logo loader-title">LANTERN</h1>
          </div>
        </div>
      )}

      {/* NAV */}
      <header className="relative z-10">
        <nav className="welcome-nav">
          <div className="welcome-brand">
            <img
              src={logo}
              alt="Lantern Logo"
              className="welcome-logo"
              draggable="false"
            />
            <span className="font-logo">LANTERN</span>
          </div>

          {/* Desktop links */}
          <div className="welcome-navlinks">
            <Link to="/how-to-study" className="nav-link">
              How to Study
            </Link>
            <Link to="/about" className="nav-link">
              About
            </Link>
            <Link to="/login" className="nav-link">
              Login
            </Link>

            <Link to="/register" className="nav-cta">
              Sign Up
            </Link>
          </div>

          {/* Mobile button */}
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="welcome-menu-btn"
            aria-label="Open menu"
            aria-expanded={menuOpen ? "true" : "false"}
          >
            <img src={openIcon} alt="" className="h-5 w-5" />
          </button>
        </nav>

        {/* Mobile menu + overlay */}
        {menuOpen && (
          <>
            <button
              className="fixed inset-0 z-40 cursor-default bg-black/30"
              aria-label="Close menu overlay"
              onClick={() => setMenuOpen(false)}
            />

            <div className="welcome-mobile-menu">
              <a
                href="#"
                className="mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                How to Study
              </a>

              <Link
                to="/about"
                className="mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                About
              </Link>

              <Link
                to="/login"
                className="mobile-link"
                onClick={() => setMenuOpen(false)}
              >
                Login
              </Link>

              <Link
                to="/register"
                className="mobile-cta"
                onClick={() => setMenuOpen(false)}
              >
                Sign Up
              </Link>
            </div>
          </>
        )}
      </header>

      {/* HERO */}
      <section className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-28 sm:px-8 lg:grid-cols-2 lg:px-12">
        <div className="reveal">
          <p className="mb-4 text-lg font-bold text-[#6ec1ff] sm:text-xl">
            Illuminate your learning journey
          </p>

          <h1 className="font-logo hero-title mb-6 text-4xl sm:text-5xl lg:text-6xl">
            LANTERN
          </h1>

          <p className="mb-10 max-w-xl text-lg leading-relaxed text-slate-300">
            Light the way to knowledge with innovative study methods and personalized learning
            experiences that transform how you learn.
          </p>

          <div className="flex flex-col gap-4 sm:flex-row">
            <Link to="/register" className="welcome-hero-btn">
              Get Started →
            </Link>

            <a href="#" className="welcome-hero-btn-outline">
              Learn More
            </a>
          </div>
        </div>

        <div className="reveal delay-2 flex justify-center">
          <div className="lantern-drop">
            <div className="lantern-hanger">
              <div className="lantern-hook" />
              <div className="lantern-chain" />

              <div className="lantern-body">
                {/* glow behind image */}
                <div className="lantern-glow" aria-hidden="true" />
                <img
                  src={logo}
                  className="pixel-lantern w-56 sm:w-72 lg:w-80"
                  alt="Lantern"
                  draggable="false"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="mx-auto max-w-7xl px-4 pb-24 sm:px-8 lg:px-12">
        <div className="grid gap-10 md:grid-cols-3">
          {[
            ["Smart Study Plans", "Personalized schedules that adapt to your pace and goals."],
            ["Focus & Clarity", "Eliminate distractions and stay mentally sharp."],
            ["Track Progress", "Visual insights to keep you motivated and consistent."],
            ["AI Assistance", "Get smart recommendations based on your learning behavior."],
            ["Study Reminders", "Never miss a session with intelligent reminders."],
            ["Clean Dashboard", "Everything you need, beautifully organized."],
          ].map(([title, desc], i) => (
            <div key={title} className={`feature-card reveal delay-${i + 1}`}>
              <h3 className="mb-3 text-xl font-extrabold text-white">{title}</h3>
              <p className="text-[1.05rem] leading-relaxed text-slate-300">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="welcome-footer reveal">© {year} Lantern. All rights reserved.</footer>

      {/* SCROLL ARROW */}
      <button
        id="scroll-arrow"
        aria-label="Scroll down"
        className={`scroll-arrow ${showArrow && !menuOpen ? "" : "hidden-arrow"}`}
        onClick={scrollNext}
      >
        <img src={arrowDown} alt="" className="h-6 w-6" />
      </button>
    </>
  );
}