/**
 * Authentication Service
 * Handles session management and authentication operations
 */

import { BaseService } from './BaseService';
import { AuthenticationError, ValidationError } from './errors';
import { User, Session } from '@supabase/supabase-js';

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignupData {
  email: string;
  password: string;
  fullName: string;
}

export interface AuthSession {
  user: User;
  session: Session;
}

export class AuthService extends BaseService {
  constructor() {
    super('AuthService');
  }

  /**
   * Sign up a new user
   */
  async signup(data: SignupData): Promise<AuthSession> {
    this.validateRequired(data, ['email', 'password', 'fullName']);

    if (data.password.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    this.log('info', 'User signup', { email: data.email });

    return this.executeRequest(
      async () => {
        const { data: authData, error } = await this.supabase.auth.signUp({
          email: data.email,
          password: data.password,
          options: {
            data: {
              full_name: data.fullName,
            },
          },
        });

        if (error) throw new AuthenticationError(error.message);
        if (!authData.user || !authData.session) {
          throw new AuthenticationError('Signup failed');
        }

        return {
          user: authData.user,
          session: authData.session,
        };
      },
      { skipCache: true }
    );
  }

  /**
   * Sign in with email and password
   */
  async login(credentials: LoginCredentials): Promise<AuthSession> {
    this.validateRequired(credentials, ['email', 'password']);

    this.log('info', 'User login', { email: credentials.email });

    return this.executeRequest(
      async () => {
        const { data, error } = await this.supabase.auth.signInWithPassword({
          email: credentials.email,
          password: credentials.password,
        });

        if (error) throw new AuthenticationError(error.message);
        if (!data.user || !data.session) {
          throw new AuthenticationError('Invalid credentials');
        }

        return {
          user: data.user,
          session: data.session,
        };
      },
      { skipCache: true }
    );
  }

  /**
   * Sign out current user
   */
  async logout(): Promise<void> {
    this.log('info', 'User logout');

    return this.executeRequest(
      async () => {
        const { error } = await this.supabase.auth.signOut();
        if (error) throw new AuthenticationError(error.message);

        this.clearCache();
      },
      { skipCache: true }
    );
  }

  /**
   * Get current session
   */
  async getSession(): Promise<Session | null> {
    return this.executeRequest(
      async () => {
        const { data, error } = await this.supabase.auth.getSession();
        if (error) throw new AuthenticationError(error.message);
        return data.session;
      },
      { deduplicationKey: 'current-session' }
    );
  }

  /**
   * Get current user
   */
  async getCurrentUser(): Promise<User | null> {
    return this.executeRequest(
      async () => {
        const { data, error } = await this.supabase.auth.getUser();
        if (error) throw new AuthenticationError(error.message);
        return data.user;
      },
      { deduplicationKey: 'current-user' }
    );
  }

  /**
   * Refresh session
   */
  async refreshSession(): Promise<AuthSession> {
    this.log('info', 'Refreshing session');

    return this.executeRequest(
      async () => {
        const { data, error } = await this.supabase.auth.refreshSession();
        if (error) throw new AuthenticationError(error.message);
        if (!data.user || !data.session) {
          throw new AuthenticationError('Session refresh failed');
        }

        this.clearCache('current-session');
        this.clearCache('current-user');

        return {
          user: data.user,
          session: data.session,
        };
      },
      { skipCache: true }
    );
  }

  /**
   * Request password reset
   */
  async requestPasswordReset(email: string): Promise<void> {
    this.log('info', 'Password reset requested', { email });

    return this.executeRequest(
      async () => {
        const { error } = await this.supabase.auth.resetPasswordForEmail(email);
        if (error) throw new AuthenticationError(error.message);
      },
      { skipCache: true }
    );
  }

  /**
   * Update password
   */
  async updatePassword(newPassword: string): Promise<void> {
    if (newPassword.length < 8) {
      throw new ValidationError('Password must be at least 8 characters');
    }

    this.log('info', 'Updating password');

    return this.executeRequest(
      async () => {
        const { error } = await this.supabase.auth.updateUser({
          password: newPassword,
        });
        if (error) throw new AuthenticationError(error.message);
      },
      { skipCache: true }
    );
  }

  /**
   * Verify if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const session = await this.getSession();
    return session !== null;
  }
}

export const authService = new AuthService();
