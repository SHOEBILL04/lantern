<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Laravel\Socialite\Facades\Socialite;
use Throwable;

class GoogleAuthController extends Controller
{
    public function redirectToGoogle(): RedirectResponse
    {
        return Socialite::driver('google')->stateless()->redirect();
    }

    public function handleGoogleCallback(): RedirectResponse
    {
        try {
            $googleUser = Socialite::driver('google')->stateless()->user();
        } catch (Throwable) {
            return redirect()->to($this->frontendUrl('/login', [
                'error' => 'google_auth_failed',
            ]));
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
}
