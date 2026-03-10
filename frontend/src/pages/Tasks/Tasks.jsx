import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';

export default function Tasks() {
    const [tasks, setTasks] = useState([]);
    const [dashboardData, setDashboardData] = useState(null);
    const [viewMode, setViewMode] = useState('active'); // 'active' or 'archive'
    const [filters, setFilters] = useState({ subject: '', priority: '', status: '', due_date: '' });

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newTask, setNewTask] = useState({ title: '', course_id: '', subject: '', priority: 'medium', description: '', due_date: '' });

    const [selectedTask, setSelectedTask] = useState(null);
    const [updateText, setUpdateText] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCoursesAndSubjects();
    }, []);

    useEffect(() => {
        fetchTasks();
    }, [viewMode, filters]);

    const fetchCoursesAndSubjects = async () => {
        try {
            const [subjectsRes, coursesRes] = await Promise.all([
                api.get('/subjects'),
                api.get('/courses')
            ]);
            setDashboardData({ subjects: subjectsRes.data, courses: coursesRes.data });
        } catch (error) {
            console.error('Error fetching data for courses:', error);
        }
    };

    const fetchTasks = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.subject) params.append('subject', filters.subject);
            if (filters.priority) params.append('priority', filters.priority);
            if (filters.due_date) params.append('due_date', filters.due_date);

            // Archive handles only completed. Active handles everything except completed.
            if (viewMode === 'archive') {
                params.append('status', 'completed');
            } else if (filters.status) {
                params.append('status', filters.status);
            }

            const res = await api.get(`${ENDPOINTS.TASKS}?${params.toString()}`);
            let fetchedTasks = res.data;

            if (viewMode === 'active') {
                fetchedTasks = fetchedTasks.filter(t => t.status !== 'completed');
            }

            setTasks(fetchedTasks);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        try {
            await api.post(ENDPOINTS.TASKS, newTask);
            setIsCreateModalOpen(false);
            setNewTask({ title: '', course_id: '', subject: '', priority: 'medium', description: '', due_date: '' });
            fetchTasks();
        } catch (error) {
            console.error('Error creating task:', error);
            alert('Failed to create task. Make sure all required fields are filled.');
        }
    };

    const openTaskDetails = async (id) => {
        try {
            const res = await api.get(`${ENDPOINTS.TASKS}/${id}`);
            setSelectedTask(res.data);
        } catch (error) {
            console.error('Error fetching task details:', error);
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (!selectedTask) return;
        try {
            const res = await api.patch(`${ENDPOINTS.TASKS}/${selectedTask.id}`, { status: newStatus });
            setSelectedTask({ ...selectedTask, status: res.data.status, completed_at: res.data.completed_at });
            fetchTasks(); // Refresh list to reflect changes
        } catch (err) {
            console.error('Error updating status:', err);
        }
    };

    const handleAddUpdate = async (e) => {
        e.preventDefault();
        if (!updateText.trim()) return;
        try {
            const res = await api.post(`${ENDPOINTS.TASKS}/${selectedTask.id}/updates`, { update_text: updateText });
            setSelectedTask({
                ...selectedTask,
                updates: [...(selectedTask.updates || []), res.data]
            });
            setUpdateText('');
        } catch (err) {
            console.error('Error adding update:', err);
        }
    };

    const handleDeleteTask = async () => {
        if (!window.confirm('Are you sure you want to delete this task?')) return;
        try {
            await api.delete(`${ENDPOINTS.TASKS}/${selectedTask.id}`);
            setSelectedTask(null);
            fetchTasks();
        } catch (err) {
            console.error('Error deleting task:', err);
        }
    };

    const extractedCourses = [];
    if (dashboardData?.subjects && dashboardData?.courses) {
        dashboardData.subjects.forEach(sub => {
            const subCourses = dashboardData.courses.filter(c => c.subject_id === sub.id) || [];
            subCourses.forEach(c => extractedCourses.push({ ...c, subjectName: sub.name }));
        });
    }

    return (
        <div style={styles.pageContainer}>
            <div style={styles.header}>
                <div>
                    <h1 style={styles.title}>Tasks</h1>
                    <p style={styles.subtitle}>Track and manage your daily assignments.</p>
                </div>
                <button style={styles.primaryButton} onClick={() => setIsCreateModalOpen(true)}>
                    + New Task
                </button>
            </div>

            <div style={styles.tabsContainer}>
                <button
                    style={viewMode === 'active' ? styles.activeTab : styles.inactiveTab}
                    onClick={() => setViewMode('active')}
                >
                    Active Tasks
                </button>
                <button
                    style={viewMode === 'archive' ? styles.activeTab : styles.inactiveTab}
                    onClick={() => setViewMode('archive')}
                >
                    Archive
                </button>
            </div>

            <div style={styles.filterContainer}>
                <input
                    type="text"
                    placeholder="Filter by Subject"
                    style={styles.input}
                    value={filters.subject}
                    onChange={e => setFilters({ ...filters, subject: e.target.value })}
                />
                <select
                    style={styles.select}
                    value={filters.priority}
                    onChange={e => setFilters({ ...filters, priority: e.target.value })}
                >
                    <option value="">Any Priority</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                </select>
                {viewMode === 'active' && (
                    <select
                        style={styles.select}
                        value={filters.status}
                        onChange={e => setFilters({ ...filters, status: e.target.value })}
                    >
                        <option value="">Any Status</option>
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                    </select>
                )}
                <input
                    type="date"
                    style={styles.input}
                    value={filters.due_date}
                    onChange={e => setFilters({ ...filters, due_date: e.target.value })}
                />
            </div>

            <div style={styles.gridContainer}>
                {loading ? (
                    <p style={styles.emptyState}>Loading tasks...</p>
                ) : tasks.length === 0 ? (
                    <div style={styles.cardStyle}>
                        <div style={styles.emptyState}>
                            <p>No tasks found matching your criteria.</p>
                        </div>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} style={styles.taskCard} onClick={() => openTaskDetails(task.id)}>
                            <div style={styles.taskHeader}>
                                <span style={styles.priorityBadge(task.priority)}>{task.priority || 'none'}</span>
                                <span style={styles.statusBadge(task.status)}>{task.status.replace('_', ' ')}</span>
                            </div>
                            <h3 style={styles.taskTitle}>{task.title}</h3>
                            <p style={styles.taskSubject}>{task.subject ? task.subject : 'General'}</p>
                            {task.due_date && <p style={styles.taskDate}>Due: {task.due_date}</p>}
                        </div>
                    ))
                )}
            </div>

            {/* Create Task Modal */}
            {isCreateModalOpen && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalContent}>
                        <h2 style={styles.modalTitle}>Create New Task</h2>
                        <form onSubmit={handleCreateTask} style={styles.formContainer}>
                            <select
                                required
                                style={styles.formInput}
                                value={newTask.course_id}
                                onChange={e => setNewTask({ ...newTask, course_id: e.target.value })}
                            >
                                <option value="">Select Course</option>
                                {extractedCourses.map(c => (
                                    <option key={c.id} value={c.id}>{c.subjectName} - {c.title}</option>
                                ))}
                            </select>
                            <input
                                required placeholder="Task Title" style={styles.formInput}
                                value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                            />
                            <input
                                placeholder="Subject (Optional)" style={styles.formInput}
                                value={newTask.subject} onChange={e => setNewTask({ ...newTask, subject: e.target.value })}
                            />
                            <select
                                style={styles.formInput}
                                value={newTask.priority}
                                onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                            >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                            </select>
                            <input
                                type="date" style={styles.formInput}
                                value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                            />
                            <textarea
                                placeholder="Description" rows="3" style={styles.formInput}
                                value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                            ></textarea>

                            <div style={styles.modalActions}>
                                <button type="button" style={styles.secondaryButton} onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                                <button type="submit" style={styles.primaryButton}>Save Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Task Details Modal */}
            {selectedTask && (
                <div style={styles.modalOverlay}>
                    <div style={styles.modalDetailContent}>
                        <div style={styles.detailHeader}>
                            <h2 style={styles.modalTitle}>{selectedTask.title}</h2>
                            <button style={styles.closeButton} onClick={() => setSelectedTask(null)}>&times;</button>
                        </div>
                        <div style={styles.badgeRow}>
                            <span style={styles.priorityBadge(selectedTask.priority)}>{selectedTask.priority}</span>
                            <select
                                style={styles.statusSelect}
                                value={selectedTask.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                        <p style={{ marginTop: '1rem', color: '#4b5563' }}>{selectedTask.description || 'No description provided.'}</p>

                        <div style={styles.updatesSection}>
                            <h4 style={styles.sectionTitle}>Updates & Progress</h4>
                            <div style={styles.updatesList}>
                                {(!selectedTask.updates || selectedTask.updates.length === 0) ? (
                                    <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No updates yet.</p>
                                ) : (
                                    selectedTask.updates.map(u => (
                                        <div key={u.id} style={styles.updateItem}>
                                            <p style={styles.updateDate}>{new Date(u.created_at).toLocaleString()}</p>
                                            <p style={styles.updateText}>{u.update_text}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                            <form onSubmit={handleAddUpdate} style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}>
                                <input
                                    type="text"
                                    placeholder="Add an update..."
                                    style={styles.updateInput}
                                    value={updateText}
                                    onChange={(e) => setUpdateText(e.target.value)}
                                />
                                <button type="submit" style={styles.updateButton}>Post</button>
                            </form>
                        </div>

                        <div style={styles.detailActions}>
                            <button style={styles.dangerButton} onClick={handleDeleteTask}>Delete Task</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// PREMIUM STYLES
const styles = {
    pageContainer: { padding: '2rem', flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: '#f9fafb', minHeight: '100vh', fontFamily: "'Inter', sans-serif" },
    header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' },
    title: { fontSize: '2.5rem', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.025em' },
    subtitle: { fontSize: '1.125rem', color: '#6b7280', margin: '0.5rem 0 0 0' },
    primaryButton: { background: 'linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%)', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(79, 70, 229, 0.2), 0 2px 4px -1px rgba(79, 70, 229, 0.1)', transition: 'all 0.2s' },
    secondaryButton: { background: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer' },
    dangerButton: { background: '#fee2e2', color: '#ef4444', border: 'none', padding: '0.5rem 1rem', borderRadius: '0.5rem', fontWeight: '600', cursor: 'pointer' },
    tabsContainer: { display: 'flex', gap: '1rem', borderBottom: '2px solid #e5e7eb', marginBottom: '2rem' },
    activeTab: { background: 'none', border: 'none', borderBottom: '3px solid #4f46e5', padding: '0.5rem 1rem', fontSize: '1.125rem', fontWeight: '600', color: '#4f46e5', cursor: 'pointer', marginBottom: '-2px' },
    inactiveTab: { background: 'none', border: 'none', padding: '0.5rem 1rem', fontSize: '1.125rem', fontWeight: '500', color: '#6b7280', cursor: 'pointer', transition: 'color 0.2s' },
    filterContainer: { display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap', background: 'white', padding: '1rem', borderRadius: '1rem', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)' },
    input: { flex: 1, minWidth: '150px', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', fontSize: '0.875rem', outline: 'none' },
    select: { flex: 1, minWidth: '150px', padding: '0.75rem 1rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', fontSize: '0.875rem', outline: 'none', background: 'white' },
    gridContainer: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' },
    taskCard: { background: 'rgba(255, 255, 255, 0.9)', backdropFilter: 'blur(10px)', borderRadius: '1rem', padding: '1.5rem', border: '1px solid rgba(229, 231, 235, 0.5)', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)', cursor: 'pointer', transition: 'transform 0.2s, boxShadow 0.2s' },
    taskHeader: { display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' },
    priorityBadge: (priority) => {
        let colors = { bg: '#f3f4f6', text: '#374151' };
        if (priority === 'high') colors = { bg: '#fee2e2', text: '#991b1b' };
        if (priority === 'medium') colors = { bg: '#fef3c7', text: '#92400e' };
        if (priority === 'low') colors = { bg: '#d1fae5', text: '#065f46' };
        return { backgroundColor: colors.bg, color: colors.text, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em' };
    },
    statusBadge: (status) => {
        let colors = { bg: '#f3f4f6', text: '#374151' };
        if (status === 'completed') colors = { bg: '#dbeafe', text: '#1e40af' };
        if (status === 'in_progress') colors = { bg: '#ede9fe', text: '#5b21b6' };
        if (status === 'pending') colors = { bg: '#f3f4f6', text: '#4b5563' };
        return { backgroundColor: colors.bg, color: colors.text, padding: '0.25rem 0.75rem', borderRadius: '9999px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'capitalize' };
    },
    taskTitle: { fontSize: '1.25rem', fontWeight: '700', color: '#111827', margin: '0 0 0.5rem 0' },
    taskSubject: { fontSize: '0.875rem', fontWeight: '500', color: '#4f46e5', margin: '0 0 0.5rem 0' },
    taskDate: { fontSize: '0.875rem', color: '#9ca3af', margin: 0, display: 'flex', alignItems: 'center' },
    cardStyle: { background: 'white', borderRadius: '1rem', border: '1px solid #e5e7eb', boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)', padding: '3rem', gridColumn: '1 / -1' },
    emptyState: { display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280', fontSize: '1.125rem' },

    // Modal Styles
    modalOverlay: { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(17, 24, 39, 0.6)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' },
    modalContent: { background: 'white', padding: '2rem', borderRadius: '1.5rem', width: '100%', maxWidth: '500px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' },
    modalDetailContent: { background: 'white', padding: '2.5rem', borderRadius: '1.5rem', width: '100%', maxWidth: '650px', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)', maxHeight: '90vh', overflowY: 'auto' },
    modalTitle: { fontSize: '1.5rem', fontWeight: '800', margin: '0 0 1.5rem 0', color: '#111827' },
    detailHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' },
    closeButton: { background: 'none', border: 'none', fontSize: '2rem', lineHeight: '1', color: '#9ca3af', cursor: 'pointer' },
    formContainer: { display: 'flex', flexDirection: 'column', gap: '1rem' },
    formInput: { padding: '0.875rem 1rem', borderRadius: '0.75rem', border: '1px solid #e5e7eb', fontSize: '1rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', width: '100%', boxSizing: 'border-box' },
    modalActions: { display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '1.5rem' },
    badgeRow: { display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '-0.5rem' },
    statusSelect: { padding: '0.5rem 1rem', borderRadius: '0.5rem', border: '1px solid #d1d5db', fontSize: '0.875rem', fontWeight: '600', color: '#374151', background: '#f9fafb', outline: 'none' },
    updatesSection: { marginTop: '2.5rem', paddingTop: '2rem', borderTop: '1px solid #e5e7eb' },
    sectionTitle: { fontSize: '1.125rem', fontWeight: '700', color: '#111827', margin: '0 0 1rem 0' },
    updatesList: { display: 'flex', flexDirection: 'column', gap: '1rem', maxHeight: '250px', overflowY: 'auto', paddingRight: '0.5rem' },
    updateItem: { background: '#f9fafb', padding: '1rem', borderRadius: '0.75rem', border: '1px solid #f3f4f6' },
    updateDate: { fontSize: '0.75rem', color: '#6b7280', margin: '0 0 0.25rem 0', fontWeight: '600' },
    updateText: { fontSize: '0.9375rem', color: '#374151', margin: 0, lineHeight: '1.5' },
    updateInput: { flex: 1, padding: '0.75rem 1rem', borderRadius: '0.75rem', border: '1px solid #d1d5db', fontSize: '0.875rem', outline: 'none' },
    updateButton: { background: '#111827', color: 'white', border: 'none', padding: '0.75rem 1.5rem', borderRadius: '0.75rem', fontWeight: '600', cursor: 'pointer' },
    detailActions: { display: 'flex', justifyContent: 'flex-end', marginTop: '2.5rem' }
};
