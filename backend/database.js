const path = require('path');
const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

// Carrega variaveis do arquivo .env.
dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });
dotenv.config({ path: path.join(__dirname, '.env'), quiet: true });

// Nome do banco usado pelo sistema.
const databaseName = process.env.DB_NAME || 'sistema_inteligente_monitoramento_receitas';

if (!/^[a-zA-Z0-9_]+$/.test(databaseName)) {
  throw new Error('DB_NAME deve conter apenas letras, numeros e underline.');
}

// Dados de conexao com o MySQL.
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: databaseName,
  waitForConnections: true,
  connectionLimit: Number(process.env.DB_CONNECTION_LIMIT) || 10,
  dateStrings: true,
  namedPlaceholders: false
};

let pool;

// Adapta erro duplicado para as rotas antigas.
function mysqlError(err) {
  if (err && err.code === 'ER_DUP_ENTRY') {
    err.code = 'SQLITE_CONSTRAINT';
  }

  return err;
}

// Cria o banco se ele ainda nao existir.
async function criarBancoSeNecessario() {
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password
  });

  await connection.query(
    `CREATE DATABASE IF NOT EXISTS \`${databaseName}\`
     CHARACTER SET utf8mb4
     COLLATE utf8mb4_unicode_ci`
  );

  await connection.end();
}

// Cria as tabelas principais do sistema.
async function criarTabelas() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(150) NOT NULL,
      cpf VARCHAR(14) NOT NULL UNIQUE,
      telefone VARCHAR(20) NOT NULL,
      endereco VARCHAR(255) NOT NULL,
      nascimento DATE NULL,
      senha VARCHAR(255) NOT NULL,
      documento VARCHAR(255) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS receitas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cliente_id INT NOT NULL,
      medicamento VARCHAR(150) NOT NULL,
      data_receita DATE NOT NULL,
      validade DATE NOT NULL,
      proxima_retirada DATE NOT NULL,
      observacoes TEXT NULL,
      imagem_receita VARCHAR(255) NULL,
      status ENUM('ativa', 'vencida', 'cancelada', 'retirada') DEFAULT 'ativa',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      CONSTRAINT fk_receitas_clientes
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notificacoes (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cliente_id INT NULL,
      mensagem TEXT NOT NULL,
      tipo VARCHAR(50) NULL,
      lida TINYINT(1) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_notificacoes_clientes
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS farmacias (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nome VARCHAR(150) NOT NULL,
      endereco VARCHAR(255) NULL,
      telefone VARCHAR(20) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.query(`
    CREATE TABLE IF NOT EXISTS sms_envios (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cliente_id INT NULL,
      telefone VARCHAR(20) NOT NULL,
      mensagem TEXT NOT NULL,
      provider VARCHAR(50) DEFAULT 'smsdev',
      provider_sid VARCHAR(120) NULL,
      status VARCHAR(40) DEFAULT 'pendente',
      erro TEXT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT fk_sms_clientes
        FOREIGN KEY (cliente_id)
        REFERENCES clientes(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await criarIndiceSeNecessario('receitas', 'idx_receitas_cliente_id', 'cliente_id');
  await criarIndiceSeNecessario('notificacoes', 'idx_notificacoes_cliente_id', 'cliente_id');
  await criarIndiceSeNecessario('sms_envios', 'idx_sms_cliente_id', 'cliente_id');
}

// Cria indice somente se ele ainda nao existir.
async function criarIndiceSeNecessario(tabela, indice, coluna) {
  const [rows] = await pool.execute(
    `
      SELECT 1
      FROM information_schema.statistics
      WHERE table_schema = ?
        AND table_name = ?
        AND index_name = ?
      LIMIT 1
    `,
    [databaseName, tabela, indice]
  );

  if (rows.length === 0) {
    await pool.query(`CREATE INDEX ${indice} ON ${tabela}(${coluna})`);
  }
}

// Abre conexao e prepara o banco ao iniciar.
async function init() {
  await criarBancoSeNecessario();
  pool = mysql.createPool(dbConfig);
  await criarTabelas();
  console.log('Banco de dados conectado com sucesso.');
}

const ready = init();

// Espera o banco ficar pronto antes de executar SQL.
async function execute(sql, params = []) {
  await ready;
  return pool.execute(sql, params);
}

// Interface simples usada pelas rotas.
const db = {
  ready,

  get(sql, params, callback) {
    execute(sql, params)
      .then(([rows]) => callback(null, rows[0] || null))
      .catch((err) => callback(mysqlError(err)));
  },

  all(sql, params, callback) {
    execute(sql, params)
      .then(([rows]) => callback(null, rows))
      .catch((err) => callback(mysqlError(err)));
  },

  run(sql, params, callback) {
    execute(sql, params)
      .then(([result]) => {
        if (typeof callback === 'function') {
          callback.call(
            {
              lastID: result.insertId,
              changes: result.affectedRows
            },
            null
          );
        }
      })
      .catch((err) => {
        if (typeof callback === 'function') {
          callback(mysqlError(err));
        }
      });
  },

  async close() {
    await ready;
    await pool.end();
  }
};

module.exports = db;
