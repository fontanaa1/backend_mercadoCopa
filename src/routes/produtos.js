const express = require('express');
const router = express.Router();
const { supabase, supabaseAdmin } = require('../../data/supabase.js');
const { verificarToken } = require('../middlewares/auth.js');

// GET - Listar produtos (público) - com busca de usuário via Admin API
router.get('/', async (req, res) => {
    const { categoria, busca, minPreco, maxPreco, tipo_oferta } = req.query;
    
    let query = supabase
        .from('produtos')
        .select('*')
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

    // Buscar dados dos usuários via Admin API
    if (produtos && produtos.length > 0) {
        const userIds = [...new Set(produtos.map(p => p.usuario_id).filter(id => id))];
        if (userIds.length > 0) {
            const userPromises = userIds.map(id => supabaseAdmin.auth.admin.getUserById(id));
            const userResults = await Promise.all(userPromises);
            const userMap = {};
            userResults.forEach(res => {
                if (!res.error && res.data && res.data.user) {
                    const u = res.data.user;
                    userMap[u.id] = {
                        id: u.id,
                        email: u.email,
                        raw_user_meta_data: u.user_metadata
                    };
                }
            });
            produtos.forEach(p => {
                p.usuario = userMap[p.usuario_id] || null;
            });
        }
    }

    res.json(produtos);
});

// GET - Meus produtos (usando supabaseAdmin para garantir retorno)
router.get('/meus', verificarToken, async (req, res) => {
    const { data, error } = await supabaseAdmin
        .from('produtos')
        .select('*')
        .eq('usuario_id', req.user.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json(data);
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

    // Buscar usuário via Admin API
    if (produto.usuario_id) {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(produto.usuario_id);
        if (!userError && userData && userData.user) {
            produto.usuario = {
                id: userData.user.id,
                email: userData.user.email,
                raw_user_meta_data: userData.user.user_metadata
            };
        }
    }

    res.json(produto);
});

// POST - Criar produto
router.post('/', verificarToken, async (req, res) => {
    const { titulo, descricao, categoria, selecao, ano, preco, tipo_oferta, tamanho, estado, imagem_url, quantidade_estoque } = req.body;
    
    if (!titulo || !preco || !categoria) {
        return res.status(400).json({ error: 'Título, preço e categoria são obrigatórios' });
    }
    
    const { data, error } = await supabaseAdmin
        .from('produtos')
        .insert([{
            usuario_id: req.user.id,
            titulo,
            descricao,
            categoria,
            selecao,
            ano,
            preco,
            tipo_oferta: tipo_oferta || 'venda',
            tamanho,
            estado,
            imagem_url: imagem_url || null,
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

// PUT - Atualizar produto
router.put('/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    const updates = req.body;
    
    const { data: produto, error: findError } = await supabase
        .from('produtos')
        .select('usuario_id')
        .eq('id', id)
        .single();
    
    if (findError || !produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    if (produto.usuario_id !== req.user.id) {
        return res.status(403).json({ error: 'Você não tem permissão para editar este produto' });
    }
    
    const { data, error } = await supabaseAdmin
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

// DELETE - Remover produto
router.delete('/:id', verificarToken, async (req, res) => {
    const { id } = req.params;
    
    const { data: produto, error: findError } = await supabase
        .from('produtos')
        .select('usuario_id')
        .eq('id', id)
        .single();
    
    if (findError || !produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    if (produto.usuario_id !== req.user.id) {
        return res.status(403).json({ error: 'Você não tem permissão para deletar este produto' });
    }
    
    const { error } = await supabaseAdmin
        .from('produtos')
        .delete()
        .eq('id', id);
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    res.json({ message: 'Produto deletado com sucesso' });
});

module.exports = router;
