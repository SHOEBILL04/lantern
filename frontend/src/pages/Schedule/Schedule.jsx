import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Schedule() {
    const [subjects, setSubjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [draggedTaskId, setDraggedTaskId] = useState(null);
    const dragStateRef = useRef({ taskId: null, originalDueDate: null, droppedOnCalendar: false });

    const today = useMemo(() => {
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }, []);

    const monthLabel = useMemo(() => today.toLocaleDateString(undefined, {
        month: 'long',
        year: 'numeric',
    }), [today]);

    useEffect(() => {
        fetchScheduleData();
    }, []);

    const fetchScheduleData = async () => {
        setLoading(true);
        try {
            const [subjectsRes, tasksRes, coursesRes] = await Promise.all([
                api.get('/subjects'),
                api.get(ENDPOINTS.TASKS),
                api.get('/courses'),
            ]);

            setSubjects(subjectsRes.data || []);
            setTasks(tasksRes.data || []);
            setCourses(coursesRes.data || []);
        } catch (error) {
            console.error('Failed to load schedule data:', error);
        } finally {
            setLoading(false);
        }
    };

    const courseMap = useMemo(() => {
        return courses.reduce((acc, course) => {
            acc[course.id] = course;
            return acc;
        }, {});
    }, [courses]);

    const subjectGroups = useMemo(() => {
        const activeTasks = tasks.filter((task) => task.status !== 'completed');

        return subjects.map((subject) => {
            const subjectCourseIds = courses
                .filter((course) => course.subject_id === subject.id)
                .map((course) => course.id);

            const subjectTasks = activeTasks.filter((task) => {
                if (task.subject && task.subject.trim().toLowerCase() === subject.name.trim().toLowerCase()) {
                    return true;
                }

                return subjectCourseIds.includes(task.course_id);
            });

            return {
                ...subject,
                tasks: sortTasksByDisplayOrder(subjectTasks),
            };
        });
    }, [subjects, tasks, courses]);

    const unscheduledGroups = useMemo(() => {
        return subjectGroups.map((subject) => ({
            ...subject,
            tasks: subject.tasks.filter((task) => !task.due_date),
        })).filter((subject) => subject.tasks.length > 0);
    }, [subjectGroups]);

    const tasksByDate = useMemo(() => {
        const groupedTasks = tasks.reduce((acc, task) => {
            if (task.status === 'completed') return acc;
            if (!task.due_date) return acc;
            if (!acc[task.due_date]) acc[task.due_date] = [];
            acc[task.due_date].push(task);
            return acc;
        }, {});

        Object.keys(groupedTasks).forEach((dateKey) => {
            groupedTasks[dateKey] = sortTasksByDisplayOrder(groupedTasks[dateKey]);
        });

        return groupedTasks;
    }, [tasks]);

    const calendarDays = useMemo(() => {
        const year = today.getFullYear();
        const month = today.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);
        const leadingEmpty = firstDay.getDay();
        const totalDays = lastDay.getDate();
        const totalCells = Math.ceil((leadingEmpty + totalDays) / 7) * 7;

        return Array.from({ length: totalCells }, (_, index) => {
            const dayNumber = index - leadingEmpty + 1;
            if (dayNumber < 1 || dayNumber > totalDays) {
                return null;
            }

            const date = new Date(year, month, dayNumber);
            const dateKey = formatDateKey(date);
            const isPast = date < today;
            const isToday = date.getTime() === today.getTime();

            return {
                date,
                dateKey,
                dayNumber,
                isPast,
                isToday,
                tasks: tasksByDate[dateKey] || [],
            };
        });
    }, [tasksByDate, today]);

    const handleTaskDrop = async (dateKey) => {
        if (!draggedTaskId) return;

        const task = tasks.find((item) => item.id === draggedTaskId);
        if (!task || task.due_date === dateKey) {
            dragStateRef.current = { taskId: null, originalDueDate: null, droppedOnCalendar: false };
            setDraggedTaskId(null);
            return;
        }

        dragStateRef.current = {
            ...dragStateRef.current,
            droppedOnCalendar: true,
        };

        setTasks((currentTasks) => currentTasks.map((item) => (
            item.id === draggedTaskId ? { ...item, due_date: dateKey } : item
        )));

        try {
            await api.patch(`${ENDPOINTS.TASKS}/${draggedTaskId}`, { due_date: dateKey });
        } catch (error) {
            console.error('Failed to reschedule task:', error);
            setTasks((currentTasks) => currentTasks.map((item) => (
                item.id === draggedTaskId ? { ...item, due_date: task.due_date || null } : item
            )));
        } finally {
            dragStateRef.current = { taskId: null, originalDueDate: null, droppedOnCalendar: false };
            setDraggedTaskId(null);
        }
    };

    const handleTaskDragStart = (task) => {
        dragStateRef.current = {
            taskId: task.id,
            originalDueDate: task.due_date || null,
            droppedOnCalendar: false,
        };
        setDraggedTaskId(task.id);
    };

    const handleTaskDragEnd = async (task) => {
        const dragState = dragStateRef.current;

        if (!dragState.droppedOnCalendar && dragState.originalDueDate) {
            setTasks((currentTasks) => currentTasks.map((item) => (
                item.id === task.id ? { ...item, due_date: null } : item
            )));

            try {
                await api.patch(`${ENDPOINTS.TASKS}/${task.id}`, { due_date: null });
            } catch (error) {
                console.error('Failed to remove task from schedule:', error);
                setTasks((currentTasks) => currentTasks.map((item) => (
                    item.id === task.id ? { ...item, due_date: dragState.originalDueDate } : item
                )));
            }
        }

        dragStateRef.current = { taskId: null, originalDueDate: null, droppedOnCalendar: false };
        setDraggedTaskId(null);
    };

    if (loading) {
        return (
            <div style={styles.page}>
                <h1 style={styles.title}>Schedule</h1>
                <p style={styles.subtitle}>Loading your schedule...</p>
            </div>
        );
    }

    return (
        <div style={styles.page}>
            <div style={styles.hero}>
                <div>
                    <h1 style={styles.title}>Schedule</h1>
                    <p style={styles.subtitle}>Drag tasks from each subject onto a date from today onward.</p>
                </div>
                <div style={styles.todayBadge}>
                    <span style={styles.todayLabel}>Today</span>
                    <strong>{today.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                </div>
            </div>

            <div style={styles.layout}>
                <aside style={styles.sidebar}>
                    <div style={styles.sidebarHeader}>
                        <h2 style={styles.sectionTitle}>Subjects</h2>
                        <span style={styles.sectionMeta}>{subjects.length} total</span>
                    </div>

                    {subjectGroups.length === 0 ? (
                        <div style={styles.emptyPanel}>No subjects added yet.</div>
                    ) : (
                        <div style={styles.subjectList}>
                            {subjectGroups.map((subject) => (
                                <div key={subject.id} style={styles.subjectCard}>
                                    <div style={styles.subjectHeaderRow}>
                                        <div style={styles.subjectHeading}>
                                            <span style={{ ...styles.subjectDot, backgroundColor: subject.color_code || '#94a3b8' }} />
                                            <h3 style={styles.subjectName}>{subject.name}</h3>
                                        </div>
                                        <span style={styles.subjectCount}>{subject.tasks.length} tasks</span>
                                    </div>

                                    {subject.tasks.length === 0 ? (
                                        <p style={styles.mutedText}>All tasks completed.</p>
                                    ) : (
                                        <div style={styles.taskStack}>
                                            {subject.tasks.map((task, index) => (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={() => handleTaskDragStart(task)}
                                                    onDragEnd={() => handleTaskDragEnd(task)}
                                                    style={{
                                                        ...styles.taskChip,
                                                        ...(draggedTaskId === task.id ? styles.taskChipDragging : {}),
                                                    }}
                                                >
                                                    <span style={styles.taskChipSubject}>{subject.name}</span>
                                                    <strong style={styles.taskChipTitle}>
                                                        {getTaskDisplayLabel(task)}
                                                    </strong>
                                                    <span style={styles.taskChipMeta}>
                                                        {courseMap[task.course_id]?.title || task.title || `Task ${index + 1}`}
                                                    </span>
                                                    {task.due_date && (
                                                        <span style={styles.taskChipDate}>Scheduled: {task.due_date}</span>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {subjects.length > 0 && unscheduledGroups.length === 0 && (
                        <div style={styles.noteCard}>
                            Every task is already placed on a date.
                        </div>
                    )}
                </aside>

                <section style={styles.calendarPanel}>
                    <div style={styles.calendarHeader}>
                        <div>
                            <h2 style={styles.sectionTitle}>Calendar</h2>
                            <p style={styles.calendarSubtext}>{monthLabel}</p>
                        </div>
                        <div style={styles.calendarLegend}>
                            <span style={styles.legendPill}>Current month</span>
                            <span style={styles.legendPill}>Drop on today or later</span>
                        </div>
                    </div>

                    <div style={styles.calendarScroll}>
                        <div style={styles.calendarFrame}>
                            <div style={styles.weekdayRow}>
                                {DAYS.map((day) => (
                                    <div key={day} style={styles.weekdayCell}>{day}</div>
                                ))}
                            </div>

                            <div style={styles.calendarGrid}>
                                {calendarDays.map((day, index) => {
                                    if (!day) {
                                        return <div key={`empty-${index}`} style={styles.emptyCalendarCell} />;
                                    }

                                    return (
                                        <div
                                            key={day.dateKey}
                                            onDragOver={(event) => {
                                                if (!day.isPast) event.preventDefault();
                                            }}
                                            onDrop={() => {
                                                if (!day.isPast) handleTaskDrop(day.dateKey);
                                            }}
                                            style={{
                                                ...styles.dayCell,
                                                ...(day.isToday ? styles.todayCell : {}),
                                                ...(day.isPast ? styles.pastCell : {}),
                                            }}
                                        >
                                            <div style={styles.dayCellHeader}>
                                                <span style={{
                                                    ...styles.dayNumber,
                                                    ...(day.isToday ? styles.todayNumber : {}),
                                                }}>
                                                    {day.dayNumber}
                                                </span>
                                                {!day.isPast && <span style={styles.dropHint}>Drop here</span>}
                                            </div>

                                            <div style={styles.dayTaskList}>
                                                {day.tasks.length === 0 ? (
                                                    <span style={styles.emptyDateText}>
                                                        {day.isPast ? 'Past date' : 'No tasks'}
                                                    </span>
                                                ) : (
                                                    day.tasks.map((task) => (
                                                        <div
                                                            key={task.id}
                                                            draggable={!day.isPast}
                                                            onDragStart={() => handleTaskDragStart(task)}
                                                            onDragEnd={() => handleTaskDragEnd(task)}
                                                            style={styles.dayTaskCard}
                                                        >
                                                            <span style={styles.dayTaskSubject}>
                                                                {task.subject || findSubjectName(task, subjectGroups) || 'General'}
                                                            </span>
                                                            <strong style={styles.dayTaskTitle}>{getTaskDisplayLabel(task)}</strong>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}

function findSubjectName(task, subjectGroups) {
    const match = subjectGroups.find((subject) => subject.tasks.some((item) => item.id === task.id));
    return match?.name || '';
}

function formatDateKey(date) {
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, '0');
    const day = `${date.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function getTaskDisplayLabel(task) {
    if (!task?.title) return 'Untitled Task';

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
        return left.id - right.id;
    });
}

const styles = {
    page: {
        minHeight: '100vh',
        padding: '2rem',
        background: 'linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)',
        color: '#0f172a',
    },
    hero: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1rem',
        alignItems: 'flex-start',
        marginBottom: '1.75rem',
        flexWrap: 'wrap',
    },
    title: {
        fontSize: '2.5rem',
        lineHeight: 1.05,
        margin: 0,
        fontWeight: 800,
        letterSpacing: '-0.04em',
    },
    subtitle: {
        margin: '0.5rem 0 0',
        color: '#475569',
        fontSize: '1rem',
    },
    todayBadge: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.35rem',
        minWidth: '180px',
        padding: '1rem 1.1rem',
        borderRadius: '1rem',
        background: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 100%)',
        color: '#f8fafc',
        boxShadow: '0 18px 45px rgba(29, 78, 216, 0.18)',
    },
    todayLabel: {
        fontSize: '0.75rem',
        textTransform: 'uppercase',
        letterSpacing: '0.14em',
        color: 'rgba(255,255,255,0.74)',
    },
    layout: {
        display: 'grid',
        gridTemplateColumns: 'minmax(260px, 1fr) minmax(0, 2fr)',
        gap: '1.5rem',
        alignItems: 'start',
    },
    sidebar: {
        display: 'flex',
        flexDirection: 'column',
        gap: '1rem',
        padding: '1.25rem',
        borderRadius: '1.5rem',
        background: 'rgba(255,255,255,0.86)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
        backdropFilter: 'blur(12px)',
        maxHeight: 'calc(100vh - 10rem)',
        overflowY: 'auto',
    },
    sidebarHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: '1rem',
    },
    sectionTitle: {
        margin: 0,
        fontSize: '1.25rem',
        fontWeight: 700,
    },
    sectionMeta: {
        fontSize: '0.875rem',
        color: '#64748b',
    },
    subjectList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.9rem',
    },
    subjectCard: {
        padding: '1rem',
        borderRadius: '1.15rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
    },
    subjectHeaderRow: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '0.75rem',
        alignItems: 'center',
        marginBottom: '0.85rem',
    },
    subjectHeading: {
        display: 'flex',
        alignItems: 'center',
        gap: '0.65rem',
        minWidth: 0,
    },
    subjectDot: {
        width: '0.8rem',
        height: '0.8rem',
        borderRadius: '999px',
        flexShrink: 0,
    },
    subjectName: {
        margin: 0,
        fontSize: '1rem',
        fontWeight: 700,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
    },
    subjectCount: {
        fontSize: '0.8rem',
        color: '#475569',
        whiteSpace: 'nowrap',
    },
    taskStack: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.65rem',
    },
    taskChip: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.22rem',
        padding: '0.8rem 0.9rem',
        borderRadius: '0.9rem',
        background: 'linear-gradient(135deg, #ffffff 0%, #eff6ff 100%)',
        border: '1px solid #bfdbfe',
        cursor: 'grab',
        boxShadow: '0 10px 20px rgba(59, 130, 246, 0.08)',
    },
    taskChipDragging: {
        opacity: 0.55,
        transform: 'scale(0.98)',
    },
    taskChipSubject: {
        fontSize: '0.72rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#1d4ed8',
        fontWeight: 700,
    },
    taskChipTitle: {
        fontSize: '0.96rem',
        color: '#0f172a',
    },
    taskChipMeta: {
        fontSize: '0.8rem',
        color: '#64748b',
    },
    taskChipDate: {
        fontSize: '0.75rem',
        color: '#0f766e',
        marginTop: '0.2rem',
    },
    mutedText: {
        margin: 0,
        color: '#64748b',
        fontSize: '0.9rem',
    },
    noteCard: {
        padding: '0.9rem 1rem',
        borderRadius: '1rem',
        background: '#ecfeff',
        border: '1px solid #a5f3fc',
        color: '#155e75',
        fontSize: '0.9rem',
    },
    emptyPanel: {
        padding: '1.25rem',
        borderRadius: '1rem',
        background: '#f8fafc',
        border: '1px dashed #cbd5e1',
        color: '#64748b',
        textAlign: 'center',
    },
    calendarPanel: {
        padding: '1.25rem',
        borderRadius: '1.5rem',
        background: 'rgba(255,255,255,0.9)',
        border: '1px solid rgba(148, 163, 184, 0.2)',
        boxShadow: '0 20px 50px rgba(15, 23, 42, 0.08)',
        backdropFilter: 'blur(12px)',
    },
    calendarScroll: {
        overflowX: 'auto',
        paddingBottom: '0.35rem',
    },
    calendarFrame: {
        minWidth: '720px',
    },
    calendarHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '1rem',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
    },
    calendarSubtext: {
        margin: '0.35rem 0 0',
        fontSize: '0.95rem',
        color: '#64748b',
    },
    calendarLegend: {
        display: 'flex',
        gap: '0.5rem',
        flexWrap: 'wrap',
    },
    legendPill: {
        padding: '0.45rem 0.7rem',
        borderRadius: '999px',
        background: '#eff6ff',
        border: '1px solid #bfdbfe',
        fontSize: '0.78rem',
        color: '#1d4ed8',
        fontWeight: 600,
    },
    weekdayRow: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: '0.75rem',
        marginBottom: '0.75rem',
    },
    weekdayCell: {
        textAlign: 'center',
        fontSize: '0.82rem',
        fontWeight: 700,
        color: '#64748b',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
    },
    calendarGrid: {
        display: 'grid',
        gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
        gap: '0.75rem',
    },
    emptyCalendarCell: {
        minHeight: '140px',
        borderRadius: '1rem',
        background: 'transparent',
    },
    dayCell: {
        minHeight: '140px',
        padding: '0.8rem',
        borderRadius: '1rem',
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column',
        gap: '0.75rem',
    },
    todayCell: {
        background: 'linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%)',
        border: '1px solid #60a5fa',
    },
    pastCell: {
        opacity: 0.55,
        background: '#f1f5f9',
    },
    dayCellHeader: {
        display: 'flex',
        justifyContent: 'space-between',
        gap: '0.5rem',
        alignItems: 'center',
    },
    dayNumber: {
        width: '2rem',
        height: '2rem',
        borderRadius: '999px',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontWeight: 700,
        color: '#334155',
        background: '#ffffff',
        border: '1px solid #e2e8f0',
    },
    todayNumber: {
        background: '#1d4ed8',
        color: '#ffffff',
        border: '1px solid #1d4ed8',
    },
    dropHint: {
        fontSize: '0.72rem',
        color: '#2563eb',
        fontWeight: 600,
    },
    dayTaskList: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.45rem',
        minHeight: 0,
    },
    emptyDateText: {
        fontSize: '0.8rem',
        color: '#94a3b8',
    },
    dayTaskCard: {
        display: 'flex',
        flexDirection: 'column',
        gap: '0.18rem',
        padding: '0.55rem 0.6rem',
        borderRadius: '0.8rem',
        background: '#ffffff',
        border: '1px solid #dbeafe',
        cursor: 'grab',
    },
    dayTaskSubject: {
        fontSize: '0.68rem',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        color: '#1d4ed8',
        fontWeight: 700,
    },
    dayTaskTitle: {
        fontSize: '0.82rem',
        color: '#0f172a',
        lineHeight: 1.3,
    },
};
