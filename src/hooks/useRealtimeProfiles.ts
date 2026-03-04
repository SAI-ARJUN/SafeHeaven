import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Profile = Tables<'profiles'>;

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

    const channel = supabase
      .channel('profiles-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('New profile registered:', payload.new);
          if (onNewProfile) {
            onNewProfile(payload.new as Profile);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Profile updated:', payload.new);
          if (onProfileUpdated) {
            onProfileUpdated(payload.new as Profile);
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('Profile deleted:', payload.old);
          if (onProfileDeleted) {
            onProfileDeleted(payload.old as Profile);
          }
        }
      )
      .subscribe((status) => {
        console.log('Profiles realtime subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, onNewProfile, onProfileUpdated, onProfileDeleted]);
}
