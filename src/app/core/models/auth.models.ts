export type PortalRole = 'Admin' | 'Employee';

export interface User {
  id: number | string;
  fullName: string;
  email: string;
  role: string;
  employeeId?: number | null;
  photoUrl?: string | null;
}

export interface LoginRequest {
  email: string;
  password: string;
  loginAs?: PortalRole;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  token: string;
  expiry: string;
  user: User;
}
