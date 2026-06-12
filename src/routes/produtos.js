// backend/src/routes/produtos.js
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

// GET - Listar produtos (público)
router.get('/', async (req, res) => {
    const { categoria, busca, tipo_oferta } = req.query;
    
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
    
    if (busca) {
        query = query.ilike('titulo', `%${busca}%`);
    }
    
    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    
    // Buscar dados dos vendedores para cada produto
    const produtosComVendedor = await Promise.all(
        (data || []).map(async (produto) => {
            const { data: userData } = await supabaseAdmin
                .from('usuarios')
                .select('email, nome, avatar_url')
                .eq('id', produto.user_id)
                .single();
            
            return {
                ...produto,
                vendedor: userData || { email: 'Vendedor', nome: 'Vendedor' }
            };
        })
    );
    
    res.json(produtosComVendedor);
});

// GET - Meus produtos (apenas do usuário logado)
router.get('/meus/produtos', async (req, res) => {
    const token = getToken(req);
    const user = await verificarToken(token);
    
    if (!user) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    
    // Retorna array, mesmo que vazio
    res.json(data || []);
});

// GET - Produto por ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    
    const { data, error } = await supabase
        .from('produtos')
        .select('*')
        .eq('id', id)
        .single();
    
    if (error) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    const { data: userData } = await supabaseAdmin
        .from('usuarios')
        .select('email, nome, avatar_url')
        .eq('id', data.user_id)
        .single();
    
    res.json({
        ...data,
        vendedor: userData || { email: 'Vendedor', nome: 'Vendedor' }
    });
});

// POST - Criar produto
router.post('/', async (req, res) => {
    const token = getToken(req);
    const user = await verificarToken(token);
    
    if (!user) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const { titulo, descricao, categoria, preco, tipo_oferta, tamanho, estado, imagem_url } = req.body;
    
    if (!titulo || !preco || !categoria) {
        return res.status(400).json({ error: 'Título, preço e categoria são obrigatórios' });
    }
    
    const { data, error } = await supabase
        .from('produtos')
        .insert([{
            user_id: user.id,
            titulo,
            descricao: descricao || '',
            categoria,
            preco,
            tipo_oferta: tipo_oferta || 'venda',
            tamanho: tamanho || 'Único',
            estado: estado || 'Excelente',
            imagem_url: imagem_url || 'https://placehold.co/400x500/e0e0e0/333?text=Imagem',
            disponivel: true,
            quantidade_estoque: 1
        }])
        .select()
        .single();
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    
    res.status(201).json(data);
});

// PUT - Atualizar produto (CORRIGIDO - retorna objeto único)
router.put('/:id', async (req, res) => {
    const token = getToken(req);
    const user = await verificarToken(token);
    
    if (!user) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const { id } = req.params;
    const updates = req.body;
    
    // Verificar se o produto pertence ao usuário
    const { data: produto, error: findError } = await supabase
        .from('produtos')
        .select('user_id')
        .eq('id', id)
        .single();
    
    if (findError || !produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    if (produto.user_id !== user.id) {
        return res.status(403).json({ error: 'Você não tem permissão para editar este produto' });
    }
    
    const { data, error } = await supabase
        .from('produtos')
        .update(updates)
        .eq('id', id)
        .select()
        .single();  // Garantir que retorna um único objeto
    
    if (error) {
        return res.status(500).json({ error: error.message });
    }
    
    res.json(data);
});

// DELETE - Deletar produto
router.delete('/:id', async (req, res) => {
    const token = getToken(req);
    const user = await verificarToken(token);
    
    if (!user) {
        return res.status(401).json({ error: 'Não autorizado' });
    }
    
    const { id } = req.params;
    
    const { data: produto, error: findError } = await supabase
        .from('produtos')
        .select('user_id')
        .eq('id', id)
        .single();
    
    if (findError || !produto) {
        return res.status(404).json({ error: 'Produto não encontrado' });
    }
    
    if (produto.user_id !== user.id) {
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

module.exports = router;
