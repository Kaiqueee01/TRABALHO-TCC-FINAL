const express = require('express');
const router = express.Router();

const db = require('../database');
const upload = require('../middlewares/upload');

function texto(valor) {
  return String(valor || '').trim();
}

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

// Cadastrar receita
router.post(
  '/receitas',
  upload.single('fotoReceita'),
  (req, res) => {
    const resultado = validarReceita(req.body);

    if (resultado.erro) {
      return res.status(400).json({
        success: false,
        mensagem: resultado.erro
      });
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
  }
);

// Atualizar receita
router.put(
  '/receitas/:id',
  upload.single('fotoReceita'),
  (req, res) => {

    try {

      const resultado = validarReceita(req.body);

      if (resultado.erro) {
        return res.status(400).json({
          success: false,
          mensagem: resultado.erro
        });
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
            return res.status(500).json({
              success: false,
              mensagem: err.message
            });
          }

          // Verifica se encontrou o registro
          if (this.changes === 0) {
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

      res.status(500).json({
        success: false,
        mensagem: error.message
      });

    }
  }
);

// Excluir receita
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
