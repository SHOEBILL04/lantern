<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SubjectController extends Controller
{
    public function index()
    {
        $subjects = DB::table('subjects')->where('user_id', auth()->id())->get();
        // optionally load courses for standard REST presentation
        foreach ($subjects as $subject) {
            $subject->courses = DB::table('courses')->where('subject_id', $subject->id)->get();
        }
        return response()->json($subjects);
    }
    
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'color_code' => 'nullable|string|max:10',
            'weekly_goal_minutes' => 'nullable|integer'
        ]);

        $id = DB::table('subjects')->insertGetId([
            'user_id' => auth()->id(),
            'name' => $request->name,
            'color_code' => $request->color_code ?? '#cbd5e1',
            'weekly_goal_minutes' => $request->weekly_goal_minutes ?? 600,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $subject = DB::table('subjects')->find($id);
        return response()->json($subject, 201);
    }
    
    public function show($id)
    {
        $subject = DB::table('subjects')->where('user_id', auth()->id())->where('id', $id)->first();
        if (!$subject) return response()->json(['message' => 'Not found'], 404);
        
        $subject->courses = DB::table('courses')->where('subject_id', $subject->id)->get();
        return response()->json($subject);
    }

    public function update(Request $request, $id)
    {
        $subject = DB::table('subjects')->where('user_id', auth()->id())->where('id', $id)->first();
        if (!$subject) return response()->json(['message' => 'Not found'], 404);

        DB::table('subjects')->where('id', $id)->update([
            'name' => $request->name ?? $subject->name,
            'color_code' => $request->color_code ?? $subject->color_code,
            'weekly_goal_minutes' => $request->weekly_goal_minutes ?? $subject->weekly_goal_minutes,
            'updated_at' => now(),
        ]);

        return response()->json(DB::table('subjects')->find($id));
    }

    public function destroy($id)
    {
        $deleted = DB::table('subjects')->where('user_id', auth()->id())->where('id', $id)->delete();
        if (!$deleted) return response()->json(['message' => 'Not found'], 404);
        return response()->json(['message' => 'Deleted']);
    }
}
