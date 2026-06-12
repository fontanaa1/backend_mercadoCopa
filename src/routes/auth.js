const express = require('express');
const router = express.Router();
const { supabase } = require('../../data/supabase.js');
const { verificarToken } = require('../middlewares/auth.js');

router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
    });
    
    if (error) {
        return res.status(401).json({ error: error.message });
    }
    
    res.json({ user: data.user, session: data.session });
});

router.post('/register', async (req, res) => {
    const { email, password, nome, username } = req.body;
    
    if (!email || !password) {
        return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }
    
    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            data: { nome, username }
        }
    });
    
    if (error) {
        return res.status(400).json({ error: error.message });
    }
    
    res.json({ user: data.user, message: 'Cadastro realizado com sucesso!' });
});

router.post('/logout', verificarToken, async (req, res) => {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    
    res.json({ message: 'Logout realizado com sucesso' });
});

router.get('/me', verificarToken, async (req, res) => {
    res.json({ user: req.user });
});

module.exports = router;