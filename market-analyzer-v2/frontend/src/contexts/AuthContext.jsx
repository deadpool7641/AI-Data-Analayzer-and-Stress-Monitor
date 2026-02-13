// src/contexts/AuthContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
} from "react";
import axios from "axios";

const AuthContext = createContext(null);

// Resolve backend base URL (Vite env or default localhost:5000)
const getApiBaseUrl = () => {
  try {
    if (
      typeof import.meta !== "undefined" &&
      import.meta.env &&
      import.meta.env.VITE_API_BASE_URL
    ) {
      return import.meta.env.VITE_API_BASE_URL;
    }
  } catch (e) {
    // ignore
  }
  return "http://localhost:5000";
};

const API_BASE_URL = getApiBaseUrl();

export function AuthProvider({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null); // user object from backend
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(true);

  // Always keep axios default Authorization in sync with accessToken
  useEffect(() => {
    if (accessToken) {
      axios.defaults.headers.common["Authorization"] = `Bearer ${accessToken}`;
    } else {
      delete axios.defaults.headers.common["Authorization"];
    }
  }, [accessToken]);

  // Restore session from localStorage and optionally refresh from /api/auth/me
  useEffect(() => {
    const restoreSession = async () => {
      setLoading(true);
      try {
        const storedToken = localStorage.getItem("accessToken");
        const storedUserStr = localStorage.getItem("user");

        if (!storedToken) {
          setLoading(false);
          return;
        }

        setAccessToken(storedToken);
        setIsAuthenticated(true);

        if (storedUserStr) {
          try {
            setUser(JSON.parse(storedUserStr));
          } catch {
            // bad JSON, drop it
            localStorage.removeItem("user");
          }
        }

        // Try to get a fresh user object from backend
        try {
          const res = await axios.get(`${API_BASE_URL}/api/auth/me`, {
            headers: {
              Authorization: `Bearer ${storedToken}`,
            },
          });
          const freshUser = res.data?.user || res.data;
          if (freshUser) {
            setUser(freshUser);
            localStorage.setItem("user", JSON.stringify(freshUser));
          }
        } catch (e) {
          console.warn(
            "Could not refresh user from /api/auth/me:",
            e?.response?.status || e?.message
          );
          // keep local user; do not logout on transient errors
        }
      } catch (err) {
        console.error("Session restore error:", err);
        localStorage.removeItem("accessToken");
        localStorage.removeItem("user");
        setAccessToken(null);
        setIsAuthenticated(false);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  // LOGIN: POST /api/auth/login → { access_token, user }
  const login = async (email, password) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/login`, {
        email,
        password,
      });

      const userData = res.data.user;
      const token = res.data.access_token || res.data.token;

      if (!token) {
        throw new Error("Login response missing access_token");
      }

      // Persist
      localStorage.setItem("accessToken", token);
      localStorage.setItem("user", JSON.stringify(userData || {}));

      setAccessToken(token);
      setIsAuthenticated(true);
      setUser(userData || null);

      axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;

      return { status: "SUCCESS", user: userData };
    } catch (error) {
      console.error("Login failed:", error);
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Login failed";
      throw new Error(msg);
    }
  };

  // REGISTER: POST /api/auth/register; optionally auto‑login if token returned
  const register = async (name, email, password) => {
    try {
      const res = await axios.post(`${API_BASE_URL}/api/auth/register`, {
        name,
        email,
        password,
      });

      const userData = res.data.user;
      const token = res.data.access_token || res.data.token;

      if (userData && token) {
        localStorage.setItem("accessToken", token);
        localStorage.setItem("user", JSON.stringify(userData));
        setAccessToken(token);
        setIsAuthenticated(true);
        setUser(userData);
        axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
      }

      return res.data;
    } catch (error) {
      console.error("Registration failed:", error);
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Registration failed";
      throw new Error(msg);
    }
  };

  // LOGOUT: clear everything
  const logout = () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("user");
    delete axios.defaults.headers.common["Authorization"];
    setAccessToken(null);
    setIsAuthenticated(false);
    setUser(null);
  };

  // PROFILE UPDATE: PUT /api/users/me with JSON body
  const updateUserProfile = async (newData) => {
    if (!accessToken) throw new Error("Not authenticated");

    try {
      const res = await axios.put(`${API_BASE_URL}/api/users/me`, newData, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      });

      const updatedUser = res.data?.user || res.data;
      if (!updatedUser) {
        throw new Error("Invalid update response from server");
      }

      setUser(updatedUser);
      localStorage.setItem("user", JSON.stringify(updatedUser));
      return updatedUser;
    } catch (error) {
      console.error("Profile update failed:", error);
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Profile update failed";
      throw new Error(msg);
    }
  };

  const checkEmail = async (_email) => {
    // Wire this to a /api/auth/check-email endpoint if you add one
    return true;
  };

  const authContextValue = useMemo(
    () => ({
      isAuthenticated,
      user,
      loading,
      accessToken,
      login,
      register,
      logout,
      updateUserProfile,
      updateSecuritySettings: updateUserProfile,
      checkEmail,
    }),
    [isAuthenticated, user, loading, accessToken]
  );

  return (
    <AuthContext.Provider value={authContextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export default AuthContext;