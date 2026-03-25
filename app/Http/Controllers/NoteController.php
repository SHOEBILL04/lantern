<?php

namespace App\Http\Controllers;

use App\Models\Note;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class NoteController extends Controller
{
    public function index(Request $request)
    {
        $query = Note::where('user_id', auth()->id());
        
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
        ];

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $path = $file->store('notes', 'public');
            $noteData['file_path'] = $path;
            $noteData['original_name'] = $file->getClientOriginalName();
            $noteData['file_type'] = $file->getClientOriginalExtension();
        }

        $note = Note::create($noteData);

        return response()->json($note, 201);
    }

    public function destroy($id)
    {
        $note = Note::where('user_id', auth()->id())->where('id', $id)->first();
        if (!$note) {
            return response()->json(['message' => 'Not found'], 404);
        }

        // Delete associated file if it exists
        if ($note->file_path) {
            Storage::disk('public')->delete($note->file_path);
        }
        
        $note->delete();

        return response()->json(['message' => 'Deleted successfully']);
    }
}
