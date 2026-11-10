import { createContext, useCallback, useEffect, useMemo, useState } from 'react';
import * as authService from '../services/authService.js';
import { setUnauthorizedHandler, tokenStore } from '../services/apiClient.js';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // 'loading' only while we check a saved token when the page first opens.
  const [status, setStatus] = useState(() => (tokenStore.get() ? 'loading' : 'ready'));
  const [notice, setNotice] = useState('');

  const clearSession = useCallback((message = '') => {
    tokenStore.clear();
    setUser(null);
    setNotice(message);
  }, []);

  // If any request later reports an invalid token or a suspended account, sign out.
  useEffect(() => {
    setUnauthorizedHandler((error) => clearSession(error.message));
    return () => setUnauthorizedHandler(null);
  }, [clearSession]);

  // Authentication persistence: restore the session from the saved token.
  useEffect(() => {
    if (!tokenStore.get()) return undefined;
    let cancelled = false;

    authService
      .fetchCurrentUser()
      .then((data) => {
        if (!cancelled) setUser(data.user);
      })
      .catch((error) => {
        if (cancelled) return;
        if (error.status === 401 || error.status === 403) clearSession(error.message);
        else setNotice(error.message);
      })
      .finally(() => {
        if (!cancelled) setStatus('ready');
      });

    return () => {
      cancelled = true;
    };
  }, [clearSession]);

  const startSession = useCallback((data) => {
    tokenStore.set(data.token);
    setUser(data.user);
    setNotice('');
    return data.user;
  }, []);

  const login = useCallback(async (values) => startSession(await authService.login(values)), [startSession]);
  const register = useCallback(async (values) => startSession(await authService.register(values)), [startSession]);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } catch {
      /* the server call is informational; we sign out locally either way */
    }
    clearSession();
  }, [clearSession]);

  const value = useMemo(
    () => ({ user, status, notice, login, register, logout, updateUser: setUser }),
    [user, status, notice, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
