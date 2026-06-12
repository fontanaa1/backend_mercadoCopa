const logger = (req, res, next) => {
    const metodo = req.method;
    const url = req.url;
    const hora = new Date().toLocaleTimeString('pt-BR');
    
    console.log(`[${hora}] ${metodo} ${url}`);
    
    next();
};

module.exports = logger;