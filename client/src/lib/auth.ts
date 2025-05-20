import { apiRequest } from "./queryClient";

// Types for authentication
export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  status: 'unverified' | 'pending_approval' | 'active' | 'suspended' | 'deactivated';
  avatarUrl: string | null;
  createdAt?: Date;
  lastLoginAt?: Date;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface RegisterData {
  username: string;
  password: string;
  firstName: string;
  lastName: string;
  email: string;
  role?: string;
}

// Auth response interface
export interface AuthResponse {
  user: User;
  message?: string;
  pendingVerification?: boolean;
  pendingApproval?: boolean;
  accountLocked?: boolean;
}

// Login user
export async function login(credentials: LoginCredentials): Promise<AuthResponse> {
  const res = await apiRequest("POST", "/api/auth/login", credentials);
  const data = await res.json();
  return data; // Return the full response with user and any status messages
}

// Register new user
export async function register(data: RegisterData): Promise<AuthResponse> {
  const res = await apiRequest("POST", "/api/auth/register", data);
  const responseData = await res.json();
  return {
    user: responseData,
    pendingVerification: true
  };
}

// Resend verification email
export async function resendVerification(email: string): Promise<{ message: string }> {
  const res = await apiRequest("POST", "/api/auth/resend-verification", { email });
  return res.json();
}

// Logout user
export async function logout(): Promise<void> {
  await apiRequest("POST", "/api/auth/logout");
}

// Get current user
export async function getCurrentUser(): Promise<User | null> {
  try {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
    });
    
    if (!res.ok) {
      if (res.status === 401) {
        return null;
      }
      throw new Error(`Error fetching current user: ${res.statusText}`);
    }
    
    return res.json();
  } catch (error) {
    console.error("Error fetching current user:", error);
    return null;
  }
}

// Get user initials for avatar
export function getUserInitials(user?: User | null): string {
  if (!user) return "";
  return `${user.firstName.charAt(0)}${user.lastName.charAt(0)}`;
}

// Is the user authenticated and has specific role
export function hasRole(user: User | null, roles: string[]): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
