import React, { useEffect, useMemo, useState } from 'react';
import api from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Progress() {
    const [subjects, setSubjects] = useState([]);
    const [courses, setCourses] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [sessions, setSessions] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchProgressData();
    }, []);

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
            setCourses(coursesRes.data || []);
            setTasks(tasksRes.data || []);
            setSessions(sessionsRes.data || []);
        } catch (error) {
            console.error('Failed to load progress data:', error);
        } finally {
            setLoading(false);
        }
    };

    const weekRange = useMemo(() => {
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const start = new Date(today);
        const daysSinceSaturday = (today.getDay() + 1) % 7;
        start.setDate(today.getDate() - daysSinceSaturday);

        return Array.from({ length: 7 }, (_, index) => {
            const date = new Date(start);
            date.setDate(start.getDate() + index);
            return {
                key: formatDateKey(date),
                label: DAY_LABELS[date.getDay()],
                fullLabel: date.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' }),
                date,
            };
        });
    }, []);

    const courseMap = useMemo(() => {
        return courses.reduce((acc, course) => {
            acc[course.id] = course;
            return acc;
        }, {});
    }, [courses]);

    const subjectNameByCourseId = useMemo(() => {
        const map = {};
        courses.forEach((course) => {
            const subject = subjects.find((item) => item.id === course.subject_id);
            if (subject) {
                map[course.id] = subject.name;
            }
        });
        return map;
    }, [courses, subjects]);

    const weeklyStudyData = useMemo(() => {
        const minutesByDay = weekRange.reduce((acc, day) => {
            acc[day.key] = 0;
            return acc;
        }, {});

        sessions.forEach((session) => {
            const sessionDate = formatDateKey(new Date(session.start_time));
            if (minutesByDay[sessionDate] !== undefined) {
                minutesByDay[sessionDate] += session.duration_minutes;
            }
        });

        const maxMinutes = Math.max(...Object.values(minutesByDay), 1);

        return weekRange.map((day) => {
            const minutes = minutesByDay[day.key] || 0;
            return {
                ...day,
                minutes,
                hoursLabel: formatHours(minutes),
                percent: Math.max((minutes / maxMinutes) * 100, minutes > 0 ? 10 : 0),
            };
        });
    }, [sessions, weekRange]);

    const totalWeekMinutes = useMemo(() => {
        return weeklyStudyData.reduce((sum, day) => sum + day.minutes, 0);
    }, [weeklyStudyData]);

    const subjectTaskProgress = useMemo(() => {
        return subjects.map((subject) => {
            const subjectCourseIds = courses
                .filter((course) => course.subject_id === subject.id)
                .map((course) => course.id);

            const subjectTasks = tasks.filter((task) => {
                if (task.subject && task.subject.trim().toLowerCase() === subject.name.trim().toLowerCase()) {
                    return true;
                }

                return subjectCourseIds.includes(task.course_id);
            });

            const completedTasks = subjectTasks.filter((task) => task.status === 'completed');

            return {
                ...subject,
                totalTasks: subjectTasks.length,
                completedTasks,
                completedCount: completedTasks.length,
                completionPercent: subjectTasks.length > 0 ? (completedTasks.length / subjectTasks.length) * 100 : 0,
            };
        });
    }, [subjects, courses, tasks]);

    if (loading) {
        return (
            <div style={styles.page}>
                <h1 style={styles.title}>Progress Tracker</h1>
                <p style={styles.subtitle}>Loading your study progress...</p>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.hero}>
                <div>
                    <h1 style={styles.title}>Progress Tracker</h1>
                    <p style={styles.subtitle}>See weekly study time from the dashboard timer and completed tasks by subject.</p>
                </div>
                <div style={styles.heroStats}>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>This week</span>
                        <strong style={styles.statValue}>{formatHours(totalWeekMinutes)}</strong>
                    </div>
                    <div style={styles.statCard}>
                        <span style={styles.statLabel}>Completed tasks</span>
                        <strong style={styles.statValue}>{tasks.filter((task) => task.status === 'completed').length}</strong>
                    </div>
                </div>
            </div>

            <div style={styles.stack}>
                <section style={{ ...styles.panel, ...styles.topPanel }}>
                    <div style={styles.panelHeader}>
                        <div>
                            <h2 style={styles.panelTitle}>Weekly Study Time</h2>
                            <p style={styles.panelSubtitle}>Hours spent studying each day of this week.</p>
                        </div>
                    </div>

                    {sessions.length === 0 ? (
                        <div style={styles.emptyState}>No study sessions tracked yet. Use the dashboard timer to start logging study time.</div>
                    ) : (
                        <div style={styles.weeklyCard}>
                            <div style={styles.weeklySummaryRow}>
                                <div style={styles.weeklySummaryBlock}>
                                    <span style={styles.weeklySummaryLabel}>Total this week</span>
                                    <strong style={styles.weeklySummaryValue}>{formatHours(totalWeekMinutes)}</strong>
                                </div>
                                <div style={styles.weeklySummaryBlock}>
                                    <span style={styles.weeklySummaryLabel}>Active days</span>
                                    <strong style={styles.weeklySummaryValue}>
                                        {weeklyStudyData.filter((day) => day.minutes > 0).length}/7
                                    </strong>
                                </div>
                            </div>

                            <div style={styles.weeklyGrid}>
                                {weeklyStudyData.map((day) => (
                                    <div key={day.key} style={styles.dayTile}>
                                        <div style={styles.dayTileHeader}>
                                            <span style={styles.dayLabel}>{day.label}</span>
                                            <span style={styles.dayFullLabel}>{day.fullLabel}</span>
                                        </div>
                                        <div style={styles.dayValueOrb}>
                                            <strong style={styles.dayValue}>{day.hoursLabel}</strong>
                                            <span style={styles.dayValueHint}>
                                                {day.minutes > 0 ? `${day.minutes} min studied` : 'No study time'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </section>

                <section style={styles.panel}>
                    <div style={styles.panelHeader}>
                        <div>
                            <h2 style={styles.panelTitle}>Task Complete Tracker</h2>
                            <p style={styles.panelSubtitle}>Completed tasks grouped by subject.</p>
                        </div>
                    </div>

                    {subjects.length === 0 ? (
                        <div style={styles.emptyState}>No subjects added yet.</div>
                    ) : (
                        <div style={styles.subjectList}>
                            {subjectTaskProgress.map((subject) => (
                                <article key={subject.id} style={styles.subjectCard}>
                                    <div style={styles.subjectHeader}>
                                        <div style={styles.subjectTitleRow}>
                                            <span style={{ ...styles.subjectDot, backgroundColor: subject.color_code || '#94a3b8' }} />
                                            <h3 style={styles.subjectTitle}>{subject.name}</h3>
                                        </div>
                                        <span style={styles.subjectMeta}>
                                            {subject.completedCount}/{subject.totalTasks || 0} done
                                        </span>
                                    </div>

                                    <div style={styles.progressTrack}>
                                        <div style={{ ...styles.progressFill, width: `${subject.completionPercent}%` }} />
                                    </div>

                                    {subject.completedCount === 0 ? (
                                        <p style={styles.subjectEmpty}>No completed tasks yet for this subject.</p>
                                    ) : (
                                        <div style={styles.completedTaskList}>
                                            {subject.completedTasks.map((task) => (
                                                <div key={task.id} style={styles.completedTaskItem}>
                                                    <div>
                                                        <strong style={styles.completedTaskTitle}>{task.title}</strong>
                                                        <p style={styles.completedTaskMeta}>
                                                            {courseMap[task.course_id]?.title || subjectNameByCourseId[task.course_id] || 'Study task'}
                                                        </p>
                                                    </div>
                                                    <span style={styles.completedBadge}>Completed</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function formatHours(minutes) {
    const hours = minutes / 60;
    if (hours === 0) return '0h';
    if (hours < 1) return `${minutes}m`;
    return `${hours.toFixed(hours % 1 === 0 ? 0 : 1)}h`;
}

const styles = {
    page: {
        minHeight: '100vh',
        padding: '2rem',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef6ff 100%)',
        color: '#0f172a',
    },
    hero: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        gap: '1rem',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
    },
    title: {
        fontSize: '2.4rem',
        fontWeight: 800,
        margin: 0,
        letterSpacing: '-0.04em',
    },
    subtitle: {
        margin: '0.5rem 0 0',
        color: '#475569',
        fontSize: '1rem',
        maxWidth: '58rem',
    },
    heroStats: {
        display: 'flex',
        gap: '0.9rem',
        flexWrap: 'wrap',
    },
    statCard: {
        minWidth: '160px',
        padding: '1rem 1.1rem',
        borderRadius: '1rem',
        background: 'linear-gradient(135deg, #0f172a 0%, #2563eb 100%)',
        color: '#f8fafc',
        boxShadow: '0 20px 40px rgba(37, 99, 235, 0.18)',
    },
    statLabel: {
        display: 'block',
        fontSize: '0.75rem',
        letterSpacing: '0.1em',
        textTransform: 'uppercase',
        color: 'rgba(255,255,255,0.7)',
        marginBottom: '0.35rem',
    },
    statValue: {
        fontSize: '1.6rem',
        fontWeight: 800,
    },
    grid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '1.5rem',
    },
    stack: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1.5rem',
    },
    panel: {
        padding: '1.25rem',
        borderRadius: '1.5rem',
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
        backdropFilter: 'blur(10px)',
    },
    topPanel: {
        maxWidth: '100%',
    },
    panelHeader: {
        marginBottom: '1.1rem',
    },
    panelTitle: {
        margin: 0,
        fontSize: '1.25rem',
        fontWeight: 700,
    },
    panelSubtitle: {
        margin: '0.35rem 0 0',
        color: '#64748b',
        fontSize: '0.92rem',
    },
    weeklyCard: {
        padding: '1.1rem',
        borderRadius: '1.25rem',
        background: 'linear-gradient(180deg, #f8fbff 0%, #eef4ff 100%)',
        border: '1px solid #dbeafe',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.7)',
    },
    weeklySummaryRow: {
        display: 'flex',
        gap: '0.85rem',
        marginBottom: '1rem',
        flexWrap: 'wrap',
    },
    weeklySummaryBlock: {
        minWidth: '160px',
        padding: '0.9rem 1rem',
        borderRadius: '1rem',
        background: 'rgba(255,255,255,0.72)',
        border: '1px solid rgba(191, 219, 254, 0.95)',
    },
    weeklySummaryLabel: {
        display: 'block',
        fontSize: '0.78rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#64748b',
        marginBottom: '0.25rem',
    },
    weeklySummaryValue: {
        fontSize: '1.35rem',
        fontWeight: 800,
        color: '#0f172a',
    },
    weeklyGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: '0.75rem',
        overflowX: 'auto',
        paddingBottom: '0.25rem',
    },
    dayTile: {
        minWidth: '120px',
        padding: '0.9rem 0.95rem',
        borderRadius: '1rem',
        background: 'rgba(255,255,255,0.7)',
        border: '1px solid rgba(191, 219, 254, 0.9)',
        boxShadow: '0 14px 30px rgba(59, 130, 246, 0.08)',
    },
    dayTileHeader: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.18rem',
        marginBottom: '1rem',
    },
    dayValueOrb: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '124px',
        padding: '1rem 0.75rem',
        borderRadius: '1rem',
        background: 'radial-gradient(circle at top, rgba(191, 219, 254, 0.95) 0%, rgba(239, 246, 255, 0.9) 52%, rgba(255,255,255,0.95) 100%)',
        border: '1px solid rgba(191, 219, 254, 0.95)',
    },
    dayLabel: {
        fontWeight: 800,
        color: '#0f172a',
        letterSpacing: '-0.02em',
    },
    dayFullLabel: {
        fontSize: '0.78rem',
        color: '#64748b',
    },
    dayValue: {
        fontSize: '1.35rem',
        fontWeight: 800,
        color: '#1d4ed8',
        lineHeight: 1,
    },
    dayValueHint: {
        marginTop: '0.5rem',
        fontSize: '0.76rem',
        color: '#64748b',
        textAlign: 'center',
        lineHeight: 1.35,
    },
    subjectList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
    },
    subjectCard: {
        padding: '1rem',
        borderRadius: '1.1rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
    },
    subjectHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '0.75rem',
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
    },
    subjectTitleRow: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.6rem',
    },
    subjectDot: {
        width: '0.8rem',
        height: '0.8rem',
        borderRadius: '999px',
        flexShrink: 0,
    },
    subjectTitle: {
        margin: 0,
        fontSize: '1rem',
        fontWeight: 700,
    },
    subjectMeta: {
        color: '#475569',
        fontSize: '0.84rem',
        fontWeight: 600,
    },
    progressTrack: {
        height: '0.7rem',
        borderRadius: '999px',
        background: '#dbeafe',
        overflow: 'hidden',
        marginBottom: '0.85rem',
    },
    progressFill: {
        height: '100%',
        borderRadius: '999px',
        background: 'linear-gradient(90deg, #22c55e 0%, #16a34a 100%)',
    },
    completedTaskList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
    },
    completedTaskItem: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '0.75rem',
        alignItems: 'center',
        padding: '0.8rem 0.9rem',
        borderRadius: '0.9rem',
        background: '#ffffff',
        border: '1px solid #dcfce7',
    },
    completedTaskTitle: {
        display: 'block',
        color: '#0f172a',
        marginBottom: '0.15rem',
    },
    completedTaskMeta: {
        margin: 0,
        fontSize: '0.8rem',
        color: '#64748b',
    },
    completedBadge: {
        padding: '0.35rem 0.65rem',
        borderRadius: '999px',
        background: '#dcfce7',
        color: '#166534',
        fontSize: '0.74rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
    },
    subjectEmpty: {
        margin: 0,
        color: '#64748b',
        fontSize: '0.9rem',
    },
    emptyState: {
        padding: '1.2rem',
        borderRadius: '1rem',
        background: '#f8fafc',
        border: '1px dashed #cbd5e1',
        color: '#64748b',
        textAlign: 'center',
    },
};
