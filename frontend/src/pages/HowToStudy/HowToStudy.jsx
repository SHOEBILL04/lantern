import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "./HowToStudy.css";
import logo from "../../assets/images/logo.png";
import aboutBg from "../../assets/images/study-bg.png";

export default function HowToStudy() {
  const sections = useMemo(
    () => [
      {
        id: "intro",
        title: "How To Study Less and Achieve More",
        subtitle: "(And graduate with a better job)",
        body: [
          "Most students study the wrong way. This guide shows what actually works, why it works, and how to organize it all using a smart plan.",
        ],
      },
      {
        id: "core",
        title: "Core Principle",
        body: ["Studying is about offsetting forgetting, not just acquiring knowledge."],
      },
      {
        id: "why",
        title: "Why Even Try?",
        body: ["Boost your grades", "Lower stress and anxiety", "Free up time for fun", "Higher GPA means better job opportunities"],
      },
      {
        id: "learn",
        title: "First, Learn How to Learn",
        body: [
          "Your goal isn’t to know things, it’s to use them on exams or in life.",
          "The right methods save time and reduce stress.",
          "Think of studying like sports: practice, don’t just read the playbook.",
        ],
      },
      {
        id: "practice",
        title: "Practice Is King (Self-Testing)",
        body: [
          "Practice recalling info without your notes.",
          "Make your own quizzes and flashcards.",
          "Teach others for maximum understanding and retention.",
        ],
      },
      {
        id: "retrieve",
        title: "Stop Re-Reading. Start Retrieving.",
        body: [
          "Re-reading feels familiar, but it’s not learning.",
          "Learning = pulling info from memory.",
          "Create practice questions from your notes.",
        ],
      },
      {
        id: "space",
        title: "Space It Out",
        body: [
          "Don’t cram. Review over time (spaced repetition).",
          "Mix in old topics as you learn new ones.",
          "Start early and review often.",
        ],
      },
      {
        id: "mix",
        title: "Mix It Up",
        body: [
          "Study different subjects in one session.",
          "Variety strengthens long-term learning.",
          "Example: do math, then history, then back to math.",
        ],
      },
      {
        id: "plan",
        title: "Plan Like a Pro with Lantern",
        body: [
          "Dump your syllabus into Lantern",
          "Estimate each task",
          "Turn due dates into doable dates",
          "Use cushion time to prevent burnout",
        ],
      },
      {
        id: "spots",
        title: "Choose Your Study Spots",
        body: [
          "Pick quiet, no-distraction zones.",
          "Separate study spaces from living spaces.",
          "The library is your best friend.",
        ],
      },
      {
        id: "distractions",
        title: "Eliminate Distractions",
        body: [
          "Your friends don’t care about your grades.",
          "Get into “No time” mode.",
          "Use airplane mode or app blockers.",
        ],
      },
      {
        id: "notes",
        title: "Take Smart Notes",
        body: [
          "Use Cornell notes: notes on one side, questions on the other.",
          "Turn notes into practice questions.",
          "Practice using self-testing.",
        ],
      },
      {
        id: "final",
        title: "Final Tips",
        body: [
          "Show up to lecture. Sit front and center. Ask questions.",
          "No plan is perfect, but no plan = no results.",
          "Consistency beats last-minute sprints.",
        ],
      },
    ],
    []
  );

  const [activeId, setActiveId] = useState(sections[0].id);

  // Lock observer updates while smooth scrolling from a click
  const lockRef = useRef(false);
  const unlockTimerRef = useRef(null);

  const SCROLL_OFFSET = 100;

  useEffect(() => {
    const els = sections.map((s) => document.getElementById(s.id)).filter(Boolean);
    if (!els.length) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (lockRef.current) return;

        const visible = entries
          .filter((e) => e.isIntersecting)
          .map((e) => ({
            id: e.target.id,
            // distance of section top from viewport top
            dist: Math.abs(e.boundingClientRect.top - SCROLL_OFFSET),
          }))
          .sort((a, b) => a.dist - b.dist)[0];

        if (visible?.id) setActiveId(visible.id);
      },
      {
        root: null,
        threshold: [0.2, 0.35, 0.5],
        rootMargin: `-${SCROLL_OFFSET}px 0px -55% 0px`,
      }
    );

    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [sections]);

  const scrollTo = (id) => {
    const el = document.getElementById(id);
    if (!el) return;

    setActiveId(id);

    lockRef.current = true;
    if (unlockTimerRef.current) clearTimeout(unlockTimerRef.current);

    const top = el.getBoundingClientRect().top + window.scrollY - SCROLL_OFFSET;

    window.scrollTo({ top, behavior: "smooth" });

    unlockTimerRef.current = setTimeout(() => {
      lockRef.current = false;
    }, 650);
  };

  return (
    <div
        className="min-h-screen w-full text-white bg-cover bg-center bg-no-repeat"
        style={{
            backgroundImage: `url(${aboutBg})`,
        }}
    >
      <header className="fixed left-8 top-6 z-50">
        <Link to="/" className="inline-flex items-center gap-4 select-none hover:opacity-90">
          <img src={logo} alt="Lantern logo" className="h-9 w-9 object-contain" />
          <span className="lanternBrandText text-xl sm:text-2xl">LANTERN</span>
        </Link>
      </header>

      <div className="w-full px-4 pt-24 pb-10 sm:px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[280px_1fr_300px]">
          {/* Left TOC */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-sm">
              <div className="mb-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                Start Here
              </div>

              <nav className="max-h-[70vh] overflow-auto pr-1 hts-scroll">
                <div className="flex flex-col gap-2">
                  {sections.map((s, idx) => {
                    const isActive = activeId === s.id;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => scrollTo(s.id)}
                        className={[
                          "w-full rounded-xl border px-3 py-2 text-left transition flex gap-3",
                          isActive
                            ? "bg-[#6ec1ff]/20 border-[#6ec1ff]/40"
                            : "border-transparent hover:border-white/15 hover:bg-white/10",
                        ].join(" ")}
                      >
                        <span className="mt-[2px] w-9 text-xs font-extrabold text-[#6ec1ff]">
                          {String(idx + 1).padStart(2, "0")}
                        </span>
                        <span className="text-[13px] font-semibold leading-snug text-slate-200">
                          {s.title}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </nav>
            </div>
          </aside>

          {/* Main article */}
          <main className="min-w-0">
            <article className="space-y-6">
              {sections.map((s) => (
                <section
                  key={s.id}
                  id={s.id}
                  className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-6 shadow-sm"
                >
                  <h2 className="sectionTitle text-3xl font-bold text-white">
                    {s.title}
                    {s.subtitle ? (
                      <span className="mt-2 block text-xs font-extrabold uppercase tracking-wider text-slate-400">
                        {s.subtitle}
                      </span>
                    ) : null}
                  </h2>

                  <ul className="mt-4 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-300">
                    {s.body.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </section>
              ))}
            </article>
          </main>

          {/* Right side signup segment */}
          <aside className="lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-md p-4 shadow-sm">
              <div className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-extrabold text-[#6ec1ff] border border-white/10">
                Lantern
              </div>

              <div className="mt-3 text-sm font-extrabold text-white">
                Turn DUE Dates into DO Dates
              </div>

              <ul className="mt-3 list-disc space-y-1 pl-5 text-[13px] text-slate-300">
                <li>Better grades</li>
                <li>Less stress</li>
                <li>More free time</li>
              </ul>

              <Link
                to="/register"
                className="mt-4 block w-full rounded-xl bg-[#6ec1ff] hover:bg-[#5ab3f0] px-4 py-2 text-center text-sm font-extrabold text-black transition"
              >
                Start planning
              </Link>
            </div>
          </aside>
        </div>

        <footer className="mt-12 text-center text-xs text-slate-400">
          © 2026 Lantern. All rights reserved.
        </footer>
      </div>
    </div>
  );
}