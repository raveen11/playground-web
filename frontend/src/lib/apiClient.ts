import { API_BASE_URL } from "./config";

interface FetchOptions extends RequestInit {
  data?: unknown;
  token?: string;
}

interface ApiErrorResponse {
  error?: string;
  message?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface SignupRequest {
  name: string;
  email: string;
  password: string;
}

export interface CreateCompanyRequest {
  name: string;
  // Add your actual company fields here
}

export interface CreateUserRequest {
  name: string;
  email: string;
  // Add your actual user fields here
}

export interface AcceptInviteRequest {
  // Add the actual fields from your invite form
  name?: string;
  password?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<T> {
  const { data, token, headers, ...rest } = options;

  const config: RequestInit = {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    credentials: "include",
  };

  if (data !== undefined) {
    config.body = JSON.stringify(data);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

  if (!response.ok) {
    let errorMsg = response.statusText;

    try {
      const errorData: ApiErrorResponse = await response.json();

      errorMsg =
        errorData.error ||
        errorData.message ||
        errorMsg;
    } catch {
      // Ignore JSON parse error for error responses
    }

    throw new Error(errorMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  auth: {
    login: (data: LoginRequest) =>
      fetchApi("/auth/login", {
        method: "POST",
        data,
      }),

    signup: (data: SignupRequest) =>
      fetchApi("/signup", {
        method: "POST",
        data,
      }),

    logout: () =>
      fetchApi("/auth/logout", {
        method: "POST",
      }),

    me: (token?: string) =>
      fetchApi("/auth/me", {
        method: "GET",
        token,
      }),
  },

  admin: {
    createCompany: (data: CreateCompanyRequest) =>
      fetchApi("/admin/companies", {
        method: "POST",
        data,
      }),
  },

  company: {
    createUser: (data: CreateUserRequest) =>
      fetchApi("/company/users", {
        method: "POST",
        data,
      }),
  },

  invites: {
    accept: (token: string, data: AcceptInviteRequest) =>
      fetchApi(`/invites/${token}/accept`, {
        method: "POST",
        data,
      }),
  },
};