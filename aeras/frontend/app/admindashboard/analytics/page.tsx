import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import AdminNav from '@/components/AdminNav';
import AdminStats from '@/components/AdminStats';

const AnalyticsPage = () => {
  const [analyticsData, setAnalyticsData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalyticsData = async () => {
      try {
        const { data, error } = await supabase
          .from('analytics')
          .select('*');

        if (error) throw error;

        setAnalyticsData(data);
      } catch (error) {
        console.error('Error fetching analytics data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalyticsData();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div className="min-h-screen p-6">
      <AdminNav />
      <h1 className="text-2xl font-bold mb-4">Analytics</h1>
      <AdminStats data={analyticsData} />
      {/* Add visualizations for metrics here */}
      <div className="mt-6">
        <h2 className="text-xl font-semibold">Most Requested Destinations</h2>
        {/* Visualization component for most requested destinations */}
      </div>
      <div className="mt-6">
        <h2 className="text-xl font-semibold">Average Wait and Completion Times</h2>
        {/* Visualization component for average wait and completion times */}
      </div>
    </div>
  );
};

export default AnalyticsPage;