<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthLoginTest extends TestCase
{
    protected function tearDown(): void
    {
        DB::table('users')->where('email', 'like', 'ci-login-%@example.com')->delete();

        parent::tearDown();
    }

    public function test_existing_user_can_login(): void
    {
        $email = 'ci-login-' . uniqid() . '@example.com';

        User::create([
            'name' => 'CI Login User',
            'email' => $email,
            'password' => Hash::make('password123'),
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'password123',
        ]);

        $response
            ->assertOk()
            ->assertJsonStructure([
                'token_type',
                'expires_in',
                'user' => ['id', 'name', 'email'],
            ])
            ->assertJson([
                'token_type' => 'bearer',
                'user' => [
                    'email' => $email,
                ],
            ]);
    }

    public function test_login_rejects_invalid_credentials(): void
    {
        $response = $this->postJson('/api/auth/login', [
            'email' => 'ci-login-missing@example.com',
            'password' => 'wrong-password',
        ]);

        $response
            ->assertStatus(401)
            ->assertJson([
                'error' => 'Unauthorized',
            ]);
    }
}