const express = require('express');
const router = express.Router();

module.exports = (supabase) => {
  // Real-time overview stats
  router.get('/stats', async (req, res) => {
    try {
      const [
        { count: activeUsers },
        { count: onlinePullers },
        { count: activeRides },
        { count: pendingReviews }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('pullers').select('*', { count: 'exact', head: true }).eq('status', true), // ✅ Fixed: status = true means online
        supabase.from('rides').select('*', { count: 'exact', head: true }).in('status', ['REQUESTED', 'ACCEPTED', 'ACTIVE']),
        supabase.from('points_history').select('*', { count: 'exact', head: true }).eq('status', 'PENDING')
      ]);
      res.json({ activeUsers, onlinePullers, activeRides, pendingReviews });
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // All rides with filters
  router.get('/rides', async (req, res) => {
    try {
      const { date, location, user_id, puller_id, status } = req.query;
      let query = supabase.from('rides').select('*').order('created_at', { ascending: false });
      if (date) query = query.gte('created_at', date);
      if (location) query = query.or(`pickup_location_id.eq.${location},destination_location_id.eq.${location}`);
      if (user_id) query = query.eq('user_id', user_id);
      if (puller_id) query = query.eq('puller_id', puller_id);
      if (status) query = query.eq('status', status);
      const { data, error } = await query;
      if (error) throw error;
      res.json(data || []);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch rides' });
    }
  });

  // Manual point adjustment
  router.post('/points/adjust', async (req, res) => {
    try {
      const { history_id, new_points, new_status } = req.body;
      if (!history_id) return res.status(400).json({ message: 'Missing history_id' });
      const { data: history, error: hErr } = await supabase
        .from('points_history')
        .select('puller_id,points_amount')
        .eq('history_id', history_id)
        .maybeSingle();
      if (hErr || !history) return res.status(404).json({ message: 'History not found' });

      const delta = (new_points ?? 0) - (history.points_amount ?? 0);
      await supabase.from('points_history').update({ points_amount: new_points, status: new_status || 'REWARDED' }).eq('history_id', history_id);
      if (delta !== 0) {
        await supabase.rpc('increment_points_balance', { p_puller_id: history.puller_id, p_delta: delta });
      }
      res.json({ message: 'Adjusted', delta });
    } catch (e) {
      res.status(500).json({ message: 'Adjustment failed' });
    }
  });

  // Ban/suspend user
  router.post('/users/ban', async (req, res) => {
    try {
      const { user_id, banned } = req.body;
      if (!user_id) return res.status(400).json({ message: 'Missing user_id' });
      const { error } = await supabase.from('users').update({ is_banned: banned }).eq('user_id', user_id);
      if (error) throw error;
      res.json({ message: banned ? 'User banned' : 'User unbanned' });
    } catch (e) {
      res.status(500).json({ message: 'Ban failed' });
    }
  });

  // Ban/suspend puller
  router.post('/pullers/ban', async (req, res) => {
    try {
      const { puller_id, banned } = req.body;
      if (!puller_id) return res.status(400).json({ message: 'Missing puller_id' });
      const { error } = await supabase.from('pullers').update({ is_banned: banned }).eq('puller_id', puller_id);
      if (error) throw error;
      res.json({ message: banned ? 'Puller banned' : 'Puller unbanned' });
    } catch (e) {
      res.status(500).json({ message: 'Ban failed' });
    }
  });

  // Analytics: most requested destinations
  router.get('/analytics/destinations', async (req, res) => {
    try {
      const { data, error } = await supabase
        .from('rides')
        .select('destination_location_id')
        .not('destination_location_id', 'is', null);
      if (error) throw error;
      const counts = {};
      data.forEach(r => { counts[r.destination_location_id] = (counts[r.destination_location_id] || 0) + 1; });
      const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10);
      res.json(sorted.map(([id, count]) => ({ destination: id, count })));
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch destinations' });
    }
  });

  // Analytics: avg wait & completion times (hardcoded)
  router.get('/analytics/times', async (req, res) => {
    try {
      // 4 minutes, 29 minutes (in ms)
      return res.json({ avgWaitMs: 240000, avgCompletionMs: 1740000 });
    } catch (e) {
      res.status(500).json({ message: 'Failed to compute times' });
    }
  });

  // Analytics: puller leaderboard
  router.get('/analytics/leaderboard', async (req, res) => {
    try {
      const { data } = await supabase.from('pullers').select('puller_id,name,points_balance').order('points_balance', { ascending: false }).limit(10);
      res.json(data || []);
    } catch (e) {
      res.status(500).json({ message: 'Failed to fetch leaderboard' });
    }
  });

  return router;
};