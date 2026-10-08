import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL, // DO NOT add /api here
  timeout: 12000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token automatically
api.interceptors.request.use((config) => {
  try {
    const s = localStorage.getItem("ko-auth");
    if (s) {
      const token = JSON.parse(s)?.state?.token;
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (err) {}

  return config;
});

// Auto refresh token when 401 happens
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      try {
        const s = localStorage.getItem("ko-auth");

        if (!s) return Promise.reject(error);

        const parsed = JSON.parse(s);
        const refreshToken = parsed?.state?.refreshToken;

        if (refreshToken) {
          const res = await api.post("/auth/refresh", {
            refreshToken,
          });

          const newToken = res.data.data.token;

          parsed.state.token = newToken;
          localStorage.setItem("ko-auth", JSON.stringify(parsed));

          error.config.headers.Authorization = `Bearer ${newToken}`;

          return api(error.config);
        }
      } catch (e) {
        console.error("Token refresh failed");
      }
    }

    return Promise.reject(error);
  }
);

export default api;
