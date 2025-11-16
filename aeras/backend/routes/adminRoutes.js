const express = require('express');
const { getActiveUsers, getRideData } = require('../services/analyticsService');
const { banUser, suspendUser, getUsers } = require('../services/userService');

const router = express.Router();

// Route to get active users
router.get('/active-users', async (req, res) => {
    try {
        const activeUsers = await getActiveUsers();
        res.status(200).json(activeUsers);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching active users', error });
    }
});

// Route to get ride data
router.get('/ride-data', async (req, res) => {
    try {
        const rideData = await getRideData();
        res.status(200).json(rideData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching ride data', error });
    }
});

// Route to get all users
router.get('/users', async (req, res) => {
    try {
        const users = await getUsers();
        res.status(200).json(users);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching users', error });
    }
});

// Route to ban a user
router.post('/users/ban/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await banUser(id);
        res.status(200).json({ message: 'User banned successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error banning user', error });
    }
});

// Route to suspend a user
router.post('/users/suspend/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await suspendUser(id);
        res.status(200).json({ message: 'User suspended successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error suspending user', error });
    }
});

module.exports = router;