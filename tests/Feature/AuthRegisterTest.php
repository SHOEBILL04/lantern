<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AuthRegisterTest extends TestCase
{
    protected function tearDown(): void
    {
        DB::table('users')->where('email', 'like', 'ci-register-%@example.com')->delete();

        parent::tearDown();
    }

    public function test_user_can_register(): void
    {
        $email = 'ci-register-' . uniqid() . '@example.com';

        $response = $this->postJson('/api/auth/register', [
            'name' => 'CI Register User',
            'email' => $email,
            'password' => 'password123',
        ]);

        $response
            ->assertStatus(200)
            ->assertJsonStructure([
                'token_type',
                'expires_in',
                'user' => ['id', 'name', 'email'],
            ])
            ->assertJson([
                'token_type' => 'bearer',
                'user' => [
                    'name' => 'CI Register User',
                    'email' => $email,
                ],
            ]);

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'name' => 'CI Register User',
        ]);
    }
}