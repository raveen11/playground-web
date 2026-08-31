import { API_BASE_URL } from "./config";

interface FetchOptions extends RequestInit {
  data?: any;
}

async function fetchApi<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { data, headers, ...rest } = options;
  const config: RequestInit = {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  // Needed for cookies (refresh token, etc.)
  config.credentials = "include";

  if (data) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    let errorMsg = response.statusText;
    try {
      const errorData = await response.json();
      errorMsg = errorData.error || errorData.message || errorMsg;
    } catch (e) {
      // Ignore JSON parse error for error responses
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export const api = {
  auth: {
    login: (data: any) => fetchApi("/auth/login", { method: "POST", data }),
    signup: (data: any) => fetchApi("/signup", { method: "POST", data }),
    logout: () => fetchApi("/auth/logout", { method: "POST" }),
    me: () => fetchApi("/auth/me", { method: "GET" }),
  },
  admin: {
    createCompany: (data: any) => fetchApi("/admin/companies", { method: "POST", data }),
  },
  company: {
    createUser: (data: any) => fetchApi("/company/users", { method: "POST", data }),
  },
  invites: {
    accept: (token: string, data: any) =>
      fetchApi(`/invites/${token}/accept`, { method: "POST", data }),
  },
};
