<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HabitTracker extends Model
{
    protected $fillable = ['habit_id', 'date', 'is_completed', 'is_skipped'];

    public function habit()
    {
        return $this->belongsTo(Habit::class);
    }
}
