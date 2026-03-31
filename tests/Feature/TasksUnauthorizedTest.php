<?php

namespace Tests\Feature;

use Tests\TestCase;

class TasksUnauthorizedTest extends TestCase
{
    public function test_tasks_endpoint_rejects_guest_requests(): void
    {
        $this->getJson('/api/tasks')
            ->assertStatus(401);
    }
}