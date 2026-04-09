<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    /**
     * Create a new AuthController instance.
     *
     * @return void
     */
    public function __construct()
    {
        $this->middleware('auth:api', ['except' => ['login', 'register']]);
    }
    // POST /api/register
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', 'min:6'],
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
        ]);

        $token = auth()->login($user);

        return $this->respondWithToken($token);
    }

    // POST /api/login
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $validated['email'])->first();

        if ($user && $user->auth_provider === 'google' && ! empty($user->google_id)) {
            return response()->json([
                'error' => 'This account uses Google sign-in. Please click Continue with Google.',
            ], 422);
        }

        $credentials = $request->only('email', 'password');

        if (! $token = auth()->attempt($credentials)) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }

        return $this->respondWithToken($token);
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
}
