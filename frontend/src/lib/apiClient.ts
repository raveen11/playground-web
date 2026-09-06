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
}

export interface CreateUserRequest {
  name: string;
  email: string;
  password?: string;
  sendInvite?: boolean;
}

export interface AcceptInviteRequest {
  name?: string;
  password?: string;
}

export interface CompanyUser {
  id: string;
  name: string;
  email: string;
  role: string;
  status: string;
  companyId?: string | null;
}

export interface BoardData {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  createdAt?: string;
  updatedAt?: string;
  columns?: ColumnData[];
  _count?: {
    columns: number;
    tickets: number;
  };
}

export interface ColumnData {
  id: string;
  boardId: string;
  name: string;
  position: number;
  createdAt?: string;
  updatedAt?: string;
  tickets?: TicketData[];
}

export interface TicketData {
  id: string;
  boardId: string;
  columnId: string;
  assigneeId?: string | null;
  title: string;
  description?: string | null;
  position: number;
  priority?: string | null;
  status?: string | null;
  createdAt?: string;
  updatedAt?: string;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface ChatMessageData {
  id: string;
  companyId: string;
  boardId?: string | null;
  userId: string;
  name: string;
  text: string;
  sentAt: string;
  createdAt?: string;
  sender?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface SocialMediaData {
  id: string;
  companyId: string;
  platform: string;
  username?: string | null;
  profileUrl?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

async function fetchApi<T>(
  endpoint: string,
  options: FetchOptions = {},
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
      errorMsg = errorData.error || errorData.message || errorMsg;
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
      fetchApi<{ user: CompanyUser }>("/auth/me", {
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
    listUsers: () =>
      fetchApi<CompanyUser[]>("/company/users", {
        method: "GET",
      }),

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

  boards: {
    list: () =>
      fetchApi<BoardData[]>("/boards", {
        method: "GET",
      }),

    get: (boardId: string) =>
      fetchApi<BoardData>(`/boards/${boardId}`, {
        method: "GET",
      }),

    create: (data: { name: string; description?: string }) =>
      fetchApi<BoardData>("/boards", {
        method: "POST",
        data,
      }),

    update: (boardId: string, data: { name?: string; description?: string | null }) =>
      fetchApi<BoardData>(`/boards/${boardId}`, {
        method: "PATCH",
        data,
      }),

    delete: (boardId: string) =>
      fetchApi<{ message: string }>(`/boards/${boardId}`, {
        method: "DELETE",
      }),

    createColumn: (boardId: string, data: { name: string; position?: number }) =>
      fetchApi<ColumnData>(`/boards/${boardId}/columns`, {
        method: "POST",
        data,
      }),
  },

  columns: {
    update: (columnId: string, data: { name?: string; position?: number }) =>
      fetchApi<ColumnData>(`/columns/${columnId}`, {
        method: "PATCH",
        data,
      }),

    delete: (columnId: string) =>
      fetchApi<{ message: string; id: string }>(`/columns/${columnId}`, {
        method: "DELETE",
      }),
  },

  tickets: {
    list: (boardId: string) =>
      fetchApi<TicketData[]>(`/tickets/board/${boardId}`, {
        method: "GET",
      }),

    get: (ticketId: string) =>
      fetchApi<TicketData>(`/tickets/${ticketId}`, {
        method: "GET",
      }),

    create: (data: {
      boardId: string;
      columnId: string;
      title: string;
      description?: string | null;
      priority?: string | null;
      status?: string | null;
      assigneeId?: string | null;
      position?: number;
    }) =>
      fetchApi<TicketData>("/tickets", {
        method: "POST",
        data,
      }),

    update: (
      ticketId: string,
      data: {
        title?: string;
        description?: string | null;
        priority?: string | null;
        status?: string | null;
        assigneeId?: string | null;
      },
    ) =>
      fetchApi<TicketData>(`/tickets/${ticketId}`, {
        method: "PATCH",
        data,
      }),

    move: (
      ticketId: string,
      data: {
        toColumnId: string;
        position: number;
      },
    ) =>
      fetchApi<TicketData>(`/tickets/${ticketId}/move`, {
        method: "POST",
        data,
      }),

    delete: (ticketId: string) =>
      fetchApi<{ message: string; id: string }>(`/tickets/${ticketId}`, {
        method: "DELETE",
      }),
  },

  chat: {
    listMessages: (boardId?: string) =>
      fetchApi<ChatMessageData[]>(
        `/chat/messages${boardId ? `?boardId=${encodeURIComponent(boardId)}` : ""}`,
        {
          method: "GET",
        },
      ),

    sendMessage: (data: { content: string; boardId?: string }) =>
      fetchApi<ChatMessageData>("/chat/messages", {
        method: "POST",
        data,
      }),

    deleteMessage: (messageId: string) =>
      fetchApi<{ message: string; id: string }>(`/chat/messages/${messageId}`, {
        method: "DELETE",
      }),
  },

  socialMedia: {
    list: () =>
      fetchApi<SocialMediaData[]>("/social-media", {
        method: "GET",
      }),

    create: (data: {
      platform: string;
      username?: string | null;
      profileUrl?: string | null;
      accessToken?: string | null;
    }) =>
      fetchApi<SocialMediaData>("/social-media", {
        method: "POST",
        data,
      }),

    update: (
      id: string,
      data: {
        platform?: string;
        username?: string | null;
        profileUrl?: string | null;
        accessToken?: string | null;
      },
    ) =>
      fetchApi<SocialMediaData>(`/social-media/${id}`, {
        method: "PATCH",
        data,
      }),

    delete: (id: string) =>
      fetchApi<{ message: string; id: string }>(`/social-media/${id}`, {
        method: "DELETE",
      }),
  },
};