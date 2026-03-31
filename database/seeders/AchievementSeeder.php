<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Achievement;

class AchievementSeeder extends Seeder
{
    /**
     * Run the database seeds.
     *
     * @return void
     */
    public function run()
    {
        $achievements = [
            [
                'name' => 'First Blood',
                'description' => 'Complete your very first task.',
                'icon' => '🎯',
                'requirement_type' => 'tasks_completed',
                'requirement_value' => 1
            ],
            [
                'name' => 'Task Master',
                'description' => 'Complete 10 tasks to become a master of productivity.',
                'icon' => '🏆',
                'requirement_type' => 'tasks_completed',
                'requirement_value' => 10
            ],
            [
                'name' => 'Task Legend',
                'description' => 'Complete 50 tasks. Truly legendary dedication.',
                'icon' => '👑',
                'requirement_type' => 'tasks_completed',
                'requirement_value' => 50
            ],
            [
                'name' => 'Getting Started',
                'description' => 'Track your very first habit successfully.',
                'icon' => '🌱',
                'requirement_type' => 'habits_completed',
                'requirement_value' => 1
            ],
            [
                'name' => 'Consistency is Key',
                'description' => 'Complete 10 habits indicating great momentum.',
                'icon' => '🔥',
                'requirement_type' => 'habits_completed',
                'requirement_value' => 10
            ],
            [
                'name' => 'Unbreakable',
                'description' => 'Complete 30 habits. Your routine is rock solid.',
                'icon' => '💎',
                'requirement_type' => 'habits_completed',
                'requirement_value' => 30
            ],
        ];

        foreach ($achievements as $achievement) {
            Achievement::updateOrCreate(
                ['name' => $achievement['name']],
                $achievement
            );
        }
    }
}
