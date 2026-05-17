import React, { createContext, useState } from 'react';
import { login as loginApi, register as registerApi } from '../api/api';

export type UserProfile = {
  id: number;
  username: string;
  email: string;
};

export const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: any) => {
  const [user, setUser] = useState<UserProfile | null>(null);

  const login = async (email: string, password: string) => {
    const result = await loginApi(email, password);
    const profile: UserProfile = {
      id: result.userId,
      username: result.username,
      email: result.email,
    };
    setUser(profile);
    return profile;
  };

  const register = async (username: string, email: string, password: string) => {
    const result = await registerApi(username, email, password);
    const profile: UserProfile = {
      id: result.userId,
      username: result.username,
      email: result.email,
    };
    setUser(profile);
    return profile;
  };

  const logout = () => setUser(null);

  return (
    <AuthContext.Provider value={{ user, login, register, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  );
};