const errorHandler = (err, req, res, next) => {
    console.error('❌ Erro capturado:', err.message);
    console.error(err.stack);
    
    const status = err.status || 500;
    const mensagem = err.message || 'Erro interno do servidor';
    
    res.status(status).json({
        sucesso: false,
        mensagem: mensagem,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
};

module.exports = errorHandler;