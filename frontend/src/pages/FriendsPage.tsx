import { useState, useEffect, useRef, useCallback } from 'react';
import Avatar from '../components/Avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../store/authStore';
import { getSocket } from '../services/socket';
import api from '../services/api';
import s from './FriendsPage.module.css';

interface Friend {
  id: string; username: string; rating: number; rankTier: string;
  isOnline: boolean; lastSeen?: string; avatar: string;
  stats?: { wins: number; losses: number; gamesPlayed: number };
}
interface FriendRequest {
  id: string;
  from: { id: string; username: string; rating: number; avatar: string; rankTier: string };
  createdAt: string;
}
interface IncomingChallenge {
  fromUserId: string; fromUsername: string; fromRating: number; timeControl: string; timer: number;
}

const TIER_COLOR: Record<string, string> = {
  Diamond: '#00d4ff', Platinum: '#a855f7', Gold: '#f5c842', Silver: '#C0C0C0', Bronze: '#CD7F32'
};
const TIME_CONTROLS = ['60+0', '180+0', '600+0', '900+10'];

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const socket = getSocket();

  const [tab, setTab] = useState<'friends' | 'requests' | 'find'>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [requests, setRequests] = useState<FriendRequest[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());
  const [challengeTC, setChallengeTC] = useState('600+0');
  const [challengePending, setChallengePending] = useState<string | null>(null);
  const [incomingChallenge, setIncomingChallenge] = useState<IncomingChallenge | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error' | 'info'>('info');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const showToast = useCallback((msg: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast(msg); setToastType(type);
    setTimeout(() => setToast(''), 3500);
  }, []);

  const loadFriends = useCallback(async () => {
    try {
      const { data } = await api.get('/friends');
      setFriends((data.friends || []).map((f: any) => ({
        id: f._id || f.id, username: f.username, rating: f.rating,
        rankTier: f.rankTier || 'Silver', isOnline: f.isOnline || false,
        lastSeen: f.lastSeen, avatar: f.avatar || '♟', stats: f.stats,
      })));
    } catch { setFriends([]); }
  }, []);

  const loadRequests = useCallback(async () => {
    try {
      const { data } = await api.get('/friends/incoming');
      setRequests((data.requests || []).map((r: any) => ({
        id: r._id || r.id,
        from: { id: r.from._id || r.from.id, username: r.from.username, rating: r.from.rating, avatar: r.from.avatar || '♟', rankTier: r.from.rankTier || 'Silver' },
        createdAt: r.createdAt,
      })));
    } catch { setRequests([]); }
  }, []);

  // ── Socket listeners ───────────────────────────────────────
  useEffect(() => {
    Promise.all([loadFriends(), loadRequests()]).finally(() => setLoading(false));

    socket.on('friend:request_received', ({ username }: any) => {
      showToast(`👥 ${username} sent you a friend request!`, 'info');
      loadRequests();
    });

    socket.on('friend:accepted', ({ username }: any) => {
      showToast(`✅ ${username} accepted your friend request!`, 'success');
      loadFriends();
    });

    // ── Incoming challenge → show modal ──
    socket.on('friend:challenge_received', (data: any) => {
      console.log('[challenge_received]', data);
      if (timerRef.current) clearInterval(timerRef.current);
      const challenge: IncomingChallenge = {
        fromUserId: data.fromUserId,
        fromUsername: data.fromUsername,
        fromRating: data.fromRating || 1200,
        timeControl: data.timeControl || '600+0',
        timer: 30,
      };
      setIncomingChallenge(challenge);
      // Countdown
      timerRef.current = setInterval(() => {
        setIncomingChallenge(prev => {
          if (!prev) { clearInterval(timerRef.current!); return null; }
          if (prev.timer <= 1) {
            clearInterval(timerRef.current!);
            socket.emit('friend:challenge_decline', { fromUserId: prev.fromUserId });
            return null;
          }
          return { ...prev, timer: prev.timer - 1 };
        });
      }, 1000);
    });

    // ── Challenger: opponent declined ──
    socket.on('friend:challenge_declined', ({ username }: any) => {
      showToast(`❌ ${username} declined your challenge`, 'error');
      setChallengePending(null);
    });

    socket.on('friend:challenge_failed', ({ message }: any) => {
      showToast(`❌ ${message}`, 'error');
      setChallengePending(null);
    });

    // Challenger navigates immediately when sending challenge
    // matchmaking:found is handled by GamePage directly

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      socket.off('friend:request_received');
      socket.off('friend:accepted');
      socket.off('friend:challenge_received');
      socket.off('friend:challenge_declined');
      socket.off('friend:challenge_failed');
      // matchmaking:found handled by GamePage
    };
  }, []);

  // ── Accept / decline challenge ─────────────────────────────
  const acceptChallenge = () => {
    if (!incomingChallenge) return;
    const { fromUserId, timeControl, fromUsername } = incomingChallenge;
    if (timerRef.current) clearInterval(timerRef.current);
    setIncomingChallenge(null);
    // Store so GamePage can emit accept after mounting
    sessionStorage.setItem('pendingChallenge', JSON.stringify({ fromUserId, timeControl }));
    navigate('/app/play');
  };

  const declineChallenge = () => {
    if (!incomingChallenge) return;
    if (timerRef.current) clearInterval(timerRef.current);
    socket.emit('friend:challenge_decline', { fromUserId: incomingChallenge.fromUserId });
    setIncomingChallenge(null);
    showToast('Challenge declined', 'info');
  };

  // ── Send challenge ─────────────────────────────────────────
  const challengeFriend = (f: Friend) => {
    if (!f.isOnline) { showToast(`${f.username} is offline`, 'error'); return; }
    // Set waiting flag BEFORE navigating so GamePage shows waiting screen
    sessionStorage.setItem('friendChallengeWaiting', '1');
    socket.emit('friend:challenge', { toUserId: f.id, timeControl: challengeTC });
    // Navigate to play page so GamePage is mounted and ready for matchmaking:found
    navigate('/app/play');
  };

  const searchUsers = async () => {
    if (!searchQuery.trim() || searchQuery.length < 2) return;
    setSearching(true);
    try {
      const { data } = await api.get(`/friends/search?q=${encodeURIComponent(searchQuery)}`);
      setSearchResults(data.users || []);
      if (!(data.users || []).length) showToast('No users found', 'info');
    } catch { showToast('Search failed', 'error'); setSearchResults([]); }
    setSearching(false);
  };

  const sendFriendRequest = async (username: string, userId: string) => {
    try {
      await api.post('/friends/request', { username });
      setSentRequests(prev => new Set([...prev, userId]));
      socket.emit('friend:notify_request', { toUserId: userId });
      showToast(`📨 Friend request sent to ${username}!`, 'success');
    } catch (e: any) { showToast(e?.response?.data?.message || 'Could not send request', 'error'); }
  };

  const acceptRequest = async (req: FriendRequest) => {
    try {
      await api.post('/friends/respond', { requestId: req.id, action: 'accept' });
      setRequests(prev => prev.filter(r => r.id !== req.id));
      socket.emit('friend:notify_accept', { toUserId: req.from.id });
      showToast(`✅ You are now friends with ${req.from.username}!`, 'success');
      loadFriends();
    } catch (e: any) { showToast(e?.response?.data?.message || 'Failed to accept', 'error'); }
  };

  const declineRequest = async (req: FriendRequest) => {
    try {
      await api.post('/friends/respond', { requestId: req.id, action: 'decline' });
      setRequests(prev => prev.filter(r => r.id !== req.id));
      showToast(`Declined request from ${req.from.username}`, 'info');
    } catch { showToast('Failed to decline', 'error'); }
  };

  const removeFriend = async (f: Friend) => {
    if (!window.confirm(`Remove ${f.username} from friends?`)) return;
    try {
      await api.delete(`/friends/${f.id}`);
      setFriends(prev => prev.filter(x => x.id !== f.id));
      showToast(`Removed ${f.username}`, 'info');
    } catch (e: any) { showToast(e?.response?.data?.message || 'Failed to remove', 'error'); }
  };

  const sorted = [...friends].sort((a, b) => (+b.isOnline - +a.isOnline) || b.rating - a.rating);
  const onlineCount = friends.filter(f => f.isOnline).length;
  const toastColor = toastType === 'success' ? 'var(--green)' : toastType === 'error' ? '#ff4444' : 'var(--gold)';

  if (loading) return (
    <div className={s.page} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ textAlign: 'center', opacity: .5 }}>
        <div style={{ fontSize: '3rem', marginBottom: 12 }}>👥</div>
        <div>Loading friends...</div>
      </div>
    </div>
  );

  return (
    <div className={s.page}>

      {/* ══ INCOMING CHALLENGE MODAL ══════════════════════════ */}
      <AnimatePresence>
        {incomingChallenge && (
          <motion.div className={s.challengeOverlay}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className={s.challengeModal}
              initial={{ scale: 0.75, y: 40 }} animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.75, opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 24 }}>
              <div className={s.challengeAvatar}>⚔️</div>
              <div className={s.challengeFrom}>{incomingChallenge.fromUsername}</div>
              <div className={s.challengeRating}>{incomingChallenge.fromRating} ELO · challenges you!</div>
              <div className={s.challengeTC}>
                {incomingChallenge.timeControl === '60+0' ? '⚡ Bullet' :
                 incomingChallenge.timeControl === '180+0' ? '🔥 Blitz' :
                 incomingChallenge.timeControl === '600+0' ? '⏱ Rapid' : '🕰 Classical'}
                {'  '}{incomingChallenge.timeControl}
              </div>
              <div className={s.challengeActions}>
                <button className="btn btn-gold" style={{ flex: 1, padding: '12px' }} onClick={acceptChallenge}>
                  ✅ Accept
                </button>
                <button className="btn btn-outline" style={{ flex: 1, padding: '12px' }} onClick={declineChallenge}>
                  ✕ Decline
                </button>
              </div>
              <div className={s.challengeTimer}>
                Auto-declines in {incomingChallenge.timer}s
                <div style={{ marginTop: 8, height: 4, background: 'var(--border)', borderRadius: 2 }}>
                  <motion.div style={{
                    height: '100%', borderRadius: 2, background: 'var(--gold)',
                    width: `${(incomingChallenge.timer / 30) * 100}%`,
                  }} transition={{ duration: 1, ease: 'linear' }} />
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className={s.layout}>

        {/* Header */}
        <motion.div className={s.header} initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
          <div>
            <h1 className={s.title}>Friends</h1>
            <p className={s.sub}>{onlineCount} online · {friends.length} total</p>
          </div>
          <div className={s.tabs}>
            {([['friends', '👥 Friends'], ['requests', '🔔 Requests'], ['find', '🔍 Find']] as const).map(([t, l]) => (
              <button key={t} className={`btn btn-sm ${tab === t ? 'btn-gold' : 'btn-ghost'}`} onClick={() => setTab(t)}>
                {l}
                {t === 'requests' && requests.length > 0 && <span className={s.badge}>{requests.length}</span>}
              </button>
            ))}
          </div>
        </motion.div>

        <AnimatePresence mode="wait">

          {/* ── Friends tab ── */}
          {tab === 'friends' && (
            <motion.div key="f" className={s.content} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              {sorted.length === 0 ? (
                <div className={s.empty}>
                  <div style={{ fontSize: '3rem' }}>👥</div>
                  <p>No friends yet! Go find someone to play with.</p>
                  <button className="btn btn-gold" onClick={() => setTab('find')}>Find Friends →</button>
                </div>
              ) : (
                <>
                  <div className={s.tcRow}>
                    <span style={{ color: 'var(--muted)', fontSize: '.8rem' }}>Challenge time:</span>
                    {TIME_CONTROLS.map(tc => (
                      <button key={tc} className={`btn btn-sm ${challengeTC === tc ? 'btn-gold' : 'btn-ghost'}`}
                        onClick={() => setChallengeTC(tc)}>{tc}</button>
                    ))}
                  </div>
                  <div className={s.friendGrid}>
                    {sorted.map((f, i) => (
                      <motion.div key={f.id} className={`card ${s.friendCard}`}
                        initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                        <div className={s.fcTop}>
                          <div className={s.fcAvatar} style={{ background: f.avatar?.startsWith('http') ? 'transparent' : `${TIER_COLOR[f.rankTier]}22`, border: `2px solid ${TIER_COLOR[f.rankTier]}55` }}>
                            <Avatar avatar={f.avatar} username={f.username} size={44} />
                            <div className={`${s.onlineDot} ${f.isOnline ? s.online : s.offline}`} />
                          </div>
                          <div className={s.fcInfo}>
                            <div className={s.fcName}>{f.username}</div>
                            <div className={s.fcRating} style={{ color: TIER_COLOR[f.rankTier] }}>{f.rating} · {f.rankTier}</div>
                            <div className={s.fcStatus}>
                              {f.isOnline
                                ? <span className={s.onlineText}>● Online now</span>
                                : <span className={s.offlineText}>Last seen {f.lastSeen ? new Date(f.lastSeen).toLocaleDateString() : 'recently'}</span>}
                            </div>
                          </div>
                        </div>
                        {f.stats && (
                          <div className={s.fcStats}>
                            <span style={{ color: 'var(--green)' }}>{f.stats.wins}W</span>
                            <span style={{ color: '#ff4444' }}>{f.stats.losses}L</span>
                            <span style={{ color: 'var(--muted)' }}>{f.stats.gamesPlayed} games</span>
                          </div>
                        )}
                        <div className={s.fcActions}>
                          <button className="btn btn-gold btn-sm"
                            onClick={() => challengeFriend(f)}
                            disabled={!f.isOnline || challengePending === f.username}>
                            {challengePending === f.username ? '⏳ Waiting...' : f.isOnline ? '⚔️ Challenge' : '💤 Offline'}
                          </button>
                          <button className="btn btn-ghost btn-sm" onClick={() => navigate(`/app/profile/${f.username}`)}>Profile</button>
                          <button className="btn btn-ghost btn-sm" style={{ color: '#ff4444', padding: '6px 10px' }}
                            onClick={() => removeFriend(f)}>✕</button>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* ── Requests tab ── */}
          {tab === 'requests' && (
            <motion.div key="r" className={s.content} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              {requests.length === 0 ? (
                <div className={s.empty}>
                  <div style={{ fontSize: '3rem' }}>🔔</div>
                  <p>No pending friend requests</p>
                </div>
              ) : (
                <div className={s.requestList}>
                  {requests.map((req, i) => (
                    <motion.div key={req.id} className={`card ${s.requestCard}`}
                      initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }}>
                      <Avatar avatar={req.from.avatar} username={req.from.username} size={44} className={s.reqAvatar} />
                      <div className={s.reqInfo}>
                        <div className={s.reqName}>{req.from.username}</div>
                        <div className={s.reqRating} style={{ color: TIER_COLOR[req.from.rankTier] }}>
                          {req.from.rating} ELO · {req.from.rankTier}
                        </div>
                      </div>
                      <div className={s.reqActions}>
                        <button className="btn btn-gold btn-sm" onClick={() => acceptRequest(req)}>✅ Accept</button>
                        <button className="btn btn-outline btn-sm" onClick={() => declineRequest(req)}>✕ Decline</button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* ── Find tab ── */}
          {tab === 'find' && (
            <motion.div key="s" className={s.content} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}>
              <div className={s.searchBar}>
                <input className="input" placeholder="Search by username (min 2 chars)..."
                  value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && searchUsers()} />
                <button className="btn btn-gold" onClick={searchUsers} disabled={searching || searchQuery.length < 2}>
                  {searching ? '...' : '🔍 Search'}
                </button>
              </div>
              <div className={s.searchResults}>
                {searchResults.map((u, i) => {
                  const uid = u._id || u.id;
                  const isMe = uid === user?.id;
                  const isFriend = friends.some(f => f.username === u.username);
                  const sent = sentRequests.has(uid);
                  return (
                    <motion.div key={uid} className={`card ${s.searchCard}`}
                      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <Avatar avatar={u.avatar || '♟'} username={u.username} size={44} className={s.scAvatar} />
                      <div className={s.scInfo}>
                        <div className={s.scName}>{u.username}</div>
                        <div className={s.scRating} style={{ color: TIER_COLOR[u.rankTier] || 'var(--muted)' }}>
                          {u.rating} · {u.rankTier || 'Silver'}
                        </div>
                      </div>
                      <div>{u.isOnline ? <span className={s.onlineText}>● Online</span> : <span className={s.offlineText}>Offline</span>}</div>
                      {isMe ? <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>You</span>
                        : isFriend ? <span style={{ fontSize: '.75rem', color: 'var(--green)' }}>✓ Friends</span>
                        : sent ? <span style={{ fontSize: '.75rem', color: 'var(--muted)' }}>Sent ✓</span>
                        : <button className="btn btn-gold btn-sm" onClick={() => sendFriendRequest(u.username, uid)}>+ Add</button>}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

        </AnimatePresence>

        <AnimatePresence>
          {toast && (
            <motion.div className={s.challengeToast}
              style={{ borderLeft: `4px solid ${toastColor}`, color: toastColor }}
              initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }}>
              {toast}
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
