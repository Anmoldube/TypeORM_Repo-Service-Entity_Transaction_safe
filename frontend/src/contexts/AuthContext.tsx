import React, { createContext, useContext, useEffect, useState } from 'react';
import { useToast } from './ToastContext';

interface User {
  id: number;
  email: string;
  name?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const { showSuccess } = useToast();

  useEffect(() => {
    // Check if user is logged in on app start
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');

    if (token && userData) {
      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      } catch (error) {
        // Invalid stored data, clear it
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }

    setLoading(false);
  }, []);

  const signIn = async (email: string, password: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Login failed');
    }

    const data = await response.json();
    const { user, token } = data;

    // Store auth data
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));

    setUser(user);
    showSuccess('Successfully signed in!');
  };

  const signUp = async (email: string, password: string, name?: string) => {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ email, password, name }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Registration failed');
    }

    const data = await response.json();
    const { user, token } = data;

    // Store auth data
    localStorage.setItem('authToken', token);
    localStorage.setItem('userData', JSON.stringify(user));

    setUser(user);
    showSuccess('Account created successfully!');
  };

  const logout = async () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
  };

  const value = {
    user,
    loading,
    signIn,
    signUp,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};