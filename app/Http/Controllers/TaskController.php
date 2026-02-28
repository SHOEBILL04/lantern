<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Task;
use App\Models\TaskUpdate;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $query = Task::where('user_id', auth()->id())->with('course');

        // Apply filters
        if ($request->has('subject')) {
            $query->where('subject', $request->subject);
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('priority')) {
            $query->where('priority', $request->priority);
        }
        if ($request->has('due_date')) {
            $query->whereDate('due_date', $request->due_date);
        }

        // Exclude archived/completed tasks older than a threshold if not explicitly requested
        // Though Archive logic typically shows completed, let's just return what's queried.
        // We order by priority: high, medium, low then by created_at
        
        $tasks = $query->orderByRaw("FIELD(priority, 'high', 'medium', 'low')")->latest()->get();

        return response()->json($tasks);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'course_id' => 'required|exists:courses,id',
            'title' => 'required|string|max:255',
            'subject' => 'nullable|string|max:255',
            'priority' => 'nullable|in:low,medium,high',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
        ]);

        $task = Task::create(array_merge($validated, [
            'user_id' => auth()->id(),
            'status' => 'pending'
        ]));

        return response()->json($task, 201);
    }

    public function show($id)
    {
        $task = Task::where('user_id', auth()->id())->with('updates')->findOrFail($id);
        return response()->json($task);
    }

    public function update(Request $request, $id)
    {
        $task = Task::where('user_id', auth()->id())->findOrFail($id);
        
        $validated = $request->validate([
            'title' => 'sometimes|string|max:255',
            'subject' => 'nullable|string|max:255',
            'priority' => 'nullable|in:low,medium,high',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:pending,in_progress,completed',
            'due_date' => 'nullable|date',
        ]);

        if (isset($validated['status']) && $validated['status'] === 'completed' && !$task->completed_at) {
            $validated['completed_at'] = now();
        } elseif (isset($validated['status']) && $validated['status'] !== 'completed') {
            $validated['completed_at'] = null;
        }

        $task->update($validated);

        return response()->json($task);
    }

    public function destroy($id)
    {
        $task = Task::where('user_id', auth()->id())->findOrFail($id);
        $task->delete();
        
        return response()->json(['message' => 'Task deleted']);
    }

    public function addUpdate(Request $request, $id)
    {
        $task = Task::where('user_id', auth()->id())->findOrFail($id);

        $request->validate([
            'update_text' => 'required|string'
        ]);

        $update = $task->updates()->create([
            'update_text' => $request->update_text
        ]);

        return response()->json($update, 201);
    }
}
