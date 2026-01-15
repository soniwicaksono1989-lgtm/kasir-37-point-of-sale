import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import netlifyIdentity, { User } from 'netlify-identity-widget';

export type AppRole = 'admin' | 'kasir';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: AppRole;
}

interface AuthContextType {
  isAuthenticated: boolean;
  user: AuthUser | null;
  loading: boolean;
  signIn: () => void;
  signOut: () => void;
  hasRole: (role: AppRole) => boolean;
  isAdmin: boolean;
  isKasir: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Extract role from Netlify Identity user metadata
const extractRole = (netlifyUser: User | null): AppRole => {
  if (!netlifyUser) return 'kasir';
  
  // Check app_metadata.roles array (set via Netlify Identity admin or functions)
  const roles = netlifyUser.app_metadata?.roles as string[] | undefined;
  
  if (roles && Array.isArray(roles)) {
    if (roles.includes('admin')) return 'admin';
    if (roles.includes('kasir')) return 'kasir';
  }
  
  // Default to kasir if no role specified
  return 'kasir';
};

const mapNetlifyUser = (netlifyUser: User | null): AuthUser | null => {
  if (!netlifyUser) return null;
  
  return {
    id: netlifyUser.id,
    email: netlifyUser.email || '',
    name: netlifyUser.user_metadata?.full_name || netlifyUser.email || 'User',
    role: extractRole(netlifyUser),
  };
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initialize Netlify Identity
    netlifyIdentity.init({
      container: '#netlify-modal',
      locale: 'en',
    });

    // Handle recovery and invitation tokens from URL hash
    // The widget auto-detects tokens, we just need to open it
    const hash = window.location.hash;
    if (hash) {
      if (hash.includes('recovery_token') || 
          hash.includes('invite_token') || 
          hash.includes('confirmation_token')) {
        // Open widget - it will automatically detect the token type and show appropriate form
        netlifyIdentity.open();
      }
    }

    // Check for existing user on mount
    const currentUser = netlifyIdentity.currentUser();
    if (currentUser) {
      setUser(mapNetlifyUser(currentUser));
    }
    setLoading(false);

    // Listen for login events
    netlifyIdentity.on('login', (netlifyUser) => {
      setUser(mapNetlifyUser(netlifyUser));
      netlifyIdentity.close();
    });

    // Listen for logout events
    netlifyIdentity.on('logout', () => {
      setUser(null);
    });

    // Listen for init events
    netlifyIdentity.on('init', (netlifyUser) => {
      if (netlifyUser) {
        setUser(mapNetlifyUser(netlifyUser));
      }
      setLoading(false);
    });

    return () => {
      netlifyIdentity.off('login');
      netlifyIdentity.off('logout');
      netlifyIdentity.off('init');
    };
  }, []);

  const signIn = () => {
    netlifyIdentity.open('login');
  };

  const signOut = () => {
    netlifyIdentity.logout();
  };

  const hasRole = (role: AppRole): boolean => {
    return user?.role === role;
  };

  const isAdmin = user?.role === 'admin';
  const isKasir = user?.role === 'kasir';

  return (
    <AuthContext.Provider value={{ 
      isAuthenticated: !!user, 
      user, 
      loading, 
      signIn, 
      signOut,
      hasRole,
      isAdmin,
      isKasir,
    }}>
      {children}
      <div id="netlify-modal" />
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
