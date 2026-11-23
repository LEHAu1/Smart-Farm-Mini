import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import {
  getStoredUser,
  isAuthenticated as checkAuth,
  login as apiLogin,
  loginWithGoogle as apiGoogleLogin,
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
  loginWithGoogle: (idToken: string) => Promise<void>;
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
    const handleUnauthorized = () => {
      setUser(null);
      setIsAuthenticated(false);
      setIsLoading(false);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);

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
            authProvider: profile.authProvider,
            avatarUrl: profile.avatarUrl,
          });
          setIsAuthenticated(true);
        } catch {
          // A cached profile is not proof that the server still accepts this session.
          setUser(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    }

    initAuth();

    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (request: LoginRequest) => {
    const result = await apiLogin(request);
    setUser(result.user);
    setIsAuthenticated(true);
  };

  const loginWithGoogle = async (idToken: string) => {
    const result = await apiGoogleLogin({ idToken });
    setUser(result.user);
    setIsAuthenticated(true);
  };

  const register = async (request: RegisterRequest) => {
    const result = await apiRegister(request);
    setUser(result.user);
    setIsAuthenticated(true);
  };

  const logout = async () => {
    await apiLogout();
    setUser(null);
    setIsAuthenticated(false);
  };

  const refreshProfile = async () => {
    try {
      const profile = await getCurrentUserProfile();
      setUser({
        id: profile.id,
        userName: profile.userName,
        email: profile.email,
        displayName: profile.displayName,
        role: profile.role,
        authProvider: profile.authProvider,
        avatarUrl: profile.avatarUrl,
      });
    } catch {
      // Ignored if unauthenticated
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        isLoading,
        login,
        loginWithGoogle,
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
