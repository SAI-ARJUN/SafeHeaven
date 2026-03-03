import { useEffect } from 'react';
import { api } from '@/lib/api';

interface Profile {
  id: number;
  email: string;
  name: string;
  phone: string;
  status: string;
  location_status: string;
  created_at: string;
  updated_at: string;
}

interface UseRealtimeProfilesOptions {
  onNewProfile?: (profile: Profile) => void;
  onProfileUpdated?: (profile: Profile) => void;
  onProfileDeleted?: (profile: Profile) => void;
  enabled?: boolean;
}

export function useRealtimeProfiles({
  onNewProfile,
  onProfileUpdated,
  onProfileDeleted,
  enabled = true,
}: UseRealtimeProfilesOptions) {
  useEffect(() => {
    if (!enabled) return;

    let lastKnownProfiles = new Set<number>();

    const fetchProfiles = async () => {
      try {
        const data = await api.profiles.getAll();
        const currentIds = new Set((data || []).map((p: Profile) => p.id));

        // Check for new profiles
        (data || []).forEach((profile: Profile) => {
          if (!lastKnownProfiles.has(profile.id)) {
            console.log('New profile registered:', profile);
            onNewProfile?.(profile);
          }
        });

        // Check for deleted profiles
        lastKnownProfiles.forEach(id => {
          if (!currentIds.has(id)) {
            console.log('Profile deleted:', id);
            onProfileDeleted?.({ id } as Profile);
          }
        });

        lastKnownProfiles = currentIds;
      } catch (error) {
        console.error('Profile fetch error:', error);
      }
    };

    fetchProfiles();

    // Poll for updates every 10 seconds (replaces realtime subscriptions)
    const intervalId = setInterval(fetchProfiles, 10000);

    return () => {
      clearInterval(intervalId);
    };
  }, [enabled, onNewProfile, onProfileUpdated, onProfileDeleted]);
}
