import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { contractService } from '@/lib/contract/contractService';
import { supabase } from '@/integrations/supabase/client';

interface User {
  id: string;
  username: string;
  email: string;
  phone: string;
  dob: string;
  walletAddress: string;
  status: 'safe' | 'alert' | 'danger';
  createdAt: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isVerifyingAdmin: boolean;
  adminWalletAddress: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  loginWithWallet: (walletAddress: string) => Promise<boolean>;
  verifyAdminOnChain: (walletAddress: string) => Promise<boolean>;
  adminLogout: () => void;
  logout: () => void;
  register: (userData: Omit<User, 'id' | 'status' | 'createdAt'>, password: string) => Promise<string>;
  updateStatus: (status: 'safe' | 'alert' | 'danger') => void;
  getAllUsers: () => User[];
  getUserLocations: () => { username: string; lat: number; lng: number; status: 'safe' | 'alert' | 'danger' }[];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

const ADMIN_WALLET = '0x548cb269df02005590CF48fb031dD697e52aa201'; // Admin wallet

const generateTouristId = (): string => {
  const prefix = 'TID';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVerifyingAdmin, setIsVerifyingAdmin] = useState(false);
  const [adminWalletAddress, setAdminWalletAddress] = useState<string | null>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser');
    const savedAdminWallet = localStorage.getItem('adminWalletAddress');
    const savedIsAdmin = localStorage.getItem('isAdmin');

    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }

    // Fast path: restore admin status from localStorage without blockchain verification
    if (savedAdminWallet && savedIsAdmin === 'true') {
      setIsAdmin(true);
      setAdminWalletAddress(savedAdminWallet);
    }
  }, []);

  // Admin verification - checks hardcoded admin wallet first, then blockchain if contract is deployed
  const verifyAdminOnChain = useCallback(async (walletAddress: string): Promise<boolean> => {
    try {
      setIsVerifyingAdmin(true);

      // First check if this is the hardcoded admin wallet (case-insensitive comparison)
      const isHardcodedAdmin = walletAddress.toLowerCase() === ADMIN_WALLET.toLowerCase();

      if (isHardcodedAdmin) {
        setIsAdmin(true);
        setAdminWalletAddress(walletAddress);
        localStorage.setItem('adminWalletAddress', walletAddress);
        localStorage.setItem('isAdmin', 'true');
        return true;
      }

      // If not hardcoded admin, try to verify on blockchain (if contract is deployed)
      try {
        await contractService.initialize();
        const isAdminOnChain = await contractService.isAdmin(walletAddress);

        if (isAdminOnChain) {
          setIsAdmin(true);
          setAdminWalletAddress(walletAddress);
          localStorage.setItem('adminWalletAddress', walletAddress);
          localStorage.setItem('isAdmin', 'true');
          return true;
        }
      } catch (contractError) {
        console.warn('Smart contract not available, using hardcoded admin only:', contractError);
      }

      // Not an admin
      setIsAdmin(false);
      setAdminWalletAddress(null);
      localStorage.removeItem('adminWalletAddress');
      localStorage.removeItem('isAdmin');
      return false;
    } catch (error) {
      console.error('Failed to verify admin:', error);
      setIsAdmin(false);
      setAdminWalletAddress(null);
      localStorage.removeItem('adminWalletAddress');
      localStorage.removeItem('isAdmin');
      return false;
    } finally {
      setIsVerifyingAdmin(false);
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      // First check Supabase database
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .maybeSingle();

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (profile) {
        // Found user in Supabase - create user object
        const user: User = {
          id: profile.id,
          username: profile.username,
          email: profile.email || '',
          phone: profile.phone || '',
          dob: profile.dob || '',
          walletAddress: profile.wallet_address || '',
          status: (profile.status as 'safe' | 'alert' | 'danger') || 'safe',
          createdAt: profile.created_at,
        };

        setUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const loginWithWallet = async (walletAddress: string): Promise<boolean> => {
    try {
      // First check Supabase database
      const { supabase } = await import('@/integrations/supabase/client');
      
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('wallet_address', walletAddress)
        .maybeSingle();

      if (error) {
        console.error('Login error:', error);
        return false;
      }

      if (profile) {
        // Found user in Supabase - create user object
        const user: User = {
          id: profile.id,
          touristId: profile.tourist_id,
          username: profile.username,
          email: profile.email || '',
          phone: profile.phone || '',
          dob: profile.dob || '',
          walletAddress: profile.wallet_address || walletAddress,
          status: (profile.status as 'safe' | 'alert' | 'danger') || 'safe',
          createdAt: profile.created_at,
        };

        setUser(user);
        localStorage.setItem('currentUser', JSON.stringify(user));
        return true;
      }

      // Fallback: check localStorage
      const users = JSON.parse(localStorage.getItem('users') || '{}');

      // Find user by wallet address
      const foundUser = Object.values(users).find(
        (u: any) => u.walletAddress?.toLowerCase() === walletAddress.toLowerCase()
      ) as any;

      if (foundUser) {
        const { password: _, ...userWithoutPassword } = foundUser;
        setUser(userWithoutPassword);
        localStorage.setItem('currentUser', JSON.stringify(userWithoutPassword));
        return true;
      }

      return false;
    } catch (error) {
      console.error('Wallet login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    setIsAdmin(false);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAdmin');
  };

  const adminLogout = () => {
    setIsAdmin(false);
    setAdminWalletAddress(null);
    localStorage.removeItem('adminWalletAddress');
    localStorage.removeItem('isAdmin');
  };

  const register = async (
    userData: Omit<User, 'id' | 'touristId' | 'status' | 'createdAt'>,
    password: string
  ): Promise<string> => {
    const touristId = generateTouristId();
    const id = crypto.randomUUID();
    const newUser: User = {
      ...userData,
      id,
      touristId,
      status: 'safe',
      createdAt: new Date().toISOString(),
    };

    const users = JSON.parse(localStorage.getItem('users') || '{}');
    users[touristId] = { ...newUser, password };
    localStorage.setItem('users', JSON.stringify(users));

    setUser(newUser);
    localStorage.setItem('currentUser', JSON.stringify(newUser));

    return touristId;
  };

  const updateStatus = async (status: 'safe' | 'alert' | 'danger') => {
    if (user) {
      const updatedUser = { ...user, status };
      setUser(updatedUser);
      localStorage.setItem('currentUser', JSON.stringify(updatedUser));

      // Update in users storage
      const users = JSON.parse(localStorage.getItem('users') || '{}');
      if (users[user.touristId]) {
        users[user.touristId] = { ...users[user.touristId], status };
        localStorage.setItem('users', JSON.stringify(users));
      }

      // Persist status to Supabase profiles table
      try {
        await supabase
          .from('profiles')
          .update({ status, updated_at: new Date().toISOString() })
          .eq('tourist_id', user.touristId);
      } catch (err) {
        console.error('Failed to update profile status in Supabase:', err);
      }
    }
  };

  const getAllUsers = (): User[] => {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    return Object.values(users).map((u: any) => {
      const { password, ...userWithoutPassword } = u;
      return userWithoutPassword;
    });
  };

  const getUserLocations = () => {
    const users = getAllUsers();
    return users.map((u) => {
      const savedLocation = JSON.parse(localStorage.getItem(`userLocation-${u.touristId}`) || 'null');
      return {
        touristId: u.touristId,
        username: u.username,
        lat: savedLocation?.lat || 20.5937 + (Math.random() - 0.5) * 2,
        lng: savedLocation?.lng || 78.9629 + (Math.random() - 0.5) * 2,
        status: u.status,
      };
    });
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin,
        isVerifyingAdmin,
        adminWalletAddress,
        login,
        loginWithWallet,
        verifyAdminOnChain,
        logout,
        adminLogout,
        register,
        updateStatus,
        getAllUsers,
        getUserLocations,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export { ADMIN_WALLET };
