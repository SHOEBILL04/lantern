<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SleepCycle extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'date', 'sleep_start', 'sleep_end', 'duration_minutes', 'quality_rating'];

    protected $casts = [
        'date' => 'date',
        'sleep_start' => 'datetime',
        'sleep_end' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
