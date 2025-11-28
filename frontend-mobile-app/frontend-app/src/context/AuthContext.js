import React, { createContext, useContext, useState, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "../utils/api";

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const validateSession = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("token");
        const storedUser = await AsyncStorage.getItem("user");

        if (storedToken && storedUser) {
          try {
            // Validate token by calling /me endpoint
            const userData = await api.getMe();
            // Token is valid, restore session
            setToken(storedToken);
            setUser({
              ...userData,
              role: userData.role || "CITIZEN",
            });
          } catch (error) {
            // Token is invalid or expired, clear storage
            console.warn("Session validation failed:", error);
            await AsyncStorage.removeItem("token");
            await AsyncStorage.removeItem("user");
            setToken(null);
            setUser(null);
          }
        }
      } catch (error) {
        console.error("Error validating session:", error);
        // On web, AsyncStorage might fail, just set loading to false
      } finally {
        setLoading(false);
      }
    };

    validateSession();
  }, []);

  const login = async (userData, authToken) => {
    setUser(userData);
    setToken(authToken);
    await AsyncStorage.setItem("token", authToken);
    await AsyncStorage.setItem("user", JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    setToken(null);
    await AsyncStorage.removeItem("token");
    await AsyncStorage.removeItem("user");
  };

  const isAuthenticated = !!token && !!user;

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, isAuthenticated, loading }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};
