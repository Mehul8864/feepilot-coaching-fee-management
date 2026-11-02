/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * FeePilot Authentication & Role-Based Access Control Context
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase/config';
import { UserProfile, UserRole, LanguageCode } from '../types/domain';
import { fetchUserProfile, logoutUser } from '../services/authService';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  role: UserRole | null;
  loading: boolean;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  setUserProfileExplicit: (profile: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [language, setLanguage] = useState<LanguageCode>('en');

  const refreshProfile = async () => {
    if (auth.currentUser) {
      const profile = await fetchUserProfile(auth.currentUser.uid);
      if (profile) {
        setUserProfile(profile);
      } else {
        // Fallback parent profile for authenticated phone users without firestore doc yet
        if (auth.currentUser.phoneNumber) {
          setUserProfile({
            id: auth.currentUser.uid,
            role: 'PARENT',
            phone: auth.currentUser.phoneNumber,
            linkedStudentIds: [],
            authorizedCentreIds: []
          });
        }
      }
    } else {
      setUserProfile(null);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const profile = await fetchUserProfile(user.uid);
          if (profile) {
            setUserProfile(profile);
          } else if (user.phoneNumber) {
            // New or unlinked parent fallback
            setUserProfile({
              id: user.uid,
              role: 'PARENT',
              phone: user.phoneNumber,
              linkedStudentIds: [],
              authorizedCentreIds: []
            });
          } else {
            setUserProfile(null);
          }
        } catch (err) {
          console.error('Error synchronizing auth profile:', err);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logoutUser();
      setCurrentUser(null);
      setUserProfile(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        role: userProfile?.role || null,
        loading,
        language,
        setLanguage,
        logout: handleLogout,
        refreshProfile,
        setUserProfileExplicit: setUserProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
