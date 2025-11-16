
module.exports = (supabase, mqttClient) => {
    console.log('🔗 Attaching Supabase Realtime Listener to rides table...');
    supabase
        .channel('ride_status_updates')
        .on(
            'postgres_changes',
            { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'rides' 
            },
            (payload) => {
                const { 
                    status: newStatus, 
                    passenger_id: passengerId, 
                    puller_id: pullerId 
                } = payload.new;

                if (newStatus === 'ACCEPTED' || newStatus === 'ACTIVE' || newStatus === 'COMPLETED') {
                    
                    const message = JSON.stringify({
                        status: newStatus,
                        puller_id: pullerId || 'N/A',
                        timestamp: new Date().toISOString()
                    });

                    const topic = `/devices/${passengerId}/status`;

                    mqttClient.publish(topic, message, { qos: 1, retain: false }, (err) => {
                        if (err) {
                            console.error(`MQTT Publish Error for topic ${topic}:`, err);
                        } else {
                            console.log(`Published status [${newStatus}] to device topic ${topic}`);
                        }
                    });
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                console.log('Supabase Realtime Channel SUBSCRIBED');
            } else if (status === 'CHANNEL_ERROR') {
                console.error('Supabase Realtime Channel Error!');
            }
        });
};