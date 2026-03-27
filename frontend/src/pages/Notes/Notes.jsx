import React, { useState, useEffect, useRef } from 'react';
import api from '../../api/client';
import { ENDPOINTS } from '../../api/endpoints';

// ─── Inline styles (no extra CSS file needed) ───────────────────────────────
const S = {
  page:        { padding: '24px', maxWidth: '960px', margin: '0 auto', fontFamily: 'inherit' },
  header:      { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' },
  title:       { margin: 0, fontSize: '1.6rem', fontWeight: 700 },
  btnPrimary:  { background: '#4f46e5', color: '#fff', border: 'none', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.9rem' },
  btnDanger:   { background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.82rem' },
  btnSecondary:{ background: '#e5e7eb', color: '#111', border: 'none', borderRadius: '8px', padding: '6px 14px', cursor: 'pointer', fontSize: '0.85rem' },
  btnAi:       { background: '#7c3aed', color: '#fff', border: 'none', borderRadius: '8px', padding: '6px 12px', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '5px' },
  card:        { background: '#fff', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px', marginBottom: '12px', boxShadow: '0 1px 3px rgba(0,0,0,.06)' },
  cardRow:     { display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' },
  label:       { fontSize: '0.75rem', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: '2px' },
  // Modal
  overlay:     { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' },
  modal:       { background: '#fff', borderRadius: '14px', padding: '28px', width: '100%', maxWidth: '520px', boxShadow: '0 20px 60px rgba(0,0,0,.2)', maxHeight: '90vh', overflowY: 'auto' },
  input:       { width: '100%', border: '1px solid #d1d5db', borderRadius: '7px', padding: '9px 12px', fontSize: '0.9rem', boxSizing: 'border-box', marginTop: '6px' },
  formGroup:   { marginBottom: '14px' },
  // AI Panel (slide-up drawer style)
  aiPanel:     { position: 'fixed', bottom: 0, right: 0, width: '420px', maxWidth: '100vw', background: '#1e1b4b', color: '#e0e7ff', borderRadius: '14px 14px 0 0', boxShadow: '0 -4px 30px rgba(0,0,0,.35)', zIndex: 900, display: 'flex', flexDirection: 'column', maxHeight: '80vh' },
  aiHeader:    { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #312e81', flexShrink: 0 },
  aiHeaderTitle:{ margin: 0, fontSize: '1rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' },
  aiBody:      { padding: '16px', overflowY: 'auto', flex: 1 },
  // Quiz card
  qCard:       { background: '#312e81', borderRadius: '10px', padding: '14px', marginBottom: '12px' },
  qNum:        { fontSize: '0.72rem', fontWeight: 700, color: '#a5b4fc', textTransform: 'uppercase', marginBottom: '5px' },
  qText:       { fontWeight: 600, marginBottom: '10px', fontSize: '0.95rem', lineHeight: 1.4 },
  optionBtn:   { display: 'block', width: '100%', textAlign: 'left', background: '#1e1b4b', color: '#c7d2fe', border: '1px solid #4338ca', borderRadius: '7px', padding: '7px 10px', marginBottom: '6px', cursor: 'pointer', fontSize: '0.85rem', transition: 'background .15s' },
  optionCorrect:{ background: '#065f46', color: '#d1fae5', border: '1px solid #34d399' },
  optionWrong: { background: '#7f1d1d', color: '#fecaca', border: '1px solid #f87171' },
  optionDisabled:{ cursor: 'default' },
  explanation: { marginTop: '8px', fontSize: '0.82rem', color: '#a5b4fc', lineHeight: 1.4 },
  scoreBox:    { background: '#312e81', borderRadius: '10px', padding: '14px', marginBottom: '16px', textAlign: 'center' },
};

// ── AI Panel Component ───────────────────────────────────────────────────────
function AiQuizPanel({ notes, onClose }) {
  const [selectedNoteId, setSelectedNoteId] = useState('');
  const [numQuestions, setNumQuestions]     = useState('5');
  const [quiz, setQuiz]                     = useState(null);      // array of questions
  const [answers, setAnswers]               = useState({});        // { qIndex: chosenOption }
  const [loading, setLoading]               = useState(false);
  const [error, setError]                   = useState('');
  const bodyRef                             = useRef(null);

  const hasFile = (note) => note.file_path;

  const handleGenerate = async () => {
    if (!selectedNoteId) { setError('Please select a note first.'); return; }
    const parsedNumQuestions = Number.parseInt(numQuestions, 10);
    if (!Number.isInteger(parsedNumQuestions) || parsedNumQuestions < 1 || parsedNumQuestions > 50) {
      setError('Please enter a valid number between 1 and 50.');
      return;
    }
    setError('');
    setQuiz(null);
    setAnswers({});
    setLoading(true);
    try {
      const res = await api.post(`${ENDPOINTS.NOTES}/${selectedNoteId}/quiz`, { num_questions: parsedNumQuestions });
      setQuiz(res.data.questions);
      setTimeout(() => bodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' }), 100);
    } catch (err) {
      const msg = err.response?.data?.message || 'Failed to generate quiz. Try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qIdx, opt) => {
    if (answers[qIdx] !== undefined) return; // already answered
    setAnswers(prev => ({ ...prev, [qIdx]: opt }));
  };

  const score = quiz
    ? Object.entries(answers).filter(([i, opt]) => {
        const q = quiz[parseInt(i)];
        return q && opt.startsWith(q.answer);
      }).length
    : 0;

  const allAnswered = quiz && Object.keys(answers).length === quiz.length;

  return (
    <div style={S.aiPanel}>
      <div style={S.aiHeader}>
        <h3 style={S.aiHeaderTitle}>
          <span>✨</span> AI Quiz Generator
        </h3>
        <button onClick={onClose} style={{ ...S.btnSecondary, padding: '4px 10px', background: '#312e81', color: '#a5b4fc', border: '1px solid #4338ca' }}>✕</button>
      </div>

      <div style={S.aiBody} ref={bodyRef}>
        {/* Controls */}
        {!quiz && (
          <div>
            <div style={S.formGroup}>
              <div style={{ ...S.label, color: '#a5b4fc' }}>Select a Note</div>
              <select
                style={{ ...S.input, background: '#312e81', color: '#e0e7ff', border: '1px solid #4338ca', marginTop: '6px' }}
                value={selectedNoteId}
                onChange={e => setSelectedNoteId(e.target.value)}
              >
                <option value="">-- choose note --</option>
                {notes.map(n => (
                  <option key={n.id} value={n.id}>
                    {n.title}{hasFile(n) ? ' 📎' : ''}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: '4px' }}>📎 = has uploaded PDF/image</div>
            </div>

            <div style={S.formGroup}>
              <div style={{ ...S.label, color: '#a5b4fc' }}>Number of Questions</div>
              <input
                type="number"
                min={1}
                max={50}
                step={1}
                style={{ ...S.input, background: '#312e81', color: '#e0e7ff', border: '1px solid #4338ca', marginTop: '6px' }}
                value={numQuestions}
                onChange={e => setNumQuestions(e.target.value)}
                placeholder="e.g. 12"
              />
              <div style={{ fontSize: '0.75rem', color: '#6366f1', marginTop: '4px' }}>Choose any number from 1 to 50</div>
            </div>

            {error && <p style={{ color: '#fca5a5', fontSize: '0.85rem', marginBottom: '10px' }}>{error}</p>}

            <button
              onClick={handleGenerate}
              disabled={loading}
              style={{ ...S.btnPrimary, width: '100%', padding: '10px', opacity: loading ? .7 : 1 }}
            >
              {loading ? '⏳ Generating…' : '🚀 Generate Quiz'}
            </button>
          </div>
        )}

        {/* Quiz */}
        {quiz && (
          <div>
            {allAnswered && (
              <div style={S.scoreBox}>
                <div style={{ fontSize: '1.4rem', fontWeight: 800, color: score === quiz.length ? '#34d399' : '#f59e0b' }}>
                  {score} / {quiz.length}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#a5b4fc', marginTop: '4px' }}>
                  {score === quiz.length ? '🎉 Perfect score!' : score >= quiz.length / 2 ? '👍 Good job!' : '📖 Keep studying!'}
                </div>
              </div>
            )}

            {quiz.map((q, i) => {
              const chosen    = answers[i];
              const isAnswered = chosen !== undefined;
              return (
                <div key={i} style={S.qCard}>
                  <div style={S.qNum}>Q{i + 1}</div>
                  <div style={S.qText}>{q.question}</div>
                  {(q.options || []).map((opt, j) => {
                    const letter  = opt.charAt(0);
                    const correct = letter === q.answer;
                    let optStyle  = { ...S.optionBtn };
                    if (isAnswered) {
                      optStyle = { ...optStyle, ...S.optionDisabled };
                      if (opt === chosen)  optStyle = { ...optStyle, ...(correct ? S.optionCorrect : S.optionWrong) };
                      if (correct && opt !== chosen) optStyle = { ...optStyle, ...S.optionCorrect };
                    }
                    return (
                      <button key={j} style={optStyle} onClick={() => handleAnswer(i, opt)} disabled={isAnswered}>
                        {opt}
                      </button>
                    );
                  })}
                  {isAnswered && q.explanation && (
                    <div style={S.explanation}>💡 {q.explanation}</div>
                  )}
                </div>
              );
            })}

            <button onClick={() => { setQuiz(null); setAnswers({}); }} style={{ ...S.btnSecondary, width: '100%', padding: '9px', background: '#312e81', color: '#a5b4fc', border: '1px solid #4338ca', marginTop: '4px' }}>
              ← New Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Notes Page ──────────────────────────────────────────────────────────
export default function Notes() {
  const [notes, setNotes]                   = useState([]);
  const [tasks, setTasks]                   = useState([]);
  const [loading, setLoading]               = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newNote, setNewNote]               = useState({ title: '', task_id: '', content: '', file: null });
  const [aiPanelOpen, setAiPanelOpen]       = useState(false);

  const getStorageUrl = (path) => {
    if (!path) return '#';
    const baseUrl = import.meta.env.VITE_API_URL.replace(/\/api\/?$/, '');
    return `${baseUrl}/storage/${path}`;
  };

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [notesRes, tasksRes] = await Promise.all([
        api.get(ENDPOINTS.NOTES),
        api.get(ENDPOINTS.TASKS),
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
      if (newNote.file)    formData.append('file', newNote.file);
      await api.post(ENDPOINTS.NOTES, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
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
    <div style={S.page}>
      {/* Header */}
      <div style={S.header}>
        <h1 style={S.title}>Notes</h1>
        <div style={{ display: 'flex', gap: '10px' }}>
          {/* ✨ AI Quiz Button */}
          <button style={S.btnAi} onClick={() => setAiPanelOpen(v => !v)}>
            ✨ AI Quiz
          </button>
          <button style={S.btnPrimary} onClick={() => setIsCreateModalOpen(true)}>
            + New Note
          </button>
        </div>
      </div>

      {/* Notes list */}
      {loading ? (
        <p style={{ color: '#6b7280' }}>Loading…</p>
      ) : notes.length === 0 ? (
        <p style={{ color: '#9ca3af', textAlign: 'center', marginTop: '40px' }}>No notes yet. Create your first note!</p>
      ) : (
        notes.map(note => (
          <div key={note.id} style={S.card}>
            <div style={S.cardRow}>
              <div style={{ flex: 1 }}>
                <h3 style={{ margin: '0 0 6px', fontSize: '1rem', fontWeight: 700 }}>{note.title}</h3>
                <div style={S.label}>Task: {getTaskLabel(note.task_id)}</div>
                {note.content && <p style={{ margin: '8px 0 0', fontSize: '0.88rem', color: '#374151', lineHeight: 1.5 }}>{note.content}</p>}
                {note.file_path && (
                  <p style={{ margin: '8px 0 0', fontSize: '0.82rem' }}>
                    📎 <a href={getStorageUrl(note.file_path)} target="_blank" rel="noopener noreferrer" style={{ color: '#4f46e5' }}>
                      {note.original_name || 'View file'}
                    </a>
                  </p>
                )}
              </div>
              <button style={S.btnDanger} onClick={() => handleDeleteNote(note.id)}>Delete</button>
            </div>
          </div>
        ))
      )}

      {/* Create Note Modal */}
      {isCreateModalOpen && (
        <div style={S.overlay} onClick={() => setIsCreateModalOpen(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <h2 style={{ margin: '0 0 18px', fontSize: '1.2rem' }}>New Note</h2>
            <form onSubmit={handleCreateNote}>
              <div style={S.formGroup}>
                <label style={S.label}>Title *</label>
                <input required style={S.input} value={newNote.title} onChange={e => setNewNote({ ...newNote, title: e.target.value })} placeholder="Note title" />
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>Task</label>
                <select style={S.input} value={newNote.task_id} onChange={e => setNewNote({ ...newNote, task_id: e.target.value })}>
                  <option value="">None</option>
                  {tasks.map(t => <option key={t.id} value={t.id}>{t.title}</option>)}
                </select>
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>Content</label>
                <textarea rows={4} style={{ ...S.input, resize: 'vertical' }} value={newNote.content} onChange={e => setNewNote({ ...newNote, content: e.target.value })} placeholder="Write your notes here…" />
              </div>
              <div style={S.formGroup}>
                <label style={S.label}>File (PDF or Image)</label>
                <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp" style={{ ...S.input, padding: '7px' }} onChange={e => setNewNote({ ...newNote, file: e.target.files[0] })} />
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" style={S.btnSecondary} onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
                <button type="submit" style={S.btnPrimary}>Save Note</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* AI Quiz Panel */}
      {aiPanelOpen && (
        <AiQuizPanel notes={notes} onClose={() => setAiPanelOpen(false)} />
      )}
    </div>
  );
}
