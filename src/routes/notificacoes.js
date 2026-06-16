const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../../data/supabase.js');
const { verificarToken } = require('../middlewares/auth.js');

router.use(verificarToken);

// GET - Listar notificações
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('notificacoes')
        .select('*')
        .eq('usuario_id', req.user.id)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// PUT - Marcar como lida
router.put('/:id/ler', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabaseAdmin
        .from('notificacoes')
        .update({ lida: true })
        .eq('id', id)
        .eq('usuario_id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

// PUT - Marcar todas como lidas
router.put('/marcar-todas', async (req, res) => {
    const { error } = await supabaseAdmin
        .from('notificacoes')
        .update({ lida: true })
        .eq('usuario_id', req.user.id)
        .eq('lida', false);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ success: true });
});

module.exports = router;