<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Course extends Model
{
    use HasFactory;

    protected $fillable = ['user_id', 'subject_id', 'title', 'description'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function subject()
    {
        return $this->belongsTo(Subject::class);
    }

    public function tasks()
    {
        return $this->hasMany(Task::class);
    }

    public function studySessions()
    {
        return $this->hasMany(StudySession::class);
    }
}
