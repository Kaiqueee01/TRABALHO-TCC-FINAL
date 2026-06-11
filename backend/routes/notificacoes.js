const express = require('express');
const router = express.Router();
const db = require('../database');

/* NOTIFICAÇÕES GERAIS (OPCIONAL FUTURO) */
router.get('/notificacoes', (req, res) => {
  const sql = `
    SELECT receitas.*, clientes.nome AS cliente_nome
    FROM receitas
    INNER JOIN clientes ON clientes.id = receitas.cliente_id
  `;

  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({
        success: false,
        mensagem: 'Erro ao listar notificações.'
      });
    }

    res.json(rows);
  });
});

router.delete('/notificacoes/historico', (req, res) => {
  db.run(`DELETE FROM notificacoes`, [], function (err) {
    if (err) {
      return res.status(500).json({
        success: false,
        mensagem: 'Erro ao excluir historico de notificacoes.'
      });
    }

    res.json({
      success: true,
      mensagem: 'Historico de notificacoes excluido com sucesso.',
      removidos: this.changes || 0
    });
  });
});

module.exports = router;
