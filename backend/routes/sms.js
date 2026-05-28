const express = require('express');
const twilio = require('twilio');
const db = require('../database');

const router = express.Router();

function texto(valor) {
  return String(valor || '').trim();
}

function normalizarTelefoneBrasil(telefone) {
  const numeros = texto(telefone).replace(/\D/g, '');

  if (!numeros) return '';
  if (numeros.startsWith('55')) return `+${numeros}`;
  if (numeros.length === 10 || numeros.length === 11) return `+55${numeros}`;

  return numeros.startsWith('+') ? numeros : `+${numeros}`;
}

function smsConfigurado() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

function salvarHistorico({ clienteId, telefone, mensagem, sid, status, erro }, callback) {
  db.run(
    `
      INSERT INTO sms_envios
      (cliente_id, telefone, mensagem, provider, provider_sid, status, erro)
      VALUES (?, ?, ?, 'twilio', ?, ?, ?)
    `,
    [clienteId || null, telefone, mensagem, sid || null, status, erro || null],
    callback
  );
}

router.get('/sms/configuracao', (req, res) => {
  res.json({
    success: true,
    configurado: smsConfigurado(),
    provider: 'twilio'
  });
});

router.get('/sms/historico', (req, res) => {
  db.all(
    `
      SELECT sms_envios.*, clientes.nome AS cliente_nome
      FROM sms_envios
      LEFT JOIN clientes ON clientes.id = sms_envios.cliente_id
      ORDER BY sms_envios.id DESC
      LIMIT 30
    `,
    [],
    (err, rows) => {
      if (err) {
        return res.status(500).json({
          success: false,
          mensagem: 'Erro ao listar histórico de SMS.'
        });
      }

      return res.json({
        success: true,
        historico: rows
      });
    }
  );
});

router.post('/sms/enviar', (req, res) => {
  const clienteId = Number(req.body.cliente_id);
  const mensagem = texto(req.body.mensagem);

  if (!clienteId || !mensagem) {
    return res.status(400).json({
      success: false,
      mensagem: 'Selecione um cliente e escreva a mensagem.'
    });
  }

  if (mensagem.length > 480) {
    return res.status(400).json({
      success: false,
      mensagem: 'A mensagem deve ter no máximo 480 caracteres.'
    });
  }

  db.get(
    `SELECT id, nome, telefone FROM clientes WHERE id = ?`,
    [clienteId],
    async (err, cliente) => {
      if (err) {
        return res.status(500).json({
          success: false,
          mensagem: 'Erro ao buscar cliente.'
        });
      }

      if (!cliente) {
        return res.status(404).json({
          success: false,
          mensagem: 'Cliente não encontrado.'
        });
      }

      const telefone = normalizarTelefoneBrasil(cliente.telefone);

      if (!telefone || telefone.length < 12) {
        return res.status(400).json({
          success: false,
          mensagem: 'Telefone do cliente inválido. Use DDD + número.'
        });
      }

      if (!smsConfigurado()) {
        salvarHistorico(
          {
            clienteId,
            telefone,
            mensagem,
            status: 'nao_configurado',
            erro: 'Credenciais Twilio ausentes'
          },
          () => {}
        );

        return res.status(400).json({
          success: false,
          mensagem: 'SMS não configurado. Preencha TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_PHONE_NUMBER no backend/.env.'
        });
      }

      try {
        const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        const envio = await client.messages.create({
          body: mensagem,
          from: process.env.TWILIO_PHONE_NUMBER,
          to: telefone
        });

        salvarHistorico(
          {
            clienteId,
            telefone,
            mensagem,
            sid: envio.sid,
            status: envio.status || 'enviado'
          },
          () => {}
        );

        return res.json({
          success: true,
          mensagem: 'SMS enviado com sucesso.',
          sid: envio.sid,
          status: envio.status
        });
      } catch (error) {
        salvarHistorico(
          {
            clienteId,
            telefone,
            mensagem,
            status: 'erro',
            erro: error.message
          },
          () => {}
        );

        return res.status(500).json({
          success: false,
          mensagem: `Erro ao enviar SMS: ${error.message}`
        });
      }
    }
  );
});

module.exports = router;
