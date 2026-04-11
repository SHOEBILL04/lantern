<?php

use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\GoogleAuthController;
use App\Http\Controllers\UsersController;
use App\Http\Controllers\WeeklyGoalController;

Route::get('/health', function () {
    $checks = [
        'app' => true,
        'db' => false,
        'users_table' => false,
        'jwt_secret' => filled(config('jwt.secret')),
    ];

    try {
        DB::connection()->getPdo();
        $checks['db'] = true;
        $checks['users_table'] = Schema::hasTable('users');
    } catch (\Throwable $e) {
        report($e);
    }

    $ok = ! in_array(false, $checks, true);

    return response()->json([
        'status' => $ok ? 'API working' : 'API degraded',
        'checks' => $checks,
    ], $ok ? 200 : 503);
});

Route::group([
    'middleware' => 'api',
    'prefix' => 'auth'
], function ($router) {
    Route::get('/google/redirect', [GoogleAuthController::class, 'redirectToGoogle']);
    Route::get('/google/callback', [GoogleAuthController::class, 'handleGoogleCallback']);

    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/verify-email-otp', [AuthController::class, 'verifyEmailOtp']);
    Route::post('/resend-email-otp', [AuthController::class, 'resendEmailOtp']);
    Route::post('/forgot-password/request-otp', [AuthController::class, 'requestPasswordResetOtp']);
    Route::post('/forgot-password/reset', [AuthController::class, 'resetPasswordWithOtp']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::post('/me', [AuthController::class, 'me']);
});

Route::group(['middleware' => 'auth:api'], function () {
    Route::patch('/weekly-goal', [WeeklyGoalController::class, 'updateWeeklyGoal']);
    Route::patch('/weekly-goal/course/{courseId}', [WeeklyGoalController::class, 'updateCourseWeeklyGoal']);

    // Basic CRUD Operations for Database-First approach
    Route::apiResource('subjects', \App\Http\Controllers\SubjectController::class);
    Route::apiResource('courses', \App\Http\Controllers\CourseController::class);
    Route::apiResource('study-sessions', \App\Http\Controllers\StudySessionController::class);
    
    // Tasks CRUD & Updates
    Route::apiResource('tasks', \App\Http\Controllers\TaskController::class);
    Route::patch('/tasks/{id}/complete', [\App\Http\Controllers\TaskController::class, 'completeTask']);
    Route::post('/tasks/{id}/updates', [\App\Http\Controllers\TaskController::class, 'addUpdate']);
    
    // Habits CRUD
    Route::apiResource('habits', \App\Http\Controllers\HabitController::class)->except(['show', 'update']);
    Route::post('habits/{habit}/track', [\App\Http\Controllers\HabitController::class, 'track']);

    // Achievements
    Route::get('/achievements', [\App\Http\Controllers\AchievementController::class, 'index']);

    // Notes (CRUD + AI quiz generation)
    Route::apiResource('notes', \App\Http\Controllers\NoteController::class)->except(['show', 'update']);
    Route::post('/notes/{id}/quiz', [\App\Http\Controllers\NoteController::class, 'generateQuiz']); // ← NEW
});

// items (can later be protected by JWT middleware)
Route::get('/items', [UsersController::class, 'index']);
Route::get('/items/{id}', [UsersController::class, 'show']);
Route::post('/items', [UsersController::class, 'store']);
Route::put('/items/{id}', [UsersController::class, 'update']);
Route::patch('/items/{id}', [UsersController::class, 'patch']);
Route::delete('/items/{id}', [UsersController::class, 'destroy']);
