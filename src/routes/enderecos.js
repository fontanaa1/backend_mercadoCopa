const express = require('express');
const router = express.Router();
const { supabase } = require('../../data/supabase.js');
const { verificarToken } = require('../middlewares/auth.js');

// Todas as rotas de endereço exigem autenticação
router.use(verificarToken);

// GET - Listar endereços do usuário
router.get('/', async (req, res) => {
    const { data, error } = await supabase
        .from('enderecos')
        .select('*')
        .eq('usuario_id', req.user.id)
        .order('principal', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// GET - Buscar endereço por ID
router.get('/:id', async (req, res) => {
    const { id } = req.params;
    const { data, error } = await supabase
        .from('enderecos')
        .select('*')
        .eq('id', id)
        .eq('usuario_id', req.user.id)
        .single();
    if (error) return res.status(404).json({ error: 'Endereço não encontrado' });
    res.json(data);
});

// POST - Criar endereço
router.post('/', async (req, res) => {
    const { nome_completo, cep, rua, numero, bairro, cidade, estado, complemento, principal } = req.body;
    if (!nome_completo || !rua || !cidade || !estado) {
        return res.status(400).json({ error: 'Nome, rua, cidade e estado são obrigatórios' });
    }

    if (principal) {
        await supabase
            .from('enderecos')
            .update({ principal: false })
            .eq('usuario_id', req.user.id);
    }

    const { data, error } = await supabase
        .from('enderecos')
        .insert([{
            usuario_id: req.user.id,
            nome_completo,
            cep: cep || null,
            rua,
            numero: numero || null,
            bairro: bairro || null,
            cidade,
            estado,
            complemento: complemento || null,
            principal: principal || false
        }])
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(data);
});

// PUT - Atualizar endereço
router.put('/:id', async (req, res) => {
    const { id } = req.params;
    const { nome_completo, cep, rua, numero, bairro, cidade, estado, complemento, principal } = req.body;

    const { data: existing, error: findError } = await supabase
        .from('enderecos')
        .select('id')
        .eq('id', id)
        .eq('usuario_id', req.user.id)
        .single();
    if (findError || !existing) {
        return res.status(404).json({ error: 'Endereço não encontrado' });
    }

    if (principal) {
        await supabase
            .from('enderecos')
            .update({ principal: false })
            .eq('usuario_id', req.user.id)
            .neq('id', id);
    }

    const { data, error } = await supabase
        .from('enderecos')
        .update({
            nome_completo,
            cep: cep || null,
            rua,
            numero: numero || null,
            bairro: bairro || null,
            cidade,
            estado,
            complemento: complemento || null,
            principal: principal || false,
            updated_at: new Date()
        })
        .eq('id', id)
        .select()
        .single();

    if (error) return res.status(500).json({ error: error.message });
    res.json(data);
});

// DELETE - Remover endereço
router.delete('/:id', async (req, res) => {
    const { id } = req.params;
    const { error } = await supabase
        .from('enderecos')
        .delete()
        .eq('id', id)
        .eq('usuario_id', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Endereço removido com sucesso' });
});

module.exports = router;