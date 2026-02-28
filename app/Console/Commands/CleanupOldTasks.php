<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Task;
use Carbon\Carbon;

class CleanupOldTasks extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'tasks:cleanup';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Deletes completed tasks that are older than 30 days';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $thresholdDate = Carbon::now()->subDays(30);
        
        $deletedCount = Task::where('status', 'completed')
            ->whereNotNull('completed_at')
            ->where('completed_at', '<', $thresholdDate)
            ->delete();
            
        $this->info("Deleted {$deletedCount} old completed tasks.");
    }
}
