const express = require('express');
const cors = require('cors');
require('dotenv').config();

const authRoutes = require('./routes/auth');
const produtosRoutes = require('./routes/produtos');
const carrinhoRoutes = require('./routes/carrinho');
const avaliacoesRoutes = require('./routes/avaliacoes');
const trocasRoutes = require('./routes/trocas');
const enderecosRoutes = require('./routes/enderecos');
const pedidosRoutes = require('./routes/pedidos');
const notificacoesRoutes = require('./routes/notificacoes');

const app = express();

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({
        mensagem: '🏆 Bem-vindo à API do Mercado da Copa!',
        versao: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            produtos: '/api/produtos',
            carrinho: '/api/carrinho',
            avaliacoes: '/api/avaliacoes',
            trocas: '/api/trocas',
            enderecos: '/api/enderecos',
            pedidos: '/api/pedidos',
            notificacoes: '/api/notificacoes'
        }
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/carrinho', carrinhoRoutes);
app.use('/api/avaliacoes', avaliacoesRoutes);
app.use('/api/trocas', trocasRoutes);
app.use('/api/enderecos', enderecosRoutes);
app.use('/api/pedidos', pedidosRoutes);
app.use('/api/notificacoes', notificacoesRoutes);

app.use((req, res) => {
    res.status(404).json({
        sucesso: false,
        mensagem: `Rota '${req.url}' não encontrada na API do Mercado da Copa.`
    });
});

const PORTA = process.env.PORT || 3000;
app.listen(PORTA, () => {
    console.log('');
    console.log(' ================================');
    console.log(` 🏆 Servidor Mercado da Copa rodando!`);
    console.log(` Acesso Local: http://localhost:${PORTA}`);
    console.log(' ================================');
});