require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const mqtt = require('mqtt');
const cors = require('cors');
const crypto = require('crypto');
const adminRoutes = require('./routes/adminRoutes');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
    origin: 'http://localhost:3000',
    credentials: true
}));
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);
const mqttClient = mqtt.connect(process.env.MQTT_BROKER_URL);

mqttClient.on('connect', () => {
    console.log('MQTT Client Connected');
});

app.post('/api/v1/puller/signup', async (req, res) => {
    const { email, password, name, phone_number } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ message: 'Missing required sign-up fields.' });
    }

    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: email,
            password: password,
        });

        if (authError) {
            return res.status(400).json({ message: authError.message });
        }

        const authUuid = authData.user.id;

        const newPullerData = {
            auth_uuid: authUuid,
            name: name,
            phone_number: phone_number,
            status: true,
            points_balance: 0
        };

        const { data: pullerInsertData, error: pullerInsertError } = await supabase
            .from('pullers')
            .insert([newPullerData])
            .select()
            .single();

        if (pullerInsertError) {
            console.error('Puller DB Insert Failed:', pullerInsertError);
            
            try {
                await supabase.auth.admin.deleteUser(authUuid);
                console.log('Successfully deleted orphaned auth user');
            } catch (deleteError) {
                console.error('Failed to delete auth user:', deleteError);
            }
            
            return res.status(500).json({ 
                message: 'Failed to register puller details.',
                error: pullerInsertError.message 
            });
        }

        return res.status(201).json({
            message: 'Puller account created successfully.',
            puller_id: pullerInsertData.puller_id,
            user_auth_uuid: authUuid,
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ message: 'Server error during signup' });
    }
});

app.post('/api/v1/login', async (req, res) => {
    const { email, password } = req.body;
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: email,
        password: password,
    });
    if (authError) {
        console.warn('Authentication Error:', authError.message);
        return res.status(401).json({ message: 'Invalid credentials or user not found.' });
    }

    const token = authData.session.access_token;
    const authUuid = authData.user.id;

    let role = null;
    let customId = null;
    const { data: pullerData } = await supabase
        .from('pullers')
        .select('puller_id')
        .eq('auth_uuid', authUuid)
        .maybeSingle();

    if (pullerData) {
        role = 'PULLER';
        customId = pullerData.puller_id;
    } else {
        const { data: adminData } = await supabase
            .from('admins')
            .select('admin_id') 
            .eq('auth_uuid', authUuid)
            .maybeSingle();

        if (adminData) {
            role = 'ADMIN';
            customId = adminData.admin_id; 
        }
    }

    if (!role) {
        return res.status(403).json({ message: 'Access denied: Account lacks required role.' });
    }
    return res.status(200).json({
        message: 'Login successful',
        user_auth_uuid: authUuid,
        custom_id: customId,
        role: role,
        token: token
    });
});

app.post('/api/v1/ride/request', async (req, res) => {
    const { user_id, pickup_location_id, destination_location_id } = req.body;

    if (!user_id || !pickup_location_id || !destination_location_id) {
        return res.status(400).json({ message: 'Missing required request fields.' });
    }

    const { data: userData, error: userError } = await supabase
        .from('passengers')
        .select('*', { head: true, count: 'exact' })
        .eq('user_id', user_id);

    if (userError || userData === null || userData.count === 0) {
        return res.status(404).json({ message: 'Passenger ID not recognized. Request denied.' });
    }

    const newRide = {
        passenger_id: user_id,
        pickup_location_id,
        destination_location_id,
        status: 'REQUESTED'
    };

    const { data, error } = await supabase
        .from('rides')
        .insert([newRide])
        .select()
        .single();

    if (error) {
        console.error('Ride insertion error:', error);
        return res.status(500).json({ message: 'Failed to request ride', details: error.message });
    }
    return res.status(201).json({
        message: 'Ride requested successfully. Waiting for Puller.',
        ride_id: data.id,
        status: data.status
    });
});

// Helper: Haversine distance (meters)
function distanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = d => d * Math.PI / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2)**2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
            Math.sin(dLon/2)**2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Complete ride + award points
app.post('/api/v1/ride/complete', async (req, res) => {
  try {
    const { ride_id } = req.body;
    if (!ride_id) return res.status(400).json({ message: 'Missing ride_id.' });

    // Fetch ride
    const { data: ride, error: rideErr } = await supabase
      .from('rides')
      .select('ride_id,puller_id,status')
      .eq('ride_id', ride_id)
      .maybeSingle();

    if (rideErr || !ride) return res.status(404).json({ message: 'Ride not found.' });
    if (!ride.puller_id) return res.status(400).json({ message: 'No puller assigned.' });
    if (!['ACTIVE','ACCEPTED'].includes(ride.status))
      return res.status(400).json({ message: 'Ride not in progress.' });

    // Update ride status
    const { error: updErr } = await supabase
      .from('rides')
      .update({ status: 'COMPLETED', completed_at: new Date().toISOString() })
      .eq('ride_id', ride_id)
      .in('status', ['ACTIVE','ACCEPTED']);
    if (updErr) return res.status(500).json({ message: 'Ride update failed.' });

    // Fixed points: 30
    const fixedPoints = 30;

    // Increment puller balance (RPC preferred; fallback direct update)
    const { error: rpcErr } = await supabase.rpc('increment_points_balance', {
      p_puller_id: ride.puller_id,
      p_delta: fixedPoints
    });
    if (rpcErr) {
      // Fallback: fetch then update
      const { data: puller } = await supabase
        .from('pullers')
        .select('points_balance')
        .eq('puller_id', ride.puller_id)
        .maybeSingle();
      const current = puller?.points_balance || 0;
      await supabase
        .from('pullers')
        .update({ points_balance: current + fixedPoints })
        .eq('puller_id', ride.puller_id);
    }

    // Log history
    await supabase.from('points_history').insert({
      puller_id: ride.puller_id,
      ride_id,
      points_amount: fixedPoints,
      status: 'REWARDED',
      transaction_date: new Date().toISOString(),
      type: 'RIDE_REWARD'
    });

    return res.json({
      ride_id,
      points_awarded: fixedPoints,
      points_status: 'REWARDED'
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Server error completing ride.' });
  }
});

app.use('/api/v1/admin', adminRoutes(supabase));

// Manual ride request simulator (fake MQTT)
app.post('/api/v1/simulate/ride-request', async (req, res) => {
  try {
    const { pickup_location_id, destination_location_id, user_id } = req.body;
    
    // Create a new ride request - don't set passenger_id or puller_id (both can be null for simulation)
    const { data: ride, error } = await supabase
      .from('rides')
      .insert({
        // passenger_id: user_id || null,  // Remove this if causing FK issues
        pickup_location_id,
        destination_location_id,
        status: 'REQUESTED',
        created_at: new Date().toISOString()
        // Don't include puller_id - it's assigned when puller accepts
      })
      .select()
      .single();
    
    if (error) {
      console.error('Simulate ride error:', error);
      throw error;
    }
    
    res.json({ message: 'Ride request created', ride });
  } catch (e) {
    console.error('Simulate ride exception:', e);
    res.status(500).json({ message: 'Failed to create ride request', error: e.message });
  }
});

// NOW start the server
app.listen(PORT, () => {
    console.log(`server running on port ${PORT}`);
    require('./realtimeListener')(supabase, mqttClient);
});

module.exports = { app, supabase, mqttClient };


