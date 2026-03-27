import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';
import './Tasks.css';

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

    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleText, setEditTitleText] = useState('');

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
            setEditTitleText(res.data.title);
            setIsEditingTitle(false);
        } catch (error) {
            console.error('Error fetching task details:', error);
        }
    };

    const handleTitleSave = async () => {
        if (!editTitleText.trim() || editTitleText === selectedTask.title) {
            setIsEditingTitle(false);
            return;
        }
        try {
            const res = await api.patch(`${ENDPOINTS.TASKS}/${selectedTask.id}`, { title: editTitleText });
            setSelectedTask({ ...selectedTask, title: res.data.title });
            setIsEditingTitle(false);
            fetchTasks();
        } catch (err) {
            console.error('Error updating title:', err);
        }
    };

    const handleStatusChange = async (newStatus) => {
        if (!selectedTask) return;
        try {
            const res = await api.patch(`${ENDPOINTS.TASKS}/${selectedTask.id}`, { status: newStatus });
            setSelectedTask({ ...selectedTask, status: res.data.status, completed_at: res.data.completed_at });
            fetchTasks();
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
        <div className="tasks-page">
            <div className="tasks-hero">
                <div>
                    <h1 className="tasks-title">Tasks</h1>
                    <p className="tasks-subtitle">Track and manage your daily assignments.</p>
                </div>
                <button className="tasks-primary-btn" onClick={() => setIsCreateModalOpen(true)}>
                    + New Task
                </button>
            </div>

            <div className="tasks-tabs">
                <button
                    className={`tasks-tab ${viewMode === 'active' ? 'tasks-tab--active' : ''}`}
                    onClick={() => setViewMode('active')}
                >
                    Active Tasks
                </button>
                <button
                    className={`tasks-tab ${viewMode === 'archive' ? 'tasks-tab--active' : ''}`}
                    onClick={() => setViewMode('archive')}
                >
                    Archive
                </button>
            </div>

            <div className="tasks-filters">
                <input
                    type="text"
                    placeholder="Filter by Subject"
                    className="tasks-input"
                    value={filters.subject}
                    onChange={e => setFilters({ ...filters, subject: e.target.value })}
                />
                <select
                    className="tasks-select"
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
                        className="tasks-select"
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
                    className="tasks-input"
                    value={filters.due_date}
                    onChange={e => setFilters({ ...filters, due_date: e.target.value })}
                />
            </div>

            <div className="tasks-grid">
                {loading ? (
                    <p className="tasks-empty">Loading tasks...</p>
                ) : tasks.length === 0 ? (
                    <div className="tasks-empty-card">
                        <p>No tasks found matching your criteria.</p>
                    </div>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className="tasks-card" onClick={() => openTaskDetails(task.id)}>
                            <div className="tasks-card-header">
                                <span className={`tasks-badge tasks-badge--priority tasks-badge--${task.priority || 'none'}`}>
                                    {task.priority || 'none'}
                                </span>
                                <span className={`tasks-badge tasks-badge--status tasks-badge--${task.status}`}>
                                    {task.status.replace('_', ' ')}
                                </span>
                            </div>
                            <h3 className="tasks-card-title">{task.title}</h3>
                            <p className="tasks-card-subject">{task.subject ? task.subject : 'General'}</p>
                            {task.due_date && <p className="tasks-card-date">Due: {task.due_date}</p>}
                        </div>
                    ))
                )}
            </div>

            {/* Create Task Modal */}
            {isCreateModalOpen && (
                <div className="tasks-modal-overlay">
                    <div className="tasks-modal">
                        <h2 className="tasks-modal-title">Create New Task</h2>
                        <form onSubmit={handleCreateTask} className="tasks-form">
                            <select
                                required
                                className="tasks-form-input"
                                value={newTask.course_id}
                                onChange={e => setNewTask({ ...newTask, course_id: e.target.value })}
                            >
                                <option value="">Select Course</option>
                                {extractedCourses.map(c => (
                                    <option key={c.id} value={c.id}>{c.subjectName} - {c.title}</option>
                                ))}
                            </select>
                            <input
                                required placeholder="Task Title" className="tasks-form-input"
                                value={newTask.title} onChange={e => setNewTask({ ...newTask, title: e.target.value })}
                            />
                            <input
                                placeholder="Subject (Optional)" className="tasks-form-input"
                                value={newTask.subject} onChange={e => setNewTask({ ...newTask, subject: e.target.value })}
                            />
                            <select
                                className="tasks-form-input"
                                value={newTask.priority}
                                onChange={e => setNewTask({ ...newTask, priority: e.target.value })}
                            >
                                <option value="low">Low Priority</option>
                                <option value="medium">Medium Priority</option>
                                <option value="high">High Priority</option>
                            </select>
                            <input
                                type="date" className="tasks-form-input"
                                value={newTask.due_date} onChange={e => setNewTask({ ...newTask, due_date: e.target.value })}
                            />
                            <textarea
                                placeholder="Description" rows="3" className="tasks-form-input"
                                value={newTask.description} onChange={e => setNewTask({ ...newTask, description: e.target.value })}
                            ></textarea>

                            <div className="tasks-modal-actions">
                                <button type="button" className="tasks-secondary-btn" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                                <button type="submit" className="tasks-primary-btn">Save Task</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Task Details Modal */}
            {selectedTask && (
                <div className="tasks-modal-overlay">
                    <div className="tasks-modal tasks-modal--detail">
                        <div className="tasks-detail-header">
                            {isEditingTitle ? (
                                <div className="tasks-detail-title-edit">
                                    <input
                                        className="tasks-form-input tasks-title-input"
                                        value={editTitleText}
                                        onChange={(e) => setEditTitleText(e.target.value)}
                                        autoFocus
                                    />
                                    <button onClick={handleTitleSave} className="tasks-primary-btn tasks-btn-compact">Save</button>
                                    <button onClick={() => setIsEditingTitle(false)} className="tasks-secondary-btn tasks-btn-compact">Cancel</button>
                                </div>
                            ) : (
                                <div className="tasks-detail-title">
                                    <h2 className="tasks-modal-title">{selectedTask.title}</h2>
                                    <button onClick={() => setIsEditingTitle(true)} className="tasks-edit-btn" aria-label="Edit title">
                                        <svg className="tasks-edit-icon" viewBox="0 0 24 24" aria-hidden="true">
                                            <path d="M16.862 4.487a1.5 1.5 0 0 1 2.121 2.121l-9.9 9.9-3.536.707.707-3.536 9.9-9.9z" />
                                            <path d="M5 19h14" />
                                        </svg>
                                    </button>
                                </div>
                            )}
                            <button className="tasks-close-btn" onClick={() => setSelectedTask(null)}>&times;</button>
                        </div>
                        <div className="tasks-badge-row">
                            <span className={`tasks-badge tasks-badge--priority tasks-badge--${selectedTask.priority || 'none'}`}>{selectedTask.priority}</span>
                            <select
                                className="tasks-status-select"
                                value={selectedTask.status}
                                onChange={(e) => handleStatusChange(e.target.value)}
                            >
                                <option value="pending">Pending</option>
                                <option value="in_progress">In Progress</option>
                                <option value="completed">Completed</option>
                            </select>
                        </div>
                        <p className="tasks-detail-description">{selectedTask.description || 'No description provided.'}</p>

                        <div className="tasks-updates">
                            <h4 className="tasks-section-title">Updates & Progress</h4>
                            <div className="tasks-updates-list">
                                {(!selectedTask.updates || selectedTask.updates.length === 0) ? (
                                    <p className="tasks-muted">No updates yet.</p>
                                ) : (
                                    selectedTask.updates.map(u => (
                                        <div key={u.id} className="tasks-update-item">
                                            <p className="tasks-update-date">{new Date(u.created_at).toLocaleString()}</p>
                                            <p className="tasks-update-text">{u.update_text}</p>
                                        </div>
                                    ))
                                )}
                            </div>
                            <form onSubmit={handleAddUpdate} className="tasks-update-form">
                                <input
                                    type="text"
                                    placeholder="Add an update..."
                                    className="tasks-update-input"
                                    value={updateText}
                                    onChange={(e) => setUpdateText(e.target.value)}
                                />
                                <button type="submit" className="tasks-update-btn">Post</button>
                            </form>
                        </div>

                        <div className="tasks-detail-actions">
                            <button className="tasks-danger-btn" onClick={handleDeleteTask}>Delete Task</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
