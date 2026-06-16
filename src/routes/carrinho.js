const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../../data/supabase.js');
const { verificarToken } = require('../middlewares/auth.js');

router.use(verificarToken);

// GET - Listar carrinho (leitura com supabase normal, RLS filtra pelo usuário)
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('carrinho_itens')
        .select('*, produto:produto_id(*)')
        .eq('usuario_id', req.user.id);

    if (error) {
        return res.status(500).json({ error: error.message });
    }

    const total = data.reduce((sum, item) => sum + (item.produto.preco * item.quantidade), 0);
    res.json({ itens: data, total });
});

// POST - Adicionar item (escrita com supabaseAdmin para bypass RLS)
router.post('/', async (req, res) => {
    const { produto_id, quantidade } = req.body;
    if (!produto_id) {
        return res.status(400).json({ error: 'Produto é obrigatório' });
    }

    // Verificar disponibilidade
    const { data: produto, error: prodError } = await supabase
        .from('produtos')
        .select('id, disponivel, quantidade_estoque')
        .eq('id', produto_id)
        .single();

    if (prodError || !produto || !produto.disponivel) {
        return res.status(404).json({ error: 'Produto não disponível' });
    }

    // Verificar se já existe no carrinho
    const { data: existing } = await supabase
        .from('carrinho_itens')
        .select('id, quantidade')
        .eq('usuario_id', req.user.id)
        .eq('produto_id', produto_id)
        .single();

    if (existing) {
        const novaQuantidade = existing.quantidade + (quantidade || 1);
        const { data, error } = await supabaseAdmin
            .from('carrinho_itens')
            .update({ quantidade: novaQuantidade })
            .eq('id', existing.id)
            .select()
            .single();

        if (error) {
            return res.status(500).json({ error: error.message });
        }
        return res.json(data);
    }

    const { data, error } = await supabaseAdmin
        .from('carrinho_itens')
        .insert([{
            usuario_id: req.user.id,
            produto_id,
            quantidade: quantidade || 1
        }])
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
});

// PUT - Atualizar quantidade
router.put('/:itemId', async (req, res) => {
    const { itemId } = req.params;
    const { quantidade } = req.body;

    if (!quantidade || quantidade < 1) {
        return res.status(400).json({ error: 'Quantidade inválida' });
    }

    const { data, error } = await supabaseAdmin
        .from('carrinho_itens')
        .update({ quantidade })
        .eq('id', itemId)
        .eq('usuario_id', req.user.id)
        .select()
        .single();

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// DELETE - Remover item específico
router.delete('/:itemId', async (req, res) => {
    const { itemId } = req.params;
    const { error } = await supabaseAdmin
        .from('carrinho_itens')
        .delete()
        .eq('id', itemId)
        .eq('usuario_id', req.user.id);

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json({ message: 'Item removido do carrinho' });
});

// DELETE - Limpar carrinho
router.delete('/', async (req, res) => {
    const { error } = await supabaseAdmin
        .from('carrinho_itens')
        .delete()
        .eq('usuario_id', req.user.id);

    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json({ message: 'Carrinho limpo com sucesso' });
});

module.exports = router;