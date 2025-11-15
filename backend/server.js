require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const mqttClient = require('mqtt');

const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY
);
const mqtt = mqtt.connect(process.env.MQTT_BROKER_URL);

mqttClient.on('connect', () => {
    console.log('MQTT Client Connected');
});



app.post('/api/v1/puller/signup', async (req, res) => {
    const { email, password, name, phone_number } = req.body;

    if (!email || !password || !name) {
        return res.status(400).json({ message: 'Missing required sign-up fields.' });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: password,
    });
    const authUuid = authData.user.id;
    const pullerId = crypto.randomUUID();


    const newPullerData = {
        puller_id: pullerId,
        auth_uuid: authUuid,
        name: name,
        phone_number: phone_number,
        status: true,
    };

    const { data: pullerInsertData, error: pullerInsertError } = await supabase
        .from('pullers')
        .insert([newPullerData]);

    if (pullerInsertError) {
        await supabase.auth.admin.deleteUser(authUuid);
        console.error('Puller DB Insert Failed, Auth Account Deleted:', pullerInsertError.message);
        return res.status(500).json({ message: 'Failed to register puller details. Please contact support.' });
    }

    return res.status(201).json({
        message: 'Puller account created successfully. Ready for login.',
        puller_id: pullerId,
        user_auth_uuid: authUuid,
    });



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
            .select('admin_id, is_super_admin') 
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





app.listen(PORT, () => {
    console.log('server running on port ${PORT}');
    require('./realtimeListener')(supabase, mqttClient);
});

module.exports = { app, supabase, mqttClient };


