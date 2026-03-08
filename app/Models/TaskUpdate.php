<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class TaskUpdate extends Model
{
    use HasFactory;

    protected $fillable = ['task_id', 'update_text'];

    public function task()
    {
        return $this->belongsTo(Task::class);
    }
}
