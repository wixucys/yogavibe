import React, { createContext, useContext, useState, useEffect, ReactNode, JSX } from 'react';
import AuthService from '../services/AuthService';
import type { User } from '../types/user';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  loading: boolean;
  login: (credentials: { login: string; password: string }) => Promise<void>;
  register: (data: { username: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider = ({ children }: AuthProviderProps): JSX.Element => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const initAuth = async (): Promise<void> => {
      try {
        await checkAuth();
      } catch (error) {
        console.error('Failed to check auth:', error);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    initAuth();
  }, []);

  const checkAuth = async (): Promise<void> => {
    try {
      const result = await AuthService.checkAuth();
      setIsAuthenticated(result.isAuthenticated);
      setUser(result.user ?? null);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const login = async (credentials: { login: string; password: string }): Promise<void> => {
    try {
      const result = await AuthService.login(credentials);
      if (!result.success) {
        throw new Error(result.message);
      }
      setIsAuthenticated(true);
      setUser(result.user ?? null);
    } catch (error) {
      console.error('Login error:', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const register = async (data: {
    username: string;
    email: string;
    password: string;
  }): Promise<void> => {
    try {
      const result = await AuthService.register(data);
      if (!result.success) {
        throw new Error(result.message);
      }
      setIsAuthenticated(true);
      setUser(result.user ?? null);
    } catch (error) {
      console.error('Register error:', error);
      setIsAuthenticated(false);
      setUser(null);
      throw error;
    }
  };

  const logout = async (): Promise<void> => {
    try {
      await AuthService.logout();
      setIsAuthenticated(false);
      setUser(null);
    } catch (error) {
      console.error('Logout error:', error);
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const value: AuthContextType = {
    isAuthenticated,
    user,
    loading,
    login,
    register,
    logout,
    checkAuth,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
