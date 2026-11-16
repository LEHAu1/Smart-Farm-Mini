import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getStoredUser,
  isAuthenticated as checkAuth,
  login as apiLogin,
  logout as apiLogout,
  register as apiRegister,
  getCurrentUserProfile,
} from '../services/auth-service';
import type { LoginRequest, RegisterRequest, UserDto } from '../types/auth';

interface AuthContextType {
  user: UserDto | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (request: LoginRequest) => Promise<void>;
  register: (request: RegisterRequest) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserDto | null>(() => getStoredUser());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => checkAuth());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    async function initAuth() {
      if (checkAuth()) {
        try {
          const profile = await getCurrentUserProfile();
          setUser({
            id: profile.id,
            userName: profile.userName,
            email: profile.email,
            displayName: profile.displayName,
            role: profile.role,
          });
          setIsAuthenticated(true);
        } catch {
          // Token expired or server unreachable, fallback to stored user if any
          const stored = getStoredUser();
          if (stored) {
            setUser(stored);
            setIsAuthenticated(true);
          } else {
            setIsAuthenticated(false);
          }
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    }

    initAuth();

    const handleUnauthorized = () => {
      setUser(null);
      setIsAuthenticated(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (request: LoginRequest) => {
    const response = await apiLogin(request);
    setUser(response.user);
    setIsAuthenticated(true);
  };

  const register = async (request: RegisterRequest) => {
    const response = await apiRegister(request);
    setUser(response.user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshProfile = async () => {
    if (!checkAuth()) return;
    try {
      const profile = await getCurrentUserProfile();
      setUser({
        id: profile.id,
        userName: profile.userName,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
      });
    } catch {
      // Ignored
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        register,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
