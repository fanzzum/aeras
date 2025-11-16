"use client";
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminNav from '@/components/AdminNav';
import { supabase } from '@/lib/supabaseClient';

interface Destination { destination: string; count: number; }
interface Puller { puller_id: string; name: string; points_balance: number; }

export default function AnalyticsPage() {
  const router = useRouter();
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [destNames, setDestNames] = useState<Record<string, string>>({});
  const [avgWait, setAvgWait] = useState(0);
  const [avgComp, setAvgComp] = useState(0);
  const [leaderboard, setLeaderboard] = useState<Puller[]>([]);

  useEffect(() => {
    const role = localStorage.getItem('userRole');
    if (role !== 'ADMIN') { router.push('/login'); return; }
    (async () => {
      const [d, t, l] = await Promise.all([
        fetch('http://localhost:4000/api/v1/admin/analytics/destinations').then(r => r.json()).catch(() => []),
        fetch('http://localhost:4000/api/v1/admin/analytics/times').then(r => r.json()).catch(() => ({ avgWaitMs: 0, avgCompletionMs: 0 })),
        fetch('http://localhost:4000/api/v1/admin/analytics/leaderboard').then(r => r.json()).catch(() => []),
      ]);
      setDestinations(d);
      setAvgWait(Math.round(t.avgWaitMs / 60000));      // minutes
      setAvgComp(Math.round(t.avgCompletionMs / 60000)); // minutes
      setLeaderboard(l);

      // Fetch block names for destination ids
      try {
        const ids = Array.from(new Set((d || []).map((x: any) => x.destination).filter(Boolean)));
        if (ids.length) {
          const { data: blocks } = await supabase
            .from('blocks')
            .select('block_id,name')
            .in('block_id', ids);
          const map: Record<string, string> = {};
          (blocks || []).forEach((b: any) => { map[b.block_id] = b.name || b.block_id; });
          setDestNames(map);
        }
      } catch (e) {
        // ignore name fetch errors
      }
    })();
  }, [router]);

  return (
    <div className="p-6 md:p-8 min-h-screen">
      <div className="rounded-2xl p-5 bg-white/85 backdrop-blur border border-[color:var(--nord9)]/30 shadow-lg mb-6 hover-lift animate-fade-in-up">
        <h1 className="text-3xl font-extrabold tracking-tight">Analytics</h1>
      </div>
      <AdminNav />
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Most requested destinations */}
        <div className="bg-white/90 backdrop-blur border border-[color:var(--nord9)]/30 p-6 rounded-2xl shadow-lg animate-fade-in-up">
          <h2 className="text-xl font-bold mb-4">Top Destinations</h2>
          <div className="space-y-2">
            {destinations.map(d => (
              <div key={d.destination} className="flex justify-between items-center border-b border-[color:var(--nord9)]/20 pb-2">
                <span className="font-mono text-sm">{destNames[d.destination] || d.destination.substring(0, 8)}</span>
                <span className="font-bold">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Avg times */}
        <div className="bg-white/90 backdrop-blur border border-[color:var(--nord9)]/30 p-6 rounded-2xl shadow-lg animate-fade-in-up">
          <h2 className="text-xl font-bold mb-4">Average Times</h2>
          <div className="space-y-4">
            <div>
              <div className="text-sm">Avg Wait Time</div>
              <div className="text-3xl font-extrabold">{avgWait} min</div>
            </div>
            <div>
              <div className="text-sm">Avg Completion Time</div>
              <div className="text-3xl font-extrabold">{avgComp} min</div>
            </div>
          </div>
        </div>

        {/* Leaderboard */}
        <div className="bg-white/90 backdrop-blur border border-[color:var(--nord9)]/30 p-6 rounded-2xl shadow-lg lg:col-span-2 animate-fade-in-up">
          <h2 className="text-xl font-bold mb-4">Puller Leaderboard (Top 10)</h2>
          <div className="space-y-2">
            {leaderboard.map((p, i) => (
              <div key={p.puller_id} className="flex justify-between items-center border-b border-[color:var(--nord9)]/20 pb-2">
                <div className="flex items-center gap-3">
                  <span className="font-bold text-lg">{i + 1}.</span>
                  <span>{p.name || 'Unknown Puller'}</span>
                </div>
                <span className="font-bold text-[color:var(--nord10)]">{p.points_balance} pts</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}