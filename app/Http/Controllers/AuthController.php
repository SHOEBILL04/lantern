<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Services\EmailOtpService;
use Illuminate\Http\Request;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

class AuthController extends Controller
{
    public function __construct(private readonly EmailOtpService $emailOtpService)
    {
        $this->middleware('auth:api', [
            'except' => [
                'login',
                'register',
                'verifyEmailOtp',
                'resendEmailOtp',
                'requestPasswordResetOtp',
                'resetPasswordWithOtp',
            ],
        ]);
    }

    // POST /api/register
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'password' => ['required', 'string', 'min:8'],
        ]);

        $email = strtolower(trim($validated['email']));
        $name = trim($validated['name']);
        $verificationRequired = $this->isEmailVerificationRequired();
        
        try {
            $existingUser = User::where('email', $email)->first();

            if ($existingUser && $existingUser->auth_provider === 'google' && ! empty($existingUser->google_id)) {
                return response()->json([
                    'error' => 'This email is linked to Google sign-in. Please click Continue with Google.',
                ], 422);
            }

            if ($existingUser && ! is_null($existingUser->email_verified_at)) {
                return response()->json([
                    'error' => 'An account with this email already exists. Please log in.',
                ], 422);
            }

            if ($existingUser) {
                $existingUser->name = $name;
                $existingUser->password = Hash::make($validated['password']);
                $existingUser->auth_provider = 'local';
                if (! $verificationRequired) {
                    $existingUser->email_verified_at = now();
                }
                $existingUser->save();

                if (! $verificationRequired) {
                    $token = auth()->login($existingUser);

                    return $this->respondWithToken($token);
                }

                if (! $this->sendEmailVerificationOtp($email)) {
                    return response()->json([
                        'error' => 'We could not send a verification code right now. Please try again.',
                    ], 500);
                }

                return response()->json([
                    'message' => 'Account exists but not verified. A new verification code has been sent.',
                    'verification_required' => true,
                    'email' => $email,
                ]);
            }

            $emailVerifiedAt = $verificationRequired ? null : now();
            User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make($validated['password']),
                'auth_provider' => 'local',
                'email_verified_at' => $emailVerifiedAt,
            ]);

            $createdUser = User::where('email', $email)->firstOrFail();

            if (! $verificationRequired) {
                $token = auth()->login($createdUser);

                return $this->respondWithToken($token);
            }

            if (! $this->sendEmailVerificationOtp($email)) {
                return response()->json([
                    'error' => 'Your account was created, but we could not send the verification code. Please retry.',
                    'verification_required' => true,
                    'email' => $email,
                ], 500);
            }

            return response()->json([
                'message' => 'Account created. We sent a verification code to your email.',
                'verification_required' => true,
                'email' => $email,
            ], 201);
        } catch (QueryException $e) {
            Log::error('Registration failed because the database is unavailable.', [
                'email' => $email,
                'exception_class' => $e::class,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Registration is temporarily unavailable. Please try again shortly.',
            ], 503);
        } catch (Throwable $e) {
            Log::error('Registration failed due to an unexpected error.', [
                'email' => $email,
                'exception_class' => $e::class,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Registration is temporarily unavailable. Please try again shortly.',
            ], 503);
        }
    }

    // POST /api/login
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $email = strtolower(trim($validated['email']));

        try {
            $user = User::where('email', $email)->first();

            if ($user && $user->auth_provider === 'google' && ! empty($user->google_id)) {
                return response()->json([
                    'error' => 'This account uses Google sign-in. Please click Continue with Google.',
                ], 422);
            }

            if ($user && $user->auth_provider === 'local' && is_null($user->email_verified_at)) {
                if (! $this->isEmailVerificationRequired()) {
                    $user->email_verified_at = now();
                    $user->save();
                } else {
                    return response()->json([
                        'error' => 'Please verify your email before logging in.',
                    ], 403);
                }
            }

            if ($user && $user->auth_provider === 'local' && is_null($user->email_verified_at)) {
                return response()->json([
                    'error' => 'Please verify your email before logging in.',
                ], 403);
            }

            $credentials = [
                'email' => $email,
                'password' => $validated['password'],
            ];

            if (! $token = auth()->attempt($credentials)) {
                return response()->json(['error' => 'Unauthorized'], 401);
            }
        } catch (QueryException $e) {
            Log::error('Login failed because the database is unavailable.', [
                'email' => $email,
                'exception_class' => $e::class,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Authentication service is temporarily unavailable. Please try again shortly.',
            ], 503);
        } catch (Throwable $e) {
            Log::error('Login failed due to an unexpected authentication error.', [
                'email' => $email,
                'exception_class' => $e::class,
                'message' => $e->getMessage(),
            ]);

            return response()->json([
                'error' => 'Authentication service is temporarily unavailable. Please try again shortly.',
            ], 503);
        }

        return $this->respondWithToken($token);
    }

    // POST /api/auth/verify-email-otp
    public function verifyEmailOtp(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'otp' => ['required', 'digits:6'],
        ]);

        $email = strtolower(trim($validated['email']));
        $user = User::where('email', $email)->first();

        if (! $user || $user->auth_provider !== 'local') {
            return response()->json([
                'error' => 'Invalid verification request.',
            ], 422);
        }

        if (! $this->isEmailVerificationRequired()) {
            $user->email_verified_at = now();
            $user->save();

            $token = auth()->login($user);

            return $this->respondWithToken($token);
        }

        if (! is_null($user->email_verified_at)) {
            $token = auth()->login($user);

            return $this->respondWithToken($token);
        }

        $result = $this->emailOtpService->verify(
            $email,
            EmailOtpService::PURPOSE_EMAIL_VERIFICATION,
            $validated['otp']
        );

        if (! ($result['ok'] ?? false)) {
            return $this->otpFailureResponse((string) ($result['reason'] ?? 'invalid'), 'verification');
        }

        $user->email_verified_at = now();
        $user->save();

        $token = auth()->login($user);

        return $this->respondWithToken($token);
    }

    // POST /api/auth/resend-email-otp
    public function resendEmailOtp(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = strtolower(trim($validated['email']));
        $user = User::where('email', $email)->first();

        if (! $user || $user->auth_provider !== 'local') {
            return response()->json([
                'error' => 'Invalid verification request.',
            ], 422);
        }

        if (! is_null($user->email_verified_at)) {
            return response()->json([
                'error' => 'This email is already verified. Please log in.',
            ], 422);
        }

        if (! $this->isEmailVerificationRequired()) {
            $user->email_verified_at = now();
            $user->save();

            return response()->json([
                'message' => 'This email has been automatically verified.',
                'verification_required' => false,
                'email' => $email,
            ]);
        }

        if (! $this->sendEmailVerificationOtp($email)) {
            return response()->json([
                'error' => 'We could not send a verification code right now. Please try again.',
            ], 500);
        }

        return response()->json([
            'message' => 'A new verification code has been sent to your email.',
            'verification_required' => true,
            'email' => $email,
        ]);
    }

    // POST /api/auth/forgot-password/request-otp
    public function requestPasswordResetOtp(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $email = strtolower(trim($validated['email']));
        $user = User::where('email', $email)->first();

        if ($user && $user->auth_provider === 'local') {
            $this->sendPasswordResetOtp($email);
        }

        return response()->json([
            'message' => 'If an account exists for this email, a reset code has been sent.',
        ]);
    }

    // POST /api/auth/forgot-password/reset
    public function resetPasswordWithOtp(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'otp' => ['required', 'digits:6'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $email = strtolower(trim($validated['email']));
        $user = User::where('email', $email)->first();

        if (! $user || $user->auth_provider !== 'local') {
            return response()->json([
                'error' => 'Invalid email or reset code.',
            ], 422);
        }

        $result = $this->emailOtpService->verify(
            $email,
            EmailOtpService::PURPOSE_PASSWORD_RESET,
            $validated['otp']
        );

        if (! ($result['ok'] ?? false)) {
            return $this->otpFailureResponse((string) ($result['reason'] ?? 'invalid'), 'reset');
        }

        $user->password = Hash::make($validated['password']);
        $user->save();

        return response()->json([
            'message' => 'Password reset successful. Please log in with your new password.',
        ]);
    }

    /**
     * Get the authenticated User.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function me()
    {
        return response()->json(auth()->user());
    }

    /**
     * Log the user out (Invalidate the token).
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function logout()
    {
        auth()->logout();

        $cookie = $this->forgetTokenCookie();

        return response()->json(['message' => 'Successfully logged out'])->cookie($cookie);
    }

    /**
     * Refresh a token.
     *
     * @return \Illuminate\Http\JsonResponse
     */
    public function refresh()
    {
        return $this->respondWithToken(auth()->refresh());
    }

    /**
     * Get the token array structure.
     *
     * @param  string  $token
     *
     * @return \Illuminate\Http\JsonResponse
     */
    protected function respondWithToken($token)
    {
        $minutes = auth()->factory()->getTTL();
        $cookie = $this->tokenCookie($token, $minutes);

        return response()->json([
            'access_token' => $token,
            'token_type' => 'bearer',
            'expires_in' => $minutes * 60,
            'user' => auth()->user()
        ])->cookie($cookie);
    }

    protected function tokenCookie(string $token, int $minutes)
    {
        $secure = app()->environment('production') || request()->isSecure();
        $sameSite = $secure ? 'None' : 'Lax';
        $domain = env('SESSION_DOMAIN');

        return cookie('token', $token, $minutes, '/', $domain, $secure, true, false, $sameSite);
    }

    protected function forgetTokenCookie()
    {
        return cookie()->forget('token', '/', env('SESSION_DOMAIN'));
    }

    private function sendEmailVerificationOtp(string $email): bool
    {
        try {
            $otp = $this->emailOtpService->issue($email, EmailOtpService::PURPOSE_EMAIL_VERIFICATION);

            $this->sendOtpMail(
                $email,
                'Verify your Lantern account',
                "Your Lantern verification code is {$otp}. It expires in 10 minutes."
            );

            return true;
        } catch (Throwable $e) {
            Log::error('Failed to send email verification OTP', [
                'email' => $email,
                'exception_class' => $e::class,
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function sendPasswordResetOtp(string $email): bool
    {
        try {
            $otp = $this->emailOtpService->issue($email, EmailOtpService::PURPOSE_PASSWORD_RESET);

            $this->sendOtpMail(
                $email,
                'Lantern password reset code',
                "Your Lantern password reset code is {$otp}. It expires in 10 minutes."
            );

            return true;
        } catch (Throwable $e) {
            Log::warning('Failed to send password reset OTP', [
                'email' => $email,
                'exception_class' => $e::class,
                'message' => $e->getMessage(),
            ]);

            return false;
        }
    }

    private function sendOtpMail(string $email, string $subject, string $firstLine): void
    {
        if ($this->shouldFallbackToLoggedOtp()) {
            Log::warning('OTP email delivery is not configured. Logging OTP content instead.', [
                'email' => $email,
                'subject' => $subject,
                'body' => $firstLine,
            ]);

            return;
        }

        $body = implode("\n", [
            $firstLine,
            'If you did not request this, you can safely ignore this email.',
            'Thanks,',
            'Lantern',
        ]);

        Mail::raw($body, function ($message) use ($email, $subject): void {
            $message->to($email)->subject($subject);
        });
    }

    private function shouldFallbackToLoggedOtp(): bool
    {
        if (config('mail.default') !== 'smtp') {
            return false;
        }

        $host = (string) config('mail.mailers.smtp.host');
        $username = config('mail.mailers.smtp.username');
        $password = config('mail.mailers.smtp.password');

        return $host === ''
            || $host === 'mailpit'
            || $host === 'smtp.your-provider.com'
            || $username === null
            || $username === ''
            || $username === 'null'
            || $username === 'your_smtp_username'
            || $password === null
            || $password === ''
            || $password === 'null'
            || $password === 'your_smtp_password';
    }

    private function isEmailVerificationRequired(): bool
    {
        return ! filter_var(env('DISABLE_EMAIL_OTP_VERIFICATION', false), FILTER_VALIDATE_BOOL);
    }

    private function otpFailureResponse(string $reason, string $context)
    {
        if ($reason === 'expired') {
            return response()->json([
                'error' => 'This code has expired. Please request a new one.',
            ], 422);
        }

        if ($reason === 'locked') {
            return response()->json([
                'error' => 'Too many incorrect attempts. Please request a new code.',
            ], 422);
        }

        $message = $context === 'reset'
            ? 'Invalid reset code.'
            : 'Invalid verification code.';

        return response()->json([
            'error' => $message,
        ], 422);
    }
}
