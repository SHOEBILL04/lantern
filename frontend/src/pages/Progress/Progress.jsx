import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import './Progress.css';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Progress() {
    const [subjects, setSubjects]   = useState([]);
    const [courses,  setCourses]    = useState([]);
    const [tasks,    setTasks]      = useState([]);
    const [sessions, setSessions]   = useState([]);
    const [loading,  setLoading]    = useState(true);
    const [expandedSubjects, setExpandedSubjects] = useState({});

    useEffect(() => { fetchProgressData(); }, []);

    const fetchProgressData = async () => {
        setLoading(true);
        try {
            const [subjectsRes, coursesRes, tasksRes, sessionsRes] = await Promise.all([
                api.get('/subjects'),
                api.get('/courses'),
                api.get(ENDPOINTS.TASKS),
                api.get('/study-sessions'),
            ]);
            setSubjects(subjectsRes.data || []);
            setCourses(coursesRes.data  || []);
            setTasks(tasksRes.data      || []);
            setSessions(sessionsRes.data || []);
        } catch (err) {
            console.error('Failed to load progress data:', err);
        } finally {
            setLoading(false);
        }
    };

    const weekRange = useMemo(() => {
        const now   = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start = new Date(today);
        const daysSinceMonday = (today.getDay() + 6) % 7;
        start.setDate(today.getDate() - daysSinceMonday);
        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(start);
            date.setDate(start.getDate() + i);
            return { key: formatDateKey(date), label: DAY_LABELS[date.getDay()] };
        });
    }, []);

    const courseMap = useMemo(() =>
        courses.reduce((acc, c) => { acc[c.id] = c; return acc; }, {}),
    [courses]);

    const subjectNameByCourseId = useMemo(() => {
        const map = {};
        courses.forEach((c) => {
            const subj = subjects.find((s) => s.id === c.subject_id);
            if (subj) map[c.id] = subj.name;
        });
        return map;
    }, [courses, subjects]);

    const weeklyStudyData = useMemo(() => {
        const minutesByDay = weekRange.reduce((acc, d) => { acc[d.key] = 0; return acc; }, {});
        sessions.forEach((s) => {
            const key = formatDateKey(new Date(s.start_time));
            if (minutesByDay[key] !== undefined) minutesByDay[key] += s.duration_minutes;
        });
        const maxMin = Math.max(...Object.values(minutesByDay), 1);
        return weekRange.map((day) => {
            const minutes = minutesByDay[day.key] || 0;
            return { ...day, minutes, hoursLabel: formatHours(minutes),
                percent: Math.max((minutes / maxMin) * 100, minutes > 0 ? 5 : 0) };
        });
    }, [sessions, weekRange]);

    const totalWeekMinutes = useMemo(() => weeklyStudyData.reduce((s, d) => s + d.minutes, 0), [weeklyStudyData]);
    const activeDays       = useMemo(() => weeklyStudyData.filter((d) => d.minutes > 0).length, [weeklyStudyData]);
    const completedCount   = useMemo(() => tasks.filter((t) => t.status === 'completed').length, [tasks]);
    const totalCount       = tasks.length;
    const taskPercent      = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
    const todayKey         = formatDateKey(new Date());

    const subjectTaskProgress = useMemo(() => subjects.map((subject) => {
        const ids = courses.filter((c) => c.subject_id === subject.id).map((c) => c.id);
        const subjectTasks = tasks.filter((t) =>
            (t.subject && t.subject.trim().toLowerCase() === subject.name.trim().toLowerCase()) ||
            ids.includes(t.course_id)
        );
        const completedTasks = subjectTasks.filter((t) => t.status === 'completed');
        return { ...subject, totalTasks: subjectTasks.length, completedTasks,
            completedCount: completedTasks.length,
            completionPercent: subjectTasks.length > 0 ? (completedTasks.length / subjectTasks.length) * 100 : 0 };
    }), [subjects, courses, tasks]);

    const toggleSubject = (id) =>
        setExpandedSubjects((prev) => ({ ...prev, [id]: !prev[id] }));

    /* ─── SKELETON LOADER ─────────────────────── */
    if (loading) return (
        <div className="dashboard-root font-sans pt-page">
            <style>{`
                @keyframes shimmer {
                    0%   { background-position: -600px 0; }
                    100% { background-position:  600px 0; }
                }
                .skeleton {
                    background: linear-gradient(90deg, #161b22 25%, #1e2530 50%, #161b22 75%);
                    background-size: 600px 100%;
                    animation: shimmer 1.6s infinite linear;
                    border-radius: 6px;
                }
            `}</style>

            {/* Header */}
            <div className="pt-sk-header">
                <div className="skeleton" style={{ height: '2.4rem', width: '16rem', marginBottom: '0.6rem', borderRadius: 8 }} />
                <div className="skeleton" style={{ height: '0.85rem', width: '22rem', maxWidth: '100%', borderRadius: 4 }} />
            </div>

            {/* Stat cards */}
            <div className="pt-stat-row">
                {[0, 1, 2].map((i) => (
                    <div key={i} className="pt-stat-card" style={{ pointerEvents: 'none' }}>
                        <div className={`pt-sk-accent pt-sk-accent-${i}`} />
                        <div className="skeleton" style={{ width: 40, height: 40, borderRadius: '0.6rem', flexShrink: 0 }} />
                        <div style={{ flex: 1 }}>
                            <div className="skeleton" style={{ height: '0.6rem', width: '7rem', marginBottom: '0.65rem', borderRadius: 4 }} />
                            <div className="skeleton" style={{ height: '1.6rem', width: '5rem', borderRadius: 6 }} />
                        </div>
                    </div>
                ))}
            </div>

            {/* Chart panel */}
            <div className="pt-panel pt-chart-panel">
                <div className="skeleton" style={{ height: '1rem', width: '11rem', marginBottom: '0.55rem' }} />
                <div className="skeleton" style={{ height: '0.75rem', width: '9rem', marginBottom: '1.5rem' }} />
                <div className="pt-bar-chart">
                    <div className="pt-bar-chart__bars">
                        {[55, 100, 12, 0, 38, 0, 0].map((h, i) => (
                            <div key={i} className="pt-bar-col">
                                <div className="skeleton pt-bar-track" style={{ height: `${Math.max(h, 8)}%`, flex: 'none' }} />
                                <div className="skeleton pt-bar-day-box" style={{ border: 'none' }} />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Subject list panel */}
            <div className="pt-panel">
                <div className="skeleton" style={{ height: '1rem', width: '11rem', marginBottom: '0.55rem' }} />
                <div className="skeleton" style={{ height: '0.75rem', width: '9rem', marginBottom: '1.5rem' }} />
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="pt-subject-card" style={{ marginBottom: '0.6rem', padding: '0.9rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', pointerEvents: 'none' }}>
                        <div className="skeleton" style={{ width: 9, height: 9, borderRadius: '50%', flexShrink: 0 }} />
                        <div className="skeleton" style={{ height: '0.8rem', width: `${[130, 95, 115][i]}px`, borderRadius: 4 }} />
                        <div style={{ flex: 1 }} />
                        <div className="skeleton" style={{ height: 5, width: 80, borderRadius: 999 }} />
                    </div>
                ))}
            </div>
        </div>
    );

    /* ─── MAIN RENDER ──────────────────────────── */
    return (
        <div className="dashboard-root pt-page font-sans">

            {/* Header */}
            <header className="pt-header anim-section" style={{ '--delay': '0ms' }}>
                <h1 className="font-display pt-title">Progress Tracker</h1>
                <p className="font-sans pt-subtitle">Your weekly study insights and task completion at a glance.</p>
            </header>

            {/* Stat Cards */}
            <div className="pt-stat-row anim-section" style={{ '--delay': '60ms' }}>

                <div className="stat-card stat-card-anim pt-stat-card" style={{ '--card-delay': '80ms' }}>
                    <div className="pt-stat-icon pt-stat-icon--blue">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                        </svg>
                    </div>
                    <div>
                        <p className="font-sans pt-stat-label">STUDY TIME THIS WEEK</p>
                        <div className="pt-stat-value-row">
                            <strong className="font-display pt-stat-value">{formatHours(totalWeekMinutes)}</strong>
                        </div>
                    </div>
                </div>

                <div className="stat-card stat-card-anim pt-stat-card" style={{ '--card-delay': '130ms' }}>
                    <div className="pt-stat-icon pt-stat-icon--green">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
                        </svg>
                    </div>
                    <div>
                        <p className="font-sans pt-stat-label">TASKS COMPLETED</p>
                        <div className="pt-stat-value-row">
                            <strong className="font-display pt-stat-value">{completedCount}/{totalCount}</strong>
                            <span className="font-sans pt-stat-note">{taskPercent}% done</span>
                        </div>
                    </div>
                </div>

                <div className="stat-card stat-card-anim pt-stat-card" style={{ '--card-delay': '180ms' }}>
                    <div className="pt-stat-icon pt-stat-icon--yellow">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>
                        </svg>
                    </div>
                    <div>
                        <p className="font-sans pt-stat-label">ACTIVE DAYS</p>
                        <div className="pt-stat-value-row">
                            <strong className="font-display pt-stat-value">{activeDays}/7</strong>
                            <span className="font-sans pt-stat-note">days this week</span>
                        </div>
                    </div>
                </div>

            </div>

            {/* Weekly Bar Chart */}
            <section className="pt-panel pt-chart-panel anim-section" style={{ '--delay': '280ms' }}>
                <div className="pt-panel-header">
                    <h2 className="font-display pt-panel-title">Weekly Study Time</h2>
                    <p className="font-sans pt-panel-sub">Hours studied each day this week.</p>
                </div>

                {sessions.length === 0 ? (
                    <div className="pt-empty font-sans">No study sessions tracked yet. Use the dashboard timer to start logging study time.</div>
                ) : (
                    <div className="pt-bar-chart">
                        <div className="pt-bar-chart__bars">
                            {weeklyStudyData.map((day) => {
                                const isToday = day.key === todayKey;
                                return (
                                    <div key={day.key} className={`pt-bar-col${isToday ? ' pt-bar-col--today' : ''}`}>
                                        <span className="font-sans pt-bar-label-top">
                                            {day.minutes > 0 ? day.hoursLabel : ''}
                                        </span>
                                        <div className="pt-bar-track">
                                            <div
                                                className={`pt-bar-fill${day.minutes > 0 ? ' pt-bar-fill--active' : ''}${isToday ? ' pt-bar-fill--today' : ''}`}
                                                style={{ height: `${day.percent}%` }}
                                            />
                                        </div>
                                        <div className={`pt-bar-day-box${isToday ? ' pt-bar-day-box--today' : ''}`}>
                                            <span className={`font-sans pt-bar-day-name${isToday ? ' pt-bar-day-name--today' : ''}`}>
                                                {day.label}
                                            </span>
                                            <span className="font-sans pt-bar-day-min">
                                                {day.minutes > 0 ? `${day.minutes}m` : '—'}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </section>

            {/* Task Complete Tracker */}
            <section className="pt-panel anim-section" style={{ '--delay': '360ms' }}>
                <div className="pt-panel-header">
                    <h2 className="font-display pt-panel-title">Task Complete Tracker</h2>
                    <p className="font-sans pt-panel-sub">Completed tasks grouped by subject.</p>
                </div>

                {subjects.length === 0 ? (
                    <div className="pt-empty font-sans">No subjects added yet.</div>
                ) : (
                    <div className="pt-subject-list">
                        {subjectTaskProgress.map((subject, idx) => {
                            const isOpen = expandedSubjects[subject.id] === true;
                            return (
                                <article
                                    key={subject.id}
                                    className="subject-card-anim pt-subject-card"
                                    style={{ '--subject-delay': `${380 + idx * 60}ms` }}
                                >
                                    <button
                                        className="pt-subject-header"
                                        onClick={() => toggleSubject(subject.id)}
                                        aria-expanded={isOpen}
                                    >
                                        <div className="pt-subject-title-row">
                                            <span
                                                className="pt-subject-dot"
                                                style={{ backgroundColor: subject.completedCount > 0 ? (subject.color_code || '#4ade80') : '#374151' }}
                                            />
                                            <span className="font-display pt-subject-name">{subject.name}</span>
                                            <svg
                                                className={`pt-chevron${isOpen ? ' pt-chevron--open' : ''}`}
                                                width="15" height="15" viewBox="0 0 24 24" fill="none"
                                                stroke="currentColor" strokeWidth="2.5"
                                                strokeLinecap="round" strokeLinejoin="round"
                                            >
                                                <polyline points="6 9 12 15 18 9"/>
                                            </svg>
                                        </div>
                                        <div className="pt-subject-right">
                                            {subject.completedCount > 0 ? (
                                                <div className="pt-subject-progress-bar">
                                                    <div
                                                        className="pt-subject-progress-fill progress-fill"
                                                        style={{
                                                            width: `${subject.completionPercent}%`,
                                                            backgroundColor: subject.color_code || '#4ade80',
                                                        }}
                                                    />
                                                </div>
                                            ) : (
                                                <span className="font-sans pt-subject-count">
                                                    {subject.completedCount}/{subject.totalTasks}
                                                </span>
                                            )}
                                        </div>
                                    </button>

                                    {isOpen && (
                                        <div className="pt-task-list">
                                            {subject.completedCount === 0 ? (
                                                <p className="font-sans pt-task-empty">No completed tasks yet.</p>
                                            ) : (
                                                subject.completedTasks.map((task) => (
                                                    <div key={task.id} className="pt-task-item">
                                                        <span className="pt-task-dot" style={{ backgroundColor: subject.color_code || '#4ade80' }} />
                                                        <div className="pt-task-info">
                                                            <strong className="font-sans pt-task-title">{task.title}</strong>
                                                            <p className="font-sans pt-task-meta">
                                                                {courseMap[task.course_id]?.title || subjectNameByCourseId[task.course_id] || 'Study task'}
                                                            </p>
                                                        </div>
                                                        <span className="font-sans pt-done-badge">
                                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                                                <polyline points="20 6 9 17 4 12"/>
                                                            </svg>
                                                            Done
                                                        </span>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    )}
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

        </div>
    );
}

function formatDateKey(date) {
    const y = date.getFullYear();
    const m = `${date.getMonth() + 1}`.padStart(2, '0');
    const d = `${date.getDate()}`.padStart(2, '0');
    return `${y}-${m}-${d}`;
}

function formatHours(minutes) {
    const h = minutes / 60;
    if (h === 0) return '0h';
    if (h < 1)   return `${minutes}m`;
    return `${h.toFixed(h % 1 === 0 ? 0 : 1)}h`;
}
