import React, { useState } from 'react';

interface TodoFormProps {
  onSubmit: (todoData: {
    text: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate?: string;
  }) => void;
  onCancel: () => void;
  initialData?: {
    text: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    dueDate?: string;
  };
}

export const TodoForm: React.FC<TodoFormProps> = ({ onSubmit, onCancel, initialData }) => {
  const [text, setText] = useState(initialData?.text || '');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH'>(initialData?.priority || 'MEDIUM');
  const [dueDate, setDueDate] = useState(initialData?.dueDate || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    onSubmit({
      text: text.trim(),
      priority,
      dueDate: dueDate || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="text" className="block text-sm font-medium text-slate-300 mb-2">
            Todo Text
          </label>
          <textarea
            id="text"
            rows={3}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 resize-none"
            placeholder="Enter your todo..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-slate-300 mb-2">
              Priority
            </label>
            <select
              id="priority"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              value={priority}
              onChange={(e) => setPriority(e.target.value as 'LOW' | 'MEDIUM' | 'HIGH')}
            >
              <option value="LOW" className="bg-slate-800">Low</option>
              <option value="MEDIUM" className="bg-slate-800">Medium</option>
              <option value="HIGH" className="bg-slate-800">High</option>
            </select>
          </div>

          <div>
            <label htmlFor="dueDate" className="block text-sm font-medium text-slate-300 mb-2">
              Due Date (Optional)
            </label>
            <input
              id="dueDate"
              type="date"
              className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={onCancel}
            className="bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white px-6 py-3 rounded-lg text-sm font-medium transition-all duration-200 transform hover:scale-105 shadow-lg"
          >
            {initialData ? 'Update' : 'Add'} Todo
          </button>
        </div>
      </form>
  );
};