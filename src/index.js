const express = require('express');
const cors = require('cors');
require('dotenv').config();

const logger = require('./middlewares/logger');
const errorHandler = require('./middlewares/errorHandler');

const authRoutes = require('./routes/auth');
const produtosRoutes = require('./routes/produtos');
const carrinhoRoutes = require('./routes/carrinho');
const avaliacoesRoutes = require('./routes/avaliacoes');
const trocasRoutes = require('./routes/trocas');

const app = express();

app.use(cors());
app.use(express.json());
app.use(logger);

app.get('/', (req, res) => {
    res.json({ 
        mensagem: '🏆 Bem-vindo à API do Mercado da Copa!',
        versao: '1.0.0',
        endpoints: {
            auth: '/api/auth',
            produtos: '/api/produtos',
            carrinho: '/api/carrinho',
            avaliacoes: '/api/avaliacoes',
            trocas: '/api/trocas'
        }
    });
});

app.use('/api/auth', authRoutes);
app.use('/api/produtos', produtosRoutes);
app.use('/api/carrinho', carrinhoRoutes);
app.use('/api/avaliacoes', avaliacoesRoutes);
app.use('/api/trocas', trocasRoutes);

app.use((req, res, next) => {
    res.status(404).json({
        sucesso: false,
        mensagem: `Rota '${req.url}' não encontrada na API do Mercado da Copa.`
    });
});

app.use(errorHandler);

const PORTA = process.env.PORT || 3000;

app.listen(PORTA, () => {
    console.log('');
    console.log(' ================================');
    console.log(` 🏆 Servidor Mercado da Copa rodando!`);
    console.log(` Acesso Local: http://localhost:${PORTA}`);
    console.log(' ================================');
    console.log('');
    console.log('📋 Rotas disponíveis:');
    console.log(`   POST   /api/auth/login`);
    console.log(`   POST   /api/auth/register`);
    console.log(`   POST   /api/auth/logout`);
    console.log(`   GET    /api/auth/me`);
    console.log(`   GET    /api/produtos`);
    console.log(`   GET    /api/produtos/:id`);
    console.log(`   POST   /api/produtos`);
    console.log(`   PUT    /api/produtos/:id`);
    console.log(`   DELETE /api/produtos/:id`);
    console.log(`   GET    /api/produtos/meus/produtos`);
    console.log(`   GET    /api/carrinho`);
    console.log(`   POST   /api/carrinho`);
    console.log(`   PUT    /api/carrinho/:itemId`);
    console.log(`   DELETE /api/carrinho/:itemId`);
    console.log(`   DELETE /api/carrinho`);
    console.log(`   GET    /api/avaliacoes/vendedor/:vendedorId`);
    console.log(`   POST   /api/avaliacoes`);
    console.log(`   GET    /api/avaliacoes/media/:vendedorId`);
    console.log(`   GET    /api/trocas`);
    console.log(`   POST   /api/trocas`);
    console.log(`   PUT    /api/trocas/:trocaId/responder`);
    console.log('');
});