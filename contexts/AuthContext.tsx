'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase/config';
import { AppUser } from '@/lib/types';
import { getUser, createUser } from '@/lib/firebase/firestore';

interface AuthContextValue {
  firebaseUser: FirebaseUser | null;
  user: AppUser | null;
  loading: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        try {
          let userData = await getUser(fbUser.uid);
          if (!userData) {
            const newUser: Omit<AppUser, 'id'> = {
              name:  fbUser.email?.split('@')[0] ?? 'ユーザー',
              email: fbUser.email ?? '',
              role:  'user',
            };
            await createUser(fbUser.uid, newUser);
            userData = { id: fbUser.uid, ...newUser };
          }
          setUser(userData);
        } catch (err) {
          console.error('Failed to load user profile:', err);
          // Still set a minimal user so the app doesn't get stuck
          setUser({
            id:    fbUser.uid,
            name:  fbUser.email?.split('@')[0] ?? 'ユーザー',
            email: fbUser.email ?? '',
            role:  'user',
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signInWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, signInWithEmail, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
