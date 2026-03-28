import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import './Habits.css';

export default function Habits() {
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddForm, setShowAddForm] = useState(false);

    // Form State
    const [newHabitName, setNewHabitName] = useState('');
    const [newHabitType, setNewHabitType] = useState('daily');
    const [newHabitSkips, setNewHabitSkips] = useState(0);

    const fetchHabits = async () => {
        try {
            const res = await api.get(ENDPOINTS.HABITS);
            setHabits(res.data);
        } catch (error) {
            console.error('Failed to fetch habits', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHabits();
    }, []);

    const addHabit = async (e) => {
        e.preventDefault();
        if (!newHabitName.trim()) return;

        try {
            const res = await api.post(ENDPOINTS.HABITS, {
                name: newHabitName,
                type: newHabitType,
                allowed_skips: newHabitType === 'weekly' ? parseInt(newHabitSkips) : 0
            });
            setHabits([...habits, res.data]);
            setNewHabitName('');
            setNewHabitType('daily');
            setNewHabitSkips(0);
            setShowAddForm(false);
        } catch (error) {
            console.error('Failed to add habit', error);
            alert('Failed to add habit. Please check your inputs.');
        }
    };

    const deleteHabit = async (id) => {
        if (!window.confirm('Delete this habit?')) return;
        try {
            await api.delete(`${ENDPOINTS.HABITS}/${id}`);
            setHabits(habits.filter(h => h.id !== id));
        } catch (error) {
            console.error('Failed to delete habit', error);
        }
    };

    const trackDay = async (habitId, isCompleted, isSkipped = false) => {
        const habitIndex = habits.findIndex(h => h.id === habitId);
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
                alert(res.data.message);
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
            if (error.response && error.response.status === 422) {
                alert(error.response.data.message);
            } else {
                console.error('Failed to track day', error);
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

            {habits.length === 0 && !showAddForm ? (
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
