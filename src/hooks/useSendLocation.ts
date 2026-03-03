import { useEffect, useRef } from 'react';
import { api } from '@/lib/api';

export function useSendLocation(
  userId: string,
  touristId: string,
  status: 'safe' | 'alert' | 'danger',
  userEmail?: string
) {
  const lastSentRef = useRef<number>(0);
  const profileIdRef = useRef<string | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const isInitializedRef = useRef(false);
  const isProfileReadyRef = useRef(false);

  useEffect(() => {
    if (!userId || !touristId || userId.trim() === '' || touristId.trim() === '') return;
    if (isInitializedRef.current) return; // Prevent re-initialization

    isInitializedRef.current = true;

    // Try to get or create profile
    const getOrCreateProfile = async () => {
      if (isProfileReadyRef.current) return; // Already have profile
      
      try {
        console.log('🔍 Looking for profile:', { touristId, userEmail });
        
        // First try to find profile by touristId (stored in name field) or email
        const profiles = await api.profiles.getAll();
        console.log('📋 Found profiles:', profiles.length);

        // Try to find by name (touristId) first
        let existingProfile = profiles.find((p: any) => p.name === touristId);

        // If not found, try by email
        if (!existingProfile && userEmail) {
          existingProfile = profiles.find((p: any) => p.email === userEmail);
        }

        if (existingProfile) {
          profileIdRef.current = existingProfile._id || existingProfile.id;
          console.log('✅ Found existing profile:', profileIdRef.current, existingProfile.name);
          isProfileReadyRef.current = true;
        } else {
          // Create new profile if it doesn't exist
          console.log('🆕 Creating new profile...');
          const newProfile = await api.profiles.create({
            email: userEmail || `${touristId}@safeheaven.local`,
            name: touristId,
            status: 'active',
            location_status: status,
          });
          profileIdRef.current = (newProfile as any)._id || (newProfile as any).id;
          console.log('✅ Created new profile:', profileIdRef.current);
          isProfileReadyRef.current = true;
        }
      } catch (error) {
        console.error('❌ Error getting/creating profile:', error);
        isProfileReadyRef.current = false;
      }
    };

    getOrCreateProfile();

    // Start watching position
    watchIdRef.current = navigator.geolocation.watchPosition(
      async (pos) => {
        // Throttle: send at most once every 3 seconds for real-time tracking
        const now = Date.now();
        if (now - lastSentRef.current < 3000) return;
        lastSentRef.current = now;

        const { latitude, longitude, accuracy } = pos.coords;

        // Ensure we have a profile ID
        if (!profileIdRef.current) {
          console.log('⏳ No profile ID yet, waiting...');
          await getOrCreateProfile();
          if (!profileIdRef.current) {
            console.warn('⚠️ Still no profile ID, skipping location update');
            return;
          }
        }

        try {
          // Create location entry in database
          await api.locations.create({
            profile_id: profileIdRef.current,
            latitude,
            longitude,
            accuracy: accuracy || 0,
          });

          // Also update profile's current location status
          await api.locations.updateProfileLocation(profileIdRef.current, {
            latitude,
            longitude,
            location_status: status,
          });

          console.log('📍 Location sent:', { latitude, longitude, status, profileId: profileIdRef.current });
        } catch (error) {
          console.error('❌ Location update error:', error);
        }
      } catch (err) {
        console.error('Location send error:', err);
      }
    };

    // Start high-accuracy GPS tracking
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        sendLocation(latitude, longitude);
      },
      (err) => {
        console.error('❌ GPS error:', err);
      },
      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
      isInitializedRef.current = false;
    };
  }, [userId, touristId, userEmail, status]);
}
