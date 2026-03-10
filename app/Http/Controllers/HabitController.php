<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class HabitController extends Controller
{
    public function index(Request $request)
    {
        $userId = auth()->id();
        
        $habits = DB::table('habits')->where('user_id', $userId)->get();

        foreach ($habits as $habit) {
            $habit->trackers = DB::table('habit_trackers')
                ->where('habit_id', $habit->id)
                ->whereDate('date', '>=', now()->subDays(6)->toDateString())
                ->get();

            if ($habit->type === 'daily' && $habit->start_date && !$habit->is_completed) {
                $startDate = Carbon::parse($habit->start_date)->startOfDay();
                $yesterday = now()->subDay()->startOfDay();

                if ($startDate->lessThan($yesterday)) {
                    $daysExpected = $startDate->diffInDays($yesterday) + 1;

                    $daysCompleted = DB::table('habit_trackers')
                        ->where('habit_id', $habit->id)
                        ->whereBetween('date', [$startDate->toDateString(), $yesterday->toDateString()])
                        ->where('is_completed', true)
                        ->count();

                    if ($daysCompleted < $daysExpected) {
                        DB::table('habits')->where('id', $habit->id)->update(['start_date' => now()->toDateString()]);
                        DB::table('habit_trackers')->where('habit_id', $habit->id)->delete();
                        $habit->start_date = now()->toDateString();
                        $habit->trackers = [];
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

        $habitId = DB::table('habits')->insertGetId([
            'user_id' => auth()->id(),
            'name' => $request->name,
            'type' => $request->type,
            'allowed_skips' => $request->type === 'weekly' ? $request->allowed_skips : 0,
            'start_date' => now()->toDateString(),
            'is_completed' => false,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return response()->json(DB::table('habits')->find($habitId), 201);
    }

    public function track(Request $request, $id)
    {
        $habit = DB::table('habits')->where('id', $id)->first();

        if (!$habit || $habit->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized or Not Found'], 403);
        }

        $request->validate([
            'date' => 'required|date',
            'is_completed' => 'required|boolean',
            'is_skipped' => 'sometimes|boolean'
        ]);

        $date = $request->date;
        $isSkipped = $request->input('is_skipped', false);

        if ($habit->type === 'weekly' && $isSkipped) {
            $startOfWeek = now()->startOfWeek()->toDateString();
            $endOfWeek = now()->endOfWeek()->toDateString();

            $currentSkipsThisWeek = DB::table('habit_trackers')
                ->where('habit_id', $habit->id)
                ->whereBetween('date', [$startOfWeek, $endOfWeek])
                ->where('is_skipped', true)
                ->where('date', '!=', $date)
                ->count();

            if ($currentSkipsThisWeek >= $habit->allowed_skips) {
                return response()->json(['message' => "You have no skips left for this week."], 422);
            }
        }

        $tracker = DB::table('habit_trackers')
            ->where('habit_id', $habit->id)
            ->where('date', $date)
            ->first();

        if ($tracker) {
            DB::table('habit_trackers')->where('id', $tracker->id)->update([
                'is_completed' => $request->is_completed,
                'is_skipped' => $isSkipped,
                'updated_at' => now(),
            ]);
            $trackerId = $tracker->id;
        } else {
            $trackerId = DB::table('habit_trackers')->insertGetId([
                'habit_id' => $habit->id,
                'date' => $date,
                'is_completed' => $request->is_completed,
                'is_skipped' => $isSkipped,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
        
        $trackerData = DB::table('habit_trackers')->find($trackerId);

        if ($habit->type === 'daily' && $request->is_completed && !$habit->is_completed) {
            $completedDaysCount = DB::table('habit_trackers')
                ->where('habit_id', $habit->id)
                ->where('date', '>=', $habit->start_date)
                ->where('is_completed', true)
                ->count();

            if ($completedDaysCount >= 21) {
                DB::table('habits')->where('id', $habit->id)->update(['is_completed' => true]);

                $achievement = DB::table('achievements')
                    ->where('name', '21 Day Habit Builder')
                    ->first();

                if (!$achievement) {
                    $achievementId = DB::table('achievements')->insertGetId([
                        'name' => '21 Day Habit Builder',
                        'description' => 'Completed a habit for 21 days consecutively.',
                        'icon' => '🏆',
                        'requirement_type' => 'habit_days',
                        'requirement_value' => 21,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $achievement = DB::table('achievements')->find($achievementId);
                }

                DB::table('user_achievements')->updateOrInsert(
                    ['user_id' => auth()->id(), 'achievement_id' => $achievement->id],
                    ['unlocked_at' => now(), 'updated_at' => now()]
                );

                return response()->json([
                    'tracker' => $trackerData, 
                    'message' => 'Achievement unlocked! 21 days completed.',
                    'achievement' => $achievement
                ]);
            }
        }

        return response()->json(['tracker' => $trackerData]);
    }

    public function destroy(Request $request, $id)
    {
        $habit = DB::table('habits')->where('id', $id)->first();
        if (!$habit || $habit->user_id !== auth()->id()) {
            return response()->json(['message' => 'Unauthorized or Not Found'], 403);
        }

        DB::table('habits')->where('id', $id)->delete();

        return response()->json(['message' => 'Habit deleted successfully']);
    }
}
