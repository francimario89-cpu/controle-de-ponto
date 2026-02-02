
import React, { useState } from 'react';
import { Note } from '../types';

interface NotesAreaProps {
  notes: Note[];
  onCreateNote: (note: Note) => void;
}

const NotesArea: React.FC<NotesAreaProps> = ({ notes, onCreateNote }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSave = () => {
    if (!title || !content) return;
    onCreateNote({
      id: Date.now().toString(),
      title,
      content,
      updatedAt: new Date(),
    });
    setTitle('');
    setContent('');
    setIsCreating(false);
  };

  return (
    <div className="h-full bg-white p-6 overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-bold text-gray-800">My Notes</h2>
          {!isCreating && (
            <button 
              onClick={() => setIsCreating(true)}
              className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" /></svg>
              New Note
            </button>
          )}
        </div>

        {isCreating && (
          <div className="mb-8 p-6 bg-indigo-50/50 border border-indigo-100 rounded-2xl shadow-sm">
            <input 
              type="text" 
              placeholder="Note title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-transparent text-xl font-bold text-gray-800 focus:outline-none mb-4 placeholder:text-gray-300"
            />
            <textarea 
              rows={6}
              placeholder="Write your note here..."
              value={content}
              onChange={(e) => setContent(e.target.value)}
              className="w-full bg-transparent text-gray-600 focus:outline-none resize-none placeholder:text-gray-300"
            />
            <div className="flex gap-3 justify-end mt-4">
              <button 
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 text-gray-500 hover:text-gray-700 font-medium"
              >
                Cancel
              </button>
              <button 
                onClick={handleSave}
                className="px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-shadow shadow-lg shadow-indigo-100"
              >
                Save Note
              </button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map(note => (
            <div key={note.id} className="p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md hover:border-indigo-100 transition-all cursor-pointer group">
              <h3 className="text-lg font-bold text-gray-800 mb-2 truncate group-hover:text-indigo-600">{note.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-4 leading-relaxed">{note.content}</p>
              <div className="mt-4 pt-4 border-t border-gray-50 flex items-center justify-between">
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">
                  {note.updatedAt.toLocaleDateString()}
                </span>
                <svg className="w-4 h-4 text-gray-300 group-hover:text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
              </div>
            </div>
          ))}
          {notes.length === 0 && !isCreating && (
            <div className="col-span-full py-20 text-center">
              <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </div>
              <p className="text-gray-500 font-medium">Create your first note to organize insights.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotesArea;
