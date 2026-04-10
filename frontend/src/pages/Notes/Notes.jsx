import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FiFileText, FiMenu, FiPaperclip, FiPlus, FiZap, FiTrash2, FiX } from "react-icons/fi";
import api from "../../api/client";
import { ENDPOINTS } from "../../api/endpoints";
import "./notes.css";

const INITIAL_NOTE_FORM = { title: "", task_id: "", content: "", file: null };

function firstValidationMessage(errors) {
  if (!errors || typeof errors !== "object") return "";
  const messageList = Object.values(errors).find((messages) => Array.isArray(messages) && messages.length > 0);
  return messageList ? String(messageList[0]) : "";
}

function getNotesErrorMessage(error, fallbackMessage) {
  if (!error?.response) {
    return "Could not reach the server. Check your internet connection and try again.";
  }

  const status = error.response.status;
  const payload = error.response.data || {};
  const validationMessage = firstValidationMessage(payload.errors);

  if (validationMessage) return validationMessage;
  if (typeof payload.message === "string" && payload.message.trim()) return payload.message;
  if (status === 401) return "Your session expired. Please log in again.";
  if (status === 403) return "You do not have permission to do this action.";
  if (status === 404) return "The selected note could not be found. Refresh and try again.";
  if (status === 413) return "The file is too large. Please upload a file smaller than 10 MB.";
  if (status === 422) return "Some note details are invalid. Please review your input.";
  if (status >= 500) return "The server hit an error. Please try again in a moment.";

  return fallbackMessage;
}

function getStorageUrlFromBase(baseUrl, path) {
  if (!path) return "#";
  return `${baseUrl}/storage/${path}`;
}

function AiQuizPanel({ notes, onClose }) {
  const [selectedNoteId, setSelectedNoteId] = useState("");
  const [numQuestions, setNumQuestions] = useState("5");
  const [quiz, setQuiz] = useState(null);
  const [answers, setAnswers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bodyRef = useRef(null);

  const hasFile = (note) => Boolean(note.file_path);

  const handleGenerate = async () => {
    if (!selectedNoteId) {
      setError("Please select a note first.");
      return;
    }

    const parsedNumQuestions = Number.parseInt(numQuestions, 10);
    if (!Number.isInteger(parsedNumQuestions) || parsedNumQuestions < 1 || parsedNumQuestions > 50) {
      setError("Please enter a valid number between 1 and 50.");
      return;
    }

    setError("");
    setQuiz(null);
    setAnswers({});
    setLoading(true);

    try {
      const res = await api.post(`${ENDPOINTS.NOTES}/${selectedNoteId}/quiz`, {
        num_questions: parsedNumQuestions,
      });
      setQuiz(res.data.questions || []);
      setTimeout(() => bodyRef.current?.scrollTo({ top: 0, behavior: "smooth" }), 100);
    } catch (err) {
      const msg = getNotesErrorMessage(err, "Failed to generate quiz. Try again.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (qIdx, option) => {
    if (answers[qIdx] !== undefined) return;
    setAnswers((prev) => ({ ...prev, [qIdx]: option }));
  };

  const score = quiz
    ? Object.entries(answers).filter(([index, option]) => {
        const question = quiz[Number.parseInt(index, 10)];
        return question && option.startsWith(question.answer);
      }).length
    : 0;

  const allAnswered = Boolean(quiz) && Object.keys(answers).length === quiz.length;

  return (
    <div className="notes-ai-panel">
      <div className="notes-ai-header">
        <h3 className="notes-ai-title font-display">
          <FiZap size={15} />
          AI Quiz Generator
        </h3>
        <button type="button" className="notes-ai-close" onClick={onClose} aria-label="Close AI quiz panel">
          <FiX size={17} />
        </button>
      </div>

      <div className="notes-ai-body font-sans" ref={bodyRef}>
        {!quiz && (
          <div className="notes-ai-controls">
            <div className="notes-form-group">
              <label className="notes-form-label notes-form-label--ai">Select a Note</label>
              <select
                className="notes-input notes-input--ai"
                value={selectedNoteId}
                onChange={(event) => setSelectedNoteId(event.target.value)}
              >
                <option value="">Choose note</option>
                {notes.map((note) => (
                  <option key={note.id} value={note.id}>
                    {note.title}
                    {hasFile(note) ? " (with file)" : ""}
                  </option>
                ))}
              </select>
              <p className="notes-ai-hint">Notes with uploads are better for richer quiz context.</p>
            </div>

            <div className="notes-form-group">
              <label className="notes-form-label notes-form-label--ai">Number of Questions</label>
              <input
                type="number"
                min={1}
                max={50}
                step={1}
                className="notes-input notes-input--ai"
                value={numQuestions}
                onChange={(event) => setNumQuestions(event.target.value)}
                placeholder="e.g. 12"
              />
              <p className="notes-ai-hint">Enter a value from 1 to 50.</p>
            </div>

            {error && <p className="notes-ai-error">{error}</p>}

            <button
              type="button"
              className="notes-ai-generate"
              onClick={handleGenerate}
              disabled={loading}
            >
              {loading ? "Generating..." : "Generate Quiz"}
            </button>
          </div>
        )}

        {quiz && (
          <div className="notes-quiz-wrap">
            {allAnswered && (
              <div className="notes-score-box">
                <p className="notes-score-value">
                  {score} / {quiz.length}
                </p>
                <p className="notes-score-text">
                  {score === quiz.length
                    ? "Perfect score!"
                    : score >= quiz.length / 2
                      ? "Good progress."
                      : "Keep studying."}
                </p>
              </div>
            )}

            {quiz.map((question, qIndex) => {
              const chosen = answers[qIndex];
              const isAnswered = chosen !== undefined;

              return (
                <article key={qIndex} className="notes-question-card">
                  <p className="notes-question-number">Q{qIndex + 1}</p>
                  <p className="notes-question-text">{question.question}</p>

                  {(question.options || []).map((option, optionIndex) => {
                    const letter = option.charAt(0);
                    const correct = letter === question.answer;

                    let optionClass = "notes-option-btn";
                    if (isAnswered) optionClass += " notes-option-btn--locked";
                    if (isAnswered && option === chosen && correct) optionClass += " notes-option-btn--correct";
                    if (isAnswered && option === chosen && !correct) optionClass += " notes-option-btn--wrong";
                    if (isAnswered && correct && option !== chosen) optionClass += " notes-option-btn--correct";

                    return (
                      <button
                        key={optionIndex}
                        type="button"
                        className={optionClass}
                        onClick={() => handleAnswer(qIndex, option)}
                        disabled={isAnswered}
                      >
                        {option}
                      </button>
                    );
                  })}

                  {isAnswered && question.explanation && (
                    <p className="notes-explanation">{question.explanation}</p>
                  )}
                </article>
              );
            })}

            <button
              type="button"
              className="notes-ai-reset"
              onClick={() => {
                setQuiz(null);
                setAnswers({});
              }}
            >
              New Quiz
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Notes() {
  // State
  const [notes, setNotes] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState(null);
  const [createError, setCreateError] = useState("");
  const [isCreatingNote, setIsCreatingNote] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newNote, setNewNote] = useState(INITIAL_NOTE_FORM);
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [isMobileView, setIsMobileView] = useState(() => window.innerWidth <= 768);
  const [isMobileNotesSidebarOpen, setIsMobileNotesSidebarOpen] = useState(false);

  // Derived
  const storageBaseUrl = useMemo(() => {
    const configuredApiUrl = import.meta.env.VITE_API_URL || "";
    return configuredApiUrl.replace(/\/api\/?$/, "");
  }, []);

  const taskLabelById = useMemo(() => {
    const labelMap = new Map();
    tasks.forEach((task) => {
      labelMap.set(String(task.id), task.title);
    });
    return labelMap;
  }, [tasks]);

  const getTaskLabel = useCallback((taskId) => {
    return taskLabelById.get(String(taskId)) || "General";
  }, [taskLabelById]);

  const getStorageUrl = useCallback((path) => {
    return getStorageUrlFromBase(storageBaseUrl, path);
  }, [storageBaseUrl]);

  // Handlers
  const updateNewNoteField = useCallback((field, value) => {
    setCreateError("");
    setNewNote((prev) => ({ ...prev, [field]: value }));
  }, []);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [notesRes, tasksRes] = await Promise.all([api.get(ENDPOINTS.NOTES), api.get(ENDPOINTS.TASKS)]);
      setNotes(notesRes.data);
      setTasks(tasksRes.data);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError(getNotesErrorMessage(err, "Failed to load notes."));
    } finally {
      setLoading(false);
    }
  }, []);

  const handleCreateNote = useCallback(async (event) => {
    event.preventDefault();
    setCreateError("");
    setNotice(null);
    setIsCreatingNote(true);

    try {
      const formData = new FormData();
      formData.append("title", newNote.title);
      if (newNote.task_id) formData.append("task_id", newNote.task_id);
      if (newNote.content) formData.append("content", newNote.content);
      if (newNote.file) formData.append("file", newNote.file);

      await api.post(ENDPOINTS.NOTES, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setIsCreateModalOpen(false);
      setNewNote({ ...INITIAL_NOTE_FORM });
      setNotice({ type: "success", text: "Note saved successfully." });
      await fetchData();
    } catch (err) {
      console.error("Error creating note:", err);
      setCreateError(getNotesErrorMessage(err, "Failed to upload note."));
    } finally {
      setIsCreatingNote(false);
    }
  }, [fetchData, newNote]);

  const handleDeleteNote = useCallback(async (id) => {
    if (!window.confirm("Are you sure you want to delete this note?")) return;

    setNotice(null);
    setDeletingNoteId(id);

    try {
      await api.delete(`${ENDPOINTS.NOTES}/${id}`);
      setNotice({ type: "success", text: "Note deleted successfully." });
      await fetchData();
    } catch (err) {
      console.error("Error deleting note:", err);
      setNotice({ type: "error", text: getNotesErrorMessage(err, "Failed to delete note.") });
    } finally {
      setDeletingNoteId(null);
    }
  }, [fetchData]);

  // Effects
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    const onResize = () => setIsMobileView(window.innerWidth <= 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!aiPanelOpen || !isMobileView) {
      setIsMobileNotesSidebarOpen(false);
    }
  }, [aiPanelOpen, isMobileView]);

  useEffect(() => {
    if (!(isMobileView && isMobileNotesSidebarOpen)) return undefined;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileView, isMobileNotesSidebarOpen]);

  const renderNotesList = (extraClass = "") => (
    <div className={`notes-list ${extraClass}`.trim()}>
      {loading && <p className="notes-state">Loading notes...</p>}

      {!loading && notes.length === 0 && <p className="notes-state">No notes yet. Create your first note.</p>}

      {!loading &&
        notes.length > 0 &&
        notes.map((note) => (
          <article key={note.id} className="notes-card">
            <div className="notes-card-main">
              <p className="notes-task-tag">TASK: {getTaskLabel(note.task_id).toUpperCase()}</p>

              <h3 className="notes-card-title">
                <FiFileText size={14} />
                {note.title}
              </h3>

              {note.content && <p className="notes-card-content">{note.content}</p>}

              {note.file_path && (
                <a
                  href={getStorageUrl(note.file_path)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="notes-file-link"
                >
                  <FiPaperclip size={13} />
                  {note.original_name || "View file"}
                </a>
              )}
            </div>

            <button
              type="button"
              className="notes-delete-btn"
              onClick={() => handleDeleteNote(note.id)}
              disabled={deletingNoteId === note.id}
            >
              <FiTrash2 size={14} />
              {deletingNoteId === note.id ? "Deleting..." : "Delete"}
            </button>
          </article>
        ))}
    </div>
  );

  if (loading && notes.length === 0) {
    return (
      <div className="notes-root dashboard-root min-h-screen bg-[#0d1117] text-slate-200 px-4 sm:px-8 lg:px-14 xl:px-16 py-6 sm:py-10">
        <style>{`
          @keyframes shimmer {
            0%   { background-position: -600px 0; }
            100% { background-position:  600px 0; }
          }
          .skeleton {
            background: linear-gradient(
              90deg,
              #161b22 25%,
              #1e2530 50%,
              #161b22 75%
            );
            background-size: 600px 100%;
            animation: shimmer 1.6s infinite linear;
            border-radius: 6px;
          }
        `}</style>

        <div className="mb-8">
          <div className="skeleton h-10 w-52 mb-3 rounded-lg" />
          <div className="skeleton h-3.5 w-72 rounded" />
        </div>

        <div className="notes-loading-grid">
          <section className="notes-loading-main">
            {[...Array(4)].map((_, index) => (
              <article key={index} className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 sm:p-5 mb-3">
                <div className="skeleton h-2.5 w-28 mb-4 rounded" />
                <div className="skeleton h-4 w-56 mb-3 rounded" />
                <div className="skeleton h-2.5 w-full mb-2 rounded" />
                <div className="skeleton h-2.5 w-4/5 rounded" />
              </article>
            ))}
          </section>

          <aside className="notes-loading-ai hidden lg:block">
            <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-4 sm:p-5">
              <div className="skeleton h-5 w-44 mb-5 rounded" />
              {[...Array(3)].map((_, index) => (
                <div key={index} className="bg-[#0d1117] border border-[#21262d] rounded-lg p-3 mb-3">
                  <div className="skeleton h-2.5 w-10 mb-3 rounded" />
                  <div className="skeleton h-3.5 w-full mb-3 rounded" />
                  <div className="skeleton h-9 w-full mb-2 rounded" />
                  <div className="skeleton h-9 w-full rounded" />
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="notes-root dashboard-root font-sans p-8 sm:p-16 text-red-400 bg-[#0d1117] min-h-screen">
        <div className="notes-load-error-card">
          <h2 className="notes-load-error-title">Could not load notes</h2>
          <p className="notes-load-error-text">{error}</p>
          <button type="button" className="notes-load-error-btn" onClick={fetchData}>
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="notes-root dashboard-root min-h-screen bg-[#0d1117] text-slate-200 px-4 sm:px-8 lg:px-14 xl:px-16 py-6 sm:py-10">
      <div className={`notes-layout ${aiPanelOpen ? "notes-layout--with-ai" : ""}`}>
        <section className="notes-main font-sans">
          <header className="notes-header">
            <h1 className="notes-page-title font-display">Notes</h1>
            <div className="notes-actions">
              {isMobileView && aiPanelOpen && (
                <button
                  type="button"
                  className="notes-action-btn notes-action-btn--sidebar"
                  onClick={() => setIsMobileNotesSidebarOpen(true)}
                >
                  <FiMenu size={14} />
                  Notes
                </button>
              )}
              <button
                type="button"
                className="notes-action-btn notes-action-btn--ai"
                onClick={() => setAiPanelOpen((current) => !current)}
              >
                <FiZap size={14} />
                AI Quiz
              </button>
              <button
                type="button"
                className="notes-action-btn notes-action-btn--new"
                onClick={() => setIsCreateModalOpen(true)}
              >
                <FiPlus size={15} />
                New Note
              </button>
            </div>
          </header>

          {notice && (
            <p className={`notes-feedback notes-feedback--${notice.type}`} role="status">
              {notice.text}
            </p>
          )}

          {!(isMobileView && aiPanelOpen) && renderNotesList()}
        </section>

        {aiPanelOpen && (
          <aside className="notes-ai-column">
            <AiQuizPanel notes={notes} onClose={() => setAiPanelOpen(false)} />
          </aside>
        )}
      </div>

      {isMobileView && aiPanelOpen && (
        <>
          <div
            className={`notes-mobile-sidebar-backdrop ${isMobileNotesSidebarOpen ? "is-open" : ""}`}
            onClick={() => setIsMobileNotesSidebarOpen(false)}
          />
          <aside className={`notes-mobile-sidebar ${isMobileNotesSidebarOpen ? "is-open" : ""}`}>
            <div className="notes-mobile-sidebar-head">
              <h3 className="notes-mobile-sidebar-title font-display">Notes</h3>
              <button
                type="button"
                className="notes-mobile-sidebar-close"
                onClick={() => setIsMobileNotesSidebarOpen(false)}
                aria-label="Close notes sidebar"
              >
                <FiX size={18} />
              </button>
            </div>
            <div className="notes-mobile-sidebar-body">{renderNotesList("notes-list--sidebar")}</div>
          </aside>
        </>
      )}

      {isCreateModalOpen && (
        <div className="notes-modal-overlay" onClick={() => setIsCreateModalOpen(false)}>
          <div className="notes-modal" onClick={(event) => event.stopPropagation()}>
            <div className="notes-modal-head">
              <h2 className="notes-modal-title font-display">New Note</h2>
              <button
                type="button"
                className="notes-modal-close"
                onClick={() => setIsCreateModalOpen(false)}
                aria-label="Close new note modal"
              >
                <FiX size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateNote} className="notes-form font-sans">
              {createError && (
                <p className="notes-feedback notes-feedback--error notes-feedback--modal" role="alert">
                  {createError}
                </p>
              )}

              <div className="notes-form-group">
                <label className="notes-form-label">Title *</label>
                <input
                  required
                  className="notes-input"
                  value={newNote.title}
                  onChange={(event) => updateNewNoteField("title", event.target.value)}
                  placeholder="Note title"
                />
              </div>

              <div className="notes-form-group">
                <label className="notes-form-label">Task</label>
                <select
                  className="notes-input"
                  value={newNote.task_id}
                  onChange={(event) => updateNewNoteField("task_id", event.target.value)}
                >
                  <option value="">None</option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="notes-form-group">
                <label className="notes-form-label">Content</label>
                <textarea
                  rows={4}
                  className="notes-input notes-textarea"
                  value={newNote.content}
                  onChange={(event) => updateNewNoteField("content", event.target.value)}
                  placeholder="Write your notes here..."
                />
              </div>

              <div className="notes-form-group">
                <label className="notes-form-label">File (PDF or Image)</label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.gif,.webp"
                  className="notes-input notes-file-input"
                  onChange={(event) => updateNewNoteField("file", event.target.files?.[0] || null)}
                />
              </div>

              <div className="notes-modal-actions">
                <button
                  type="button"
                  className="notes-modal-btn notes-modal-btn--ghost"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="notes-modal-btn notes-modal-btn--solid" disabled={isCreatingNote}>
                  {isCreatingNote ? "Saving..." : "Save Note"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
