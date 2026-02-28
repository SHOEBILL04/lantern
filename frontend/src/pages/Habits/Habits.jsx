import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';

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
        if (!window.confirm("Delete this habit?")) return;
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

    if (loading) return <div style={pageContainerStyle}><div style={loadingStyle}>Loading your habits...</div></div>;

    const dailyHabits = habits.filter(h => h.type === 'daily');
    const weeklyHabits = habits.filter(h => h.type === 'weekly');

    return (
        <div style={pageContainerStyle}>
            <div style={headerNavStyle}>
                <div>
                    <h1 style={titleStyle}>My Habits</h1>
                    <p style={subtitleStyle}>Forge discipline through consistency.</p>
                </div>
                <button
                    style={addButtonStyle}
                    onClick={() => setShowAddForm(!showAddForm)}
                >
                    {showAddForm ? '✕ Cancel' : '+ New Habit'}
                </button>
            </div>

            {showAddForm && (
                <form onSubmit={addHabit} style={addFormStyle}>
                    <div style={formRowStyle}>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Habit Name</label>
                            <input
                                type="text"
                                placeholder="e.g., Read 10 pages"
                                value={newHabitName}
                                onChange={(e) => setNewHabitName(e.target.value)}
                                style={inputStyle}
                                autoFocus
                            />
                        </div>
                        <div style={inputGroupStyle}>
                            <label style={labelStyle}>Type</label>
                            <select
                                value={newHabitType}
                                onChange={e => setNewHabitType(e.target.value)}
                                style={selectStyle}
                            >
                                <option value="daily">Daily Challenge (21 Days)</option>
                                <option value="weekly">Weekly Routine (Allowed Skips)</option>
                            </select>
                        </div>

                        {newHabitType === 'weekly' && (
                            <div style={inputGroupStyle}>
                                <label style={labelStyle}>Weekly Skips</label>
                                <input
                                    type="number"
                                    min="0"
                                    max="6"
                                    value={newHabitSkips}
                                    onChange={(e) => setNewHabitSkips(e.target.value)}
                                    style={inputStyle}
                                />
                            </div>
                        )}
                    </div>
                    <button type="submit" style={submitButtonStyle}>Create Habit</button>
                </form>
            )}

            {habits.length === 0 && !showAddForm ? (
                <div style={emptyCardStyle}>
                    <div style={emptyStateIconStyle}>🚀</div>
                    <h3 style={emptyStateTitleStyle}>Ready to build better habits?</h3>
                    <p style={emptyStateTextStyle}>Start by creating a daily or weekly routine.</p>
                </div>
            ) : (
                <div style={habitListContainerStyle}>
                    {/* DAILY HABITS */}
                    {dailyHabits.length > 0 && (
                        <div style={sectionStyle}>
                            <h2 style={sectionTitleStyle}>Daily Challenges</h2>
                            <div style={gridStyle}>
                                {dailyHabits.map(habit => {
                                    const todayTracker = getTodayTracker(habit);
                                    const isDoneToday = todayTracker?.is_completed;

                                    // Calculate exactly how many days completed since start_date
                                    let daysCompleted = 0;
                                    if (habit.start_date) {
                                        daysCompleted = (habit.trackers || []).filter(t => t.date >= habit.start_date && t.is_completed).length;
                                    }
                                    const progressPercent = Math.min(100, Math.round((daysCompleted / 21) * 100));

                                    return (
                                        <div key={habit.id} style={{ ...cardStyle, ...(habit.is_completed ? completedCardStyle : {}) }}>
                                            <div style={cardHeaderStyle}>
                                                <div style={badgeStyle('daily')}>Daily</div>
                                                <button onClick={() => deleteHabit(habit.id)} style={deleteBtnStyle}>✕</button>
                                            </div>
                                            <h3 style={cardTitleStyle}>{habit.name}</h3>

                                            <div style={progressContainerStyle}>
                                                <div style={progressHeaderStyle}>
                                                    <span style={progressTextStyle}>{daysCompleted} / 21 Days</span>
                                                    <span style={progressPercentStyle}>{progressPercent}%</span>
                                                </div>
                                                <div style={progressBarBgStyle}>
                                                    <div style={{ ...progressBarFillStyle, width: `${progressPercent}%`, backgroundColor: habit.is_completed ? '#10b981' : '#3b82f6' }}></div>
                                                </div>
                                            </div>

                                            <div style={actionContainerStyle}>
                                                {habit.is_completed ? (
                                                    <div style={completedBadgeStyle}>🎉 21 Days Completed!</div>
                                                ) : (
                                                    <button
                                                        style={{ ...actionBtnStyle, ...(isDoneToday ? activeActionBtnStyle : {}) }}
                                                        onClick={() => trackDay(habit.id, !isDoneToday)}
                                                    >
                                                        {isDoneToday ? '✓ Done for Today' : 'Mark Complete'}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}

                    {/* WEEKLY HABITS */}
                    {weeklyHabits.length > 0 && (
                        <div style={sectionStyle}>
                            <h2 style={sectionTitleStyle}>Weekly Routines</h2>
                            <div style={gridStyle}>
                                {weeklyHabits.map(habit => {
                                    const todayTracker = getTodayTracker(habit);
                                    const isDoneToday = todayTracker?.is_completed;
                                    const isSkippedToday = todayTracker?.is_skipped;

                                    // Calculate skips this week
                                    const d = new Date();
                                    const dayOfWeek = d.getDay(); // 0 is Sunday
                                    const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Get Monday
                                    const monday = new Date(d.setDate(diff)).toLocaleDateString('en-CA');

                                    const skipsThisWeek = (habit.trackers || []).filter(t => t.date >= monday && t.is_skipped).length;
                                    const skipsLeft = Math.max(0, habit.allowed_skips - skipsThisWeek);

                                    return (
                                        <div key={habit.id} style={cardStyle}>
                                            <div style={cardHeaderStyle}>
                                                <div style={badgeStyle('weekly')}>Weekly</div>
                                                <button onClick={() => deleteHabit(habit.id)} style={deleteBtnStyle}>✕</button>
                                            </div>
                                            <h3 style={cardTitleStyle}>{habit.name}</h3>

                                            <div style={skipsInfoStyle}>
                                                <span style={skipsNumberStyle}>{skipsLeft}</span> skips remaining this week
                                            </div>

                                            <div style={weeklyActionGroupStyle}>
                                                <button
                                                    style={{ ...actionBtnStyle, flex: 1, ...(isDoneToday ? activeActionBtnStyle : {}) }}
                                                    onClick={() => trackDay(habit.id, !isDoneToday, false)}
                                                    disabled={isSkippedToday}
                                                >
                                                    {isDoneToday ? '✓ Done' : 'Complete'}
                                                </button>
                                                <button
                                                    style={{ ...skipBtnStyle, flex: 1, ...(isSkippedToday ? activeSkipBtnStyle : {}) }}
                                                    onClick={() => trackDay(habit.id, false, !isSkippedToday)}
                                                    disabled={isDoneToday}
                                                >
                                                    {isSkippedToday ? 'Skipped' : 'Skip Today'}
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

// STYLES - Modern Overhaul
const pageContainerStyle = { padding: '3rem', flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb', fontFamily: '"Inter", sans-serif', minHeight: '100vh', boxSizing: 'border-box' };
const headerNavStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' };
const titleStyle = { fontSize: '2.5rem', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.025em' };
const subtitleStyle = { fontSize: '1.1rem', color: '#6b7280', marginTop: '0.5rem', fontWeight: '400' };
const addButtonStyle = { background: '#111827', color: 'white', padding: '0.75rem 1.5rem', borderRadius: '99px', fontSize: '0.95rem', fontWeight: '600', cursor: 'pointer', border: '2px solid transparent', transition: 'all 0.2s', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)' };
const loadingStyle = { fontSize: '1.2rem', color: '#6b7280', textAlign: 'center', marginTop: '4rem', fontWeight: '500' };

// Form Styles
const addFormStyle = { background: 'white', padding: '2rem', borderRadius: '16px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.05), 0 4px 6px -2px rgba(0, 0, 0, 0.025)', marginBottom: '3rem', border: '1px solid #f3f4f6' };
const formRowStyle = { display: 'flex', gap: '1.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' };
const inputGroupStyle = { display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: '1 1 200px' };
const labelStyle = { fontSize: '0.85rem', fontWeight: '600', color: '#4b5563', textTransform: 'uppercase', letterSpacing: '0.05em' };
const inputStyle = { padding: '0.875rem 1rem', borderRadius: '10px', border: '1px solid #d1d5db', fontSize: '1rem', backgroundColor: '#f9fafb', transition: 'border-color 0.2s, box-shadow 0.2s', outline: 'none' };
const selectStyle = { ...inputStyle, cursor: 'pointer', appearance: 'none', backgroundImage: 'url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns=\'http://www.w3.org/2000/svg\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'currentColor\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3e%3cpolyline points=\'6 9 12 15 18 9\'%3e%3c/polyline%3e%3c/svg%3e")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 1rem center', backgroundSize: '1em' };
const submitButtonStyle = { background: '#2563eb', color: 'white', padding: '0.875rem 2rem', borderRadius: '10px', border: 'none', cursor: 'pointer', fontWeight: '600', fontSize: '1rem', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)', transition: 'background-color 0.2s' };

// Layout
const habitListContainerStyle = { display: 'flex', flexDirection: 'column', gap: '3rem' };
const sectionStyle = { display: 'flex', flexDirection: 'column', gap: '1.5rem' };
const sectionTitleStyle = { fontSize: '1.5rem', fontWeight: '700', color: '#1f2937', margin: 0, paddingBottom: '0.5rem', borderBottom: '2px solid #e5e7eb', display: 'inline-block', alignSelf: 'flex-start' };
const gridStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1.5rem' };

// Cards
const cardStyle = { background: 'white', borderRadius: '20px', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', border: '1px solid #f3f4f6', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', transition: 'transform 0.2s, box-shadow 0.2s' };
const completedCardStyle = { background: '#f0fdf4', borderColor: '#bbf7d0', boxShadow: 'none' };
const cardHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' };
const badgeStyle = (type) => ({ padding: '0.35rem 0.75rem', borderRadius: '99px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', backgroundColor: type === 'daily' ? '#eff6ff' : '#fdf4ff', color: type === 'daily' ? '#2563eb' : '#c026d3' });
const deleteBtnStyle = { background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '0.25rem', borderRadius: '50%', fontSize: '1rem', transition: 'background-color 0.2s, color 0.2s' };
const cardTitleStyle = { fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: 0 };

// Progress (Daily)
const progressContainerStyle = { display: 'flex', flexDirection: 'column', gap: '0.5rem' };
const progressHeaderStyle = { display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.875rem' };
const progressTextStyle = { fontWeight: '600', color: '#4b5563' };
const progressPercentStyle = { fontWeight: '700', color: '#111827' };
const progressBarBgStyle = { height: '10px', backgroundColor: '#e5e7eb', borderRadius: '99px', overflow: 'hidden' };
const progressBarFillStyle = { height: '100%', borderRadius: '99px', transition: 'width 0.5s cubic-bezier(0.4, 0, 0.2, 1)' };

// Skips (Weekly)
const skipsInfoStyle = { fontSize: '0.95rem', color: '#4b5563', backgroundColor: '#f3f4f6', padding: '0.75rem 1rem', borderRadius: '10px', textAlign: 'center' };
const skipsNumberStyle = { fontWeight: '800', color: '#111827', fontSize: '1.1rem' };

// Actions
const actionContainerStyle = { marginTop: 'auto', paddingTop: '0.5rem' };
const weeklyActionGroupStyle = { display: 'flex', gap: '0.5rem', marginTop: 'auto', paddingTop: '0.5rem' };
const actionBtnStyle = { width: '100%', padding: '0.875rem', borderRadius: '12px', border: '2px solid #e5e7eb', backgroundColor: 'white', color: '#4b5563', fontWeight: '600', fontSize: '0.95rem', cursor: 'pointer', transition: 'all 0.2s' };
const activeActionBtnStyle = { backgroundColor: '#10b981', borderColor: '#10b981', color: 'white', boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.2)' };
const skipBtnStyle = { ...actionBtnStyle };
const activeSkipBtnStyle = { backgroundColor: '#f59e0b', borderColor: '#f59e0b', color: 'white', boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.2)' };
const completedBadgeStyle = { textAlign: 'center', padding: '0.875rem', backgroundColor: '#d1fae5', color: '#065f46', borderRadius: '12px', fontWeight: '700' };

// Empty state
const emptyCardStyle = { background: 'white', borderRadius: '24px', padding: '5rem 2rem', border: '2px dashed #e5e7eb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' };
const emptyStateIconStyle = { fontSize: '3rem', marginBottom: '1rem' };
const emptyStateTitleStyle = { fontSize: '1.5rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0' };
const emptyStateTextStyle = { fontSize: '1rem', color: '#6b7280', margin: 0 };
