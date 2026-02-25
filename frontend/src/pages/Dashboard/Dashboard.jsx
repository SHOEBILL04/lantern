import { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import api from "../../api/client";
import confetti from "canvas-confetti";
import "./Dashboard.css";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // --- Add Subject Modal State ---
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubjectName, setNewSubjectName] = useState("");
  const [newCourseTitle, setNewCourseTitle] = useState("");
  const [newTasksCount, setNewTasksCount] = useState(5);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // --- Subject Details Modal State ---
  const [activeSubject, setActiveSubject] = useState(null);

  // --- Timer State (with auto-restore from localStorage) ---
  const [timerMode, setTimerMode] = useState(() => localStorage.getItem("timerMode") || "pomodoro");
  const [pomodoroDuration, setPomodoroDuration] = useState(() => parseInt(localStorage.getItem("pomodoroDuration")) || 25);
  const [timeLeft, setTimeLeft] = useState(() => {
    const savedTime = localStorage.getItem("timeLeft");
    return savedTime !== null ? parseInt(savedTime) : (25 * 60);
  });
  const [isActive, setIsActive] = useState(() => localStorage.getItem("timerIsActive") === "true");
  const [selectedCourse, setSelectedCourse] = useState(() => localStorage.getItem("selectedCourse") || "");
  const intervalRef = useRef(null);

  // We need to store the exact timestamp when the timer was started or last updated 
  // so we can calculate elapsed time even if the tab was closed.
  const [lastTickTime, setLastTickTime] = useState(() => parseInt(localStorage.getItem("lastTickTime")) || null);
  const startTimeRef = useRef(() => localStorage.getItem("timerStartTime") || null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await api.get("/dashboard");
      setData(res.data);
      if (res.data.subjects && res.data.subjects.length > 0 && !selectedCourse) {
        let defaultCourse = res.data.subjects[0]?.courses?.[0]?.id;
        if (!defaultCourse) {
          for (let s of res.data.subjects) {
            if (s.courses && s.courses.length > 0) {
              defaultCourse = s.courses[0].id;
              break;
            }
          }
        }
        if (defaultCourse) setSelectedCourse(defaultCourse);
      }

      // Update activeSubject if modal is open to reflect new completed tasks
      if (activeSubject) {
        const updatedSubject = res.data.subjects.find(s => s.id === activeSubject.id);
        if (updatedSubject) setActiveSubject(updatedSubject);
      }
      setError(null);
    } catch (err) {
      setError("Failed to load dashboard data");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Timer Persistence Sync ---
  useEffect(() => {
    localStorage.setItem("timerMode", timerMode);
    localStorage.setItem("pomodoroDuration", pomodoroDuration.toString());
    localStorage.setItem("timeLeft", timeLeft.toString());
    localStorage.setItem("timerIsActive", isActive.toString());
    localStorage.setItem("selectedCourse", selectedCourse);
    if (lastTickTime) localStorage.setItem("lastTickTime", lastTickTime.toString());
    if (startTimeRef.current) localStorage.setItem("timerStartTime", startTimeRef.current.toString());
  }, [timerMode, pomodoroDuration, timeLeft, isActive, selectedCourse, lastTickTime]);

  // --- Background Time calculation (Catch-up) ---
  useEffect(() => {
    if (isActive && lastTickTime) {
      const now = Date.now();
      const elapsedSeconds = Math.floor((now - lastTickTime) / 1000);

      if (elapsedSeconds > 0) {
        setTimeLeft(prev => {
          let newTime = timerMode === "pomodoro" ? prev - elapsedSeconds : prev + elapsedSeconds;
          if (timerMode === "pomodoro" && newTime <= 0) {
            newTime = 0;
            setIsActive(false);
            handleSessionComplete(pomodoroDuration);
          }
          return newTime;
        });
        setLastTickTime(now);
      }
    }
  }, [isActive, lastTickTime, timerMode, pomodoroDuration]);

  // --- Timer Tick ---
  useEffect(() => {
    if (isActive) {
      intervalRef.current = setInterval(() => {
        setLastTickTime(Date.now());
        setTimeLeft((time) => {
          if (timerMode === "pomodoro" && time <= 1) {
            clearInterval(intervalRef.current);
            setIsActive(false);
            handleSessionComplete(pomodoroDuration);
            return 0;
          }
          return timerMode === "pomodoro" ? time - 1 : time + 1;
        });
      }, 1000);
    } else if (!isActive && intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [isActive, timerMode, pomodoroDuration]);

  const toggleTimer = () => {
    if (!isActive) {
      // Starting
      startTimeRef.current = new Date().toISOString();
      setLastTickTime(Date.now());
      setIsActive(true);
    } else {
      // Stopping (we ONLY log if they manually stop or finish pomodoro, not on switching tabs)
      if (timerMode === "stopwatch") {
        const durationSeconds = timeLeft;
        const durationMinutes = Math.max(1, Math.floor(durationSeconds / 60));
        handleSessionComplete(durationMinutes);
        setTimeLeft(0);
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
    // Prevent switching to the mode we're already in
    if (timerMode === newMode) return;

    setTimerMode(newMode);

    // If we're swapping modes while the timer is currently running, 
    // keep it running, but reset its counting target.
    if (isActive) {
      // if we're moving TO pomodoro from stopwatch
      if (newMode === 'pomodoro') {
        setTimeLeft(pomodoroDuration * 60);
      }
      // if we're moving TO stopwatch from pomodoro
      else {
        setTimeLeft(0);
      }
      // Don't log a completed session on swap, just re-base the timer length
      startTimeRef.current = new Date().toISOString();
      setLastTickTime(Date.now());
    } else {
      // Just update visuals since nothing is running
      setTimeLeft(newMode === 'pomodoro' ? pomodoroDuration * 60 : 0);
    }
  };

  const handleChangePomodoroDuration = (e) => {
    const val = parseInt(e.target.value) || 1;
    setPomodoroDuration(val);
    if (timerMode === "pomodoro" && !isActive) {
      setTimeLeft(val * 60);
    }
  };

  const handleSessionComplete = async (durationMinutes) => {
    if (!selectedCourse) {
      alert("Please select a course to start a study session for.");
      return;
    }

    try {
      const payload = {
        course_id: selectedCourse,
        duration_minutes: durationMinutes,
        start_time: startTimeRef.current || new Date().toISOString(),
        end_time: new Date().toISOString(),
        notes: `Study session from Dashboard (${timerMode})`,
      };
      await api.post("/study-sessions", payload);

      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#60a5fa', '#10b981', '#f59e0b', '#ec4899']
      });

      fetchDashboardData();
    } catch (err) {
      console.error("Failed to save session", err);
    } finally {
      startTimeRef.current = null;
    }
  };

  // --- Adding Subject / Course ---
  const handleAddSubject = async (e) => {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      await api.post("/dashboard/add-subject-course", {
        subject_name: newSubjectName,
        course_title: newCourseTitle,
        number_of_tasks: parseInt(newTasksCount),
      });
      setIsModalOpen(false);
      setNewSubjectName("");
      setNewCourseTitle("");
      setNewTasksCount(5);
      fetchDashboardData();
    } catch (err) {
      console.error("Failed to add subject and course", err);
      alert("Failed to add subject and course");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Completing a Task ---
  const handleCompleteTask = async (taskId) => {
    try {
      await api.patch(`/tasks/${taskId}/complete`);
      fetchDashboardData(); // this will also update the activeSubject state implicitly
    } catch (err) {
      console.error("Failed to complete task", err);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m} : ${s}`;
  };

  const formatHoursMinutes = (totalMinutes) => {
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    return `${h}h ${m}m`;
  };

  if (loading && !data) return <div className="p-8">Loading dashboard...</div>;
  if (error) return <div className="p-8 text-red-500">{error}</div>;

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>Welcome to Lantern</h1>
        <p>Track your study progress and manage your time effectively</p>
      </header>

      <div className="top-stats-grid">
        <div className="stat-card">
          <div className="stat-label">Study time Today</div>
          <div className="stat-value">{formatHoursMinutes(data.study_time_today_minutes)}</div>
          <div className="stat-sub">Free time {formatHoursMinutes((data.weekly_goal_minutes / 7) - data.study_time_today_minutes > 0 ? (data.weekly_goal_minutes / 7) - data.study_time_today_minutes : 0)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Tasks Completed</div>
          <div className="stat-value">{data.tasks_completed_today}/{data.total_relevant_tasks}</div>
          <div className="stat-sub">{Math.round((data.tasks_completed_today / data.total_relevant_tasks) * 100)}% completion rate</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">study streak</div>
          <div className="stat-value">{data.study_streak} days</div>
          <div className="stat-sub">keep it up!</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Weekly goal</div>
          <div className="stat-value">{formatHoursMinutes(data.study_time_this_week_minutes)}</div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${Math.min(100, (data.study_time_this_week_minutes / data.weekly_goal_minutes) * 100)}%` }}
            ></div>
          </div>
          <div className="stat-sub" style={{ textAlign: "right", marginTop: "4px" }}>{formatHoursMinutes(data.weekly_goal_minutes)}</div>
        </div>
      </div>

      <div className="dashboard-main-content">
        <div className="subjects-section">
          <div className="subjects-header">
            <h2>Subject & Courses</h2>
            <button className="add-subject-btn" onClick={() => setIsModalOpen(true)}>+ Add Subject</button>
          </div>

          <div className="subjects-grid">
            {data.subjects.map(subject => (
              <div
                className="subject-card interactive"
                key={subject.id}
                onClick={() => setActiveSubject(subject)}
              >
                <div className="subject-card-header">
                  <span className="color-dot" style={{ backgroundColor: subject.color_code || '#cbd5e1' }}></span>
                  <h3>{subject.name}</h3>
                </div>

                <div className="subject-progress">
                  <div className="progress-labels">
                    <span>Weekly Progress</span>
                    <span>{formatHoursMinutes(subject.weekly_progress_minutes)}/{formatHoursMinutes(subject.weekly_goal_minutes)}</span>
                  </div>
                  <div className="progress-bar-container dark">
                    <div
                      className="progress-bar-fill dark-fill"
                      style={{ width: `${Math.min(100, (subject.weekly_progress_minutes / subject.weekly_goal_minutes) * 100)}%` }}
                    ></div>
                  </div>
                  <div className="progress-labels stats-row">
                    <span>Tasks {subject.completed_tasks}/{subject.total_tasks}</span>
                    <span>{subject.total_tasks > 0 ? Math.round((subject.completed_tasks / subject.total_tasks) * 100) : 0}%</span>
                  </div>
                  <div className="task-progress-container">
                    <div
                      className="task-progress-fill"
                      style={{ width: `${subject.total_tasks > 0 ? (subject.completed_tasks / subject.total_tasks) * 100 : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            {data.subjects.length === 0 && (
              <div className="text-gray-500">No subjects found.</div>
            )}
          </div>
        </div>

        <div className="timer-section">
          <div className="timer-card">
            <h3>Study Timer</h3>

            <div className="timer-tabs">
              <button
                className={`timer-tab ${timerMode === 'pomodoro' ? 'active' : ''}`}
                onClick={() => handleModeSwitch('pomodoro')}
              >
                Pomodoro
              </button>
              <button
                className={`timer-tab ${timerMode === 'stopwatch' ? 'active' : ''}`}
                onClick={() => handleModeSwitch('stopwatch')}
              >
                Stopwatch
              </button>
            </div>

            <div className="focus-badge">Focus Time</div>

            <div className="timer-display" style={{ marginBottom: "0.25rem" }}>
              {formatTime(timeLeft)}
            </div>

            {timerMode === 'pomodoro' && (
              <div style={{ marginBottom: "1rem", fontSize: "0.75rem", color: "#6b7280" }}>
                POMODORO DURATION:{' '}
                <input
                  type="number"
                  value={pomodoroDuration}
                  onChange={handleChangePomodoroDuration}
                  style={{ width: '50px', marginLeft: '5px', padding: '2px 4px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
                  min="1"
                  max="120"
                  disabled={isActive}
                /> min
              </div>
            )}

            <div className="sessions-completed" style={{ marginTop: timerMode === 'pomodoro' ? '0' : '1.5rem' }}>
              Sessions completed: {Math.floor(data.study_time_today_minutes / pomodoroDuration)}
            </div>

            <div className="timer-subject-select">
              <label>Course to Study</label>
              <select
                value={selectedCourse}
                onChange={(e) => setSelectedCourse(e.target.value)}
                disabled={isActive}
              >
                {data.subjects.map(s => (
                  <optgroup key={s.id} label={s.name}>
                    {s.courses.map(c => (
                      <option key={c.id} value={c.id}>{c.title}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <div className="timer-actions">
              <button className="start-btn" onClick={toggleTimer}>
                {isActive ? 'Stop' : '▶ Start'}
              </button>
              <button className="reset-btn" onClick={resetTimer}>
                X
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add New Subject Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setIsModalOpen(false)}>
          <div className="modal-content">
            <h2>Add New Subject / Course</h2>
            <form onSubmit={handleAddSubject}>
              <div className="form-group">
                <label>Subject Name</label>
                <input
                  type="text"
                  value={newSubjectName}
                  onChange={e => setNewSubjectName(e.target.value)}
                  required
                  placeholder="e.g. Mathematics"
                />
              </div>
              <div className="form-group">
                <label>Course Title</label>
                <input
                  type="text"
                  value={newCourseTitle}
                  onChange={e => setNewCourseTitle(e.target.value)}
                  required
                  placeholder="e.g. Calculus 101"
                />
              </div>
              <div className="form-group">
                <label>Number of Tasks</label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={newTasksCount}
                  onChange={e => setNewTasksCount(e.target.value)}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Cancel</button>
                <button type="submit" className="btn-submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Adding...' : 'Add Subject'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Subject Detailed Task Modal */}
      {activeSubject && (
        <div className="modal-overlay" onClick={(e) => e.target.className === 'modal-overlay' && setActiveSubject(null)}>
          <div className="modal-content task-details-modal">
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span className="color-dot" style={{ backgroundColor: activeSubject.color_code }}></span>
              {activeSubject.name} - Courses & Tasks
            </h2>
            <div className="courses-list">
              {activeSubject.courses.map(course => (
                <div key={course.id} className="course-block">
                  <h4 className="course-title">{course.title}</h4>
                  <div className="task-grid">
                    {course.tasks.map(task => (
                      <div
                        key={task.id}
                        className={`task-block ${task.status === 'completed' ? 'completed' : 'pending'}`}
                        onClick={() => {
                          if (task.status !== 'completed') {
                            handleCompleteTask(task.id);
                          }
                        }}
                      >
                        {task.status === 'completed' ? '✓' : '◯'} Task {task.id}
                      </div>
                    ))}
                    {course.tasks.length === 0 && <span className="text-gray-500 text-sm">No tasks</span>}
                  </div>
                </div>
              ))}
            </div>
            <div className="modal-actions">
              <button type="button" className="btn-cancel" onClick={() => setActiveSubject(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
