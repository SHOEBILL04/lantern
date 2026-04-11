<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;
use Throwable;

class TestOtpEmailCommand extends Command
{
    protected $signature = 'otp:test-email {email : Recipient email address}';

    protected $description = 'Send a test OTP email using current mail configuration';

    public function handle(): int
    {
        $email = strtolower(trim((string) $this->argument('email')));
        $otp = (string) random_int(100000, 999999);

        $body = implode("\n", [
            "Your Lantern test OTP code is {$otp}.",
            'This message verifies that SMTP delivery is working.',
            'If you did not request this, you can ignore this email.',
            'Thanks,',
            'Lantern',
        ]);

        try {
            Mail::raw($body, function ($message) use ($email): void {
                $message->to($email)->subject('Lantern OTP delivery test');
            });
        } catch (Throwable $e) {
            $this->error('Failed to send test OTP email.');
            $this->line('Reason: '.$e->getMessage());

            return self::FAILURE;
        }

        $this->info("Test OTP email sent to {$email}.");
        $this->line('If the email does not arrive, check spam and SMTP credentials.');

        return self::SUCCESS;
    }
}
