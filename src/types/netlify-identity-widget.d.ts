declare module 'netlify-identity-widget' {
  export interface User {
    id: string;
    email?: string;
    user_metadata?: {
      full_name?: string;
      avatar_url?: string;
      [key: string]: unknown;
    };
    app_metadata?: {
      roles?: string[];
      provider?: string;
      [key: string]: unknown;
    };
    token?: {
      access_token: string;
      expires_at: number;
      expires_in: number;
      refresh_token: string;
      token_type: string;
    };
    created_at: string;
    confirmed_at?: string;
    confirmation_sent_at?: string;
    updated_at?: string;
  }

  export interface InitOptions {
    container?: string;
    locale?: string;
    APIUrl?: string;
    logo?: boolean;
    namePlaceholder?: string;
  }

  export function init(options?: InitOptions): void;
  export function open(tabName?: 'login' | 'signup'): void;
  export function close(): void;
  export function logout(): void;
  export function currentUser(): User | null;
  export function refresh(): Promise<string>;
  export function on(event: 'init' | 'login' | 'logout' | 'error' | 'open' | 'close', callback: (user?: User) => void): void;
  export function off(event: 'init' | 'login' | 'logout' | 'error' | 'open' | 'close'): void;
}
