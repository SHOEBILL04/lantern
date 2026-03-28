<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DatabaseRoundTripTest extends TestCase
{
    protected function tearDown(): void
    {
        DB::table('users')->where('email', 'like', 'ci-db-%@example.com')->delete();

        parent::tearDown();
    }

    public function test_database_insert_and_read_round_trip_works(): void
    {
        $userId = DB::table('users')->insertGetId([
            'name' => 'CI DB User',
            'email' => 'ci-db-' . uniqid() . '@example.com',
            'password' => bcrypt('password123'),
            'current_streak' => 0,
            'longest_streak' => 0,
            'weekly_goal_minutes' => 1680,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $subjectId = DB::table('subjects')->insertGetId([
            'user_id' => $userId,
            'name' => 'CI Subject',
            'color_code' => '#123456',
            'weekly_goal_minutes' => 600,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $courseId = DB::table('courses')->insertGetId([
            'user_id' => $userId,
            'subject_id' => $subjectId,
            'title' => 'CI Course',
            'description' => 'Created by CI test',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $taskId = DB::table('tasks')->insertGetId([
            'user_id' => $userId,
            'course_id' => $courseId,
            'title' => 'CI Task',
            'subject' => 'CI Subject',
            'description' => 'Round-trip database test',
            'status' => 'pending',
            'priority' => 'medium',
            'due_date' => now()->toDateString(),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $task = DB::table('tasks')->find($taskId);

        $this->assertNotNull($task);
        $this->assertSame('CI Task', $task->title);
        $this->assertSame('pending', $task->status);
        $this->assertSame('medium', $task->priority);
    }
}