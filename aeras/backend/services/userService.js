const { supabase } = require('../lib/supabaseClient');

const userService = {
    getAllUsers: async () => {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw new Error(error.message);
        return data;
    },

    getUserById: async (userId) => {
        const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();
        if (error) throw new Error(error.message);
        return data;
    },

    banUser: async (userId) => {
        const { error } = await supabase.from('users').update({ banned: true }).eq('id', userId);
        if (error) throw new Error(error.message);
        return { message: 'User banned successfully' };
    },

    unbanUser: async (userId) => {
        const { error } = await supabase.from('users').update({ banned: false }).eq('id', userId);
        if (error) throw new Error(error.message);
        return { message: 'User unbanned successfully' };
    },

    suspendUser: async (userId) => {
        const { error } = await supabase.from('users').update({ suspended: true }).eq('id', userId);
        if (error) throw new Error(error.message);
        return { message: 'User suspended successfully' };
    },

    reactivateUser: async (userId) => {
        const { error } = await supabase.from('users').update({ suspended: false }).eq('id', userId);
        if (error) throw new Error(error.message);
        return { message: 'User reactivated successfully' };
    }
};

module.exports = userService;