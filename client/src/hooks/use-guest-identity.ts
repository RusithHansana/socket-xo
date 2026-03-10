import { useState } from 'react';
import type { GuestIdentity } from 'shared';
import { getGuestIdentity } from '../services/identity-service';

export function useGuestIdentity(): GuestIdentity {
  const [identity] = useState<GuestIdentity>(() => getGuestIdentity());

  return identity;
}