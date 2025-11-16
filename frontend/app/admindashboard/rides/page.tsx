"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import { supabase } from '@/lib/supabaseClient';

type RideStatus = 'REQUESTED' | 'ACCEPTED' | 'ACTIVE' | 'COMPLETED' | 'CANCELED';
interface Ride {
  ride_id: string;
  user_id?: string;
  puller_id?: string;
  pickup_location_id: string;
  destination_location_id: string;
  status: RideStatus;
  created_at: string;
  completed_at?: string | null;
}

export default function RidesPage() {
  const router = useRouter();
  const [rides, setRides] = useState<Ride[]>([]);
  const [filters, setFilters] = useState({ date: '', location: '', status: '' });
  const [usersMap, setUsersMap] = useState<Record<string, string>>({});
  const [pullersMap, setPullersMap] = useState<Record<string, string>>({});

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'ADMIN') { router.push('/login'); return; }
    fetchRides();
  }, [router]);

  const fetchRides = async () => {
    const params = new URLSearchParams();
    if (filters.date) params.set('date', filters.date);
    if (filters.location) params.set('location', filters.location);
    if (filters.status) params.set('status', filters.status);
    const res = await fetch(`http://localhost:4000/api/v1/admin/rides?${params}`);
    if (res.ok) {
      const data = await res.json();
      setRides(data);
      // Fetch names for all user_ids and puller_ids
      const userIds = Array.from(new Set(data.map((r: Ride) => r.user_id).filter(Boolean)));
      const pullerIds = Array.from(new Set(data.map((r: Ride) => r.puller_id).filter(Boolean)));
      if (userIds.length) {
        const { data: users } = await supabase.from('users').select('user_id,name').in('user_id', userIds);
        const uMap: Record<string, string> = {};
        (users || []).forEach((u: any) => { uMap[u.user_id] = u.name || 'Unknown'; });
        setUsersMap(uMap);
      }
      if (pullerIds.length) {
        const { data: pullers } = await supabase.from('pullers').select('puller_id,name').in('puller_id', pullerIds);
        const pMap: Record<string, string> = {};
        (pullers || []).forEach((p: any) => { pMap[p.puller_id] = p.name || 'Unknown'; });
        setPullersMap(pMap);
      }
    }
  };

  const applyFilters = () => fetchRides();

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="rounded-2xl p-5 bg-white/85 backdrop-blur border border-[color:var(--nord9)]/30 shadow-lg mb-6 hover-lift animate-fade-in-up">
        <h1 className="text-3xl font-extrabold tracking-tight">Ride Management</h1>
      </div>
      <AdminNav />

      {/* Filters */}
      <div className="bg-white/90 backdrop-blur border border-[color:var(--nord9)]/30 p-4 rounded-2xl shadow-lg mb-6 flex flex-wrap gap-3 items-end animate-fade-in-up">
        <div>
          <label className="text-sm font-semibold">Date (from)</label>
          <input
            type="date"
            value={filters.date}
            onChange={e => setFilters({ ...filters, date: e.target.value })}
            className="border border-[color:var(--nord9)]/30 p-2 rounded-lg"
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Location ID</label>
          <input
            type="text"
            value={filters.location}
            onChange={e => setFilters({ ...filters, location: e.target.value })}
            className="border border-[color:var(--nord9)]/30 p-2 rounded-lg"
            placeholder="Block ID"
          />
        </div>
        <div>
          <label className="text-sm font-semibold">Status</label>
          <select
            value={filters.status}
            onChange={e => setFilters({ ...filters, status: e.target.value })}
            className="border border-[color:var(--nord9)]/30 p-2 rounded-lg"
          >
            <option value="">All</option>
            <option value="REQUESTED">REQUESTED</option>
            <option value="ACCEPTED">ACCEPTED</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="CANCELED">CANCELED</option>
          </select>
        </div>
        <button
          onClick={applyFilters}
          className="px-4 py-2 rounded-lg font-bold text-white bg-[color:var(--nord10)] hover:bg-[color:var(--nord9)] transition-all duration-200 hover-lift hover-press"
        >
          Apply
        </button>
      </div>

      {/* Ride list */}
      <div className="bg-white/90 backdrop-blur border border-[color:var(--nord9)]/30 p-6 rounded-2xl shadow-lg animate-fade-in-up">
        <h2 className="text-xl font-bold mb-4">All Rides ({rides.length})</h2>
        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {rides.map(r => (
            <div key={r.ride_id} className="border border-[color:var(--nord9)]/30 rounded p-3 text-sm hover-lift hover-press">
              <div className="flex justify-between">
                <span className="font-mono">{r.ride_id.substring(0, 8)}</span>
                <span className="font-bold">{r.status}</span>
              </div>
              <div className="mt-1">
                <div><strong>User:</strong> {r.user_id ? usersMap[r.user_id] || 'Loading...' : '—'}</div>
                <div><strong>Puller:</strong> {r.puller_id ? pullersMap[r.puller_id] || 'Loading...' : '—'}</div>
                <div><strong>Pickup:</strong> {r.pickup_location_id.substring(0, 8)}</div>
                <div><strong>Destination:</strong> {r.destination_location_id.substring(0, 8)}</div>
                <div><strong>Created:</strong> {new Date(r.created_at).toLocaleString()}</div>
                {r.completed_at && <div><strong>Completed:</strong> {new Date(r.completed_at).toLocaleString()}</div>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}