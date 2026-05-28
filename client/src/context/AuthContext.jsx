// src/context/AuthContext.jsx
import { createContext, useState, useContext, useEffect } from 'react';
import Axios from 'axios';

const AuthContext = createContext(undefined);

/** Valor por defecto cuando no hay Provider (la app usa `user` en App.js + localStorage). */
function authDesdeLocalStorage() {
  try {
    const raw = localStorage.getItem('user');
    const user = raw ? JSON.parse(raw) : null;
    return {
      user,
      login: async () => ({ success: false, message: 'Usar pantalla de login' }),
      logout: () => {},
      isAuthenticated: !!user,
    };
  } catch {
    return { user: null, login: async () => ({ success: false }), logout: () => {}, isAuthenticated: false };
  }
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx !== undefined && ctx !== null) {
    return ctx;
  }
  return authDesdeLocalStorage();
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configurar axios para incluir el token en cada petición
  useEffect(() => {
    if (token) {
      Axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete Axios.defaults.headers.common['Authorization'];
    }
    setLoading(false);
  }, [token]);

  const login = async (email, password) => {
    try {
      const response = await Axios.post('/login', { email, password });
      const { token, usuario } = response.data;
      
      localStorage.setItem('token', token);
      setToken(token);
      setUser(usuario);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Error al conectar' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    delete Axios.defaults.headers.common['Authorization'];
  };

  const value = {
    user,
    login,
    logout,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};