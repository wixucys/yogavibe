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
  login: string;
  password: string;
}

export interface RegisterData {
  username: string;
  email: string;
  password: string;
}

export interface AuthCheckResult {
  isAuthenticated: boolean;
  user?: User;
}

export interface AuthSuccessResult {
  success: true;
  user?: User;
  message?: string;
}

export interface AuthErrorResult {
  success: false;
  message: string;
}

export type AuthActionResult = AuthSuccessResult | AuthErrorResult;

export interface UpdateProfileResultSuccess {
  success: true;
  user: User;
}

export interface UpdateProfileResultError {
  success: false;
  message: string;
}

export type UpdateProfileResult =
  | UpdateProfileResultSuccess
  | UpdateProfileResultError;