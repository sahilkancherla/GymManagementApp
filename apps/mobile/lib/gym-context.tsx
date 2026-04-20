import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiFetch } from './api';

export type GymMembership = {
  gym_id: string;
  gym: { id: string; name: string; logo_url: string | null };
  roles: string[];
  status: string;
};

type GymContextValue = {
  gyms: GymMembership[];
  activeGym: GymMembership | null;
  setActiveGymId: (id: string) => void;
  loading: boolean;
  refresh: () => Promise<void>;
  isAdmin: boolean;
  isCoach: boolean;
};

const GymContext = createContext<GymContextValue>({
  gyms: [],
  activeGym: null,
  setActiveGymId: () => {},
  loading: true,
  refresh: async () => {},
  isAdmin: false,
  isCoach: false,
});

export function GymProvider({ children }: { children: React.ReactNode }) {
  const [gyms, setGyms] = useState<GymMembership[]>([]);
  const [activeGymId, setActiveGymId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const data = await apiFetch('/gyms');
      const list: GymMembership[] = (data || []).filter(
        (g: any) => g.gym && g.status === 'active',
      );
      setGyms(list);

      // Auto-select first gym if none selected or current is gone
      if (list.length > 0) {
        const current = list.find((g) => g.gym_id === activeGymId);
        if (!current) setActiveGymId(list[0].gym_id);
      } else {
        setActiveGymId(null);
      }
    } catch (err) {
      console.error('Failed to load gyms:', err);
    } finally {
      setLoading(false);
    }
  }, [activeGymId]);

  useEffect(() => {
    refresh();
  }, []);

  const activeGym = gyms.find((g) => g.gym_id === activeGymId) || null;
  const roles = activeGym?.roles || [];

  return (
    <GymContext.Provider
      value={{
        gyms,
        activeGym,
        setActiveGymId,
        loading,
        refresh,
        isAdmin: roles.includes('admin'),
        isCoach: roles.includes('coach'),
      }}
    >
      {children}
    </GymContext.Provider>
  );
}

export function useGym() {
  return useContext(GymContext);
}
