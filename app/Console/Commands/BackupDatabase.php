<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class BackupDatabase extends Command
{
    protected $signature = 'backup:database {--keep=30 : Number of days to keep backups}';

    protected $description = 'Backup the MySQL database to a SQL file';

    public function handle(): int
    {
        $db = config('database.connections.mysql.database');
        $user = config('database.connections.mysql.username');
        $pass = config('database.connections.mysql.password');
        $host = config('database.connections.mysql.host');
        $port = config('database.connections.mysql.port');

        $filename = 'backup-'.date('Y-m-d-H-i-s').'.sql';
        $path = storage_path("app/backups/{$filename}");

        if (! is_dir(storage_path('app/backups'))) {
            mkdir(storage_path('app/backups'), 0755, true);
        }

        $command = sprintf(
            'mysqldump --host=%s --port=%s --user=%s --password=%s --routines --single-transaction %s > %s 2>&1',
            escapeshellarg($host),
            escapeshellarg($port),
            escapeshellarg($user),
            escapeshellarg($pass),
            escapeshellarg($db),
            escapeshellarg($path)
        );

        $output = null;
        $resultCode = null;
        exec($command, $output, $resultCode);

        if ($resultCode !== 0) {
            $this->error('Database backup failed: '.implode("\n", $output));

            return Command::FAILURE;
        }

        $this->info("Backup created: {$filename}");

        $keep = (int) $this->option('keep');
        $this->cleanOldBackups($keep);

        return Command::SUCCESS;
    }

    private function cleanOldBackups(int $keepDays): void
    {
        $backupDir = storage_path('app/backups');
        if (! is_dir($backupDir)) {
            return;
        }

        $cutoff = now()->subDays($keepDays)->timestamp;
        $count = 0;

        foreach (glob($backupDir.'/backup-*.sql') as $file) {
            if (filemtime($file) < $cutoff) {
                unlink($file);
                $count++;
            }
        }

        if ($count > 0) {
            $this->info("Cleaned {$count} old backup(s)");
        }
    }
}
