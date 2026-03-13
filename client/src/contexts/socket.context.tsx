import { createContext } from 'react';
import type { TypedSocket } from '../services/socket-service';

export const SocketContext = createContext<TypedSocket | null | undefined>(undefined);
SocketContext.displayName = 'SocketContext';
