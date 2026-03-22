<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class WeeklyGoalController extends Controller
{
    public function updateWeeklyGoal(Request $request)
    {
        $validated = $request->validate([
            'weekly_goal_minutes' => ['required', 'integer', 'min:1', 'max:10080'],
        ]);

        $user = auth()->user();
        $user->weekly_goal_minutes = $validated['weekly_goal_minutes'];
        $user->save();

        return response()->json([
            'message' => 'Weekly goal updated successfully',
            'weekly_goal_minutes' => $user->weekly_goal_minutes,
            'user' => $user,
        ]);
    }

    public function updateCourseWeeklyGoal(Request $request, $courseId)
    {
        $validated = $request->validate([
            'weekly_goal_minutes' => ['required', 'integer', 'min:1', 'max:10080'],
        ]);

        $course = DB::table('courses')
            ->where('id', $courseId)
            ->where('user_id', auth()->id())
            ->first();

        if (!$course) {
            return response()->json(['message' => 'Course not found'], 404);
        }

        $goalMinutes = $validated['weekly_goal_minutes'];

        if (Schema::hasColumn('courses', 'weekly_goal_minutes')) {
            DB::table('courses')
                ->where('id', $courseId)
                ->update([
                    'weekly_goal_minutes' => $goalMinutes,
                    'updated_at' => now(),
                ]);

            $updatedCourse = DB::table('courses')->where('id', $courseId)->first();

            return response()->json([
                'message' => 'Course weekly goal updated successfully',
                'course' => $updatedCourse,
                'persisted_on' => 'courses',
            ]);
        }

        // Database-first fallback:
        // some environments only have subjects.weekly_goal_minutes.
        if (Schema::hasColumn('subjects', 'weekly_goal_minutes')) {
            DB::table('subjects')
                ->where('id', $course->subject_id)
                ->where('user_id', auth()->id())
                ->update([
                    'weekly_goal_minutes' => $goalMinutes,
                    'updated_at' => now(),
                ]);

            $updatedCourse = DB::table('courses')->where('id', $courseId)->first();

            return response()->json([
                'message' => 'Saved to subject weekly goal (courses.weekly_goal_minutes is missing in database).',
                'course' => $updatedCourse,
                'persisted_on' => 'subjects',
            ]);
        }

        return response()->json([
            'message' => 'Cannot save: weekly goal column is missing on both courses and subjects tables.',
        ], 422);
    }
}
