// backend/src/routes/pedidos.js
const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../../data/supabase.js');

function getToken(req) {
    return req.headers.authorization?.split('Bearer ')[1];
}

async function verificarToken(token) {
    if (!token) return null;
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) return null;
    return user;
}

// GET - Listar pedidos do usuário
router.get('/', async (req, res) => {
    const token = getToken(req);
    const user = await verificarToken(token);
    
    if (!user) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    
    // Buscar pedidos com seus itens
    const { data: pedidos, error } = await supabase
        .from('pedidos')
        .select(`
            *,
            itens:pedido_itens(
                *,
                produto:produtos(*)
            )
        `)
        .eq('usuario_id', user.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    
    res.json(pedidos || []);
});

// POST - Criar pedido
router.post('/', async (req, res) => {
    const token = getToken(req);
    const user = await verificarToken(token);
    
    if (!user) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const { items, total, forma_pagamento, endereco_id } = req.body;
    
    if (!items || !items.length || !total) {
        return res.status(400).json({ error: 'Items e total são obrigatórios' });
    }
    
    // Buscar endereço se fornecido
    let enderecoData = null;
    if (endereco_id) {
        const { data: endereco } = await supabase
            .from('enderecos')
            .select('*')
            .eq('id', endereco_id)
            .eq('usuario_id', user.id)
            .single();
        enderecoData = endereco;
    }
    
    // Gerar número do pedido
    const numeroPedido = 'MC-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    
    // Criar pedido
    const { data: pedido, error: pedidoError } = await supabase
        .from('pedidos')
        .insert([{
            usuario_id: user.id,
            numero_pedido: numeroPedido,
            total: total,
            forma_pagamento: forma_pagamento,
            status: 'processando',
            endereco_id: endereco_id || null,
            endereco_entrega: enderecoData
        }])
        .select()
        .single();
    
    if (pedidoError) {
        return res.status(500).json({ error: pedidoError.message });
    }
    
    // Criar itens do pedido
    const itensPedido = items.map(item => ({
        pedido_id: pedido.id,
        produto_id: item.produto_id,
        quantidade: item.quantidade,
        preco_unitario: item.preco_unitario
    }));
    
    const { error: itensError } = await supabase
        .from('pedido_itens')
        .insert(itensPedido);
    
    if (itensError) {
        // Se erro, deletar pedido
        await supabase.from('pedidos').delete().eq('id', pedido.id);
        return res.status(500).json({ error: itensError.message });
    }
    
    // Atualizar estoque dos produtos
    for (const item of items) {
        const { data: produto } = await supabase
            .from('produtos')
            .select('quantidade_estoque')
            .eq('id', item.produto_id)
            .single();
        
        if (produto) {
            await supabase
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
    const token = getToken(req);
    const user = await verificarToken(token);
    
    if (!user) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    
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
        .eq('usuario_id', user.id)
        .single();
    
    if (error) {
        return res.status(404).json({ error: 'Pedido não encontrado' });
    }
    
    res.json(data);
});

module.exports = router;
