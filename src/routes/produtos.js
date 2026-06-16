const express = require('express');
const router = express.Router();
const { supabase } = require('../../data/supabase.js');
const { verificarToken } = require('../middlewares/auth.js');

// GET - Listar produtos (público) - sem JOIN
router.get('/', async (req, res) => {
    const { categoria, busca, minPreco, maxPreco, tipo_oferta } = req.query;
    
    let query = supabase
        .from('produtos')
        .select('*')  // sem join
        .eq('disponivel', true);
    
    if (categoria && categoria !== 'todos') {
        query = query.eq('categoria', categoria);
    }
    if (tipo_oferta && tipo_oferta !== 'todos') {
        query = query.eq('tipo_oferta', tipo_oferta);
    }
    if (minPreco) {
        query = query.gte('preco', parseFloat(minPreco));
    }
    if (maxPreco) {
        query = query.lte('preco', parseFloat(maxPreco));
    }
    if (busca) {
        query = query.ilike('titulo', `%${busca}%`);
    }
    
    const { data: produtos, error } = await query.order('created_at', { ascending: false });
    if (error) {
        return res.status(500).json({ error: error.message });
    }

    // Buscar dados dos usuários manualmente
    if (produtos && produtos.length > 0) {
        const userIds = [...new Set(produtos.map(p => p.user_id).filter(id => id))];
        if (userIds.length > 0) {
            const { data: users, error: userError } = await supabase
                .from('auth.users')
                .select('id, email, raw_user_meta_data')
                .in('id', userIds);
            
            if (!userError && users) {
                const userMap = Object.fromEntries(users.map(u => [u.id, u]));
                produtos.forEach(p => {
                    p.usuario = userMap[p.user_id] || null;
                });
            }
        }
    }

    res.json(produtos);
});

// GET - Buscar produto por ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const { data: produto, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }

    // Buscar dados do usuário
    if (produto.user_id) {
        const { data: user, error: userError } = await supabase
            .from('auth.users')
            .select('id, email, raw_user_meta_data')
            .eq('id', produto.user_id)
            .single();
        if (!userError && user) {
            produto.usuario = user;
        }
    }

    res.json(produto);
});

// POST - Criar produto (autenticado)
router.post('/', verificarToken, async (req, res) => {
    const { titulo, descricao, categoria, selecao, ano, preco, tipo_oferta, tamanho, estado, imagem_url, quantidade_estoque } = req.body;
    
    if (!titulo || !preco || !categoria) {
        return res.status(400).json({ error: 'Título, preço e categoria são obrigatórios' });
    }
    
    const { data, error } = await supabase
        .from('produtos')
        .insert([{
            user_id: req.user.id,
            titulo,
            descricao,
            categoria,
            selecao,
            ano,
            preco,
            tipo_oferta: tipo_oferta || 'venda',
            tamanho,
            estado,
            imagem_url,
            quantidade_estoque: quantidade_estoque || 1,
            disponivel: true
        }])
        .select()
        .single();
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.status(201).json(data);
});

// PUT - Atualizar produto (autenticado, apenas dono)
router.put('/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const { data: produto, error: findError } = await supabase
        .from('produtos')
        .select('user_id')
        .eq('id', id)
        .single();
    
    if (findError || !produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    if (produto.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Você não tem permissão para editar este produto' });
    }
    
    const { data, error } = await supabase
        .from('produtos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

// DELETE - Remover produto (autenticado, apenas dono)
router.delete('/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    
    const { data: produto, error: findError } = await supabase
        .from('produtos')
        .select('user_id')
        .eq('id', id)
        .single();
    
    if (findError || !produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    if (produto.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Você não tem permissão para deletar este produto' });
    }
    
    const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json({ message: 'Produto deletado com sucesso' });
});

// GET - Meus produtos (autenticado)
router.get('/meus', verificarToken, async (req, res) => {
    const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('user_id', req.user.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
});

module.exports = router;
