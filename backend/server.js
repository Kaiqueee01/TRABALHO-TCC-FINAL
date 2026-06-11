const express = require('express');
const cors = require('cors');
const path = require('path');

// Importar banco de dados (cria tabelas automaticamente)
// Inicia o banco junto com o servidor.
const db = require('./database');

const app = express();

// Permite chamadas do frontend para a API.
app.use(cors());

// Adiciona cabecalhos basicos de seguranca.
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

// Permite receber JSON nas requisicoes.
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* =========================
   PASTA PÚBLICA
========================= */
// Entrega os arquivos do frontend.
app.use(express.static(path.join(__dirname, '../public')));

/* =========================
   UPLOADS
========================= */
// Permite abrir arquivos enviados.
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

/* =========================
   ROTAS
========================= */
// Carrega os grupos de rotas da API.
const authRoutes = require('./routes/auth');
const pacientesRoutes = require('./routes/pacientes');
const receitasRoutes = require('./routes/receitas');
const notificacoesRoutes = require('./routes/notificacoes');
const smsRoutes = require('./routes/sms');

// Registra rotas de autenticacao.
app.use('/api/auth', authRoutes);
app.use('/api', pacientesRoutes);
app.use('/api', receitasRoutes);
app.use('/api', notificacoesRoutes);
app.use('/api', smsRoutes);

/* =========================
   HOME
========================= */
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Responde quando a rota da API nao existe.
app.use('/api', (req, res) => {
  res.status(404).json({
    success: false,
    mensagem: 'Rota não encontrada'
  });
});

/* =========================
   ERRO GLOBAL
========================= */
// Trata erros que chegam ao Express.
app.use((err, req, res, next) => {
  console.error(err);

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({
      success: false,
      mensagem: 'Arquivo maior que o limite permitido'
    });
  }

  if (err.message === 'Tipo de arquivo não permitido!') {
    return res.status(400).json({
      success: false,
      mensagem: err.message
    });
  }

  res.status(500).json({
    success: false,
    mensagem: err.message || 'Erro interno do servidor'
  });
});

/* =========================
   SERVIDOR
========================= */
const PORT = Number(process.env.PORT) || 3000;

// Monta uma mensagem clara para erro do MySQL.
function detalheErro(err) {
  if (Array.isArray(err.errors) && err.errors.length > 0) {
    return err.errors
      .map((item) => item.message || item.code)
      .filter(Boolean)
      .join(' | ');
  }

  return err.message || err.code || String(err);
}

// Sobe o servidor na porta configurada.
function iniciarServidor() {
  const server = app.listen(PORT, () => {
    console.log('Sistema IMR iniciado com sucesso.');
    console.log(`Acesse o sistema em: http://localhost:${PORT}`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.error('\nNão foi possível iniciar o servidor.');
      console.error(`A porta ${PORT} já está em uso.`);
      console.error('Isso normalmente acontece quando outro "npm start" ainda está aberto.');
      console.error(`\nSe o servidor já estiver aberto, acesse: http://localhost:${PORT}`);
      console.error('\nComo resolver no PowerShell:');
      console.error(`1. Veja quem está usando a porta: netstat -ano | findstr :${PORT}`);
      console.error('2. Encerre o processo pelo PID: Stop-Process -Id NUMERO_DO_PID -Force');
      console.error(`\nOutra opção: iniciar em outra porta com $env:PORT=3001; npm start\n`);
      process.exit(1);
    }

    throw err;
  });
}

// So inicia o servidor depois do banco conectar.
db.ready
  .then(iniciarServidor)
  .catch((err) => {
    console.error('\nNão foi possível conectar ao MySQL.');
    console.error(`Host: ${process.env.DB_HOST || 'localhost'}`);
    console.error(`Porta: ${process.env.DB_PORT || '3306'}`);
    console.error(`Banco: ${process.env.DB_NAME || 'receitacerta'}`);
    console.error('\nConfira se o MySQL está instalado, aberto e se usuário/senha estão corretos.');
    console.error('Edite o arquivo backend/.env com seus dados de conexão.');
    console.error('\nDetalhe do erro:', detalheErro(err));
    process.exit(1);
  });
