<?php   

namespace App\Http\Services;

use App\Models\User;
use App\Models\Achievement;
use Carbon\Carbon;

class AchievementService
{
    public function checkAndAwardAchievements(User $user, string $type)
    {
        $currentValue = $this->getCurrentValue($user, $type);
        $unlockedAchievementIds = $user->achievements()->pluck('achievement_id')->toArray();
        $newAchievements = Achievement::where('requirement_type', $type)
        ->where('requirement_value', '<=', $currentValue)
        ->whereNotIn('id', $unlockedAchievementIds)
        ->get();
        foreach($newAchievements as $achievement)
        {
            $user->achievements()->attach($achievement->id, [
                'unlocked_at' => Carbon::now()
            ]);
        }
        return $newAchievements;
        
    }
    private function getCurrentValue(User $user, string $type)
    {
        switch($type)
        {
            case 'tasks_completed':
                return $user->tasks()->where('status', 'completed')->count();
            case 'habits_completed':
                return $user->habits()->count();
            case 'study_minutes':
                return $user->studySessions()->sum('duration_minutes');
            default:
            return 0;
        }
    }
    
}