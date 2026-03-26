import { useState, useEffect, useRef } from "react";
import api from "../../api/client";
import confetti from "canvas-confetti";
import { useAuth } from "../../context/AuthContext";
import "./Dashboard.css";


/* ─── Animation delay sequence (ms) ──────────────────────────────────────────
   header → welcome    :   0
   stat cards          : 120  (cards stagger individually: 120, 170, 220, 270)
   subjects section    : 380
   timer sidebar       : 460
────────────────────────────────────────────────────────────────────────────── */

export default function Dashboard() {
  const DEFAULT_WEEKLY_GOAL_MINUTES = 1680; // 28h
  const DEFAULT_COURSE_WEEKLY_GOAL_MINUTES = 600; // 10h

  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ── Modal state ──────────────────────────────────────────────────────────────
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newTasksCount, setNewTasksCount] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeSubject, setActiveSubject] = useState(null);

  // ── Timer state ──────────────────────────────────────────────────────────────
  const [timerMode, setTimerMode] = useState(
    () => localStorage.getItem("timerMode") || "pomodoro"
  );
  const [pomodoroDuration, setPomodoroDuration] = useState(
    () => parseInt(localStorage.getItem("pomodoroDuration"), 10) || 25
  );
  const [timeLeft, setTimeLeft] = useState(() => {
    const saved = localStorage.getItem("timeLeft");
    return saved !== null ? parseInt(saved, 10) : 25 * 60;
  });
  const [isActive, setIsActive] = useState(() => localStorage.getItem("timerIsActive") === "true");
  const [selectedCourse, setSelectedCourse] = useState(() => localStorage.getItem("selectedCourse") || "");
  const [lastTickTime, setLastTickTime] = useState(() => parseInt(localStorage.getItem("lastTickTime"), 10) || null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(localStorage.getItem("timerStartTime") || null);
  const isPersistingSessionRef = useRef(false);

  // ── Mobile timer toggle ───────────────────────────────────────────────────────
  const [showTimer, setShowTimer] = useState(false);
  const [weeklyGoalHoursInput, setWeeklyGoalHoursInput] = useState("28");
  const [isSavingWeeklyGoal, setIsSavingWeeklyGoal] = useState(false);
  const [courseGoalInputs, setCourseGoalInputs] = useState({});
  const [savingCourseGoalId, setSavingCourseGoalId] = useState(null);

  // ─── Data Fetching ────────────────────────────────────────────────────────────

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [userRes, subjectsRes, coursesRes, tasksRes, sessionsRes] = await Promise.all([
        api.post("/auth/me"),
        api.get("/subjects"),
        api.get("/courses"),
        api.get("/tasks"),
        api.get("/study-sessions"),
      ]);

      const userInfo = userRes.data;
      const subjects = subjectsRes.data;
      const courses = coursesRes.data;
      const tasks = tasksRes.data;
      const sessions = sessionsRes.data;

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startOfWeek = new Date();
      const daysSinceMonday = (startOfWeek.getDay() + 6) % 7;
      startOfWeek.setDate(startOfWeek.getDate() - daysSinceMonday);
      startOfWeek.setHours(0, 0, 0, 0);

      const getSessionDurationSeconds = (session) => {
        const startMs = session?.start_time ? new Date(session.start_time).getTime() : NaN;
        const endMs = session?.end_time ? new Date(session.end_time).getTime() : NaN;
        if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
          return Math.round((endMs - startMs) / 1000);
        }
        const fallbackMinutes = Number(session?.duration_minutes) || 0;
        return Math.max(0, Math.round(fallbackMinutes * 60));
      };

      let studyTimeTodaySeconds = 0;
      let studyTimeThisWeekSeconds = 0;
      sessions.forEach((s) => {
        const t = new Date(s.start_time);
        const durationSeconds = getSessionDurationSeconds(s);
        if (t >= today) studyTimeTodaySeconds += durationSeconds;
        if (t >= startOfWeek) studyTimeThisWeekSeconds += durationSeconds;
      });

      let tasksCompletedToday = 0;
      let pendingTasks = 0;
      tasks.forEach((t) => {
        if (t.status === "completed") {
          if (t.completed_at && new Date(t.completed_at) >= today) tasksCompletedToday++;
        } else {
          pendingTasks++;
        }
      });


      const subjectsData = subjects.map(subject => {
        const subjectCourses = courses.filter(c => c.subject_id === subject.id).map(course => {
          const courseTasks = sortTasksByDisplayOrder(tasks.filter(t => t.course_id === course.id));
          return { ...course, tasks: courseTasks };
        });


        let subjectStudyTimeThisWeekSeconds = 0;
        const normalizedCourses = subjectCourses.map((course) => {
          let courseStudyTimeThisWeekSeconds = 0;
          sessions.forEach((s) => {
            if (s.course_id?.toString() === course.id?.toString() && new Date(s.start_time) >= startOfWeek) {
              courseStudyTimeThisWeekSeconds += getSessionDurationSeconds(s);
            }
          });
          subjectStudyTimeThisWeekSeconds += courseStudyTimeThisWeekSeconds;
          return {
            ...course,
            weekly_progress_minutes: courseStudyTimeThisWeekSeconds / 60,
          };
        });
        const computedSubjectGoalMinutes = normalizedCourses.reduce(
          (sum, course) => sum + (Number(course.weekly_goal_minutes) || DEFAULT_COURSE_WEEKLY_GOAL_MINUTES),
          0
        );

        let total = 0, done = 0;
        subjectCourses.forEach((c) => {
          total += c.tasks.length;
          done += c.tasks.filter((t) => t.status === "completed").length;
        });

        return {
          ...subject,
          weekly_progress_minutes: subjectStudyTimeThisWeekSeconds / 60,
          weekly_goal_minutes:
            computedSubjectGoalMinutes ||
            Number(subject.weekly_goal_minutes) ||
            DEFAULT_COURSE_WEEKLY_GOAL_MINUTES,
          total_tasks: total,
          completed_tasks: done,
          courses: normalizedCourses,
        };
      });

      const agg = {
        study_time_today_minutes: studyTimeTodaySeconds / 60,
        tasks_completed_today: tasksCompletedToday,
        total_relevant_tasks: (tasksCompletedToday + pendingTasks) || 1,
        study_streak: userInfo.current_streak || 0,
        weekly_goal_minutes: userInfo.weekly_goal_minutes || DEFAULT_WEEKLY_GOAL_MINUTES,
        study_time_this_week_minutes: studyTimeThisWeekSeconds / 60,
        subjects: subjectsData,
      };

      setData(agg);
      setWeeklyGoalHoursInput(((agg.weekly_goal_minutes || DEFAULT_WEEKLY_GOAL_MINUTES) / 60).toString());
      const nextCourseGoalInputs = {};
      agg.subjects.forEach((subject) => {
        subject.courses.forEach((course) => {
          nextCourseGoalInputs[course.id.toString()] = (
            (Number(course.weekly_goal_minutes) || DEFAULT_COURSE_WEEKLY_GOAL_MINUTES) / 60
          ).toString();
        });
      });
      setCourseGoalInputs(nextCourseGoalInputs);

      const courseStillExists = agg.subjects.some((subject) =>
        subject.courses.some((course) => course.id.toString() === selectedCourse?.toString())
      );
      const firstAvailableCourseId = agg.subjects
        .flatMap((subject) => subject.courses)
        .find((course) => course?.id !== undefined)
        ?.id
        ?.toString();

      if (firstAvailableCourseId && !courseStillExists) {
        setSelectedCourse(firstAvailableCourseId);
      }
      if (activeSubject) {
        const updated = agg.subjects.find((s) => s.id === activeSubject.id);
        if (updated) setActiveSubject(updated);
      }
      setError(null);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, []); // eslint-disable-line

  // ─── Timer Persistence ────────────────────────────────────────────────────────

  useEffect(() => {
    localStorage.setItem("timerMode", timerMode);
    localStorage.setItem("pomodoroDuration", pomodoroDuration.toString());
    localStorage.setItem("timeLeft", timeLeft.toString());
    localStorage.setItem("timerIsActive", isActive.toString());
    localStorage.setItem("selectedCourse", selectedCourse ? selectedCourse.toString() : "");
    if (lastTickTime) localStorage.setItem("lastTickTime", lastTickTime.toString());
    else localStorage.removeItem("lastTickTime");
    if (startTimeRef.current) localStorage.setItem("timerStartTime", startTimeRef.current);
    else localStorage.removeItem("timerStartTime");
  }, [timerMode, pomodoroDuration, timeLeft, isActive, selectedCourse, lastTickTime]);

  // Background catch-up
  useEffect(() => {
    if (isActive && lastTickTime) {
      const elapsed = Math.floor((Date.now() - lastTickTime) / 1000);
      if (elapsed > 0) {
        setTimeLeft((prev) => {
          const next = timerMode === "pomodoro" ? prev - elapsed : prev + elapsed;
          if (timerMode === "pomodoro" && next <= 0) {
            setIsActive(false);
            handleSessionComplete(pomodoroDuration * 60, { sessionMode: "pomodoro", showCelebration: true });
            return 0;
          }
          return next;
        });
        setLastTickTime(Date.now());
      }
    }
  }, [isActive, lastTickTime]); // eslint-disable-line

  // Tick
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setLastTickTime(Date.now());
        setTimeLeft((t) => {
          if (timerMode === "pomodoro" && t <= 1) {
            clearInterval(intervalRef.current);
            setIsActive(false);
            handleSessionComplete(pomodoroDuration * 60, { sessionMode: "pomodoro", showCelebration: true });
            return 0;
          }
          return timerMode === "pomodoro" ? t - 1 : t + 1;
        });
      }, 1000);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, timerMode, pomodoroDuration]); // eslint-disable-line

  // ─── Timer Controls ───────────────────────────────────────────────────────────

  const toggleTimer = () => {
    if (!isActive) {
      startTimeRef.current = new Date().toISOString();
      setLastTickTime(Date.now());
      setIsActive(true);
    } else {
      const elapsedSeconds =
        timerMode === "stopwatch"
          ? Math.max(0, timeLeft)
          : Math.max(0, pomodoroDuration * 60 - timeLeft);

      if (elapsedSeconds > 0) {
        handleSessionComplete(elapsedSeconds, {
          sessionMode: timerMode,
          showCelebration: timerMode !== "stopwatch",
        });
      }
      setIsActive(false);
      setLastTickTime(null);
    }
  };

  const resetTimer = () => {
    setIsActive(false);
    setLastTickTime(null);
    setTimeLeft(timerMode === "pomodoro" ? pomodoroDuration * 60 : 0);
  };

  const handleModeSwitch = (newMode) => {
    if (timerMode === newMode) return;
    setTimerMode(newMode);
    setTimeLeft(newMode === "pomodoro" ? pomodoroDuration * 60 : 0);
    if (isActive) {
      startTimeRef.current = new Date().toISOString();
      setLastTickTime(Date.now());
    }
  };

  const handleChangePomodoroDuration = (e) => {
    const val = parseInt(e.target.value, 10) || 1;
    setPomodoroDuration(val);
    if (timerMode === "pomodoro" && !isActive) setTimeLeft(val * 60);
  };

  // ─── Session Complete ─────────────────────────────────────────────────────────

  const handleSessionComplete = async (
    durationSeconds,
    { sessionMode = timerMode, showCelebration = sessionMode !== "stopwatch" } = {}
  ) => {
    if (durationSeconds <= 0) return;
    if (isPersistingSessionRef.current) return;
    if (!selectedCourse) { alert("Please select a course first."); return; }
    isPersistingSessionRef.current = true;
    try {
      const durationMinutes = Math.max(1, Math.floor(durationSeconds / 60));
      await api.post("/study-sessions", {
        course_id: selectedCourse,
        duration_minutes: durationMinutes,
        start_time: startTimeRef.current || new Date().toISOString(),
        end_time: new Date().toISOString(),
        notes: `Study session from Dashboard (${sessionMode})`,
      });

      if (showCelebration) {
        confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 }, colors: ["#38bdf8", "#34d399", "#a78bfa", "#facc15"] });
      }
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to save session", err);
    } finally {
      startTimeRef.current = null;
      isPersistingSessionRef.current = false;
    }
  };

  // ─── Subject / Task Handlers ──────────────────────────────────────────────────

  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      const { data: { id: subjectId } } = await api.post("/subjects", { name: newSubjectName, color_code: "#cbd5e1" });
      const { data: { id: courseId } } = await api.post("/courses", { subject_id: subjectId, title: newCourseTitle, description: "Dynamically added from dashboard" });
      await Promise.all(
        Array.from({ length: parseInt(newTasksCount, 10) }, (_, i) =>
          api.post("/tasks", { course_id: courseId, title: `Task ${i + 1} for ${newCourseTitle}`, description: "Auto-generated task" })
        )
      );
      setIsModalOpen(false);
      setNewSubjectName(""); setNewCourseTitle(""); setNewTasksCount(5);
      fetchDashboardData();
    } catch (err) {
      console.error(err);
      alert("Failed to add subject and course");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    try {
      await api.patch(`/tasks/${taskId}/complete`);
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to complete task", err);
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

  const fmt = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return <>{m}<span className="opacity-40 mx-0.5">:</span>{s}</>;
  };

  const fmtHMS = (min) => {
    const totalSeconds = Math.max(0, Math.floor((min || 0) * 60));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${hours}h ${minutes}m ${seconds}s`;
  };
  const pct = (a, b) => Math.min(100, b > 0 ? (a / b) * 100 : 0);
  const displayName = user?.name || user?.email?.split("@")[0] || "there";

  const handleSaveWeeklyGoal = async () => {
    const parsedHours = Number(weeklyGoalHoursInput);
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      alert("Please enter a valid weekly goal in hours.");
      return;
    }

    const goalMinutes = Math.max(1, Math.round(parsedHours * 60));
    try {
      setIsSavingWeeklyGoal(true);
      await api.patch("/weekly-goal", { weekly_goal_minutes: goalMinutes });
      setData((prev) => (prev ? { ...prev, weekly_goal_minutes: goalMinutes } : prev));
      setWeeklyGoalHoursInput((goalMinutes / 60).toString());
    } catch (err) {
      console.error("Failed to update weekly goal", err);
      alert("Failed to update weekly goal.");
    } finally {
      setIsSavingWeeklyGoal(false);
    }
  };

  const applyCourseGoalUpdate = (subjects, targetCourseId, goalMinutes) =>
    subjects.map((subject) => {
      const updatedCourses = subject.courses.map((course) => (
        course.id.toString() === targetCourseId
          ? { ...course, weekly_goal_minutes: goalMinutes }
          : course
      ));
      const recomputedSubjectGoalMinutes = updatedCourses.reduce(
        (sum, course) => sum + (Number(course.weekly_goal_minutes) || DEFAULT_COURSE_WEEKLY_GOAL_MINUTES),
        0
      );
      return {
        ...subject,
        courses: updatedCourses,
        weekly_goal_minutes:
          recomputedSubjectGoalMinutes ||
          Number(subject.weekly_goal_minutes) ||
          DEFAULT_COURSE_WEEKLY_GOAL_MINUTES,
      };
    });

  const handleSaveCourseWeeklyGoal = async (courseId) => {
    const targetCourseId = courseId?.toString();
    if (!targetCourseId) return;

    const parsedHours = Number(courseGoalInputs[targetCourseId]);
    if (!Number.isFinite(parsedHours) || parsedHours <= 0) {
      alert("Please enter a valid course weekly goal in hours.");
      return;
    }

    const goalMinutes = Math.max(1, Math.round(parsedHours * 60));
    try {
      setSavingCourseGoalId(targetCourseId);
      await api.patch(`/weekly-goal/course/${targetCourseId}`, { weekly_goal_minutes: goalMinutes });

      setCourseGoalInputs((prev) => ({
        ...prev,
        [targetCourseId]: (goalMinutes / 60).toString(),
      }));
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          subjects: applyCourseGoalUpdate(prev.subjects, targetCourseId, goalMinutes),
        };
      });
      setActiveSubject((prev) => {
        if (!prev) return prev;
        return applyCourseGoalUpdate([prev], targetCourseId, goalMinutes)[0];
      });
    } catch (err) {
      console.error("Failed to update course weekly goal", err);
      const backendMessage = err?.response?.data?.message;
      alert(backendMessage || "Failed to update course weekly goal.");
    } finally {
      setSavingCourseGoalId(null);
    }
  };

  const selectedCourseKey = selectedCourse?.toString();
  const activeSessionElapsedSeconds = isActive
    ? (timerMode === "stopwatch"
      ? Math.max(0, timeLeft)
      : Math.max(0, pomodoroDuration * 60 - timeLeft))
    : 0;
  const activeSessionElapsedMinutes = activeSessionElapsedSeconds / 60;

  const subjectsForDisplay = (data?.subjects || []).map((subject) => {
    const hasSelectedCourse = subject.courses.some((course) => course.id.toString() === selectedCourseKey);
    if (!hasSelectedCourse || activeSessionElapsedMinutes <= 0) return subject;

    return {
      ...subject,
      weekly_progress_minutes: subject.weekly_progress_minutes + activeSessionElapsedMinutes,
      courses: subject.courses.map((course) => (
        course.id.toString() === selectedCourseKey
          ? { ...course, weekly_progress_minutes: (course.weekly_progress_minutes || 0) + activeSessionElapsedMinutes }
          : course
      )),
    };
  });

  const displayStudyTimeTodayMinutes = (data?.study_time_today_minutes || 0) + activeSessionElapsedMinutes;
  const displayStudyTimeThisWeekMinutes = (data?.study_time_this_week_minutes || 0) + activeSessionElapsedMinutes;

  // ─── Shared class strings ─────────────────────────────────────────────────────

  const inputCls = "font-sans w-full px-3.5 py-3 rounded-lg border border-[#30363d] bg-[#0d1117] text-slate-200 text-sm focus:outline-none focus:border-sky-400 transition-colors box-border";
  const labelCls = "font-sans block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-1.5";

  // ─── Render guards ────────────────────────────────────────────────────────────

  if (loading && !data) return (
    <div className="dashboard-root min-h-screen bg-[#0d1117] px-4 sm:px-8 lg:px-14 xl:px-16 py-6 sm:py-10">

      {/* Shimmer keyframe is defined inline so it's self-contained */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -600px 0; }
          100% { background-position:  600px 0; }
        }
        .skeleton {
          background: linear-gradient(
            90deg,
            #161b22 25%,
            #1e2530 50%,
            #161b22 75%
          );
          background-size: 600px 100%;
          animation: shimmer 1.6s infinite linear;
          border-radius: 6px;
        }
      `}</style>

      {/* ── Header skeleton ── */}
      <div className="mb-9">
        <div className="skeleton h-10 w-72 sm:w-96 mb-3 rounded-lg" />
        <div className="skeleton h-3.5 w-56 sm:w-72 rounded" />
      </div>

      {/* ── Stat cards skeleton ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-10">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-[#161b22] border border-[#21262d] rounded-xl px-4 sm:px-6 py-4 sm:py-5 overflow-hidden relative">
            {/* colored top bar */}
            <div className={`absolute top-0 left-0 w-full h-[3px] ${["bg-sky-400", "bg-green-400", "bg-yellow-400", "bg-violet-400"][i]} opacity-40`} />
            <div className="skeleton h-2.5 w-24 mb-4 rounded" />
            <div className="skeleton h-8 w-20 mb-3 rounded-md" />
            <div className="skeleton h-2.5 w-28 rounded" />
          </div>
        ))}
      </div>

      {/* ── Subjects + Timer skeleton ── */}
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">

        {/* Subjects */}
        <div className="w-full lg:flex-[2_2_0%]">
          <div className="flex justify-between items-center mb-5">
            <div className="skeleton h-4 w-36 rounded" />
            <div className="skeleton h-8 w-28 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 sm:p-5">
                <div className="flex items-center gap-3 mb-7">
                  <div className="skeleton w-3 h-3 rounded-full flex-shrink-0" />
                  <div className="skeleton h-3.5 w-28 rounded" />
                </div>
                <div className="space-y-2.5">
                  <div className="flex justify-between">
                    <div className="skeleton h-2.5 w-24 rounded" />
                    <div className="skeleton h-2.5 w-16 rounded" />
                  </div>
                  <div className="skeleton h-1.5 w-full rounded-full" />
                  <div className="flex justify-between pt-1">
                    <div className="skeleton h-2.5 w-16 rounded" />
                    <div className="skeleton h-2.5 w-8 rounded" />
                  </div>
                  <div className="skeleton h-1.5 w-full rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Timer */}
        <div className="hidden lg:block lg:flex-[1_1_0%]">
          <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-6 xl:p-7">
            <div className="skeleton h-4 w-24 mx-auto mb-6 rounded" />
            <div className="skeleton h-10 w-full mb-5 rounded-full" />
            <div className="skeleton h-6 w-28 mx-auto mb-5 rounded-full" />
            <div className="skeleton h-20 w-40 mx-auto mb-4 rounded-xl" />
            <div className="skeleton h-2.5 w-36 mx-auto mb-6 rounded" />
            <div className="skeleton h-px w-full mb-5" />
            <div className="skeleton h-2.5 w-28 mb-2 rounded" />
            <div className="skeleton h-11 w-full mb-5 rounded-lg" />
            <div className="flex gap-2">
              <div className="skeleton h-12 flex-1 rounded-xl" />
              <div className="skeleton h-12 w-12 rounded-xl" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
  if (error) return (
    <div className="dashboard-root font-sans p-8 sm:p-16 text-red-400 bg-[#0d1117] min-h-screen">
      {error}
    </div>
  );

  // ─── Timer Panel ─────────────────────────────────────────────────────────────
  // Extracted so it renders identically in the desktop sidebar and mobile drawer.

  const TimerPanel = () => (
    <div className="bg-[#161b22] border border-[#21262d] rounded-2xl p-5 lg:p-6 xl:p-7 flex flex-col items-center text-center h-full">

      <h3 className="font-display text-sm font-bold text-slate-100 mb-5">Study Timer</h3>

      {/* Mode tabs */}
      <div className="flex w-full bg-[#0d1117] border border-[#21262d] rounded-full p-1 mb-5">
        {["pomodoro", "stopwatch"].map((mode) => (
          <button
            key={mode}
            onClick={() => handleModeSwitch(mode)}
            className={`font-sans flex-1 py-2 rounded-full text-xs font-semibold transition-all ${timerMode === mode
              ? "bg-slate-100 text-[#0d1117] shadow"
              : "text-slate-500 hover:text-slate-300"
              }`}
          >
            {mode.charAt(0).toUpperCase() + mode.slice(1)}
          </button>
        ))}
      </div>

      {/* Focus badge */}
      <div className="font-sans text-[0.65rem] font-bold uppercase tracking-widest text-sky-400 bg-sky-400/10 border border-sky-400/20 rounded-full px-4 py-1 mb-4">
        Focus Time
      </div>

      {/* Time display */}
      <div className="font-display text-6xl lg:text-7xl font-extrabold text-slate-100 tracking-tight leading-none mb-3 tabular-nums">
        {fmt(timeLeft)}
      </div>

      {/* Pomodoro duration */}
      {timerMode === "pomodoro" && (
        <div className="font-sans flex items-center gap-2 text-[0.68rem] text-slate-500 uppercase tracking-widest mb-2">
          Duration:
          <input
            type="number" min="1" max="120"
            value={pomodoroDuration}
            onChange={handleChangePomodoroDuration}
            disabled={isActive}
            className="font-sans w-12 text-center px-1 py-0.5 rounded border border-[#30363d] bg-[#0d1117] text-slate-200 text-xs disabled:opacity-40"
          />
          min
        </div>
      )}

      {/* Course selector */}
      <div className="w-full text-left mt-4 mb-4 pt-4 border-t border-[#21262d]">
        <label className={labelCls}>Course to Study</label>
        <select
          value={selectedCourse}
          onChange={(e) => setSelectedCourse(e.target.value)}
          disabled={isActive}
          className={`timer-select ${inputCls} disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <option value="" disabled>Select a course</option>
          {subjectsForDisplay.flatMap((s) =>
            s.courses.map((c) => (
              <option key={c.id} value={c.id}>{`${s.name} - ${c.title}`}</option>
            ))
          )}
        </select>
      </div>

      {/* Actions */}
      <div className="flex gap-2 w-full mt-auto">
        <button
          onClick={toggleTimer}
          className="font-sans flex-1 py-3 rounded-xl bg-slate-100 text-[#0d1117] font-bold text-sm hover:bg-slate-200 active:scale-95 transition-all"
        >
          {isActive ? "Stop" : "▶ Start"}
        </button>
        <button
          onClick={resetTimer}
          className="font-sans w-12 rounded-xl bg-[#21262d] border border-[#30363d] text-slate-400 hover:bg-[#30363d] hover:text-slate-200 transition-colors text-lg"
          title="Reset"
        >
          ↺
        </button>
      </div>
    </div>
  );

  // ─── JSX ──────────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-root min-h-screen bg-[#0d1117] text-slate-200 px-4 sm:px-8 lg:px-14 xl:px-16 py-6 sm:py-10">

      {/* ══════════════════════════════════════════
          1 — Welcome header  (delay: 0ms)
      ══════════════════════════════════════════ */}
      <header
        className="anim-section mb-7 sm:mb-9 flex items-start justify-between gap-4"
        style={{ "--delay": "0ms" }}
      >
        <div>
          <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-100 tracking-tight leading-tight">
            Welcome, {displayName}
          </h1>
          <p className="font-sans text-slate-500 text-xs sm:text-sm mt-2">
            Track your study progress and manage your time effectively
          </p>
        </div>

        {/* Mobile timer toggle */}
        <button
          onClick={() => setShowTimer((v) => !v)}
          className="font-sans lg:hidden flex-shrink-0 flex items-center gap-2 text-xs font-semibold text-sky-400 border border-sky-400/30 bg-sky-400/10 rounded-lg px-3 py-2 hover:bg-sky-400/20 transition-colors mt-1"
        >
          ⏱ {showTimer ? "Hide" : "Timer"}
          {isActive && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
        </button>
      </header>

      {/* ══════════════════════════════════════════
          2 — Stat cards  (stagger: 120–270ms)
          Each card has its own delay via
          --card-delay so they cascade in.
      ══════════════════════════════════════════ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 lg:gap-5 mb-8 sm:mb-10">

        {[
          {
            label: "Study Time Today",
            value: fmtHMS(displayStudyTimeTodayMinutes),
            sub: `Free time ${fmtHMS(Math.max(0, data.weekly_goal_minutes / 7 - displayStudyTimeTodayMinutes))}`,
          },
          {
            label: "Tasks Completed",
            value: `${data.tasks_completed_today}/${data.total_relevant_tasks}`,
            sub: `${Math.round(pct(data.tasks_completed_today, data.total_relevant_tasks))}% completion rate`,
          },
          {
            label: "Study Streak",
            value: `${data.study_streak} days`,
            sub: "keep it up!",
          },
        ].map(({ label, value, sub }, i) => (
          <div
            key={label}
            className="stat-card stat-card-anim relative flex flex-col bg-[#161b22] rounded-xl px-4 sm:px-6 py-4 sm:py-5 border border-[#21262d] overflow-hidden hover:-translate-y-0.5 transition-transform"
            style={{ "--card-delay": `${120 + i * 55}ms` }}
          >
            <div className="font-sans text-[0.65rem] sm:text-[0.7rem] font-semibold text-slate-500 uppercase tracking-widest mb-2 sm:mb-3">
              {label}
            </div>
            <div className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-slate-100 tracking-tight mb-1">
              {value}
            </div>
            <div className="font-sans text-[0.7rem] sm:text-xs text-slate-600 mt-auto">{sub}</div>
          </div>
        ))}

        {/* Weekly Goal card */}
        <div
          className="stat-card stat-card-anim relative flex flex-col bg-[#161b22] rounded-xl px-4 sm:px-6 py-4 sm:py-5 border border-[#21262d] overflow-hidden hover:-translate-y-0.5 transition-transform"
          style={{ "--card-delay": "285ms" }}
        >
          <div className="font-sans text-[0.65rem] sm:text-[0.7rem] font-semibold text-slate-500 uppercase tracking-widest mb-2 sm:mb-3">
            Weekly Goal
          </div>
          <div className="font-display text-xl sm:text-2xl lg:text-3xl font-bold text-slate-100 tracking-tight mb-3">
            {fmtHMS(displayStudyTimeThisWeekMinutes)}
          </div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <input
              type="number"
              min="1"
              step="0.5"
              value={weeklyGoalHoursInput}
              onChange={(e) => setWeeklyGoalHoursInput(e.target.value)}
              className="font-sans w-16 sm:w-20 px-2 py-1 rounded border border-[#30363d] bg-[#0d1117] text-slate-200 text-xs"
              aria-label="Weekly goal in hours"
            />
            <span className="font-sans text-[0.7rem] text-slate-500">hours</span>
            <button
              onClick={handleSaveWeeklyGoal}
              disabled={isSavingWeeklyGoal}
              className="font-sans text-xs font-semibold px-2.5 py-1 rounded border border-[#30363d] text-slate-300 hover:bg-[#21262d] disabled:opacity-50 disabled:cursor-not-allowed w-full sm:w-auto"
            >
              {isSavingWeeklyGoal ? "Saving..." : "Save"}
            </button>
          </div>
          <div className="mt-auto">
            <div className="h-1.5 w-full bg-[#21262d] rounded-full overflow-hidden">
              <div
                className="progress-fill h-full bg-gradient-to-r from-violet-400 to-indigo-400 rounded-full"
                style={{ width: `${pct(displayStudyTimeThisWeekMinutes, data.weekly_goal_minutes)}%` }}
              />
            </div>
            <div className="font-sans text-[0.7rem] sm:text-xs text-slate-600 text-right mt-1">
              {fmtHMS(data.weekly_goal_minutes)}
            </div>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════════
          Mobile timer drawer  (no extra delay —
          it appears when toggled, not on load)
      ══════════════════════════════════════════ */}
      {showTimer && (
        <div className="lg:hidden mb-6">
          <TimerPanel />
        </div>
      )}

      {/* ══════════════════════════════════════════
          3 — Subjects + Timer row
          Subjects: delay 380ms
          Timer:    delay 460ms
      ══════════════════════════════════════════ */}
      <div className="flex flex-col lg:flex-row gap-5 lg:gap-6 items-start">

        {/* ── Subjects section (≈2/3 width on desktop) ── */}
        <div
          className="anim-section w-full lg:flex-[2_2_0%]"
          style={{ "--delay": "380ms" }}
        >
          <div className="flex justify-between items-center mb-4 sm:mb-5">
            <h2 className="font-display text-sm sm:text-base font-bold text-slate-100">
              Subject &amp; Courses
            </h2>
            <button
              onClick={() => setIsModalOpen(true)}
              className="font-sans text-xs font-semibold text-slate-300 border border-[#30363d] rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 hover:bg-[#21262d] hover:border-slate-500 transition-colors"
            >
              + Add Subject
            </button>
          </div>

          {/* mobile: 1 col | sm: 2 cols | xl: 3 cols */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
            {subjectsForDisplay.map((subject, i) => (
              <div
                key={subject.id}
                onClick={() => setActiveSubject(subject)}
                className="subject-card-anim bg-[#161b22] border border-[#21262d] rounded-xl p-4 sm:p-5 flex flex-col cursor-pointer hover:-translate-y-1 hover:border-[#30363d] hover:shadow-xl transition-all duration-200"
                style={{ "--subject-delay": `${420 + i * 60}ms` }}
              >
                <div className="flex items-center gap-3 mb-5 sm:mb-7">
                  <span
                    className="w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: subject.color_code || "#cbd5e1" }}
                  />
                  <h3 className="font-display text-sm font-bold text-slate-200 truncate">
                    {subject.name}
                  </h3>
                </div>

                <div className="mt-auto space-y-2">
                  <div className="font-sans flex justify-between text-[0.72rem] text-slate-500">
                    <span>Weekly Progress</span>
                    <span>{fmtHMS(subject.weekly_progress_minutes)}/{fmtHMS(subject.weekly_goal_minutes)}</span>
                  </div>
                  <div className="h-1.5 w-full bg-[#21262d] rounded-full overflow-hidden">
                    <div
                      className="progress-fill h-full bg-gradient-to-r from-sky-400 to-indigo-400 rounded-full"
                      style={{ width: `${pct(subject.weekly_progress_minutes, subject.weekly_goal_minutes)}%` }}
                    />
                  </div>

                  <div className="font-sans flex justify-between text-[0.72rem] text-slate-500 pt-1">
                    <span>Tasks {subject.completed_tasks}/{subject.total_tasks}</span>
                    <span>
                      {subject.total_tasks > 0
                        ? Math.round((subject.completed_tasks / subject.total_tasks) * 100)
                        : 0}%
                    </span>
                  </div>
                  <div className="h-1.5 w-full bg-[#21262d] rounded-full overflow-hidden">
                    <div
                      className="progress-fill h-full bg-gradient-to-r from-emerald-400 to-green-400 rounded-full"
                      style={{ width: `${pct(subject.completed_tasks, subject.total_tasks)}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}

            {data.subjects.length === 0 && (
              <p className="font-sans text-slate-600 text-sm col-span-full">No subjects found.</p>
            )}
          </div>
        </div>

        {/* ── Timer sidebar ≈1/3 width on desktop ── */}
        <div
          className="anim-section hidden lg:block lg:flex-[1_1_0%] flex-shrink-0"
          style={{ "--delay": "460ms" }}
        >
          <div className="sticky top-8">
            <TimerPanel />
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          Add Subject Modal
      ════════════════════════════════════════════════════════ */}
      {isModalOpen && (
        <div
          className="modal-overlay fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={(e) => e.target.classList.contains("modal-overlay") && setIsModalOpen(false)}
        >
          <div className="modal-content bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-9 w-full max-w-md shadow-2xl">
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-slate-100 mb-6 sm:mb-7 tracking-tight">
              Add New Subject / Course
            </h2>
            <form onSubmit={handleAddSubject} className="space-y-4 sm:space-y-5">
              <div>
                <label className={labelCls}>Subject Name</label>
                <input
                  type="text" className={inputCls}
                  placeholder="e.g. Mathematics"
                  value={newSubjectName}
                  onChange={(e) => setNewSubjectName(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Course Title</label>
                <input
                  type="text" className={inputCls}
                  placeholder="e.g. Calculus 101"
                  value={newCourseTitle}
                  onChange={(e) => setNewCourseTitle(e.target.value)}
                  required
                />
              </div>
              <div>
                <label className={labelCls}>Number of Tasks</label>
                <input
                  type="number" min="1" max="16" className={inputCls}
                  value={newTasksCount}
                  onChange={(e) => setNewTasksCount(e.target.value)}
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="font-sans px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold text-slate-400 border border-[#30363d] rounded-lg hover:bg-[#21262d] hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="font-sans px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-bold bg-slate-100 text-[#0d1117] rounded-lg hover:bg-slate-200 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  {isSubmitting ? "Adding..." : "Add Subject"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════════
          Task Details Modal
      ════════════════════════════════════════════════════════ */}
      {activeSubject && (
        <div
          className="modal-overlay fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 px-4"
          onClick={(e) => e.target.classList.contains("modal-overlay") && setActiveSubject(null)}
        >
          <div className="modal-content bg-[#161b22] border border-[#30363d] rounded-2xl p-6 sm:p-9 w-full max-w-2xl shadow-2xl">
            <h2 className="font-display text-lg sm:text-xl font-extrabold text-slate-100 mb-5 sm:mb-6 pb-4 sm:pb-5 border-b border-[#21262d] flex items-center gap-3 tracking-tight">
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: activeSubject.color_code }}
              />
              <span className="truncate">{activeSubject.name} — Courses &amp; Tasks</span>
            </h2>
            <div className="courses-list">
              {activeSubject.courses.map(course => (
                <div key={course.id} className="course-block">
                  <div className="course-header">
                    <h4 className="course-title">{course.title}</h4>
                    <div className="course-goal-editor">
                      <span className="course-goal-label">Weekly Goal</span>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        value={
                          courseGoalInputs[course.id.toString()] ??
                          ((Number(course.weekly_goal_minutes) || DEFAULT_COURSE_WEEKLY_GOAL_MINUTES) / 60).toString()
                        }
                        onChange={(e) =>
                          setCourseGoalInputs((prev) => ({
                            ...prev,
                            [course.id.toString()]: e.target.value,
                          }))
                        }
                        className="course-goal-input"
                        aria-label={`Weekly goal in hours for ${course.title}`}
                      />
                      <span className="course-goal-unit">h</span>
                      <button
                        type="button"
                        onClick={() => handleSaveCourseWeeklyGoal(course.id)}
                        disabled={savingCourseGoalId === course.id.toString()}
                        className="course-goal-save"
                      >
                        {savingCourseGoalId === course.id.toString() ? "Saving..." : "Save"}
                      </button>
                    </div>
                  </div>
                  <div className="course-progress-row">
                    <span>Progress</span>
                    <span>{fmtHMS(course.weekly_progress_minutes)}/{fmtHMS(course.weekly_goal_minutes)}</span>
                  </div>
                  <div className="course-progress-track">
                    <div
                      className="course-progress-fill"
                      style={{ width: `${pct(course.weekly_progress_minutes, course.weekly_goal_minutes)}%` }}
                    />
                  </div>
                  <div className="task-grid">
                    {course.tasks.map((task) => (
                      <div
                        key={task.id}
                        onClick={() => task.status !== "completed" && handleCompleteTask(task.id)}
                        className={`font-sans px-3 py-2.5 rounded-lg text-xs font-semibold text-center flex items-center justify-center gap-1.5 transition-all select-none
                          ${task.status === "completed"
                            ? "bg-emerald-400/15 border border-emerald-400/30 text-emerald-400 cursor-default"
                            : "bg-[#161b22] border border-[#30363d] text-slate-400 cursor-pointer hover:border-sky-400 hover:text-sky-400 hover:bg-sky-400/10 hover:-translate-y-0.5"
                          }`}
                      >
                        {task.status === 'completed' ? '✓' : '◯'} {getTaskDisplayLabel(task)}
                      </div>
                    ))}
                    {course.tasks.length === 0 && (
                      <span className="font-sans text-slate-600 text-xs">No tasks</span>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end mt-5 sm:mt-6">
              <button
                onClick={() => setActiveSubject(null)}
                className="font-sans px-4 sm:px-5 py-2 sm:py-2.5 text-sm font-semibold text-slate-400 border border-[#30363d] rounded-lg hover:bg-[#21262d] hover:text-slate-200 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getTaskDisplayLabel(task) {
  if (!task?.title) return "Untitled Task";

  const numberedTaskMatch = task.title.match(/^Task\s+(\d+)\b/i);
  if (numberedTaskMatch) {
    return `Task ${numberedTaskMatch[1]}`;
  }

  return task.title;
}

function getTaskDisplayOrder(task) {
  if (!task?.title) return Number.MAX_SAFE_INTEGER;

  const numberedTaskMatch = task.title.match(/^Task\s+(\d+)\b/i);
  if (numberedTaskMatch) {
    return Number(numberedTaskMatch[1]);
  }

  return Number.MAX_SAFE_INTEGER;
}

function sortTasksByDisplayOrder(taskList) {
  return [...taskList].sort((left, right) => {
    const orderDifference = getTaskDisplayOrder(left) - getTaskDisplayOrder(right);
    if (orderDifference !== 0) return orderDifference;
    const leftId = Number(left.id);
    const rightId = Number(right.id);
    if (Number.isFinite(leftId) && Number.isFinite(rightId)) {
      return leftId - rightId;
    }
    return String(left.id ?? "").localeCompare(String(right.id ?? ""));
  });
}
