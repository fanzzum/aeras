import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type RideStatus = 'REQUESTED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';
interface Ride {
  ride_id: string;
  pickup_location_id: string;
  destination_location_id: string;
  status: RideStatus;
  created_at: string;
  completed_at?: string | null;
  puller_id: string | null;
}

const fmt = (ts?: string | null) => ts ? new Date(ts).toLocaleString() : '—';

export default function HistoryPage() {
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);

  useEffect(() => {
    const pid = localStorage.getItem('userId');
    const role = localStorage.getItem('userRole');
    const token = localStorage.getItem('token');
    if (!pid || !token || role !== 'ADMIN') { router.push('/login'); return; }
    (async () => {
      const { data } = await supabase.from('rides').select('*').order('created_at', { ascending: false });
      setRides((data || []) as Ride[]);
    })();
  }, [router]);

  const badge = (s: RideStatus) => {
    const map: Record<RideStatus, string> = {
      REQUESTED: 'bg-yellow-500',
      ACCEPTED: 'bg-blue-500',
      ACTIVE: 'bg-green-500',
      COMPLETED: 'bg-gray-500',
      CANCELED: 'bg-red-500',
    };
    return `px-2 py-1 rounded-md text-xs font-bold ${map[s]} text-white`;
  };

  return (
    <div className="p-6 md:p-8 space-y-4 min-h-screen">
      <div className="rounded-2xl p-5 bg-white/85 backdrop-blur border border-gray-300 shadow-lg">
        <h1 className="text-2xl font-extrabold tracking-tight">Ride History</h1>
      </div>
      <div className="space-y-3">
        {rides.map(r => (
          <div key={r.ride_id} className="border border-gray-300 rounded p-3 text-sm bg-white shadow hover:shadow-lg">
            <div className="flex justify-between items-center">
              <span className="font-mono">{r.ride_id.substring(0, 8)}</span>
              <span className={badge(r.status)}>{r.status}</span>
            </div>
            <div className="mt-1">
              <div>Pickup: {r.pickup_location_id.substring(0, 8)}</div>
              <div>Destination: {r.destination_location_id.substring(0, 8)}</div>
              <div>Requested: {fmt(r.created_at)}</div>
              <div>Completed: {fmt(r.completed_at)}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}