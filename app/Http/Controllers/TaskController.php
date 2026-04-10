<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Http\Services\AchievementService;

class TaskController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('tasks')->where('user_id', auth()->id());

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

        $tasks = $query->orderByRaw("FIELD(priority, 'high', 'medium', 'low')")->orderBy('created_at', 'desc')->get();

        return response()->json($tasks);
    }

    public function store(Request $request)
    {
        $request->validate([
            'course_id' => 'required|exists:courses,id',
            'title' => 'required|string|max:255',
            'subject' => 'nullable|string|max:255',
            'priority' => 'nullable|in:low,medium,high',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date|after_or_equal:today',
        ]);

        $id = DB::table('tasks')->insertGetId([
            'user_id' => auth()->id(),
            'course_id' => $request->course_id,
            'title' => $request->title,
            'subject' => $request->subject,
            'priority' => $request->priority ?? 'medium',
            'description' => $request->description,
            'status' => 'pending',
            'due_date' => $request->due_date,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(DB::table('tasks')->find($id), 201);
    }

    public function show($id)
    {
        $task = DB::table('tasks')->where('user_id', auth()->id())->where('id', $id)->first();
        if (!$task) return response()->json(['message' => 'Not found'], 404);
        
        $task->updates = DB::table('task_updates')->where('task_id', $id)->get();
        return response()->json($task);
    }

    public function update(Request $request, $id, AchievementService $achievementService)
    {
        $task = DB::table('tasks')->where('user_id', auth()->id())->where('id', $id)->first();
        if (!$task) return response()->json(['message' => 'Not found'], 404);
        
        $request->validate([
            'title' => 'sometimes|string|max:255',
            'subject' => 'nullable|string|max:255',
            'priority' => 'nullable|in:low,medium,high',
            'description' => 'nullable|string',
            'status' => 'sometimes|in:pending,in_progress,completed',
            'due_date' => 'nullable|date|after_or_equal:today',
        ]);

        $updateData = [
            'updated_at' => now()
        ];
        
        if ($request->has('title')) $updateData['title'] = $request->title;
        if ($request->has('subject')) $updateData['subject'] = $request->subject;
        if ($request->has('priority')) $updateData['priority'] = $request->priority;
        if ($request->has('description')) $updateData['description'] = $request->description;
        if ($request->has('due_date')) $updateData['due_date'] = $request->due_date;
        
        $newlyUnlocked = [];
        if ($request->has('status')) {
            $updateData['status'] = $request->status;
            if ($request->status === 'completed' && !$task->completed_at) {
                $updateData['completed_at'] = now();
                
                // Trigger achievement check
                $user = auth()->user();
                if ($user) {
                    $newlyUnlocked = $achievementService->checkAndAwardAchievements($user, 'tasks_completed');
                }
            } elseif ($request->status !== 'completed') {
                $updateData['completed_at'] = null;
            }
        }

        DB::table('tasks')->where('id', $id)->update($updateData);

        $responseTask = DB::table('tasks')->find($id);
        $responseTask->newly_unlocked = $newlyUnlocked;

        return response()->json($responseTask);
    }

    public function destroy($id)
    {
        $deleted = DB::table('tasks')->where('user_id', auth()->id())->where('id', $id)->delete();
        if (!$deleted) return response()->json(['message' => 'Not found'], 404);
        
        return response()->json(['message' => 'Task deleted']);
    }

    public function addUpdate(Request $request, $id)
    {
        $task = DB::table('tasks')->where('user_id', auth()->id())->where('id', $id)->first();
        if (!$task) return response()->json(['message' => 'Not found'], 404);

        $request->validate([
            'update_text' => 'required|string'
        ]);

        $updateId = DB::table('task_updates')->insertGetId([
            'task_id' => $id,
            'update_text' => $request->update_text,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(DB::table('task_updates')->find($updateId), 201);
    }

    public function completeTask($id, AchievementService $achievementService)
    {
        $task = DB::table('tasks')->where('user_id', auth()->id())->where('id', $id)->first();
        if (!$task) return response()->json(['message' => 'Not found'], 404);
        
        if (!$task->completed_at) {
            DB::table('tasks')->where('id', $id)->update([
                'status' => 'completed',
                'completed_at' => now(),
                'updated_at' => now()
            ]);
        }

        $user = auth()->user();
        if ($user) {
            $newlyUnlocked = $achievementService->checkAndAwardAchievements($user, 'tasks_completed');
        } else {
            $newlyUnlocked = [];
        }

        return response()->json([
            'message' => 'Task marked as completed', 
            'task' => DB::table('tasks')->find($id),
            'newly_unlocked' => $newlyUnlocked
        ]);
    }
}
