const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../../data/supabase.js');
const { verificarToken } = require('../middlewares/auth.js');

// GET - Avaliações de um vendedor (público)
router.get('/vendedor/:vendedorId', async (req, res) => {
    const { vendedorId } = req.params;
    const { data, error } = await supabase
        .from('avaliacoes')
        .select('*, comprador:comprador_id(email, raw_user_meta_data)')
        .eq('vendedor_id', vendedorId)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST - Criar avaliação (autenticado)
router.post('/', verificarToken, async (req, res) => {
    const { vendedor_id, produto_id, nota, comentario } = req.body;
    if (!vendedor_id || !nota) return res.status(400).json({ error: 'Vendedor e nota são obrigatórios' });
    if (nota < 1 || nota > 5) return res.status(400).json({ error: 'Nota entre 1 e 5' });

    const { data, error } = await supabaseAdmin
        .from('avaliacoes')
        .insert([{
            vendedor_id,
            comprador_id: req.user.id,
            produto_id,
            nota,
            comentario
        }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// GET - Média de avaliações
router.get('/media/:vendedorId', async (req, res) => {
    const { vendedorId } = req.params;
    const { data, error } = await supabase
        .from('avaliacoes')
        .select('nota')
        .eq('vendedor_id', vendedorId);
    if (error) return res.status(500).json({ error: error.message });

    const media = data.length > 0 ? data.reduce((s, a) => s + a.nota, 0) / data.length : 0;
    res.json({
        vendedor_id: vendedorId,
        media: parseFloat(media.toFixed(1)),
        total_avaliacoes: data.length
    });
});

module.exports = router;