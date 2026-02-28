<?php

namespace App\Http\Controllers;

use App\Models\Habit;
use App\Models\HabitTracker;
use Illuminate\Http\Request;

class HabitController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $user = $request->user();
        
        $habits = $user->habits()->with(['trackers' => function ($query) {
            // Get trackers from the last 7 days
            $query->whereDate('date', '>=', now()->subDays(6)->toDateString());
        }])->get();

        // Process daily habit reset logic
        foreach ($habits as $habit) {
            if ($habit->type === 'daily' && $habit->start_date) {
                // If the habit is already fully completed, do not reset
                if ($habit->is_completed) continue;

                $startDate = \Carbon\Carbon::parse($habit->start_date)->startOfDay();
                $yesterday = now()->subDay()->startOfDay();

                // If start date is strictly before yesterday, we must check if any days were missed
                if ($startDate->lessThan($yesterday)) {
                    // Count how many days SHOULD have been completed between start_date and yesterday
                    $daysExpected = $startDate->diffInDays($yesterday) + 1;

                    // Count how many days actually have a completed tracker in that range
                    $daysCompleted = HabitTracker::where('habit_id', $habit->id)
                        ->whereBetween('date', [$startDate->toDateString(), $yesterday->toDateString()])
                        ->where('is_completed', true)
                        ->count();

                    // If they missed a day, reset the habit to start today
                    if ($daysCompleted < $daysExpected) {
                        $habit->update(['start_date' => now()->toDateString()]);
                        // Delete previous trackers so they don't count towards the new 21-day streak
                        HabitTracker::where('habit_id', $habit->id)->delete();
                        // Refresh trackers relationship
                        $habit->load(['trackers' => function ($query) {
                            $query->whereDate('date', '>=', now()->subDays(6)->toDateString());
                        }]);
                    }
                }
            }
        }

        return response()->json($habits);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'type' => 'required|in:daily,weekly',
            'allowed_skips' => 'required_if:type,weekly|integer|min:0|max:6',
        ]);

        $habit = $request->user()->habits()->create([
            'name' => $request->name,
            'type' => $request->type,
            'allowed_skips' => $request->type === 'weekly' ? $request->allowed_skips : 0,
            'start_date' => now()->toDateString(),
            'is_completed' => false,
        ]);

        return response()->json($habit, 201);
    }

    public function track(Request $request, Habit $habit)
    {
        // Ensure user owns the habit
        if ($habit->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'date' => 'required|date',
            'is_completed' => 'required|boolean',
            'is_skipped' => 'sometimes|boolean'
        ]);

        $date = $request->date;
        $isSkipped = $request->input('is_skipped', false);

        // Weekly Skip Logic validation
        if ($habit->type === 'weekly' && $isSkipped) {
            $startOfWeek = now()->startOfWeek()->toDateString();
            $endOfWeek = now()->endOfWeek()->toDateString();

            $currentSkipsThisWeek = HabitTracker::where('habit_id', $habit->id)
                ->whereBetween('date', [$startOfWeek, $endOfWeek])
                ->where('is_skipped', true)
                ->where('date', '!=', $date) // exclude current day if it was already skipped
                ->count();

            if ($currentSkipsThisWeek >= $habit->allowed_skips) {
                return response()->json(['message' => "You have no skips left for this week."], 422);
            }
        }

        $tracker = HabitTracker::updateOrCreate(
            ['habit_id' => $habit->id, 'date' => $date],
            [
                'is_completed' => $request->is_completed,
                'is_skipped' => $isSkipped
            ]
        );

        // Check for 21 days achievement ONLY if it's a daily habit
        if ($habit->type === 'daily' && $request->is_completed && !$habit->is_completed) {
            $completedDaysCount = HabitTracker::where('habit_id', $habit->id)
                ->where('date', '>=', $habit->start_date)
                ->where('is_completed', true)
                ->count();

            if ($completedDaysCount >= 21) {
                $habit->update(['is_completed' => true]);

                // Grant achievement
                $achievement = \App\Models\Achievement::firstOrCreate(
                    ['title' => '21 Day Habit Builder'],
                    [
                        'description' => 'Completed a habit for 21 days consecutively.',
                        'icon' => '🏆',
                        'condition_type' => 'habit_days',
                        'condition_value' => 21
                    ]
                );

                $request->user()->achievements()->syncWithoutDetaching([
                    $achievement->id => ['unlocked_at' => now()]
                ]);

                return response()->json([
                    'tracker' => $tracker, 
                    'message' => 'Achievement unlocked! 21 days completed.',
                    'achievement' => $achievement
                ]);
            }
        }

        return response()->json(['tracker' => $tracker]);
    }

    public function destroy(Request $request, Habit $habit)
    {
        if ($habit->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $habit->delete();

        return response()->json(['message' => 'Habit deleted successfully']);
    }
}
