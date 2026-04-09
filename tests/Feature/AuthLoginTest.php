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
            ->assertCookie('token')
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

    public function test_google_only_user_cannot_login_with_password(): void
    {
        $email = 'ci-login-google-' . uniqid() . '@example.com';

        User::create([
            'name' => 'Google Only User',
            'email' => $email,
            'password' => Hash::make('server-generated-password'),
            'google_id' => 'ci-google-id-' . uniqid(),
            'auth_provider' => 'google',
        ]);

        $response = $this->postJson('/api/auth/login', [
            'email' => $email,
            'password' => 'password123',
        ]);

        $response
            ->assertStatus(422)
            ->assertJson([
                'error' => 'This account uses Google sign-in. Please click Continue with Google.',
            ]);
    }
}
