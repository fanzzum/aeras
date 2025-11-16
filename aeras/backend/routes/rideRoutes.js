const express = require('express');
const { supabase } = require('../server');

const router = express.Router();

// Get all rides
router.get('/', async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('rides')
            .select('*');

        if (error) throw error;

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching rides', error: error.message });
    }
});

// Get ride by ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('rides')
            .select('*')
            .eq('ride_id', id)
            .single();

        if (error) throw error;

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ message: 'Error fetching ride', error: error.message });
    }
});

// Update ride status
router.put('/:id/status', async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
        return res.status(400).json({ message: 'Status is required' });
    }

    try {
        const { data, error } = await supabase
            .from('rides')
            .update({ status })
            .eq('ride_id', id)
            .single();

        if (error) throw error;

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ message: 'Error updating ride status', error: error.message });
    }
});

// Delete ride
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('rides')
            .delete()
            .eq('ride_id', id);

        if (error) throw error;

        return res.status(204).send();
    } catch (error) {
        return res.status(500).json({ message: 'Error deleting ride', error: error.message });
    }
});

module.exports = router;