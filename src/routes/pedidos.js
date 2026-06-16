const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../../data/supabase.js');
const { verificarToken } = require('../middlewares/auth.js');

router.use(verificarToken);

// GET - Listar pedidos do usuário
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('pedidos')
        .select(`
            *,
            itens:pedido_itens(
                *,
                produto:produtos(*)
            )
        `)
        .eq('usuario_id', req.user.id)
        .order('created_at', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data || []);
});

// POST - Criar pedido
router.post('/', async (req, res) => {
    const { items, total, forma_pagamento, endereco_id } = req.body;
    if (!items || !items.length || !total) {
        return res.status(400).json({ error: 'Items e total são obrigatórios' });
    }

    let enderecoData = null;
    if (endereco_id) {
        const { data: endereco } = await supabase
            .from('enderecos')
            .select('*')
            .eq('id', endereco_id)
            .eq('usuario_id', req.user.id)
            .single();
        enderecoData = endereco;
    }

    const numeroPedido = 'MC-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');

    // Inserir pedido com supabaseAdmin (SEM endereco_id, apenas endereco_entrega)
    const { data: pedido, error: pedidoError } = await supabaseAdmin
        .from('pedidos')
        .insert([{
            usuario_id: req.user.id,
            numero_pedido: numeroPedido,
            total: total,
            forma_pagamento: forma_pagamento,
            status: 'processando',
            endereco_entrega: enderecoData  // apenas este campo
        }])
        .select()
        .single();
    if (pedidoError) return res.status(500).json({ error: pedidoError.message });

    // Inserir itens do pedido
    const itensPedido = items.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
    }));
    const { error: itensError } = await supabaseAdmin
        .from('pedido_itens')
        .insert(itensPedido);
    if (itensError) {
        await supabaseAdmin.from('pedidos').delete().eq('id', pedido.id);
        return res.status(500).json({ error: itensError.message });
    }

    // Atualizar estoque
    for (const item of items) {
        const { data: produto } = await supabase
            .from('produtos')
            .select('quantidade_estoque')
            .eq('id', item.produto_id)
            .single();
        if (produto) {
            await supabaseAdmin
                .from('produtos')
                .update({
                    quantidade_estoque: Math.max(0, produto.quantidade_estoque - item.quantidade),
                    disponivel: produto.quantidade_estoque - item.quantidade > 0
                })
                .eq('id', item.produto_id);
        }
    }

    res.status(201).json(pedido);
});

// GET - Buscar pedido por ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('pedidos')
        .select(`
            *,
            itens:pedido_itens(
                *,
                produto:produtos(*)
            )
        `)
        .eq('id', id)
        .eq('usuario_id', req.user.id)
        .single();
    if (error) return res.status(404).json({ error: 'Pedido não encontrado' });
    res.json(data);
});

module.exports = router;
