<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\StudySession;
use Carbon\Carbon;

class StudySessionController extends Controller
{
    public function store(Request $request)
    {
        $request->validate([
            'course_id' => 'required|exists:courses,id',
            'duration_minutes' => 'required|integer|min:1',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'notes' => 'nullable|string',
        ]);

        $session = StudySession::create([
            'user_id' => auth()->id(),
            'course_id' => $request->course_id,
            'duration_minutes' => $request->duration_minutes,
            'start_time' => Carbon::parse($request->start_time),
            'end_time' => Carbon::parse($request->end_time),
            'notes' => $request->notes,
        ]);

        $user = auth()->user();
        if ($user) {
            $today = Carbon::today()->toDateString();
            if ($user->last_activity_date !== $today) {
                if ($user->last_activity_date === Carbon::yesterday()->toDateString()) {
                    $user->current_streak += 1;
                } else {
                    $user->current_streak = 1;
                }
                if ($user->current_streak > $user->longest_streak) {
                    $user->longest_streak = $user->current_streak;
                }
                $user->last_activity_date = $today;
                $user->save();
            }
        }

        return response()->json(['message' => 'Study session saved successfully', 'session' => $session], 201);
    }
}
