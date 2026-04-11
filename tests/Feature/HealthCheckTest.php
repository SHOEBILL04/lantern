<?php

namespace Tests\Feature;

use Tests\TestCase;

class HealthCheckTest extends TestCase
{
    public function test_health_check_returns_successful_response(): void
    {
        $this->getJson('/api/health')
            ->assertOk()
            ->assertJsonPath('status', 'API working')
            ->assertJsonPath('checks.app', true)
            ->assertJsonPath('checks.db', true)
            ->assertJsonPath('checks.users_table', true)
            ->assertJsonPath('checks.jwt_secret', true);
    }
}
