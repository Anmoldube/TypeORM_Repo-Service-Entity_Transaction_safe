import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';

export const ProfileDropdown: React.FC = () => {
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  const handleLogout = async () => {
    try {
      await logout();
      setIsOpen(false);
    } catch (error) {
      console.error('Failed to logout:', error);
    }
  };

  const getInitials = (email: string, name?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    }
    return email[0].toUpperCase();
  };

  if (!user) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg"
        aria-label="Profile menu"
      >
        {getInitials(user.email, user.name)}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 py-2 z-50">
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center space-x-3">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-purple-600 to-blue-600 text-white font-semibold">
                {getInitials(user.email, user.name)}
              </div>
              <div className="flex-1 min-w-0">
                {user.name && (
                  <p className="text-white font-medium truncate">{user.name}</p>
                )}
                <p className="text-slate-300 text-sm truncate">{user.email}</p>
              </div>
            </div>
          </div>

          <div className="py-1">
            <button
              onClick={handleLogout}
              className="w-full text-left px-4 py-3 text-slate-300 hover:text-white hover:bg-white/10 transition-colors duration-200 flex items-center space-x-3"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              <span>Logout</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};