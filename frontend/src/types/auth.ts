import type { User } from './user';

export interface AuthTokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse extends Partial<AuthTokens> {
  user?: User;
  [key: string]: unknown;
}

export interface LoginCredentials {
  login?: string;
  email?: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}