import { createContext, useContext, useEffect, useState } from "react";
import { authApi } from "../services/api";

const AuthContext = createContext(null);

function normalizeUser(user) {
  if (!user) return null;
  return {
    ...user,
    name: user.name ?? user.full_name,
    full_name: user.full_name ?? user.name,
    userType: user.userType ?? user.user_type ?? user.role,
    user_type: user.user_type ?? user.userType ?? user.role,
    employeeId: user.employeeId ?? user.employee_id,
    employee_id: user.employee_id ?? user.employeeId,
    joiningDate: user.joiningDate ?? user.joining_date,
    joining_date: user.joining_date ?? user.joiningDate,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    authApi.me()
      .then((res) => setUser(normalizeUser(res.data.user ?? res.data)))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (identifier, password, role) => {
    const res = await authApi.login({ identifier, password, role });
    const nextUser = normalizeUser(res.data.user ?? res.data);
    setUser(nextUser);
    return nextUser;
  };

  const socialLogin = async (provider, role) => {
    const res = await authApi.socialLogin({ provider, role });
    const nextUser = normalizeUser(res.data.user ?? res.data);
    setUser(nextUser);
    return nextUser;
  };

  const logout = async () => {
    await authApi.logout().catch(() => {});
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, login, socialLogin, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
