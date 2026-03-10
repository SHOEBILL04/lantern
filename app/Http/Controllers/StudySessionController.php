<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class StudySessionController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('study_sessions')->where('user_id', auth()->id());
        
        if ($request->has('course_id')) {
            $query->where('course_id', $request->course_id);
        }
        
        return response()->json($query->orderBy('start_time', 'desc')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'course_id' => 'required|exists:courses,id',
            'duration_minutes' => 'required|integer|min:1',
            'start_time' => 'required|date',
            'end_time' => 'required|date|after:start_time',
            'notes' => 'nullable|string',
        ]);

        $sessionId = DB::table('study_sessions')->insertGetId([
            'user_id' => auth()->id(),
            'course_id' => $request->course_id,
            'duration_minutes' => $request->duration_minutes,
            'start_time' => Carbon::parse($request->start_time),
            'end_time' => Carbon::parse($request->end_time),
            'notes' => $request->notes,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        // Streak logic has been outsourced to the DB trigger trg_study_sessions_after_insert.

        return response()->json([
            'message' => 'Study session saved successfully', 
            'session' => DB::table('study_sessions')->find($sessionId)
        ], 201);
    }
}
