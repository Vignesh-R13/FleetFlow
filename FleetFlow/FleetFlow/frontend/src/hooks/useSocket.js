import { useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000';

// One shared socket per mounted consumer; callers pass event handlers to attach.
// Example: useSocket({ 'vessel:position': (data) => { ... } })
// Returns { connected } so callers that want a live/reconnecting indicator
// (e.g. LiveIndicator in the Command Center) can react to it — existing
// callers that ignore the return value are unaffected.
export function useSocket(handlers = {}) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => setConnected(false));

    Object.keys(handlersRef.current).forEach((event) => {
      socket.on(event, (payload) => handlersRef.current[event]?.(payload));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  return { connected };
}
