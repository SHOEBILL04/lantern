<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Subject;
use App\Models\Course;
use App\Models\Task;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $user = auth()->user();
        if (!$user) {
            return response()->json(['error' => 'Unauthenticated'], 401);
        }

        $today = Carbon::today();
        $startOfWeek = Carbon::now()->startOfWeek();

        // 1. Study time Today (sum of duration_minutes for today)
        $studyTimeTodayMinutes = $user->studySessions()->whereDate('start_time', $today)->sum('duration_minutes');
        
        // 2. Tasks Completed
        $tasksCompletedToday = $user->tasks()->whereDate('completed_at', $today)->count();
        $pendingTasks = $user->tasks()->whereNull('completed_at')->count();
        $totalRelevantTasks = $tasksCompletedToday + $pendingTasks;
        
        // 3. Study streak
        $studyStreak = $user->current_streak ?? 0;

        // 4. Weekly goal progress
        $weeklyGoalMinutes = $user->weekly_goal_minutes ?? 1680; // Default 28h
        $studyTimeThisWeekMinutes = $user->studySessions()->where('start_time', '>=', $startOfWeek)->sum('duration_minutes');
        
        // 5. Subjects & Courses progress
        $subjects = $user->subjects()->with(['courses.tasks', 'courses.studySessions'])->get()->map(function ($subject) use ($startOfWeek) {
            // Weekly progress for the subject
            $subjectStudyTimeThisWeek = $subject->courses->flatMap->studySessions->where('start_time', '>=', $startOfWeek)->sum('duration_minutes');
            
            // Tasks for this subject
            $subjectTasks = $subject->courses->flatMap->tasks;
            $totalSubjectTasks = $subjectTasks->count();
            $completedSubjectTasks = $subjectTasks->whereNotNull('completed_at')->count();

            return [
                'id' => $subject->id,
                'name' => $subject->name,
                'color_code' => $subject->color_code,
                'weekly_goal_minutes' => $subject->weekly_goal_minutes ?? 600,
                'weekly_progress_minutes' => $subjectStudyTimeThisWeek,
                'total_tasks' => $totalSubjectTasks,
                'completed_tasks' => $completedSubjectTasks,
                'courses' => $subject->courses->map(function ($course) {
                    return [
                        'id' => $course->id,
                        'title' => $course->title,
                        'tasks' => $course->tasks->map(function($task) {
                            return [
                                'id' => $task->id,
                                'title' => $task->title,
                                'status' => $task->status,
                                'completed_at' => $task->completed_at
                            ];
                        })
                    ];
                })
            ];
        });

        return response()->json([
            'study_time_today_minutes' => $studyTimeTodayMinutes,
            'tasks_completed_today' => $tasksCompletedToday,
            'total_relevant_tasks' => $totalRelevantTasks > 0 ? $totalRelevantTasks : 1, // prevent div by zero
            'study_streak' => $studyStreak,
            'weekly_goal_minutes' => $weeklyGoalMinutes,
            'study_time_this_week_minutes' => $studyTimeThisWeekMinutes,
            'subjects' => $subjects,
        ]);
    }

    public function addSubjectCourse(Request $request)
    {
        $request->validate([
            'subject_name' => 'required|string|max:255',
            'course_title' => 'required|string|max:255',
            'number_of_tasks' => 'required|integer|min:1|max:50',
            'color_code' => 'nullable|string|max:10',
        ]);

        $user = auth()->user();

        // Find or create the subject
        $subject = Subject::firstOrCreate(
            ['user_id' => $user->id, 'name' => $request->subject_name],
            ['color_code' => $request->color_code ?? '#cbd5e1', 'weekly_goal_minutes' => 600]
        );

        // Create the course
        $course = Course::create([
            'user_id' => $user->id,
            'subject_id' => $subject->id,
            'title' => $request->course_title,
            'description' => 'Dynamically added from dashboard',
        ]);

        // Create tasks
        $tasksToInsert = [];
        for ($i = 0; $i < $request->number_of_tasks; $i++) {
            $tasksToInsert[] = [
                'user_id' => $user->id,
                'course_id' => $course->id,
                'title' => 'Task ' . ($i + 1) . ' for ' . $course->title,
                'description' => 'Auto-generated task',
                'status' => 'pending',
                'due_date' => Carbon::now()->addDays(7)->toDateString(),
                'created_at' => now(),
                'updated_at' => now(),
            ];
        }
        Task::insert($tasksToInsert);

        return response()->json([
            'message' => 'Subject, Course, and Tasks created successfully',
            'course' => $course
        ], 201);
    }

    public function completeTask($id)
    {
        $task = Task::where('user_id', auth()->id())->findOrFail($id);
        
        if (!$task->completed_at) {
            $task->status = 'completed';
            $task->completed_at = now();
            $task->save();
        }

        return response()->json(['message' => 'Task marked as completed', 'task' => $task]);
    }
}
