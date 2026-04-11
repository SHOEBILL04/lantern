<?php

namespace App\Services;

use App\Models\EmailOtp;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Schema;

class EmailOtpService
{
    public const PURPOSE_EMAIL_VERIFICATION = 'email_verification';
    public const PURPOSE_PASSWORD_RESET = 'password_reset';

    public const DEFAULT_TTL_MINUTES = 10;
    public const MAX_ATTEMPTS = 5;

    public function issue(string $email, string $purpose, int $ttlMinutes = self::DEFAULT_TTL_MINUTES): string
    {
        if (! Schema::hasTable('email_otps')) {
            return $this->issueInCache($email, $purpose, $ttlMinutes);
        }

        EmailOtp::where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->update(['consumed_at' => now()]);

        $otp = (string) random_int(100000, 999999);

        EmailOtp::create([
            'email' => $email,
            'purpose' => $purpose,
            'otp_hash' => Hash::make($otp),
            'attempts' => 0,
            'expires_at' => now()->addMinutes($ttlMinutes),
        ]);

        return $otp;
    }

    public function verify(string $email, string $purpose, string $otp): array
    {
        if (! Schema::hasTable('email_otps')) {
            return $this->verifyFromCache($email, $purpose, $otp);
        }

        $record = EmailOtp::where('email', $email)
            ->where('purpose', $purpose)
            ->whereNull('consumed_at')
            ->orderByDesc('id')
            ->first();

        if (! $record) {
            return ['ok' => false, 'reason' => 'missing'];
        }

        if ($record->expires_at->isPast()) {
            return ['ok' => false, 'reason' => 'expired'];
        }

        if ($record->attempts >= self::MAX_ATTEMPTS) {
            return ['ok' => false, 'reason' => 'locked'];
        }

        if (! Hash::check($otp, $record->otp_hash)) {
            $record->increment('attempts');

            if ($record->attempts >= self::MAX_ATTEMPTS) {
                return ['ok' => false, 'reason' => 'locked'];
            }

            return ['ok' => false, 'reason' => 'invalid'];
        }

        $record->consumed_at = now();
        $record->save();

        return ['ok' => true];
    }

    private function issueInCache(string $email, string $purpose, int $ttlMinutes): string
    {
        $otp = (string) random_int(100000, 999999);
        $expiresAt = now()->addMinutes($ttlMinutes);

        Cache::put(
            $this->cacheKey($email, $purpose),
            [
                'otp_hash' => Hash::make($otp),
                'attempts' => 0,
                'expires_at' => $expiresAt->toISOString(),
            ],
            $expiresAt
        );

        return $otp;
    }

    private function verifyFromCache(string $email, string $purpose, string $otp): array
    {
        $key = $this->cacheKey($email, $purpose);
        $record = Cache::get($key);

        if (! is_array($record)) {
            return ['ok' => false, 'reason' => 'missing'];
        }

        $expiresAt = isset($record['expires_at']) ? Carbon::parse($record['expires_at']) : null;

        if (! $expiresAt || $expiresAt->isPast()) {
            Cache::forget($key);

            return ['ok' => false, 'reason' => 'expired'];
        }

        $attempts = (int) ($record['attempts'] ?? 0);

        if ($attempts >= self::MAX_ATTEMPTS) {
            return ['ok' => false, 'reason' => 'locked'];
        }

        if (! Hash::check($otp, (string) ($record['otp_hash'] ?? ''))) {
            $attempts++;

            Cache::put(
                $key,
                [
                    ...$record,
                    'attempts' => $attempts,
                ],
                $expiresAt
            );

            if ($attempts >= self::MAX_ATTEMPTS) {
                return ['ok' => false, 'reason' => 'locked'];
            }

            return ['ok' => false, 'reason' => 'invalid'];
        }

        Cache::forget($key);

        return ['ok' => true];
    }

    private function cacheKey(string $email, string $purpose): string
    {
        return 'email_otp:' . $purpose . ':' . sha1(strtolower($email));
    }
}
