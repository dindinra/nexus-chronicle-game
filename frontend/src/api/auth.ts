// auth.ts — Auth API (Fase 6.5): register, login (JWT), getMe.
import { postJson, fetchJson, getToken, setToken, clearToken } from './client';

export interface UserOut {
  id: number;
  username: string;
  email: string | null;
}

export interface AuthToken {
  access_token: string;
  token_type: string;
}

export interface Credentials {
  username: string;
  password: string;
}

export interface RegisterInput extends Credentials {
  email?: string;
}

export function login(input: Credentials): Promise<AuthToken> {
  return postJson<AuthToken>('/auth/login', input);
}

export function register(input: RegisterInput): Promise<UserOut> {
  return postJson<UserOut>('/auth/register', input);
}

export function getMe(): Promise<UserOut> {
  return fetchJson<UserOut>('/auth/me');
}

export { getToken, setToken, clearToken };
