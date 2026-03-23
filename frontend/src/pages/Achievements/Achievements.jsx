import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import './Achievements.css'; // basic css

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

    if (loading) return <div>loading...</div>;

    return (
        <div className="ugly-page">
            <h1>Achievements (Backend Data Dump)</h1>
            <hr />

            <div style={{ display: 'flex', flexDirection: 'column' }}>
                {achievements.map((a) => (
                    <div key={a.id} className={`ugly-card ${a.is_unlocked ? 'unlocked' : 'locked'}`}>
                        <h2>
                            [{a.is_unlocked ? 'X' : ' '}] {a.name}
                        </h2>
                        <p>{a.description}</p>
                        <div>
                            <strong>Status:</strong> {a.is_unlocked ? 'Unlocked' : 'Locked'} <br />
                            <strong>Progress:</strong> {a.current_value} / {a.requirement_value} ({Math.round(a.progress_percent)}%) <br />
                            <strong>Type:</strong> {a.requirement_type}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}