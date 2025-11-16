"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import { LayoutDashboard, History, MapPin, CheckCircle, Clock, DollarSign, XCircle, X as CloseIcon } from 'lucide-react';

type RideStatus = 'REQUESTED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';

interface Ride {
  ride_id: string;
  puller_id: string | null;
  pickup_location_id: string;
  destination_location_id: string;
  status: RideStatus;
  created_at: string;
  completed_at?: string | null;
}

interface Block { block_id: string; name: string | null; }
interface PointTxn { history_id: string; points_amount: number | null; transaction_date: string | null; type: string | null; }

const AUTO_CANCEL_MS = 20000;
const fmtTime = (ts?: string | null) => ts ? new Date(ts).toLocaleString() : '—';

// 1s ticker
const useTicker = (ms: number) => {
  const [, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick(t => (t + 1) % 1_000_000), ms);
    return () => clearInterval(id);
  }, [ms]);
};

export default function PullerDashboard() {
  const router = useRouter();
  const [pullerId, setPullerId] = useState<string | null>(null);
  const [rides, setRides] = useState<Ride[]>([]);
  const [blocksMap, setBlocksMap] = useState<Record<string, Block>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [points, setPoints] = useState<number>(0);
  const [pointTxns, setPointTxns] = useState<PointTxn[]>([]);
  const timersRef = useRef<Record<string, NodeJS.Timeout>>({});
  const hiddenRequestedRef = useRef<Set<string>>(new Set());
  const [currentLat, setCurrentLat] = useState<number>(0);
  const [currentLon, setCurrentLon] = useState<number>(0);
  useTicker(1000);

  // auth + geo
  useEffect(() => {
    const pid = localStorage.getItem('userId');
    const role = localStorage.getItem('userRole');
    const token = localStorage.getItem('token');
    if (!pid || !token || role !== 'PULLER') { router.push('/login'); return; }
    setPullerId(pid);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(pos => {
        setCurrentLat(pos.coords.latitude);
        setCurrentLon(pos.coords.longitude);
      });
    }
  }, [router]);

  const secondsLeft = (r: Ride) => {
    if (r.status !== 'REQUESTED') return null;
    const created = new Date(r.created_at).getTime();
    const remaining = Math.ceil((AUTO_CANCEL_MS - (Date.now() - created)) / 1000);
    return Math.max(0, remaining);
  };

  const fetchBlocks = useCallback(async (ids: string[]) => {
    const uniq = Array.from(new Set(ids.filter(Boolean)));
    if (!uniq.length) return;
    const { data } = await supabase.from('blocks').select('block_id,name').in('block_id', uniq);
    if (data) {
      const map: Record<string, Block> = {};
      data.forEach(b => { map[b.block_id] = b; });
      setBlocksMap(prev => ({ ...prev, ...map }));
    }
  }, []);

  const autoCancel = useCallback(async (ride: Ride) => {
    if (ride.status !== 'REQUESTED') return;
    await supabase.from('rides')
      .update({ status: 'CANCELED' })
      .eq('ride_id', ride.ride_id)
      .eq('status', 'REQUESTED');
    fetchRides();
  }, []);

  const scheduleAutoCancel = useCallback((ride: Ride) => {
    if (ride.status !== 'REQUESTED') return;
    const created = new Date(ride.created_at).getTime();
    const remaining = AUTO_CANCEL_MS - (Date.now() - created);
    if (remaining <= 0) { autoCancel(ride); return; }
    if (timersRef.current[ride.ride_id]) clearTimeout(timersRef.current[ride.ride_id]);
    timersRef.current[ride.ride_id] = setTimeout(() => autoCancel(ride), remaining);
  }, [autoCancel]);

  const fetchPoints = useCallback(async (pid: string) => {
    const [{ data: puller }, { data: tx }] = await Promise.all([
      supabase.from('pullers').select('points_balance').eq('puller_id', pid).maybeSingle(),
      supabase.from('points_history').select('history_id,points_amount,transaction_date,type').eq('puller_id', pid).order('transaction_date', { ascending: false }).limit(10),
    ]);
    if (puller?.points_balance != null) setPoints(puller.points_balance);
    if (tx) setPointTxns(tx as PointTxn[]);
  }, []);

  const fetchRides = useCallback(async () => {
    if (!pullerId) return;
    setIsLoading(true);
    try {
      const { data } = await supabase.from('rides').select('*').order('created_at', { ascending: false });
      const list = (data || []) as Ride[];
      const filtered = list.filter(r =>
        (r.puller_id === pullerId) ||
        (r.status === 'REQUESTED' && r.puller_id === null && !hiddenRequestedRef.current.has(r.ride_id))
      );
      setRides(filtered);
      filtered.forEach(scheduleAutoCancel);
      const ids: string[] = [];
      filtered.forEach(r => ids.push(r.pickup_location_id, r.destination_location_id));
      fetchBlocks(ids);
      fetchPoints(pullerId);
    } catch {
      setFeedback({ message: 'Failed to load data', type: 'error' });
    } finally {
      setIsLoading(false);
    }
  }, [pullerId, scheduleAutoCancel, fetchBlocks, fetchPoints]);

  // Simple vibrate helper
  const vibrate = (pattern: number[] = [250, 120, 250]) => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  };

  useEffect(() => {
    if (!pullerId) return;
    fetchRides();

    // Realtime subscription with vibration on new REQUESTED rides
    const ch = supabase
      .channel('puller_dashboard')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'rides' },
        (payload: any) => {
          // Vibrate only when a fresh ride request is inserted and unassigned
          if (
            payload?.eventType === 'INSERT' &&
            payload?.new?.status === 'REQUESTED' &&
            !payload?.new?.puller_id
          ) {
            vibrate([220, 100, 220]); // short-double pulse
          }
          fetchRides();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
      Object.values(timersRef.current).forEach(t => clearTimeout(t));
    };
  }, [pullerId, fetchRides]);

  const handleAction = useCallback(async (rideId: string, newStatus: 'ACCEPTED' | 'ACTIVE' | 'COMPLETED') => {
    if (!pullerId) return;
    setFeedback(null);
    const update: Record<string, string> = { status: newStatus };
    if (newStatus === 'ACCEPTED') update.puller_id = pullerId;
    if (newStatus === 'COMPLETED') {
      const finalize = async (rid: string, lat: number, lon: number) => {
        const resp = await fetch('http://localhost:4000/api/v1/ride/complete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ride_id: rid, gps_lat: lat, gps_lon: lon })
        });
        const result = await resp.json().catch(()=> ({}));
        if (!resp.ok) { setFeedback({ message: 'Completion failed', type: 'error' }); return; }
        setFeedback({ message: `+${result.points_awarded} pts (${result.points_status})`, type: 'success' });
        fetchRides();
      };
      // get latest or fallback to cached
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          pos => finalize(rideId, pos.coords.latitude, pos.coords.longitude),
          () => finalize(rideId, currentLat, currentLon),
          { enableHighAccuracy: true, timeout: 4000 }
        );
      } else {
        await finalize(rideId, currentLat, currentLon);
      }
      return;
    }
    const { error } = await supabase.from('rides').update(update).eq('ride_id', rideId);
    if (error) { setFeedback({ message: 'Update failed', type: 'error' }); return; }
    if (timersRef.current[rideId]) { clearTimeout(timersRef.current[rideId]); delete timersRef.current[rideId]; }
    setFeedback({ message: `Updated → ${newStatus}`, type: 'success' });
    fetchRides();
  }, [pullerId, fetchRides, currentLat, currentLon]);

  const handleSkip = (rideId: string) => {
    hiddenRequestedRef.current.add(rideId);
    setRides(prev => prev.filter(r => !(r.ride_id === rideId && r.status === 'REQUESTED')));
  };

  const logout = () => {
    localStorage.removeItem('token'); localStorage.removeItem('userId'); localStorage.removeItem('userRole');
    router.push('/login');
  };

  if (!pullerId) return <div className="min-h-screen flex items-center justify-center">Loading...</div>;

  const openRides = rides.filter(r => ['REQUESTED', 'ACCEPTED', 'ACTIVE'].includes(r.status));
  const completedRides = rides.filter(r => r.status === 'COMPLETED' && r.puller_id === pullerId);
  const canceledRides = rides.filter(r => r.status === 'CANCELED' && r.puller_id === pullerId);

  // Nord badges
  const StatusBadge = ({ status }: { status: RideStatus }) => {
    const map: Record<RideStatus, string> = {
      REQUESTED: 'bg-[color:var(--nord13)]/50',
      ACCEPTED: 'bg-[color:var(--nord9)]/40',
      ACTIVE: 'bg-[color:var(--nord14)]/50',
      COMPLETED: 'bg-[color:var(--nord7)]/40',
      CANCELED: 'bg-[color:var(--nord11)]/40',
    };
    return (
      <span className={`px-2 py-1 rounded-md text-xs font-bold ${map[status]} text-[color:var(--foreground)]`}>
        {status}
      </span>
    );
  };

  return (
    <div className="p-6 md:p-8 space-y-6 min-h-screen">
      {/* Top bar */}
      <div className="rounded-2xl p-5 bg-white/85 backdrop-blur border border-[color:var(--nord9)]/30 shadow-lg hover-lift animate-fade-in-up">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight flex items-center">
            <LayoutDashboard className="mr-3" size={28} /> Puller Console
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push('/pullerdashboard/history')}
              className="px-4 py-2 rounded-lg font-semibold text-white bg-[color:var(--nord9)] hover:bg-[color:var(--nord10)] transition-all duration-200 hover-lift hover-press focus:outline-none focus:ring-2 focus:ring-[color:var(--nord9)]/50"
            >
              <History size={18} className="inline mr-1" /> History
            </button>
            <button
              onClick={logout}
              className="px-4 py-2 rounded-lg font-semibold text-white bg-[color:var(--nord11)] hover:bg-[#a54f57] transition-all duration-200 hover-lift hover-press focus:outline-none focus:ring-2 focus:ring-[color:var(--nord11)]/40"
            >
              <XCircle size={18} className="inline mr-1" /> Logout
            </button>
          </div>
        </div>
        <p className="mt-2 font-mono text-sm">Your ID: {pullerId.substring(0, 10)}...</p>
      </div>

      {/* Points row */}
      <div className="grid sm:grid-cols-2 gap-6">
        <div className="bg-white/90 backdrop-blur border border-[color:var(--nord9)]/30 p-5 rounded-2xl shadow-lg hover-lift hover-press animate-fade-in-up">
          <div className="text-sm">Points Balance</div>
          <div className="text-4xl font-extrabold">{points}</div>
        </div>
        <div className="bg-white/90 backdrop-blur border border-[color:var(--nord10)]/30 p-5 rounded-2xl shadow-lg hover-lift animate-fade-in-up">
          <div className="font-bold mb-2">Recent Point Transactions</div>
          <div className="space-y-2 h-56 overflow-y-auto pr-2 text-sm" tabIndex={0} aria-label="Recent point transactions">
            {pointTxns.length === 0 ? (
              <div>No transactions</div>
            ) : (
              pointTxns.map(tx => (
                <div key={tx.history_id} className="flex justify-between border border-[color:var(--nord9)]/30 rounded p-2 bg-white/95 hover-lift hover-press">
                  <span>{tx.type ?? '—'}</span>
                  <span className="font-mono">{tx.points_amount ?? 0}</span>
                  <span>{fmtTime(tx.transaction_date)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {feedback && (
        <div className={`p-4 rounded-lg border shadow ${feedback.type === 'success'
            ? 'bg-[color:var(--nord14)]/20 border-[color:var(--nord14)]/40'
            : 'bg-[color:var(--nord11)]/20 border-[color:var(--nord11)]/40'
          } animate-fade-in-up`}>
          {feedback.message}
        </div>
      )}

      {/* Open/Active */}
      <section className="bg-white/90 backdrop-blur border border-[color:var(--nord9)]/30 p-6 rounded-2xl shadow-xl animate-fade-in-up">
        <h2 className="text-xl font-extrabold mb-4 border-b border-[color:var(--nord9)]/25 pb-2">
          {isLoading ? 'Loading...' : `Open / Active (${openRides.length})`}
        </h2>
        <div className="space-y-4 max-h-[40vh] overflow-y-auto">
          {openRides.length === 0 && !isLoading ? (
            <p className="text-center py-8">No open rides.</p>
          ) : (
            openRides.map(r => {
              const pickup = blocksMap[r.pickup_location_id]?.name || r.pickup_location_id.substring(0, 8);
              const dest = blocksMap[r.destination_location_id]?.name || r.destination_location_id.substring(0, 8);
              const mine = r.puller_id === pullerId;
              return (
                <div
                  key={r.ride_id}
                  className="p-4 border border-[color:var(--nord10)]/25 rounded-xl shadow-sm bg-white/95 flex flex-col md:flex-row md:items-center md:justify-between gap-3 hover-lift hover-press"
                >
                  <div className="flex flex-col text-sm space-y-1">
                    <span className="font-mono">Ride {r.ride_id.substring(0, 8)}</span>
                    <span className="flex items-center">
                      <MapPin size={14} className="mr-2 text-[color:var(--nord10)]" />
                      Pickup: <span className="font-bold ml-1">{pickup}</span>
                    </span>
                    <span className="flex items-center">
                      <MapPin size={14} className="mr-2 text-[color:var(--nord8)]" />
                      Destination: <span className="font-bold ml-1">{dest}</span>
                    </span>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={r.status} />
                      {mine && r.status !== 'REQUESTED' ? <span className="text-xs font-bold">(Yours)</span> : null}
                    </div>
                    <span className="text-xs">Requested: {fmtTime(r.created_at)}</span>
                    {r.status === 'COMPLETED' && <span className="text-xs">Completed: {fmtTime(r.completed_at)}</span>}
                    {r.status === 'REQUESTED' && (
                      <span className="text-xs font-semibold text-[color:var(--nord12)]">
                        Auto-cancel in {secondsLeft(r)}s
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {r.status === 'REQUESTED' && (
                      <>
                        <button
                          onClick={() => handleAction(r.ride_id, 'ACCEPTED')}
                          className="px-4 py-2 rounded-lg font-bold text-white bg-[color:var(--nord14)] hover:bg-[#89B97E] transition-all duration-200 hover-lift hover-press focus:outline-none focus:ring-2 focus:ring-[color:var(--nord14)]/40"
                        >
                          <CheckCircle size={16} className="inline mr-1" /> Accept
                        </button>
                        <button
                          onClick={() => handleSkip(r.ride_id)}
                          className="px-4 py-2 rounded-lg font-bold text-white bg-[color:var(--nord3)] hover:bg-[color:var(--nord2)] transition-all duration-200 hover-lift hover-press focus:outline-none focus:ring-2 focus:ring-[color:var(--nord3)]/40"
                        >
                          <CloseIcon size={16} className="inline mr-1" /> Skip
                        </button>
                      </>
                    )}
                    {mine && r.status === 'ACCEPTED' && (
                      <button
                        onClick={() => handleAction(r.ride_id, 'ACTIVE')}
                        className="px-4 py-2 rounded-lg font-bold text-white bg-[color:var(--nord10)] hover:bg-[color:var(--nord9)] transition-all duration-200 hover-lift hover-press focus:outline-none focus:ring-2 focus:ring-[color:var(--nord10)]/40"
                      >
                        <Clock size={16} className="inline mr-1" /> Start
                      </button>
                    )}
                    {mine && r.status === 'ACTIVE' && (
                      <button
                        onClick={() => handleAction(r.ride_id, 'COMPLETED')}
                        className="px-4 py-2 rounded-lg font-bold text-white bg-[color:var(--nord11)] hover:bg-[#a54f57] transition-all duration-200 hover-lift hover-press focus:outline-none focus:ring-2 focus:ring-[color:var(--nord11)]/40"
                      >
                        <DollarSign size={16} className="inline mr-1" /> Complete
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* Completed & Canceled */}
      <div className="grid md:grid-cols-2 gap-6">
        <section className="bg-white/90 backdrop-blur border border-[color:var(--nord9)]/30 p-6 rounded-2xl shadow-xl animate-fade-in-up">
          <h2 className="text-xl font-extrabold mb-4 border-b border-[color:var(--nord9)]/25 pb-2">
            Completed ({completedRides.length})
          </h2>
          <div className="space-y-3 max-h-[30vh] overflow-y-auto">
            {completedRides.length === 0 ? (
              <p className="text-sm">None completed yet.</p>
            ) : (
              completedRides.map(r => (
                <div key={r.ride_id} className="text-sm border border-[color:var(--nord10)]/25 rounded-lg p-3 bg-white/95 hover-lift hover-press">
                  <div className="flex justify-between">
                    <span className="font-mono">{r.ride_id.substring(0, 8)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-1">
                    <div><strong>Pickup:</strong> {blocksMap[r.pickup_location_id]?.name || r.pickup_location_id.substring(0, 8)}</div>
                    <div><strong>Destination:</strong> {blocksMap[r.destination_location_id]?.name || r.destination_location_id.substring(0, 8)}</div>
                    {r.status === 'COMPLETED' && <div><strong>Completed:</strong> {fmtTime(r.completed_at)}</div>}
                    {r.status === 'CANCELED' && <div><strong>Requested:</strong> {fmtTime(r.created_at)}</div>}
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="bg-white/90 backdrop-blur border border-[color:var(--nord9)]/30 p-6 rounded-2xl shadow-xl animate-fade-in-up">
          <h2 className="text-xl font-extrabold mb-4 border-b border-[color:var(--nord9)]/25 pb-2">
            Canceled ({canceledRides.length})
          </h2>
          <div className="space-y-3 max-h-[30vh] overflow-y-auto">
            {canceledRides.length === 0 ? (
              <p className="text-sm">No canceled rides.</p>
            ) : (
              canceledRides.map(r => (
                <div key={r.ride_id} className="text-sm border border-[color:var(--nord10)]/25 rounded-lg p-3 bg-white/95 hover-lift hover-press">
                  <div className="flex justify-between">
                    <span className="font-mono">{r.ride_id.substring(0, 8)}</span>
                    <StatusBadge status={r.status} />
                  </div>
                  <div className="mt-1">
                    <div><strong>Pickup:</strong> {blocksMap[r.pickup_location_id]?.name || r.pickup_location_id.substring(0, 8)}</div>
                    <div><strong>Destination:</strong> {blocksMap[r.destination_location_id]?.name || r.destination_location_id.substring(0, 8)}</div>
                    <div><strong>Requested:</strong> {fmtTime(r.created_at)}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}