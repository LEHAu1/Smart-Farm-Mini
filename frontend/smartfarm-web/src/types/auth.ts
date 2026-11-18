export interface UserDto {
  id: string;
  userName: string;
  email: string;
  displayName?: string | null;
  role: string;
  authProvider?: string | null;
  avatarUrl?: string | null;
}

export interface AuthResponseDto {
  accessToken: string;
  refreshToken: string;
  expiresAtUtc: string;
  user: UserDto;
}

export interface LoginRequest {
  userNameOrEmail: string;
  password: string;
}

export interface GoogleLoginRequest {
  idToken: string;
}

export interface RegisterRequest {
  userName: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface UserProfileDto {
  id: string;
  userName: string;
  email: string;
  displayName?: string | null;
  phoneNumber?: string | null;
  role: string;
  authProvider?: string | null;
  avatarUrl?: string | null;
  createdAtUtc: string;
}

export interface UpdateProfileRequest {
  displayName?: string;
  phoneNumber?: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export type LoginErrors = Partial<Record<keyof LoginCredentials, string>>;
