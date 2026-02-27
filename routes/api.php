<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\UsersController;

Route::get('/health', fn () => response()->json(['status' => 'API working']));

Route::group([
    'middleware' => 'api',
    'prefix' => 'auth'
], function ($router) {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::post('/me', [AuthController::class, 'me']);
});

Route::group(['middleware' => 'auth:api'], function () {
    Route::get('/dashboard', [\App\Http\Controllers\DashboardController::class, 'index']);
    Route::post('/dashboard/add-subject-course', [\App\Http\Controllers\DashboardController::class, 'addSubjectCourse']);
    Route::post('/study-sessions', [\App\Http\Controllers\StudySessionController::class, 'store']);
    Route::patch('/tasks/{id}/complete', [\App\Http\Controllers\DashboardController::class, 'completeTask']);
    
    // Tasks CRUD & Updates
    Route::apiResource('tasks', \App\Http\Controllers\TaskController::class);
    Route::post('/tasks/{id}/updates', [\App\Http\Controllers\TaskController::class, 'addUpdate']);
});

// items (can later be protected by JWT middleware)
Route::get('/items', [UsersController::class, 'index']);
Route::get('/items/{id}', [UsersController::class, 'show']);
Route::post('/items', [UsersController::class, 'store']);
Route::put('/items/{id}', [UsersController::class, 'update']);
Route::patch('/items/{id}', [UsersController::class, 'patch']);
Route::delete('/items/{id}', [UsersController::class, 'destroy']);
