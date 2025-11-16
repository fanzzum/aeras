import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const AdminStats = () => {
  const [activeUsers, setActiveUsers] = useState(0);
  const [activeRides, setActiveRides] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      const { count: userCount } = await supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .eq('is_active', true);

      const { count: rideCount } = await supabase
        .from('rides')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'ACTIVE');

      setActiveUsers(userCount || 0);
      setActiveRides(rideCount || 0);
    };

    fetchStats();
    const interval = setInterval(fetchStats, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold">Admin Statistics</h2>
      <div className="mt-4">
        <p className="text-lg">Active Users: <span className="font-semibold">{activeUsers}</span></p>
        <p className="text-lg">Active Rides: <span className="font-semibold">{activeRides}</span></p>
      </div>
    </div>
  );
};

export default AdminStats;