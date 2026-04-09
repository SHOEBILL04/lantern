<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    private const LOCAL_GOOGLE_CALLBACK_URI = 'http://localhost:8000/api/auth/google/callback';

    public function redirectToGoogle(): RedirectResponse
    {
        $this->logRedirectMismatchIfNeeded();

        return $this->googleProvider()->redirect();
    }

    public function handleGoogleCallback(): RedirectResponse
    {
        $this->logRedirectMismatchIfNeeded();

        try {
            $googleUser = $this->googleProvider()->user();
        } catch (Throwable $e) {
            Log::error('Google OAuth callback failed', [
                'exception_class' => $e::class,
                'exception_message' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
                'configured_google_redirect_uri' => (string) config('services.google.redirect'),
                'resolved_google_redirect_uri' => $this->googleRedirectUri(),
                'request_full_url' => request()->fullUrl(),
                'request_query' => request()->query(),
            ]);

            $query = [
                'error' => 'google_auth_failed',
            ];

            if ($this->shouldExposeDebugHint()) {
                $query['debug'] = $this->safeDebugHint($e);
            }

            return redirect()->to($this->frontendUrl('/login', $query));
        }

        $googleId = (string) $googleUser->getId();
        $email = $googleUser->getEmail();

        if (blank($googleId) || blank($email)) {
            return redirect()->to($this->frontendUrl('/login', [
                'error' => 'google_auth_incomplete_profile',
            ]));
        }

        $user = User::where('google_id', $googleId)
            ->orWhere('email', $email)
            ->first();

        $avatarUrl = $googleUser->getAvatar();
        $name = $googleUser->getName() ?: $googleUser->getNickname() ?: $this->nameFromEmail($email);

        if (! $user) {
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make(Str::random(64)),
                'google_id' => $googleId,
                'auth_provider' => 'google',
                'avatar_url' => $avatarUrl,
            ]);

            $user->email_verified_at = now();
            $user->save();
        } else {
            $user->google_id = $user->google_id ?: $googleId;

            if (blank($user->auth_provider)) {
                $user->auth_provider = 'google';
            }

            if (! blank($avatarUrl)) {
                $user->avatar_url = $avatarUrl;
            }

            if (is_null($user->email_verified_at) && $user->email === $email) {
                $user->email_verified_at = now();
            }

            if ($user->isDirty()) {
                $user->save();
            }
        }

        $token = auth('api')->login($user);
        $minutes = auth('api')->factory()->getTTL();
        $cookie = cookie('token', $token, $minutes, '/', null, false, true, false, 'Lax');

        return redirect()
            ->to($this->frontendUrl('/auth/google/success'))
            ->cookie($cookie);
    }

    private function frontendUrl(string $path, array $query = []): string
    {
        $base = rtrim((string) env('FRONTEND_URL', 'http://localhost:5173'), '/');
        $url = $base.'/'.ltrim($path, '/');

        if (! empty($query)) {
            $url .= '?'.http_build_query($query);
        }

        return $url;
    }

    private function nameFromEmail(string $email): string
    {
        return Str::before($email, '@') ?: 'Google User';
    }

    private function googleProvider()
    {
        return Socialite::driver('google')
            ->stateless()
            ->redirectUrl($this->googleRedirectUri());
    }

    private function googleRedirectUri(): string
    {
        if ($this->isLocalOrTestingEnvironment()) {
            return self::LOCAL_GOOGLE_CALLBACK_URI;
        }

        return (string) config('services.google.redirect');
    }

    private function isLocalOrTestingEnvironment(): bool
    {
        return app()->environment(['local', 'development', 'testing']);
    }

    private function shouldExposeDebugHint(): bool
    {
        return $this->isLocalOrTestingEnvironment();
    }

    private function safeDebugHint(Throwable $e): string
    {
        $message = Str::lower($e->getMessage());

        if (Str::contains($message, 'redirect_uri_mismatch')) {
            return 'redirect_uri_mismatch';
        }

        if (Str::contains($message, 'invalid_client')) {
            return 'invalid_client';
        }

        if (Str::contains($message, 'invalid_grant')) {
            return 'invalid_grant';
        }

        if (Str::contains($message, 'connection refused')) {
            return 'connection_refused';
        }

        return Str::snake(class_basename($e));
    }

    private function logRedirectMismatchIfNeeded(): void
    {
        $configured = (string) config('services.google.redirect');

        if (
            $this->isLocalOrTestingEnvironment() &&
            ! blank($configured) &&
            $configured !== self::LOCAL_GOOGLE_CALLBACK_URI
        ) {
            Log::warning('Google OAuth redirect URI mismatch in local/testing environment', [
                'configured_google_redirect_uri' => $configured,
                'expected_google_redirect_uri' => self::LOCAL_GOOGLE_CALLBACK_URI,
            ]);
        }
    }
}
