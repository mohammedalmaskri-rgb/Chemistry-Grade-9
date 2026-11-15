import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { User } from '../types';
import { repo } from '../data';

interface AuthState {
  user: User | null;
  loading: boolean;
  signIn: (employeeNo: string) => Promise<User>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    repo.getCurrentUser().then((u) => { setUser(u); setLoading(false); });
  }, []);

  const signIn = async (employeeNo: string) => {
    const u = await repo.demoSignIn(employeeNo);
    setUser(u);
    return u;
  };
  const signOut = async () => { await repo.signOut(); setUser(null); };

  return <AuthContext.Provider value={{ user, loading, signIn, signOut }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
