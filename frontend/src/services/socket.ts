import { io, Socket } from 'socket.io-client';

let s: Socket | null = null;
let lastToken = '';

export function getSocket(): Socket {
  // Get current token
  let token = '';
  try {
    const st = localStorage.getItem('ko-auth');
    token = st ? JSON.parse(st)?.state?.token || '' : '';
  } catch(_) {}

  // If token changed (new login) or socket dead, reconnect
  if (s && (token !== lastToken || !s.connected)) {
    s.disconnect();
    s = null;
  }

  if (!s) {
    lastToken = token;
    s = io(import.meta.env.VITE_SOCKET_URL || window.location.origin, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });
    s.on('connect', () => console.info('[Socket] connected:', s?.id));
    s.on('connect_error', e => console.warn('[Socket] error:', e.message));
    s.on('disconnect', () => console.warn('[Socket] disconnected'));
  }
  return s;
}

export function disconnectSocket() {
  s?.disconnect();
  s = null;
  lastToken = '';
}
