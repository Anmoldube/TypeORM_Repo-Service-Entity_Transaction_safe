import React from 'react';
import { TodoFilters as TodoFiltersType } from '../services/api';

interface TodoFiltersProps {
  filters: TodoFiltersType;
  onFiltersChange: (filters: TodoFiltersType) => void;
}

export const TodoFilters: React.FC<TodoFiltersProps> = ({ filters, onFiltersChange }) => {
  const handleFilterChange = (key: keyof TodoFiltersType, value: string) => {
    const newFilters = { ...filters };
    if (value === '') {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    onFiltersChange(newFilters);
  };

  return (
    <div className="flex flex-wrap gap-4 items-center">
      <div>
        <label htmlFor="status-filter" className="block text-sm font-medium text-slate-300 mb-2">
          Status
        </label>
        <select
          id="status-filter"
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
          value={filters.status || ''}
          onChange={(e) => handleFilterChange('status', e.target.value)}
        >
          <option value="" className="bg-slate-800">All Status</option>
          <option value="ACTIVE" className="bg-slate-800">Active</option>
          <option value="COMPLETED" className="bg-slate-800">Completed</option>
        </select>
      </div>

      <div>
        <label htmlFor="priority-filter" className="block text-sm font-medium text-slate-300 mb-2">
          Priority
        </label>
        <select
          id="priority-filter"
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
          value={filters.priority || ''}
          onChange={(e) => handleFilterChange('priority', e.target.value)}
        >
          <option value="" className="bg-slate-800">All Priorities</option>
          <option value="HIGH" className="bg-slate-800">High</option>
          <option value="MEDIUM" className="bg-slate-800">Medium</option>
          <option value="LOW" className="bg-slate-800">Low</option>
        </select>
      </div>

      <div>
        <label htmlFor="due-date-filter" className="block text-sm font-medium text-slate-300 mb-2">
          Due Before
        </label>
        <input
          id="due-date-filter"
          type="date"
          className="bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
          value={filters.dueDate || ''}
          onChange={(e) => handleFilterChange('dueDate', e.target.value)}
        />
      </div>

      <div className="flex items-end">
        <button
          onClick={() => onFiltersChange({})}
          className="bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200"
        >
          Clear Filters
        </button>
      </div>
    </div>
  );
};