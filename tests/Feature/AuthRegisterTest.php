<?php

namespace Tests\Feature;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AuthRegisterTest extends TestCase
{
    protected function tearDown(): void
    {
        if (Schema::hasTable('email_otps')) {
            DB::table('email_otps')->where('email', 'like', 'ci-register-%@example.com')->delete();
        }

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
            ->assertStatus(201)
            ->assertJson([
                'verification_required' => true,
                'email' => $email,
            ]);

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'name' => 'CI Register User',
            'email_verified_at' => null,
        ]);

        if (Schema::hasTable('email_otps')) {
            $this->assertDatabaseHas('email_otps', [
                'email' => $email,
                'purpose' => 'email_verification',
            ]);
        }
    }
}
