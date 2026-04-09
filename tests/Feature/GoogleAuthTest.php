<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Laravel\Socialite\Contracts\User as SocialiteUser;
use Laravel\Socialite\Facades\Socialite;
use Mockery;
use Tests\TestCase;

class GoogleAuthTest extends TestCase
{
    protected function tearDown(): void
    {
        DB::table('users')
            ->where('email', 'like', 'ci-google-%@example.com')
            ->orWhere('google_id', 'like', 'ci-google-id-%')
            ->delete();

        parent::tearDown();
    }

    public function test_google_redirect_route_sends_user_to_google(): void
    {
        Socialite::shouldReceive('driver')->once()->with('google')->andReturnSelf();
        Socialite::shouldReceive('stateless')->once()->andReturnSelf();
        Socialite::shouldReceive('redirect')->once()->andReturn(
            redirect('https://accounts.google.com/o/oauth2/auth')
        );

        $response = $this->get('/api/auth/google/redirect');

        $response->assertRedirect('https://accounts.google.com/o/oauth2/auth');
    }

    public function test_google_callback_creates_user_and_redirects_to_frontend_success(): void
    {
        $googleId = 'ci-google-id-' . uniqid();
        $email = 'ci-google-' . uniqid() . '@example.com';

        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getId')->andReturn($googleId);
        $socialiteUser->shouldReceive('getEmail')->andReturn($email);
        $socialiteUser->shouldReceive('getName')->andReturn('CI Google User');
        $socialiteUser->shouldReceive('getNickname')->andReturnNull();
        $socialiteUser->shouldReceive('getAvatar')->andReturn('https://example.com/avatar.png');

        Socialite::shouldReceive('driver')->once()->with('google')->andReturnSelf();
        Socialite::shouldReceive('stateless')->once()->andReturnSelf();
        Socialite::shouldReceive('user')->once()->andReturn($socialiteUser);

        $response = $this->get('/api/auth/google/callback');

        $response
            ->assertRedirect('http://localhost:5173/auth/google/success')
            ->assertCookie('token');

        $this->assertDatabaseHas('users', [
            'email' => $email,
            'google_id' => $googleId,
            'auth_provider' => 'google',
            'avatar_url' => 'https://example.com/avatar.png',
        ]);

        $user = User::where('email', $email)->first();
        $this->assertNotNull($user);
        $this->assertNotNull($user->email_verified_at);
    }

    public function test_google_callback_logs_in_existing_user_by_email(): void
    {
        $email = 'ci-google-' . uniqid() . '@example.com';
        $googleId = 'ci-google-id-' . uniqid();

        $existing = User::create([
            'name' => 'Existing Local User',
            'email' => $email,
            'password' => Hash::make('password123'),
            'auth_provider' => 'local',
        ]);

        $socialiteUser = Mockery::mock(SocialiteUser::class);
        $socialiteUser->shouldReceive('getId')->andReturn($googleId);
        $socialiteUser->shouldReceive('getEmail')->andReturn($email);
        $socialiteUser->shouldReceive('getName')->andReturn('Google Name');
        $socialiteUser->shouldReceive('getNickname')->andReturnNull();
        $socialiteUser->shouldReceive('getAvatar')->andReturn('https://example.com/new-avatar.png');

        Socialite::shouldReceive('driver')->once()->with('google')->andReturnSelf();
        Socialite::shouldReceive('stateless')->once()->andReturnSelf();
        Socialite::shouldReceive('user')->once()->andReturn($socialiteUser);

        $response = $this->get('/api/auth/google/callback');

        $response
            ->assertRedirect('http://localhost:5173/auth/google/success')
            ->assertCookie('token');

        $existing->refresh();

        $this->assertSame($googleId, $existing->google_id);
        $this->assertSame('local', $existing->auth_provider);
        $this->assertSame('https://example.com/new-avatar.png', $existing->avatar_url);
        $this->assertNotNull($existing->email_verified_at);
    }
}
