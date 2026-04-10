import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import './Habits.css';

export default function Habits() {
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);
    const [habitsFetchError, setHabitsFetchError] = useState('');
    const [feedback, setFeedback] = useState(null);

    // Form State
    const [newHabitName, setNewHabitName] = useState('');
    const [newHabitType, setNewHabitType] = useState('daily');
    const [newHabitSkips, setNewHabitSkips] = useState(0);

    useEffect(() => {
        if (!feedback) return undefined;

        const timeoutId = setTimeout(() => {
            setFeedback(null);
        }, 5000);

        return () => clearTimeout(timeoutId);
    }, [feedback]);

    const extractErrorMessage = (error, fallbackMessage) => {
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
    };

    const fetchHabits = async () => {
        setLoading(true);
        setHabitsFetchError('');
        try {
            const res = await api.get(ENDPOINTS.HABITS);
            setHabits(res.data);
        } catch (error) {
            console.error('Failed to fetch habits', error);
            setHabits([]);
            setHabitsFetchError(extractErrorMessage(error, 'Failed to load habits. Please try again.'));
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHabits();
    }, []);

    const addHabit = async (e) => {
        e.preventDefault();
        const trimmedName = newHabitName.trim();
        if (!trimmedName) {
            setFeedback({
                type: 'error',
                message: 'Habit name is required.'
            });
            return;
        }

        try {
            const res = await api.post(ENDPOINTS.HABITS, {
                name: trimmedName,
                type: newHabitType,
                allowed_skips: newHabitType === 'weekly' ? parseInt(newHabitSkips, 10) || 0 : 0
            });
            setHabits(prevHabits => [...prevHabits, res.data]);
            setNewHabitName('');
            setNewHabitType('daily');
            setNewHabitSkips(0);
            setShowAddForm(false);
            setFeedback({ type: 'success', message: 'Habit added successfully.' });
        } catch (error) {
            console.error('Failed to add habit', error);
            setFeedback({
                type: 'error',
                message: extractErrorMessage(error, 'Failed to add habit. Please check your inputs.')
            });
        }
    };

    const deleteHabit = async (id) => {
        if (!window.confirm('Delete this habit?')) return;
        try {
            await api.delete(`${ENDPOINTS.HABITS}/${id}`);
            setHabits(prevHabits => prevHabits.filter(h => h.id !== id));
            setFeedback({ type: 'success', message: 'Habit deleted successfully.' });
        } catch (error) {
            console.error('Failed to delete habit', error);
            setFeedback({
                type: 'error',
                message: extractErrorMessage(error, 'Failed to delete habit. Please try again.')
            });
        }
    };

    const trackDay = async (habitId, isCompleted, isSkipped = false) => {
        const habitIndex = habits.findIndex(h => h.id === habitId);
        if (habitIndex < 0) return;
        const habit = habits[habitIndex];
        if (habit.is_completed) return;

        const todayStr = new Date().toLocaleDateString('en-CA');

        try {
            const res = await api.post(ENDPOINTS.HABITS_TRACK(habitId), {
                date: todayStr,
                is_completed: isCompleted,
                is_skipped: isSkipped
            });

            if (res.data.achievement) {
                setFeedback({
                    type: 'success',
                    message: res.data.message || 'Achievement unlocked!'
                });
            }

            // Optimistic update
            const updatedHabits = [...habits];
            const trackers = habit.trackers || [];
            const existingTrackerIndex = trackers.findIndex(t => t.date.substring(0, 10) === todayStr);

            let updatedTrackers = [...trackers];
            if (existingTrackerIndex >= 0) {
                updatedTrackers[existingTrackerIndex] = { ...updatedTrackers[existingTrackerIndex], is_completed: isCompleted, is_skipped: isSkipped };
            } else {
                updatedTrackers.push(res.data.tracker);
            }

            updatedHabits[habitIndex] = { ...habit, trackers: updatedTrackers, is_completed: habit.is_completed || res.data.achievement ? true : false };
            setHabits(updatedHabits);

        } catch (error) {
            if (error?.response?.status === 422) {
                setFeedback({
                    type: 'error',
                    message: extractErrorMessage(error, 'Unable to track habit for today.')
                });
            } else {
                console.error('Failed to track day', error);
                setFeedback({
                    type: 'error',
                    message: extractErrorMessage(error, 'Failed to update habit tracking. Please try again.')
                });
            }
        }
    };

    const getTodayTracker = (habit) => {
        const todayStr = new Date().toLocaleDateString('en-CA');
        return (habit.trackers || []).find(t => t.date.substring(0, 10) === todayStr);
    };

    if (loading) {
        return (
            <div className="habits-page">
                <div className="habits-loading">Loading your habits...</div>
            </div>
        );
    }

    const dailyHabits = habits.filter(h => h.type === 'daily');
    const weeklyHabits = habits.filter(h => h.type === 'weekly');
    const totalHabits = habits.length;
    const completedHabits = habits.filter(h => h.is_completed).length;

    return (
        <div className="habits-page">
            {feedback && (
                <div className={`habits-feedback habits-feedback--${feedback.type}`} role="status" aria-live="polite">
                    <span>{feedback.message}</span>
                    <button
                        type="button"
                        className="habits-feedback-close"
                        aria-label="Dismiss message"
                        onClick={() => setFeedback(null)}
                    >
                        &times;
                    </button>
                </div>
            )}

            <div className="habits-hero">
                <div className="habits-hero-text">
                    <p className="habits-kicker">Habits</p>
                    <h1 className="habits-title">Rituals that compound</h1>
                    <p className="habits-subtitle">Forge discipline through consistency.</p>
                </div>
                <div className="habits-hero-actions">
                    <div className="habits-pill-row">
                        <div className="habits-pill">
                            <span className="habits-pill-label">Total</span>
                            <span className="habits-pill-value">{totalHabits}</span>
                        </div>
                        <div className="habits-pill">
                            <span className="habits-pill-label">Daily</span>
                            <span className="habits-pill-value">{dailyHabits.length}</span>
                        </div>
                        <div className="habits-pill">
                            <span className="habits-pill-label">Weekly</span>
                            <span className="habits-pill-value">{weeklyHabits.length}</span>
                        </div>
                        <div className="habits-pill habits-pill--success">
                            <span className="habits-pill-label">Completed</span>
                            <span className="habits-pill-value">{completedHabits}</span>
                        </div>
                    </div>
                    <button
                        className="habits-primary-btn"
                        onClick={() => setShowAddForm(!showAddForm)}
                    >
                        {showAddForm ? 'Cancel' : '+ New Habit'}
                    </button>
                </div>
            </div>

            {showAddForm && (
                <form onSubmit={addHabit} className="habits-form">
                    <div className="habits-form-row">
                        <div className="habits-input-group">
                            <label className="habits-label">Habit Name</label>
                            <input
                                type="text"
                                placeholder="e.g., Read 10 pages"
                                value={newHabitName}
                                onChange={(e) => setNewHabitName(e.target.value)}
                                className="habits-input"
                                autoFocus
                            />
                        </div>
                        <div className="habits-input-group">
                            <label className="habits-label">Type</label>
                            <select
                                value={newHabitType}
                                onChange={e => setNewHabitType(e.target.value)}
                                className="habits-select"
                            >
                                <option value="daily">Daily Challenge (21 Days)</option>
                                <option value="weekly">Weekly Routine (Allowed Skips)</option>
                            </select>
                        </div>

                        {newHabitType === 'weekly' && (
                            <div className="habits-input-group">
                                <label className="habits-label">Weekly Skips</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="6"
                                    value={newHabitSkips}
                                    onChange={(e) => setNewHabitSkips(e.target.value)}
                                    className="habits-input"
                                />
                            </div>
                        )}
                    </div>
                    <button type="submit" className="habits-submit-btn">Create Habit</button>
                </form>
            )}

            {habitsFetchError ? (
                <div className="habits-empty habits-empty--error" role="alert">
                    <h3 className="habits-empty-title">Could not load habits</h3>
                    <p className="habits-empty-text">{habitsFetchError}</p>
                    <button type="button" className="habits-submit-btn habits-retry-btn" onClick={fetchHabits}>
                        Retry
                    </button>
                </div>
            ) : habits.length === 0 && !showAddForm ? (
                <div className="habits-empty">
                    <div className="habits-empty-art" aria-hidden="true">
                        <span className="habits-empty-ring"></span>
                        <span className="habits-empty-ring"></span>
                        <span className="habits-empty-core"></span>
                    </div>
                    <h3 className="habits-empty-title">Ready to build better habits?</h3>
                    <p className="habits-empty-text">Start by creating a daily or weekly routine.</p>
                </div>
            ) : (
                <div className="habits-sections">
                    {dailyHabits.length > 0 && (
                        <section className="habits-section habits-animate" style={{ '--section-delay': '80ms' }}>
                            <div className="habits-section-head">
                                <h2 className="habits-section-title">Daily Challenges</h2>
                                <p className="habits-section-subtitle">Complete 21 days to lock in the ritual.</p>
                            </div>
                            <div className="habits-grid">
                                {dailyHabits.map((habit, index) => {
                                    const todayTracker = getTodayTracker(habit);
                                    const isDoneToday = todayTracker?.is_completed;

                                    let daysCompleted = 0;
                                    if (habit.start_date) {
                                        daysCompleted = (habit.trackers || []).filter(t => t.date >= habit.start_date && t.is_completed).length;
                                    }
                                    const progressPercent = Math.min(100, Math.round((daysCompleted / 21) * 100));

                                    return (
                                        <div
                                            key={habit.id}
                                            className={`habit-card ${habit.is_completed ? 'habit-card--completed' : ''}`}
                                            style={{ '--habit-delay': `${index * 60 + 120}ms` }}
                                        >
                                            <div className="habit-card-top">
                                                <span className="habit-badge habit-badge--daily">Daily</span>
                                                <button onClick={() => deleteHabit(habit.id)} className="habit-delete" aria-label="Delete habit">
                                                    X
                                                </button>
                                            </div>
                                            <h3 className="habit-name">{habit.name}</h3>

                                            <div className="habit-progress">
                                                <div className="habit-progress-head">
                                                    <span className="habit-progress-text">{daysCompleted} / 21 Days</span>
                                                    <span className="habit-progress-value">{progressPercent}%</span>
                                                </div>
                                                <div className="habit-progress-track">
                                                    <div
                                                        className={`habit-progress-fill ${habit.is_completed ? 'habit-progress-fill--complete' : ''}`}
                                                        style={{ width: `${progressPercent}%` }}
                                                    ></div>
                                                </div>
                                            </div>

                                            <div className="habit-actions">
                                                {habit.is_completed ? (
                                                    <div className="habit-complete-badge">21 Days Completed</div>
                                                ) : (
                                                    <button
                                                        className={`habit-action-btn ${isDoneToday ? 'habit-action-btn--active' : ''}`}
                                                        onClick={() => trackDay(habit.id, !isDoneToday)}
                                                    >
                                                        {isDoneToday ? 'Done for Today' : 'Mark Complete'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}

                    {weeklyHabits.length > 0 && (
                        <section className="habits-section habits-animate" style={{ '--section-delay': '140ms' }}>
                            <div className="habits-section-head">
                                <h2 className="habits-section-title">Weekly Routines</h2>
                                <p className="habits-section-subtitle">Use skips wisely and keep the rhythm.</p>
                            </div>
                            <div className="habits-grid">
                                {weeklyHabits.map((habit, index) => {
                                    const todayTracker = getTodayTracker(habit);
                                    const isDoneToday = todayTracker?.is_completed;
                                    const isSkippedToday = todayTracker?.is_skipped;

                                    const d = new Date();
                                    const dayOfWeek = d.getDay();
                                    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
                                    const monday = new Date(d.setDate(diff)).toLocaleDateString('en-CA');

                                    const skipsThisWeek = (habit.trackers || []).filter(t => t.date >= monday && t.is_skipped).length;
                                    const skipsLeft = Math.max(0, habit.allowed_skips - skipsThisWeek);

                                    return (
                                        <div
                                            key={habit.id}
                                            className="habit-card"
                                            style={{ '--habit-delay': `${index * 60 + 200}ms` }}
                                        >
                                            <div className="habit-card-top">
                                                <span className="habit-badge habit-badge--weekly">Weekly</span>
                                                <button onClick={() => deleteHabit(habit.id)} className="habit-delete" aria-label="Delete habit">
                                                    X
                                                </button>
                                            </div>
                                            <h3 className="habit-name">{habit.name}</h3>

                                            <div className="habit-skip-box">
                                                <span className="habit-skip-count">{skipsLeft}</span>
                                                <span className="habit-skip-text">skips remaining this week</span>
                                            </div>

                                            <div className="habit-actions habit-actions-row">
                                                <button
                                                    className={`habit-action-btn habit-action-btn--primary ${isDoneToday ? 'habit-action-btn--active' : ''}`}
                                                    onClick={() => trackDay(habit.id, !isDoneToday, false)}
                                                    disabled={isSkippedToday}
                                                >
                                                    {isDoneToday ? 'Done' : 'Complete'}
                                                </button>
                                                <button
                                                    className={`habit-action-btn habit-action-btn--ghost ${isSkippedToday ? 'habit-action-btn--skip' : ''}`}
                                                    onClick={() => trackDay(habit.id, false, !isSkippedToday)}
                                                    disabled={isDoneToday}
                                                >
                                                    {isSkippedToday ? 'Skipped' : 'Skip Today'}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </div>
            )}
        </div>
    );
}
