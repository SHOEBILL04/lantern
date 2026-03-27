<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NoteController extends Controller
{
    public function index(Request $request)
    {
        $query = DB::table('notes')->where('user_id', auth()->id());
        
        if ($request->has('task_id')) {
            $query->where('task_id', $request->task_id);
        }

        return response()->json($query->orderBy('created_at', 'desc')->get());
    }

    public function store(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'task_id' => 'nullable|exists:tasks,id',
            'file' => 'nullable|file|max:10240', // 10MB limit
            'content' => 'nullable|string'
        ]);

        $noteData = [
            'user_id' => auth()->id(),
            'task_id' => $request->task_id,
            'title' => $request->title,
            'content' => $request->content,
            'created_at' => now(),
            'updated_at' => now(),
        ];

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('notes', 'public');
            $noteData['file_path'] = $path;
            $noteData['original_name'] = $file->getClientOriginalName();
            $noteData['file_type'] = $file->getClientOriginalExtension();
        }

        $id = DB::table('notes')->insertGetId($noteData);
        $note = DB::table('notes')->find($id);

        return response()->json($note, 201);
    }

    public function destroy($id)
    {
        $note = DB::table('notes')->where('user_id', auth()->id())->where('id', $id)->first();
        if (!$note) {
            return response()->json(['message' => 'Not found'], 404);
        }

        if ($note->file_path) {
            Storage::disk('public')->delete($note->file_path);
        }
        
        DB::table('notes')->where('id', $id)->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }

    /**
     * Generate quiz questions from a note using Google Gemini.
     * 
     * Supports:
     *  - text content stored in the note
     *  - uploaded images (jpg/png/gif/webp) via Gemini vision
     *  - uploaded PDFs via Gemini file upload API
     *
     * POST /api/notes/{id}/quiz
     * Body (optional JSON): { "num_questions": 5 }
     */
    public function generateQuiz(Request $request, $id)
    {
        // ── 1. Fetch note and verify ownership ────────────────────────────
        $note = DB::table('notes')
            ->where('user_id', auth()->id())
            ->where('id', $id)
            ->first();

        if (!$note) {
            return response()->json(['message' => 'Note not found'], 404);
        }

        $validated = $request->validate([
            'num_questions' => 'nullable|integer|min:1|max:50',
        ]);
        $numQuestions = (int) ($validated['num_questions'] ?? 5);
        $apiKey       = config('services.gemini.api_key');

        if (!$apiKey) {
            return response()->json(['message' => 'Gemini API key not configured'], 500);
        }

        // ── 2. Build the Gemini content parts ─────────────────────────────
        $parts = [];

        // Instruction text part
        $parts[] = [
            'text' => "You are a quiz generator. Based on the study material provided, generate exactly {$numQuestions} quiz questions with answers.\n\n"
                    . "Return ONLY a valid JSON array (no markdown, no explanation) in this format:\n"
                    . '[{"question":"...","options":["A)...","B)...","C)...","D)..."],"answer":"A","explanation":"..."}]'
                    . "\n\nStudy material title: " . $note->title
                    . ($note->content ? "\n\nNote content:\n" . $note->content : ""),
        ];

        // If there is an uploaded file, include it
        if (!empty($note->file_path)) {
            $absolutePath = Storage::disk('public')->path($note->file_path);
            $ext          = strtolower($note->file_type ?? pathinfo($note->file_path, PATHINFO_EXTENSION));

            $imageExts = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

            if (in_array($ext, $imageExts) && file_exists($absolutePath)) {
                // Inline base64 image for Gemini vision
                $mimeMap = [
                    'jpg'  => 'image/jpeg',
                    'jpeg' => 'image/jpeg',
                    'png'  => 'image/png',
                    'gif'  => 'image/gif',
                    'webp' => 'image/webp',
                ];
                $mime     = $mimeMap[$ext] ?? 'image/jpeg';
                $b64      = base64_encode(file_get_contents($absolutePath));

                $parts[] = [
                    'inlineData' => [
                        'mimeType' => $mime,
                        'data'     => $b64,
                    ],
                ];
            } elseif ($ext === 'pdf' && file_exists($absolutePath)) {
                // Upload PDF to Gemini File API first, then reference it
                $uploadedFileUri = $this->uploadPdfToGemini($absolutePath, $apiKey);

                if ($uploadedFileUri) {
                    $parts[] = [
                        'fileData' => [
                            'mimeType' => 'application/pdf',
                            'fileUri'  => $uploadedFileUri,
                        ],
                    ];
                }
            }
        }

        // ── 3. Call Gemini generateContent ────────────────────────────────
        $models = $this->geminiModels();

        try {
            $response = null;
            $usedModel = null;
            $last404Body = null;
            $last429Body = null;
            $retryAfterSeconds = null;

            foreach ($models as $model) {
                $endpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$model}:generateContent?key={$apiKey}";
                $attempt = $this->geminiHttpClient(60)->post($endpoint, [
                    'contents' => [
                        ['parts' => $parts],
                    ],
                    'generationConfig' => [
                        'temperature'     => 0.4,
                        'maxOutputTokens' => 2048,
                    ],
                ]);

                if ($attempt->status() === 404) {
                    $last404Body = $attempt->body();
                    Log::warning('Gemini model unavailable for generateContent', [
                        'model' => $model,
                        'body' => $last404Body,
                    ]);
                    continue;
                }

                if ($attempt->status() === 429) {
                    $last429Body = $attempt->body();
                    $retryAfterSeconds = $this->retryAfterSeconds($attempt);
                    Log::warning('Gemini model rate limited', [
                        'model' => $model,
                        'retry_after' => $retryAfterSeconds,
                        'body' => $last429Body,
                    ]);

                    if ($retryAfterSeconds) {
                        sleep(min($retryAfterSeconds, 2));
                    } else {
                        usleep(250000);
                    }
                    continue;
                }

                $response = $attempt;
                $usedModel = $model;
                break;
            }

            if (!$response && !$last429Body) {
                $discoveredModel = $this->discoverGeminiModel($apiKey);
                if ($discoveredModel && !in_array($discoveredModel, $models, true)) {
                    $discoveredEndpoint = "https://generativelanguage.googleapis.com/v1beta/models/{$discoveredModel}:generateContent?key={$apiKey}";
                    $discoveredAttempt = $this->geminiHttpClient(60)->post($discoveredEndpoint, [
                        'contents' => [
                            ['parts' => $parts],
                        ],
                        'generationConfig' => [
                            'temperature'     => 0.4,
                            'maxOutputTokens' => 2048,
                        ],
                    ]);

                    if ($discoveredAttempt->status() === 429) {
                        $last429Body = $discoveredAttempt->body();
                        $retryAfterSeconds = $this->retryAfterSeconds($discoveredAttempt);
                        Log::warning('Gemini discovered model rate limited', [
                            'model' => $discoveredModel,
                            'retry_after' => $retryAfterSeconds,
                            'body' => $last429Body,
                        ]);
                    } elseif ($discoveredAttempt->successful()) {
                        $response = $discoveredAttempt;
                        $usedModel = $discoveredModel;
                    } else {
                        Log::warning('Gemini discovered model failed', [
                            'model' => $discoveredModel,
                            'status' => $discoveredAttempt->status(),
                            'body' => $discoveredAttempt->body(),
                        ]);
                    }
                }
            }

            if (!$response && $last429Body) {
                return response()->json([
                    'message' => 'AI is rate-limited right now (429). Please try again in a minute, or increase Gemini quota/billing.',
                    'retry_after' => $retryAfterSeconds,
                ], 429);
            }

            if (!$response) {
                return response()->json([
                    'message' => 'No compatible Gemini model available. Update GEMINI_MODEL / GEMINI_FALLBACK_MODELS.',
                    'detail' => $last404Body,
                ], 502);
            }

            if (!$response->successful()) {
                Log::error('Gemini API error', ['model' => $usedModel, 'body' => $response->body()]);
                return response()->json(['message' => 'AI service error: ' . $response->status()], 502);
            }

            $raw  = $response->json('candidates.0.content.parts.0.text', '');
            // Strip possible markdown code fences
            $json = preg_replace('/^```(?:json)?\s*/i', '', trim($raw));
            $json = preg_replace('/\s*```$/', '', $json);

            $questions = json_decode($json, true);

            if (json_last_error() !== JSON_ERROR_NONE || !is_array($questions)) {
                Log::error('Gemini returned invalid JSON', ['raw' => $raw]);
                return response()->json(['message' => 'AI returned an invalid response. Try again.'], 502);
            }

            return response()->json([
                'note_id'   => (int) $id,
                'note_title' => $note->title,
                'questions' => $questions,
            ]);

        } catch (\Throwable $e) {
            Log::error('Gemini request failed', ['error' => $e->getMessage()]);

            if (str_contains($e->getMessage(), 'cURL error 60')) {
                return response()->json([
                    'message' => 'SSL certificate issue on server. Set GEMINI_SSL_VERIFY=false for local dev or configure GEMINI_CA_BUNDLE.',
                ], 500);
            }

            return response()->json(['message' => 'Failed to reach AI service.'], 500);
        }
    }

    private function geminiHttpClient(int $timeoutSeconds)
    {
        $caBundle = config('services.gemini.ca_bundle');
        $verify   = $caBundle ?: config('services.gemini.ssl_verify', true);

        return Http::timeout($timeoutSeconds)->withOptions([
            'verify' => $verify,
        ]);
    }

    private function geminiModels(): array
    {
        $primary = (string) config('services.gemini.model', 'gemini-2.0-flash');
        $fallbacks = config('services.gemini.fallback_models', []);

        if (!is_array($fallbacks)) {
            $fallbacks = [];
        }

        return array_values(array_unique(array_filter(array_merge([$primary], $fallbacks))));
    }

    private function discoverGeminiModel(string $apiKey): ?string
    {
        $endpoint = "https://generativelanguage.googleapis.com/v1beta/models?key={$apiKey}";
        $response = $this->geminiHttpClient(30)->get($endpoint);

        if (!$response->successful()) {
            Log::warning('Gemini list models failed', [
                'status' => $response->status(),
                'body' => $response->body(),
            ]);
            return null;
        }

        $models = $response->json('models', []);
        if (!is_array($models)) {
            return null;
        }

        $flashCandidates = [];
        $otherCandidates = [];

        foreach ($models as $model) {
            if (!is_array($model)) {
                continue;
            }

            $name = (string) ($model['name'] ?? '');
            $methods = $model['supportedGenerationMethods'] ?? [];

            if (!$name || !is_array($methods) || !in_array('generateContent', $methods, true)) {
                continue;
            }

            $cleanName = preg_replace('/^models\//', '', $name);
            if (!$cleanName) {
                continue;
            }

            if (str_contains($cleanName, 'flash')) {
                $flashCandidates[] = $cleanName;
            } else {
                $otherCandidates[] = $cleanName;
            }
        }

        return $flashCandidates[0] ?? $otherCandidates[0] ?? null;
    }

    private function retryAfterSeconds($response): ?int
    {
        $retryAfter = $response->header('Retry-After');
        if ($retryAfter === null || $retryAfter === '') {
            return null;
        }

        if (is_numeric($retryAfter)) {
            return max((int) $retryAfter, 0);
        }

        $timestamp = strtotime($retryAfter);
        if ($timestamp === false) {
            return null;
        }

        return max($timestamp - time(), 0);
    }

    // ── Helper: upload a PDF to Gemini File API ───────────────────────────
    private function uploadPdfToGemini(string $filePath, string $apiKey): ?string
    {
        try {
            $uploadEndpoint = "https://generativelanguage.googleapis.com/upload/v1beta/files?key={$apiKey}";

            $response = $this->geminiHttpClient(120)
                ->attach('file', file_get_contents($filePath), basename($filePath), ['Content-Type' => 'application/pdf'])
                ->post($uploadEndpoint);

            if ($response->successful()) {
                return $response->json('file.uri');
            }

            Log::warning('Gemini PDF upload failed', ['status' => $response->status()]);
            return null;
        } catch (\Throwable $e) {
            Log::error('Gemini PDF upload exception', ['error' => $e->getMessage()]);
            return null;
        }
    }
}
