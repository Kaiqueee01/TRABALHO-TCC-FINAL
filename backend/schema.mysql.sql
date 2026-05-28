CREATE DATABASE IF NOT EXISTS receitacerta
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE receitacerta;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS farmacias (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nome VARCHAR(150) NOT NULL,
  endereco VARCHAR(255) NULL,
  telefone VARCHAR(20) NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sms_envios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  cliente_id INT NULL,
  telefone VARCHAR(20) NOT NULL,
  mensagem TEXT NOT NULL,
  provider VARCHAR(50) DEFAULT 'twilio',
  provider_sid VARCHAR(120) NULL,
  status VARCHAR(40) DEFAULT 'pendente',
  erro TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_sms_clientes
    FOREIGN KEY (cliente_id)
    REFERENCES clientes(id)
    ON DELETE SET NULL
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sms_cliente_id ON sms_envios(cliente_id);
