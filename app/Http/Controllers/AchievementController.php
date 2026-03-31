<?php

namespace App\Http\Controllers;

use App\Models\Achievement;
use App\Models\Task;
use App\Models\HabitTracker;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class AchievementController extends Controller
{
    /**
     * Display a listing of the user's achievements and progress.
     */
    public function index()
    {
        $user = Auth::user();
        if (!$user) {
            return response()->json(['message' => 'Unauthorized'], 401);
        }

        $achievements = Achievement::all();
        
        // Calculate user stats dynamically based on existing db records
        $tasksCompleted = Task::where('user_id', $user->id)->where('status', 'completed')->count();
        
        $habitsCompleted = HabitTracker::whereHas('habit', function($query) use ($user) {
            $query->where('user_id', $user->id);
        })->where('is_completed', true)->count();

        $studyMinutes = $user->studySessions()->sum('duration_minutes');
        
        $stats = [
            'tasks_completed' => $tasksCompleted,
            'habits_completed' => $habitsCompleted,
            'study_minutes' => $studyMinutes,
        ];

        $response = $achievements->map(function ($achievement) use ($user, $stats) {
            $currentValue = $stats[$achievement->requirement_type] ?? 0;
            $requirementValue = $achievement->requirement_value;
            
            $progressPercent = min(100, ($requirementValue > 0 ? ($currentValue / $requirementValue) * 100 : 0));
            $isUnlocked = $currentValue >= $requirementValue;
            
            // Sync with pivot if newly unlocked (optional but good for history)
            if ($isUnlocked && !$user->achievements->contains($achievement->id)) {
                $user->achievements()->attach($achievement->id, ['unlocked_at' => now()]);
            }

            return [
                'id' => $achievement->id,
                'name' => $achievement->name,
                'description' => $achievement->description,
                'is_unlocked' => $isUnlocked,
                'progress_percent' => $progressPercent,
                'current_value' => $currentValue,
                'requirement_value' => $requirementValue,
                'requirement_type' => str_replace('_', ' ', $achievement->requirement_type),
                'remaining' => max(0, $requirementValue - $currentValue)
            ];
        });

        return response()->json($response);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        //
    }

    /**
     * Display the specified resource.
     */
    public function show(string $id)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, string $id)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(string $id)
    {
        //
    }
}
