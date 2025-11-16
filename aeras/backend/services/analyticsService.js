const { supabase } = require('../lib/supabaseClient');

async function getActiveUsers() {
    const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true);

    if (error) {
        throw new Error(`Error fetching active users: ${error.message}`);
    }
    return data;
}

async function getRideAnalytics() {
    const { data, error } = await supabase
        .from('rides')
        .select('destination_location_id, status, created_at')
        .order('created_at', { ascending: false });

    if (error) {
        throw new Error(`Error fetching ride analytics: ${error.message}`);
    }

    const analytics = {
        totalRides: data.length,
        completedRides: data.filter(ride => ride.status === 'COMPLETED').length,
        canceledRides: data.filter(ride => ride.status === 'CANCELED').length,
        mostRequestedDestinations: getMostRequestedDestinations(data),
    };

    return analytics;
}

function getMostRequestedDestinations(rides) {
    const destinationCount = rides.reduce((acc, ride) => {
        acc[ride.destination_location_id] = (acc[ride.destination_location_id] || 0) + 1;
        return acc;
    }, {});

    return Object.entries(destinationCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5);
}

module.exports = {
    getActiveUsers,
    getRideAnalytics,
};