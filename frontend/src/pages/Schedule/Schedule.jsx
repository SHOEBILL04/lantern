import React, { useEffect, useMemo, useRef, useState } from 'react';
import api from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import './Schedule.css';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function Schedule() {
    const [subjects, setSubjects] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [courses, setCourses] = useState([]);
    const [loading, setLoading] = useState(true);
    const [scheduleFetchError, setScheduleFetchError] = useState('');
    const [feedback, setFeedback] = useState(null);
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

    useEffect(() => {
        if (!feedback) return undefined;

        const timeoutId = setTimeout(() => {
            setFeedback(null);
        }, 5000);

        return () => clearTimeout(timeoutId);
    }, [feedback]);

    const fetchScheduleData = async () => {
        setLoading(true);
        setScheduleFetchError('');
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
            const message = extractErrorMessage(error, 'Failed to load schedule data. Please refresh and try again.');
            setScheduleFetchError(message);
            setFeedback({ type: 'error', message });
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
            setFeedback({ type: 'success', message: `Task scheduled for ${dateKey}.` });
        } catch (error) {
            console.error('Failed to reschedule task:', error);
            setFeedback({
                type: 'error',
                message: extractErrorMessage(error, 'Failed to reschedule task. Please try again.')
            });
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
                setFeedback({ type: 'success', message: 'Task removed from schedule.' });
            } catch (error) {
                console.error('Failed to remove task from schedule:', error);
                setFeedback({
                    type: 'error',
                    message: extractErrorMessage(error, 'Failed to remove task from schedule. Please try again.')
                });
                setTasks((currentTasks) => currentTasks.map((item) => (
                    item.id === task.id ? { ...item, due_date: dragState.originalDueDate } : item
                )));
            }
        }

        dragStateRef.current = { taskId: null, originalDueDate: null, droppedOnCalendar: false };
        setDraggedTaskId(null);
    };

    if (loading) {
        return <ScheduleLoadingSkeleton />;
    }

    return (
        <div className="schedule-page">
            {feedback && (
                <div className={`schedule-feedback schedule-feedback--${feedback.type}`} role="status" aria-live="polite">
                    <span>{feedback.message}</span>
                    <button
                        type="button"
                        className="schedule-feedback-close"
                        aria-label="Dismiss message"
                        onClick={() => setFeedback(null)}
                    >
                        &times;
                    </button>
                </div>
            )}

            <div className="schedule-hero">
                <div>
                    <h1 className="schedule-title">Schedule</h1>
                    <p className="schedule-subtitle">Drag tasks from each subject onto a date from today onward.</p>
                </div>
                <div className="schedule-today-badge">
                    <span className="schedule-today-label">Today</span>
                    <strong>{today.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}</strong>
                </div>
            </div>

            {scheduleFetchError && (
                <div className="schedule-error-panel" role="alert">
                    <span>{scheduleFetchError}</span>
                    <button type="button" className="schedule-error-retry-btn" onClick={fetchScheduleData}>
                        Retry
                    </button>
                </div>
            )}

            <div className="schedule-layout">
                <aside className="schedule-sidebar">
                    <div className="schedule-sidebar-header">
                        <h2 className="schedule-section-title">Subjects</h2>
                        <span className="schedule-section-meta">{subjects.length} total</span>
                    </div>

                    {subjectGroups.length === 0 ? (
                        <div className="schedule-empty-panel">No subjects added yet.</div>
                    ) : (
                        <div className="schedule-subject-list">
                            {subjectGroups.map((subject) => (
                                <div key={subject.id} className="schedule-subject-card">
                                    <div className="schedule-subject-header-row">
                                        <div className="schedule-subject-heading">
                                            <span className="schedule-subject-dot" style={{ backgroundColor: subject.color_code || '#94a3b8' }} />
                                            <h3 className="schedule-subject-name">{subject.name}</h3>
                                        </div>
                                        <span className="schedule-subject-count">{subject.tasks.length} tasks</span>
                                    </div>

                                    {subject.tasks.length === 0 ? (
                                        <p className="schedule-muted-text">All tasks completed.</p>
                                    ) : (
                                        <div className="schedule-task-stack">
                                            {subject.tasks.map((task, index) => (
                                                <div
                                                    key={task.id}
                                                    draggable
                                                    onDragStart={() => handleTaskDragStart(task)}
                                                    onDragEnd={() => handleTaskDragEnd(task)}
                                                    className={`schedule-task-chip${draggedTaskId === task.id ? ' schedule-task-chip--dragging' : ''}`}
                                                >
                                                    <span className="schedule-task-chip-subject">{subject.name}</span>
                                                    <strong className="schedule-task-chip-title">
                                                        {getTaskDisplayLabel(task)}
                                                    </strong>
                                                    <span className="schedule-task-chip-meta">
                                                        {courseMap[task.course_id]?.title || task.title || `Task ${index + 1}`}
                                                    </span>
                                                    {task.due_date && (
                                                        <span className="schedule-task-chip-date">Scheduled: {task.due_date}</span>
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
                        <div className="schedule-note-card">
                            Every task is already placed on a date.
                        </div>
                    )}
                </aside>

                <section className="schedule-calendar-panel">
                    <div className="schedule-calendar-header">
                        <div>
                            <h2 className="schedule-section-title">Calendar</h2>
                            <p className="schedule-calendar-subtext">{monthLabel}</p>
                        </div>
                        <div className="schedule-calendar-legend">
                            <span className="schedule-legend-pill">Current month</span>
                            <span className="schedule-legend-pill">Drop on today or later</span>
                        </div>
                    </div>

                    <div className="schedule-calendar-scroll">
                        <div className="schedule-calendar-frame">
                            <div className="schedule-weekday-row">
                                {DAYS.map((day) => (
                                    <div key={day} className="schedule-weekday-cell">{day}</div>
                                ))}
                            </div>

                            <div className="schedule-calendar-grid">
                                {calendarDays.map((day, index) => {
                                    if (!day) {
                                        return <div key={`empty-${index}`} className="schedule-empty-calendar-cell" />;
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
                                            className={`schedule-day-cell${day.isToday ? ' schedule-day-cell--today' : ''}${day.isPast ? ' schedule-day-cell--past' : ''}`}
                                        >
                                            <div className="schedule-day-cell-header">
                                                <span className={`schedule-day-number${day.isToday ? ' schedule-day-number--today' : ''}`}>
                                                    {day.dayNumber}
                                                </span>
                                                {!day.isPast && <span className="schedule-drop-hint">Drop here</span>}
                                            </div>

                                            <div className="schedule-day-task-list">
                                                {day.tasks.length === 0 ? (
                                                    <span className="schedule-empty-date-text">
                                                        {day.isPast ? 'Past date' : 'No tasks'}
                                                    </span>
                                                ) : (
                                                    day.tasks.map((task) => (
                                                        <div
                                                            key={task.id}
                                                            draggable={!day.isPast}
                                                            onDragStart={() => handleTaskDragStart(task)}
                                                            onDragEnd={() => handleTaskDragEnd(task)}
                                                            className="schedule-day-task-card"
                                                        >
                                                            <span className="schedule-day-task-subject">
                                                                {task.subject || findSubjectName(task, subjectGroups) || 'General'}
                                                            </span>
                                                            <strong className="schedule-day-task-title">{getTaskDisplayLabel(task)}</strong>
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

function ScheduleLoadingSkeleton() {
    return (
        <div className="schedule-page schedule-page--loading" aria-busy="true" aria-live="polite">
            <div className="schedule-hero">
                <div className="schedule-loading-copy">
                    <div className="schedule-skeleton schedule-skeleton-title" />
                    <div className="schedule-skeleton schedule-skeleton-subtitle" />
                </div>
                <div className="schedule-today-badge schedule-today-badge--loading">
                    <div className="schedule-skeleton schedule-skeleton-today-label" />
                    <div className="schedule-skeleton schedule-skeleton-today-value" />
                </div>
            </div>

            <div className="schedule-layout">
                <aside className="schedule-sidebar">
                    <div className="schedule-sidebar-header">
                        <div className="schedule-skeleton schedule-skeleton-section-title" />
                        <div className="schedule-skeleton schedule-skeleton-section-meta" />
                    </div>

                    <div className="schedule-subject-list">
                        {[1, 2, 3].map((subjectIndex) => (
                            <div key={`loading-subject-${subjectIndex}`} className="schedule-subject-card schedule-subject-card--loading">
                                <div className="schedule-subject-header-row">
                                    <div className="schedule-subject-heading">
                                        <div className="schedule-skeleton schedule-skeleton-dot" />
                                        <div className="schedule-skeleton schedule-skeleton-subject-name" />
                                    </div>
                                    <div className="schedule-skeleton schedule-skeleton-task-count" />
                                </div>
                                <div className="schedule-task-stack">
                                    {[1, 2].map((taskIndex) => (
                                        <div key={`loading-task-${subjectIndex}-${taskIndex}`} className="schedule-task-chip schedule-task-chip--loading">
                                            <div className="schedule-skeleton schedule-skeleton-chip-label" />
                                            <div className="schedule-skeleton schedule-skeleton-chip-title" />
                                            <div className="schedule-skeleton schedule-skeleton-chip-meta" />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </aside>

                <section className="schedule-calendar-panel">
                    <div className="schedule-calendar-header">
                        <div>
                            <div className="schedule-skeleton schedule-skeleton-section-title" />
                            <div className="schedule-skeleton schedule-skeleton-calendar-subtext" />
                        </div>
                        <div className="schedule-calendar-legend">
                            <div className="schedule-skeleton schedule-skeleton-legend-pill" />
                            <div className="schedule-skeleton schedule-skeleton-legend-pill schedule-skeleton-legend-pill--wide" />
                        </div>
                    </div>

                    <div className="schedule-calendar-scroll">
                        <div className="schedule-calendar-frame">
                            <div className="schedule-weekday-row">
                                {DAYS.map((day) => (
                                    <div key={`loading-weekday-${day}`} className="schedule-weekday-cell">
                                        <div className="schedule-skeleton schedule-skeleton-weekday" />
                                    </div>
                                ))}
                            </div>

                            <div className="schedule-calendar-grid">
                                {Array.from({ length: 35 }).map((_, index) => (
                                    <div key={`loading-cell-${index}`} className="schedule-day-cell schedule-day-cell--loading">
                                        <div className="schedule-day-cell-header">
                                            <div className="schedule-skeleton schedule-skeleton-day-number" />
                                            <div className="schedule-skeleton schedule-skeleton-drop-hint" />
                                        </div>
                                        <div className="schedule-day-task-list">
                                            <div className="schedule-skeleton schedule-skeleton-day-task" />
                                            <div className="schedule-skeleton schedule-skeleton-day-task schedule-skeleton-day-task--short" />
                                        </div>
                                    </div>
                                ))}
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

function extractErrorMessage(error, fallbackMessage) {
    const responseData = error?.response?.data;

    if (responseData?.errors && typeof responseData.errors === 'object') {
        const firstValidationError = Object.values(responseData.errors)
            .flat()
            .find(Boolean);
        if (firstValidationError) return firstValidationError;
    }

    if (typeof responseData?.message === 'string' && responseData.message.trim()) {
        return responseData.message;
    }

    if (typeof responseData === 'string' && responseData.trim()) {
        return responseData;
    }

    return fallbackMessage;
}
