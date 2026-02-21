import React from 'react';

export default function Achievements() {
    return (
        <div style={pageContainerStyle}>
            <h1 style={titleStyle}>Achievements</h1>
            <p style={subtitleStyle}>View the milestones and badges you've unlocked over time.</p>

            <div style={cardStyle}>
                <div style={emptyStateStyle}>
                    <p>Complete tasks to start earning achievements!</p>
                </div>
            </div>
        </div>
    );
}

const pageContainerStyle = { padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column' };
const titleStyle = { fontSize: '2rem', fontWeight: 'bold', color: '#111827', marginBottom: '0.5rem' };
const subtitleStyle = { fontSize: '1rem', color: '#6b7280', marginBottom: '2rem' };
const cardStyle = { background: '#ffffff', borderRadius: '0.5rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', flex: 1, padding: '2rem' };
const emptyStateStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#9ca3af', fontStyle: 'italic' };
