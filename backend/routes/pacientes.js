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

// Formata cliente para enviar ao frontend.
function clienteResponse(row) {
  return {
    id: row.id,
    nome: row.nome,
    cpf: row.cpf,
    telefone: row.telefone,
    endereco: row.endereco,
    nascimento: row.nascimento,
    documento: row.documento
  };
}

/* =========================
   LISTAR CLIENTES
========================= */
// Lista todos os clientes.
router.get('/clientes', (req, res) => {
  db.all(
    `
      SELECT id, nome, cpf, telefone, endereco, nascimento, documento
      FROM clientes
      ORDER BY nome
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          mensagem: 'Erro ao listar clientes.'
        });
      }

      res.json({
        success: true,
        clientes: rows
      });
    }
  );
});

/* =========================
   CADASTRAR CLIENTE PELO ADM
========================= */
// Cadastra cliente pelo administrador.
router.post('/clientes', upload.single('documento'), async (req, res) => {
  try {
    const nome = texto(req.body.nome);
    const cpf = texto(req.body.cpf);
    const telefone = texto(req.body.telefone);
    const endereco = texto(req.body.endereco);
    const nascimento = texto(req.body.nascimento);
    const senha = String(req.body.senha || '');
    const documento = req.file ? req.file.filename : null;

    if (!nome || !cpf || !telefone || !endereco || !nascimento || !senha) {
      excluirArquivoUpload(req.file);
      return res.status(400).json({
        success: false,
        mensagem: 'Preencha nome, CPF, telefone, endereço, nascimento e senha.'
      });
    }

    if (req.file) {
      await validarUploadDocumento(req.file);
    }

    const senhaHash = await bcrypt.hash(senha, 10);

    db.run(
      `
        INSERT INTO clientes
        (nome, cpf, telefone, endereco, nascimento, senha, documento)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [nome, cpf, telefone, endereco, nascimento, senhaHash, documento],
      function (err) {
        if (err) {
          excluirArquivoUpload(req.file);

          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({
              success: false,
              mensagem: 'Já existe um cliente cadastrado com este CPF.'
            });
          }

          return res.status(500).json({
            success: false,
            mensagem: 'Erro ao cadastrar cliente.'
          });
        }

        return res.status(201).json({
          success: true,
          cliente: clienteResponse({
            id: this.lastID,
            nome,
            cpf,
            telefone,
            endereco,
            nascimento,
            documento
          })
        });
      }
    );
  } catch (error) {
    excluirArquivoUpload(req.file);
    res.status(error.statusCode || 500).json({
      success: false,
      mensagem: error.mensagemCliente || error.message || 'Erro ao cadastrar cliente.'
    });
  }
});

/* =========================
   EDITAR CLIENTE
========================= */
// Atualiza dados de um cliente.
router.put('/clientes/:id', upload.single('documento'), async (req, res) => {

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

    if (!nome || !cpf || !telefone || !endereco) {
      excluirArquivoUpload(req.file);
      return res.status(400).json({
        success: false,
        mensagem: 'Preencha nome, CPF, telefone e endereço.'
      });
    }

    let senhaHash = null;
    const documento = req.file ? req.file.filename : null;

    if (req.file) {
      await validarUploadDocumento(req.file);
    }

    if (senha) {
      senhaHash = await bcrypt.hash(senha, 10);
    }

    const sql = `
      UPDATE clientes
      SET
        nome=?,
        cpf=?,
        telefone=?,
        endereco=?,
        nascimento=?,
        senha=COALESCE(?, senha),
        documento=COALESCE(?, documento)
      WHERE id=?
    `;

    db.run(
      sql,
      [
        nome,
        cpf,
        telefone,
        endereco,
        nascimento,
        senhaHash,
        documento,
        req.params.id
      ],
      function (err) {
        if (err) {
          excluirArquivoUpload(req.file);

          if (err.code === 'SQLITE_CONSTRAINT') {
            return res.status(409).json({
              success: false,
              mensagem: 'Já existe um cliente cadastrado com este CPF.'
            });
          }

          return res.status(500).json({
            success: false,
            mensagem: 'Erro ao atualizar cliente.'
          });
        }

        if (this.changes === 0) {
          excluirArquivoUpload(req.file);
          return res.status(404).json({
            success: false,
            mensagem: 'Cliente não encontrado.'
          });
        }

        res.json({ success: true });
      }
    );

  } catch (error) {

    excluirArquivoUpload(req.file);
    res.status(error.statusCode || 500).json({
      success: false,
      mensagem: error.mensagemCliente || error.message || 'Erro ao atualizar cliente.'
    });
  }
});

/* =========================
   EXCLUIR CLIENTE
========================= */
// Exclui cliente e dados ligados a ele.
router.delete('/clientes/:id', (req, res) => {

  db.run(
    `DELETE FROM receitas WHERE cliente_id = ?`,
    [req.params.id],
      (err) => {
        if (err) {
          return res.status(500).json({
            success: false,
            mensagem: 'Erro ao excluir receitas do cliente.'
          });
        }

        db.run(
          `DELETE FROM notificacoes WHERE cliente_id = ?`,
          [req.params.id],
          (notificacaoErr) => {
            if (notificacaoErr) {
              return res.status(500).json({
                success: false,
                mensagem: 'Erro ao excluir notificações do cliente.'
              });
            }

            db.run(
              `DELETE FROM clientes WHERE id = ?`,
              [req.params.id],
              function (clienteErr) {
                if (clienteErr) {
                  return res.status(500).json({
                    success: false,
                    mensagem: 'Erro ao excluir cliente.'
                  });
                }

                if (this.changes === 0) {
                  return res.status(404).json({
                    success: false,
                    mensagem: 'Cliente não encontrado.'
                  });
                }

                res.json({ success: true });
              }
            );
          }
        );
      }
    );
});

module.exports = router;
