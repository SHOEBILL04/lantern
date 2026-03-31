<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CourseController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('courses')->where('user_id', auth()->id());
        
        if ($request->has('subject_id')) {
            $query->where('subject_id', $request->subject_id);
        }
        
        $courses = $query->get();
        foreach ($courses as $course) {
            $course->tasks = DB::table('tasks')->where('course_id', $course->id)->get();
            $course->studySessions = DB::table('study_sessions')->where('course_id', $course->id)->get();
        }
        return response()->json($courses);
    }
    
    public function store(Request $request)
    {
        $request->validate([
            'subject_id' => 'required|exists:subjects,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string'
        ]);

        $id = DB::table('courses')->insertGetId([
            'user_id' => auth()->id(),
            'subject_id' => $request->subject_id,
            'title' => $request->title,
            'description' => $request->description,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $course = DB::table('courses')->find($id);
        return response()->json($course, 201);
    }
    
    public function show($id)
    {
        $course = DB::table('courses')->where('user_id', auth()->id())->where('id', $id)->first();
        if (!$course) return response()->json(['message' => 'Not found'], 404);
        
        $course->tasks = DB::table('tasks')->where('course_id', $course->id)->get();
        return response()->json($course);
    }

    public function update(Request $request, $id)
    {
        $course = DB::table('courses')->where('user_id', auth()->id())->where('id', $id)->first();
        if (!$course) return response()->json(['message' => 'Not found'], 404);

        $request->validate([
            'title' => 'sometimes|string|max:255',
            'description' => 'nullable|string'
        ]);

        DB::table('courses')->where('id', $id)->update([
            'title' => $request->title ?? $course->title,
            'description' => $request->description ?? $course->description,
            'updated_at' => now(),
        ]);

        return response()->json(DB::table('courses')->find($id));
    }

    public function destroy($id)
    {
        $deleted = DB::table('courses')->where('user_id', auth()->id())->where('id', $id)->delete();
        if (!$deleted) return response()->json(['message' => 'Not found'], 404);
        return response()->json(['message' => 'Deleted']);
    }
}
