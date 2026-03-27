import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import './Achievements.css';

export default function Achievements() {
    const [achievements, setAchievements] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.get('/achievements')
            .then(res => {
                setAchievements(res.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) {
        return (
            <div className="achievements-page">
                <h1 className="achievements-title">Achievements</h1>
                <p className="achievements-subtitle">Loading your achievements...</p>
            </div>
        );
    }

    const unlockedAchievements = achievements.filter(a => a.is_unlocked);
    const lockedAchievements = achievements.filter(a => !a.is_unlocked);

    return (
        <div className="achievements-page">
            <div className="achievements-hero">
                <div>
                    <h1 className="achievements-title">Achievements</h1>
                    <p className="achievements-subtitle">Track your progress and unlock rewards</p>
                </div>
                <div className="achievements-stats">
                    <div className="stat-item">
                        <span className="stat-number">{unlockedAchievements.length}</span>
                        <span className="stat-label">Unlocked</span>
                    </div>
                    <div className="stat-item">
                        <span className="stat-number">{achievements.length}</span>
                        <span className="stat-label">Total</span>
                    </div>
                </div>
            </div>

            <div className="achievements-content">
                {unlockedAchievements.length > 0 && (
                    <section className="achievements-section">
                        <h2 className="section-title">Unlocked Achievements</h2>
                        <div className="achievements-grid">
                            {unlockedAchievements.map((achievement) => (
                                <div key={achievement.id} className="achievement-card unlocked">
                                    <div className="achievement-icon">
                                        <span className="icon-emoji">🏆</span>
                                    </div>
                                    <div className="achievement-content">
                                        <h3 className="achievement-name">{achievement.name}</h3>
                                        <p className="achievement-description">{achievement.description}</p>
                                        <div className="achievement-progress">
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${achievement.progress_percent}%` }}
                                                ></div>
                                            </div>
                                            <span className="progress-text">
                                                {achievement.current_value} / {achievement.requirement_value}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {lockedAchievements.length > 0 && (
                    <section className="achievements-section">
                        <h2 className="section-title">Locked Achievements</h2>
                        <div className="achievements-grid">
                            {lockedAchievements.map((achievement) => (
                                <div key={achievement.id} className="achievement-card locked">
                                    <div className="achievement-icon locked">
                                        <span className="icon-emoji">🔒</span>
                                    </div>
                                    <div className="achievement-content">
                                        <h3 className="achievement-name">{achievement.name}</h3>
                                        <p className="achievement-description">{achievement.description}</p>
                                        <div className="achievement-progress">
                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{ width: `${achievement.progress_percent}%` }}
                                                ></div>
                                            </div>
                                            <span className="progress-text">
                                                {achievement.current_value} / {achievement.requirement_value}
                                            </span>
                                        </div>
                                        <div className="achievement-requirement">
                                            <span className="requirement-type">{achievement.requirement_type}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {achievements.length === 0 && (
                    <div className="empty-state">
                        <div className="empty-icon">🏆</div>
                        <h3>No achievements available</h3>
                        <p>Start completing tasks to unlock achievements!</p>
                    </div>
                )}
            </div>
        </div>
    );
}