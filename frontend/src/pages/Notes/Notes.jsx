import React, { useState, useEffect } from 'react';
import api from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';

export default function Notes() {
    const [notes, setNotes] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);

    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [newNote, setNewNote] = useState({ title: '', task_id: '', content: '', file: null });

    const getStorageUrl = (path) => {
        if (!path) return '#';
        const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
        return `${baseUrl}/storage/${path}`;
    };

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [notesRes, tasksRes] = await Promise.all([
                api.get(ENDPOINTS.NOTES),
                api.get(ENDPOINTS.TASKS)
            ]);
            setNotes(notesRes.data);
            setTasks(tasksRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateNote = async (e) => {
        e.preventDefault();
        try {
            const formData = new FormData();
            formData.append('title', newNote.title);
            if (newNote.task_id) formData.append('task_id', newNote.task_id);
            if (newNote.content) formData.append('content', newNote.content);
            if (newNote.file) formData.append('file', newNote.file);

            await api.post(ENDPOINTS.NOTES, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setIsCreateModalOpen(false);
            setNewNote({ title: '', task_id: '', content: '', file: null });
            fetchData();
        } catch (error) {
            console.error('Error creating note:', error);
            alert('Failed to upload note.');
        }
    };

    const handleDeleteNote = async (id) => {
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        try {
            await api.delete(`${ENDPOINTS.NOTES}/${id}`);
            fetchData();
        } catch (error) {
            console.error('Error deleting note:', error);
        }
    };

    const getTaskLabel = (taskId) => {
        const task = tasks.find(t => t.id == taskId);
        return task ? task.title : 'General';
    };

    return (
        <div style={{ padding: '20px' }}>
            <h1>Notes</h1>
            <button onClick={() => setIsCreateModalOpen(true)}>Create Note</button>

            {loading ? (
                <p>Loading...</p>
            ) : (
                <ul style={{ marginTop: '20px' }}>
                    {notes.map(note => (
                        <li key={note.id} style={{ border: '1px solid #ccc', padding: '10px', marginBottom: '10px' }}>
                            <h3>{note.title}</h3>
                            <p><strong>Task:</strong> {getTaskLabel(note.task_id)}</p>
                            <p>{note.content}</p>
                            {note.file_path && (
                                <p>
                                    File: <a href={getStorageUrl(note.file_path)} target="_blank" rel="noopener noreferrer">View</a>
                                </p>
                            )}
                            <button onClick={() => handleDeleteNote(note.id)}>Delete</button>
                        </li>
                    ))}
                </ul>
            )}

            {isCreateModalOpen && (
                <div style={{ border: '1px solid black', padding: '20px', marginTop: '20px' }}>
                    <h2>New Note</h2>
                    <form onSubmit={handleCreateNote}>
                        <div>
                            <label>Title: </label>
                            <input required value={newNote.title} onChange={e => setNewNote({ ...newNote, title: e.target.value })} />
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <label>Task: </label>
                            <select value={newNote.task_id} onChange={e => setNewNote({ ...newNote, task_id: e.target.value })}>
                                <option value="">None</option>
                                {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                            </select>
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <label>Content: </label>
                            <textarea value={newNote.content} onChange={e => setNewNote({ ...newNote, content: e.target.value })} />
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <label>File: </label>
                            <input type="file" onChange={e => setNewNote({ ...newNote, file: e.target.files[0] })} />
                        </div>
                        <div style={{ marginTop: '10px' }}>
                            <button type="submit">Save</button>
                            <button type="button" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

