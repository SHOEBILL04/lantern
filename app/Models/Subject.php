<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Subject extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'name', 'color_code', 'weekly_goal_minutes'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function exams()
    {
        return $this->hasMany(Exam::class);
    }

    public function courses()
    {
        return $this->hasMany(Course::class);
    }
}
