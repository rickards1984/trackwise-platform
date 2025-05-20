import { useContext } from 'react';
import { AuthContext } from '@/App';

export function useAuth() {
  const { user, setUser } = useContext(AuthContext);
  
  return {
    user,
    setUser,
    isAuthenticated: !!user,
  };
}