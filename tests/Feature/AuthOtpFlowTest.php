<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\EmailOtpService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class AuthOtpFlowTest extends TestCase
{
    protected function tearDown(): void
    {
        if (Schema::hasTable('email_otps')) {
            DB::table('email_otps')->where('email', 'like', 'ci-otp-%@example.com')->delete();
        }

        DB::table('users')->where('email', 'like', 'ci-otp-%@example.com')->delete();

        parent::tearDown();
    }

    public function test_verify_email_otp_marks_user_verified_and_logs_in(): void
    {
        $email = 'ci-otp-' . uniqid() . '@example.com';

        User::create([
            'name' => 'OTP Verify User',
            'email' => $email,
            'password' => Hash::make('password123'),
            'auth_provider' => 'local',
        ]);

        $otp = app(EmailOtpService::class)->issue($email, EmailOtpService::PURPOSE_EMAIL_VERIFICATION);

        $response = $this->postJson('/api/auth/verify-email-otp', [
            'email' => $email,
            'otp' => $otp,
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

        $this->assertDatabaseMissing('users', [
            'email' => $email,
            'email_verified_at' => null,
        ]);

        if (Schema::hasTable('email_otps')) {
            $this->assertDatabaseMissing('email_otps', [
                'email' => $email,
                'purpose' => 'email_verification',
                'consumed_at' => null,
            ]);
        }
    }

    public function test_request_password_reset_otp_is_generic_and_creates_code_for_existing_local_user(): void
    {
        $email = 'ci-otp-' . uniqid() . '@example.com';

        User::create([
            'name' => 'OTP Reset User',
            'email' => $email,
            'password' => Hash::make('password123'),
            'auth_provider' => 'local',
            'email_verified_at' => now(),
        ]);

        $response = $this->postJson('/api/auth/forgot-password/request-otp', [
            'email' => $email,
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'If an account exists for this email, a reset code has been sent.',
            ]);

        if (Schema::hasTable('email_otps')) {
            $this->assertDatabaseHas('email_otps', [
                'email' => $email,
                'purpose' => 'password_reset',
            ]);
        }
    }

    public function test_reset_password_with_valid_otp_updates_password(): void
    {
        $email = 'ci-otp-' . uniqid() . '@example.com';

        $user = User::create([
            'name' => 'OTP Reset Confirm User',
            'email' => $email,
            'password' => Hash::make('old-password'),
            'auth_provider' => 'local',
            'email_verified_at' => now(),
        ]);

        $otp = app(EmailOtpService::class)->issue($email, EmailOtpService::PURPOSE_PASSWORD_RESET);

        $response = $this->postJson('/api/auth/forgot-password/reset', [
            'email' => $email,
            'otp' => $otp,
            'password' => 'new-password123',
            'password_confirmation' => 'new-password123',
        ]);

        $response
            ->assertOk()
            ->assertJson([
                'message' => 'Password reset successful. Please log in with your new password.',
            ]);

        $user->refresh();
        $this->assertTrue(Hash::check('new-password123', $user->password));

        if (Schema::hasTable('email_otps')) {
            $this->assertDatabaseMissing('email_otps', [
                'email' => $email,
                'purpose' => 'password_reset',
                'consumed_at' => null,
            ]);
        }
    }
}
