const express = require('express');
const fs = require('fs');
const router = express.Router();

const db = require('../database');
const upload = require('../middlewares/upload');
const { analisarReceitaComIa } = require('../services/receitaAi');
const {
  excluirArquivoUpload,
  validarUploadReceita
} = require('../services/uploadValidador');

// Limpa textos recebidos do formulario.
function texto(valor) {
  return String(valor || '').trim();
}

// Confere campos obrigatorios da receita.
function validarReceita(body) {
  const dados = {
    cliente_id: Number(body.cliente_id),
    medicamento: texto(body.medicamento),
    data_receita: texto(body.data_receita),
    validade: texto(body.validade),
    proxima_retirada: texto(body.proxima_retirada),
    observacoes: texto(body.observacoes)
  };

  if (!dados.cliente_id || !dados.medicamento || !dados.data_receita || !dados.validade || !dados.proxima_retirada) {
    return {
      erro: 'Preencha cliente, medicamento, data da receita, validade e próxima retirada.'
    };
  }

  return { dados };
}

// Listar receitas
// Lista receitas com o nome do cliente.
router.get('/receitas', (req, res) => {
  const sql = `
    SELECT receitas.*, clientes.nome AS cliente_nome
    FROM receitas
    LEFT JOIN clientes ON clientes.id = receitas.cliente_id
    ORDER BY receitas.id DESC
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        mensagem: 'Erro ao listar receitas.'
      });
    }

    return res.json({
      success: true,
      receitas: rows
    });
  });
});

// Analisar receita com IA para preencher medicamentos automaticamente
router.post(
// Analisa a imagem da receita com IA ou OCR local.
  '/receitas/analisar',
  upload.single('fotoReceita'),
  async (req, res) => {
    try {
      await validarUploadReceita(req.file);
      const resultado = await analisarReceitaComIa(req.file);
      return res.json(resultado);
    } catch (error) {
      return res.status(error.statusCode || 500).json({
        success: false,
        mensagem: error.message || 'Erro ao analisar receita com IA.'
      });
    } finally {
      if (req.file && req.file.path) {
        fs.promises.unlink(req.file.path).catch(() => {});
      }
    }
  }
);

// Cadastrar receita
router.post(
// Cadastra uma nova receita.
  '/receitas',
  upload.single('fotoReceita'),
  async (req, res) => {
    try {
    const resultado = validarReceita(req.body);

    if (resultado.erro) {
      excluirArquivoUpload(req.file);
      return res.status(400).json({
        success: false,
        mensagem: resultado.erro
      });
    }

    if (req.file) {
      await validarUploadReceita(req.file);
    }

    const {
      cliente_id,
      medicamento,
      data_receita,
      validade,
      proxima_retirada,
      observacoes
    } = resultado.dados;
    const imagem_receita = req.file ? req.file.filename : null;

    db.run(
      `
        INSERT INTO receitas
        (cliente_id, medicamento, data_receita, validade, proxima_retirada, observacoes, imagem_receita)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `,
      [cliente_id, medicamento, data_receita, validade, proxima_retirada, observacoes, imagem_receita],
      function (err) {
        if (err) {
          excluirArquivoUpload(req.file);
          return res.status(500).json({
            success: false,
            mensagem: 'Erro ao cadastrar receita.'
          });
        }

        return res.status(201).json({
          success: true,
          receita: {
            id: this.lastID,
            cliente_id,
            medicamento,
            data_receita,
            validade,
            proxima_retirada,
            observacoes,
            imagem_receita
          }
        });
      }
    );
    } catch (error) {
      excluirArquivoUpload(req.file);
      return res.status(error.statusCode || 500).json({
        success: false,
        mensagem: error.message || 'Erro ao cadastrar receita.'
      });
    }
  }
);

// Atualizar receita
router.put(
// Atualiza uma receita existente.
  '/receitas/:id',
  upload.single('fotoReceita'),
  async (req, res) => {

    try {

      const resultado = validarReceita(req.body);

      if (resultado.erro) {
        excluirArquivoUpload(req.file);
        return res.status(400).json({
          success: false,
          mensagem: resultado.erro
        });
      }

      if (req.file) {
        await validarUploadReceita(req.file);
      }

      const {
        cliente_id,
        medicamento,
        data_receita,
        validade,
        proxima_retirada,
        observacoes
      } = resultado.dados;

      // Mantém a imagem antiga caso nenhuma nova seja enviada
      const imagem_receita = req.file
        ? req.file.filename
        : (req.body.imagem_receita || null);

      const sql = `
        UPDATE receitas
        SET
          cliente_id = ?,
          medicamento = ?,
          data_receita = ?,
          validade = ?,
          proxima_retirada = ?,
          observacoes = ?,
          imagem_receita = ?
        WHERE id = ?
      `;

      db.run(
        sql,
        [
          cliente_id,
          medicamento,
          data_receita,
          validade,
          proxima_retirada,
          observacoes,
          imagem_receita,
          req.params.id
        ],
        function (err) {

          if (err) {
            excluirArquivoUpload(req.file);
            return res.status(500).json({
              success: false,
              mensagem: err.message
            });
          }

          // Verifica se encontrou o registro
          if (this.changes === 0) {
            excluirArquivoUpload(req.file);
            return res.status(404).json({
              success: false,
              mensagem: 'Receita não encontrada'
            });
          }

          res.json({
            success: true,
            mensagem: 'Receita atualizada com sucesso'
          });
        }
      );

    } catch (error) {

      excluirArquivoUpload(req.file);
      res.status(error.statusCode || 500).json({
        success: false,
        mensagem: error.message || 'Erro ao atualizar receita.'
      });

    }
  }
);

// Excluir receita
// Exclui uma receita pelo id.
router.delete('/receitas/:id', (req, res) => {
  db.run(
    `DELETE FROM receitas WHERE id = ?`,
    [req.params.id],
    function (err) {
      if (err) {
        return res.status(500).json({
          success: false,
          mensagem: 'Erro ao excluir receita.'
        });
      }

      if (this.changes === 0) {
        return res.status(404).json({
          success: false,
          mensagem: 'Receita não encontrada'
        });
      }

      return res.json({
        success: true,
        mensagem: 'Receita excluída com sucesso'
      });
    }
  );
});

module.exports = router;
