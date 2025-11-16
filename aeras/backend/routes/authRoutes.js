const express = require('express');
const { supabase } = require('../server'); // Adjust the path as necessary

const router = express.Router();

// Admin login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });

    if (error) {
        return res.status(401).json({ message: 'Invalid credentials' });
    }

    const { user } = data;
    const { id, email: userEmail } = user;

    return res.status(200).json({
        message: 'Login successful',
        userId: id,
        email: userEmail,
    });
});

// Admin signup route
router.post('/signup', async (req, res) => {
    const { email, password } = req.body;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
    });

    if (error) {
        return res.status(400).json({ message: 'Signup failed', error });
    }

    return res.status(201).json({
        message: 'Signup successful',
        userId: data.user.id,
    });
});

module.exports = router;