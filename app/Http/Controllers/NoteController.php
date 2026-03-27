<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

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
}
