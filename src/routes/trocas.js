const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../../data/supabase.js');
const { verificarToken } = require('../middlewares/auth.js');

router.use(verificarToken);

// GET - Listar trocas do usuário
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('trocas')
        .select(`
            *,
            solicitante:solicitante_id(email, raw_user_meta_data),
            receptor:receptor_id(email, raw_user_meta_data),
            produto_solicitante:produto_solicitante_id(*),
            produto_receptor:produto_receptor_id(*)
        `)
        .or(`solicitante_id.eq.${req.user.id},receptor_id.eq.${req.user.id}`);
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// POST - Propor troca
router.post('/', async (req, res) => {
    const { receptor_id, produto_solicitante_id, produto_receptor_id, mensagem } = req.body;

    if (!receptor_id || !produto_solicitante_id || !produto_receptor_id) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Verificar propriedade
    const { data: produtoSol, error: errSol } = await supabase
        .from('produtos')
        .select('usuario_id')
        .eq('id', produto_solicitante_id)
        .single();
    if (errSol || produtoSol.usuario_id !== req.user.id) {
        return res.status(403).json({ error: 'Você não é dono do produto solicitante' });
    }

    const { data: produtoRec, error: errRec } = await supabase
        .from('produtos')
        .select('usuario_id')
        .eq('id', produto_receptor_id)
        .single();
    if (errRec || produtoRec.usuario_id !== receptor_id) {
        return res.status(403).json({ error: 'Produto receptor não pertence ao vendedor informado' });
    }

    const { data, error } = await supabaseAdmin
        .from('trocas')
        .insert([{
            solicitante_id: req.user.id,
            receptor_id,
            produto_solicitante_id,
            produto_receptor_id,
            mensagem,
            status: 'pendente'
        }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// PUT - Responder troca
router.put('/:trocaId/responder', async (req, res) => {
    const { trocaId } = req.params;
    const { aceitar } = req.body;

    const { data: troca, error: findError } = await supabase
        .from('trocas')
        .select('receptor_id, status')
        .eq('id', trocaId)
        .single();
    if (findError || !troca) return res.status(404).json({ error: 'Troca não encontrada' });
    if (troca.receptor_id !== req.user.id) return res.status(403).json({ error: 'Apenas o receptor pode responder' });
    if (troca.status !== 'pendente') return res.status(400).json({ error: 'Esta troca já foi respondida' });

    const novoStatus = aceitar ? 'aceita' : 'recusada';
    const { data, error } = await supabaseAdmin
        .from('trocas')
        .update({ status: novoStatus, updated_at: new Date() })
        .eq('id', trocaId)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });

    if (aceitar) {
        await supabaseAdmin
            .from('produtos')
            .update({ disponivel: false })
            .in('id', [data.produto_solicitante_id, data.produto_receptor_id]);
    }

    res.json(data);
});

module.exports = router;