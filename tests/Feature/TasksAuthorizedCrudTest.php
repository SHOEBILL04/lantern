<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class TasksAuthorizedCrudTest extends TestCase
{
    protected function tearDown(): void
    {
        DB::table('task_updates')
            ->whereIn('task_id', function ($query) {
                $query->select('id')
                    ->from('tasks')
                    ->where('title', 'like', 'Prepare%CI pipeline');
            })
            ->delete();

        DB::table('tasks')->where('title', 'like', 'Prepare%CI pipeline')->delete();
        DB::table('courses')->where('title', 'CSE3100')->delete();
        DB::table('subjects')->where('name', 'Algorithms')->delete();
        DB::table('users')->where('email', 'like', 'ci-tasks-%@example.com')->delete();

        parent::tearDown();
    }

    public function test_authenticated_user_can_crud_tasks(): void
    {
        $user = User::create([
            'name' => 'CI Tasks User',
            'email' => 'ci-tasks-' . uniqid() . '@example.com',
            'password' => Hash::make('password123'),
        ]);

        $token = auth('api')->login($user);
        $headers = [
            'Authorization' => 'Bearer ' . $token,
            'Accept' => 'application/json',
        ];

        $subjectId = DB::table('subjects')->insertGetId([
            'user_id' => $user->id,
            'name' => 'Algorithms',
            'color_code' => '#ff9900',
            'weekly_goal_minutes' => 300,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $courseId = DB::table('courses')->insertGetId([
            'user_id' => $user->id,
            'subject_id' => $subjectId,
            'title' => 'CSE3100',
            'description' => 'Lantern CI course',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $createResponse = $this->withHeaders($headers)->postJson('/api/tasks', [
            'course_id' => $courseId,
            'title' => 'Prepare CI pipeline',
            'subject' => 'Algorithms',
            'priority' => 'high',
            'description' => 'Create GitHub Actions workflow',
            'due_date' => now()->addDays(3)->toDateString(),
        ]);

        $createResponse
            ->assertStatus(201)
            ->assertJson([
                'title' => 'Prepare CI pipeline',
                'status' => 'pending',
                'priority' => 'high',
            ]);

        $taskId = $createResponse->json('id');

        $this->withHeaders($headers)
            ->getJson('/api/tasks')
            ->assertOk()
            ->assertJsonFragment([
                'id' => $taskId,
                'title' => 'Prepare CI pipeline',
            ]);

        $this->withHeaders($headers)
            ->getJson('/api/tasks/' . $taskId)
            ->assertOk()
            ->assertJson([
                'id' => $taskId,
                'title' => 'Prepare CI pipeline',
            ]);

        $this->withHeaders($headers)
            ->putJson('/api/tasks/' . $taskId, [
                'title' => 'Prepare final CI pipeline',
                'status' => 'in_progress',
                'priority' => 'medium',
                'description' => 'Workflow and tests updated',
            ])
            ->assertOk()
            ->assertJson([
                'id' => $taskId,
                'title' => 'Prepare final CI pipeline',
                'status' => 'in_progress',
                'priority' => 'medium',
            ]);

        $this->withHeaders($headers)
            ->postJson('/api/tasks/' . $taskId . '/updates', [
                'update_text' => 'Connected backend and frontend CI jobs',
            ])
            ->assertStatus(201)
            ->assertJson([
                'task_id' => $taskId,
                'update_text' => 'Connected backend and frontend CI jobs',
            ]);

        $this->withHeaders($headers)
            ->deleteJson('/api/tasks/' . $taskId)
            ->assertOk()
            ->assertJson([
                'message' => 'Task deleted',
            ]);

        $this->assertDatabaseMissing('tasks', [
            'id' => $taskId,
        ]);
    }
}
