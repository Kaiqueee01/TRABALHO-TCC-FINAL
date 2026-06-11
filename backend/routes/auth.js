const express = require('express');
const router = express.Router();
const db = require('../database');
const bcrypt = require('bcrypt');
const upload = require('../middlewares/upload');
const {
  excluirArquivoUpload,
  validarUploadDocumento
} = require('../services/uploadValidador');

// Limpa textos recebidos do formulario.
function texto(valor) {
  return String(valor || '').trim();
}

// Remove dados sensiveis antes de responder.
function clienteSeguro(row) {
  if (!row) return null;

  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    telefone: row.telefone,
    endereco: row.endereco,
    nascimento: row.nascimento,
    documento: row.documento,
    created_at: row.created_at
  };
}

/* =========================
   LOGIN ADM
========================= */
// Confere usuario e senha do administrador.
router.post('/login/adm', async (req, res) => {

  const usuario = texto(req.body.usuario);
  const senha = texto(req.body.senha);
  const admUsuario = process.env.ADM_USUARIO || 'adm';
  const admSenha = process.env.ADM_SENHA || '1';

  if (usuario === admUsuario && senha === admSenha) {
    return res.json({
      success: true,
      tipo: 'adm'
    });
  }

  return res.status(401).json({
    success: false,
    mensagem: 'Usuário ou senha inválidos'
  });
});

/* =========================
   CADASTRO CLIENTE (JSON)
========================= */
// Cadastra cliente sem documento primeiro.
router.post('/cadastro', async (req, res) => {
  try {
    const {
      nome: nomeRecebido,
      cpf: cpfRecebido,
      telefone: telefoneRecebido,
      endereco: enderecoRecebido,
      nascimento: nascimentoRecebido,
      senha
    } = req.body;
    const nome = texto(nomeRecebido);
    const cpf = texto(cpfRecebido);
    const telefone = texto(telefoneRecebido);
    const endereco = texto(enderecoRecebido);
    const nascimento = texto(nascimentoRecebido);
    const senhaLimpa = String(senha || '');

    if (!nome || !cpf || !telefone || !endereco || !nascimento || !senhaLimpa) {
      return res.status(400).json({
        success: false,
        erro: 'Preencha todos os campos obrigatórios.'
      });
    }

    const senhaHash = await bcrypt.hash(senhaLimpa, 10);

    // Checa CPF duplicado
    db.get(
      `SELECT id FROM clientes WHERE cpf = ?`,
      [cpf],
      (err, row) => {
        if (err) {
          return res.status(500).json({ success: false });
        }

        if (row) {
          return res.status(409).json({
            success: false,
            erro: 'Já existe um cliente cadastrado com este CPF.'
          });
        }

        db.run(
          `INSERT INTO clientes (nome, cpf, telefone, endereco, nascimento, senha, documento) VALUES (?, ?, ?, ?, ?, ?, NULL)`,
          [nome, cpf, telefone, endereco, nascimento, senhaHash],
          function (insertErr) {
            if (insertErr) {
              if (insertErr.code === 'SQLITE_CONSTRAINT') {
                return res.status(409).json({
                  success: false,
                  erro: 'Já existe um cliente cadastrado com este CPF.'
                });
              }

              return res.status(500).json({
                success: false,
                erro: 'Erro ao cadastrar cliente.'
              });
            }

            return res.json({
              success: true,
              cliente: {
                id: this.lastID,
                nome,
                cpf,
                telefone,
                endereco,
                nascimento
              }
            });
          }
        );
      }
    );
  } catch (error) {
    return res.status(500).json({
      success: false,
      erro: error.message
    });
  }
});

/* =========================
   UPLOAD DOCUMENTO CLIENTE (multipart)
========================= */
router.post(
// Recebe e vincula o documento do cliente.
  '/cadastro-documento',
  upload.single('documento'),
  async (req, res) => {
    try {
      const { cpf } = req.body;
      const cpfLimpo = texto(cpf);

      if (!cpfLimpo) {
        excluirArquivoUpload(req.file);
        return res.status(400).json({
          success: false,
          erro: 'CPF é obrigatório para vincular o documento.'
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          erro: 'Documento (arquivo) é obrigatório.'
        });
      }

      await validarUploadDocumento(req.file);

      const documentoFilename = req.file.filename;

      db.run(
        `UPDATE clientes SET documento = ? WHERE cpf = ?`,
        [documentoFilename, cpfLimpo],
        function (err) {
          if (err) {
            excluirArquivoUpload(req.file);
            return res.status(500).json({
              success: false,
              erro: err.message
            });
          }

          if (this.changes === 0) {
            excluirArquivoUpload(req.file);
            return res.status(404).json({
              success: false,
              erro: 'Cliente não encontrado para este CPF.'
            });
          }

          return res.json({
            success: true,
            documento: documentoFilename
          });
        }
      );
    } catch (error) {
      excluirArquivoUpload(req.file);
      return res.status(error.statusCode || 500).json({
        success: false,
        erro: error.mensagemCliente || error.message
      });
    }
  }
);

/* =========================
   LOGIN CLIENTE
========================= */
// Confere CPF e senha do cliente.
router.post('/login/cliente', (req, res) => {

  const cpf = texto(req.body.cpf);
  const senha = String(req.body.senha || '');

  if (!cpf || !senha) {
    return res.status(400).json({
      success: false,
      mensagem: 'Informe CPF e senha'
    });
  }

  db.get(
    `SELECT * FROM clientes WHERE cpf = ?`,
    [cpf],
    async (err, row) => {

      if (err) {
        return res.status(500).json({ success: false });
      }

      if (!row) {
        return res.status(401).json({
          success: false,
          mensagem: 'Cliente não encontrado'
        });
      }

      let senhaCorreta = false;

      try {
        senhaCorreta = await bcrypt.compare(senha, row.senha);
      } catch (error) {
        return res.status(500).json({
          success: false,
          mensagem: 'Erro ao validar senha'
        });
      }

      if (!senhaCorreta) {
        return res.status(401).json({
          success: false,
          mensagem: 'Senha inválida'
        });
      }

      res.json({
        success: true,
        cliente: clienteSeguro(row)
      });
    }
  );
});

module.exports = router;
