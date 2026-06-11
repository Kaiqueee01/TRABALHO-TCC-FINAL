const express = require('express');
const https = require('https');
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

function provedorSms() {
  const provider = texto(process.env.SMS_PROVIDER).toLowerCase();

  if (provider) return provider;
  if (process.env.SMSDEV_KEY) return 'smsdev';

  return 'twilio';
}

function smsConfiguradoTwilio() {
  return Boolean(
    process.env.TWILIO_ACCOUNT_SID &&
    process.env.TWILIO_AUTH_TOKEN &&
    process.env.TWILIO_PHONE_NUMBER
  );
}

function smsConfiguradoSmsDev() {
  return Boolean(process.env.SMSDEV_KEY);
}

function smsConfigurado() {
  const provider = provedorSms();

  if (provider === 'twilio') return smsConfiguradoTwilio();
  if (provider === 'smsdev') return smsConfiguradoSmsDev();

  return false;
}

function mensagemConfiguracao() {
  const provider = provedorSms();

  if (provider === 'twilio') {
    return 'SMS nao configurado. Preencha TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_PHONE_NUMBER no backend/.env.';
  }

  if (provider === 'smsdev') {
    return 'SMS nao configurado. Preencha SMS_PROVIDER=smsdev e SMSDEV_KEY no backend/.env.';
  }

  return 'SMS nao configurado. Use SMS_PROVIDER=twilio ou SMS_PROVIDER=smsdev no backend/.env.';
}

function httpGetJson(url) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      let body = '';

      res.setEncoding('utf8');
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            dados: body ? JSON.parse(body) : {}
          });
        } catch (error) {
          reject(new Error(`Resposta invalida do provedor SMS: ${body || error.message}`));
        }
      });
    });

    req.setTimeout(15000, () => {
      req.destroy(new Error('Tempo esgotado ao conectar no provedor SMS.'));
    });

    req.on('error', reject);
  });
}

async function enviarSmsTwilio({ telefone, mensagem }) {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
  const envio = await client.messages.create({
    body: mensagem,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: telefone
  });

  return {
    provider: 'twilio',
    sid: envio.sid,
    status: envio.status || 'enviado'
  };
}

async function enviarSmsDev({ telefone, mensagem }) {
  const numero = telefone.replace(/\D/g, '');
  const url = new URL('https://api.smsdev.com.br/v1/send');

  url.searchParams.set('key', process.env.SMSDEV_KEY);
  url.searchParams.set('type', '9');
  url.searchParams.set('number', numero);
  url.searchParams.set('msg', mensagem);

  const resposta = await httpGetJson(url);
  const primeiroResultado = Array.isArray(resposta.dados) ? resposta.dados[0] : resposta.dados;
  const situacao = texto(primeiroResultado && primeiroResultado.situacao).toUpperCase();

  if (resposta.statusCode >= 400 || situacao !== 'OK') {
    const descricao = texto(primeiroResultado && primeiroResultado.descricao) || JSON.stringify(resposta.dados);
    throw new Error(`SMSDev: ${descricao || 'erro ao enviar SMS'}`);
  }

  return {
    provider: 'smsdev',
    sid: String(primeiroResultado.id || ''),
    status: primeiroResultado.descricao || 'enviado'
  };
}

async function enviarSms({ telefone, mensagem }) {
  const provider = provedorSms();

  if (provider === 'twilio') {
    return enviarSmsTwilio({ telefone, mensagem });
  }

  if (provider === 'smsdev') {
    return enviarSmsDev({ telefone, mensagem });
  }

  throw new Error(`Provedor SMS invalido: ${provider}`);
}

function salvarHistorico({ clienteId, telefone, mensagem, provider, sid, status, erro }, callback) {
  db.run(
    `
      INSERT INTO sms_envios
      (cliente_id, telefone, mensagem, provider, provider_sid, status, erro)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `,
    [clienteId || null, telefone, mensagem, provider || provedorSms(), sid || null, status, erro || null],
    callback
  );
}

router.get('/sms/configuracao', (req, res) => {
  res.json({
    success: true,
    configurado: smsConfigurado(),
    provider: provedorSms()
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
          mensagem: 'Erro ao listar historico de SMS.'
        });
      }

      return res.json({
        success: true,
        historico: rows
      });
    }
  );
});

router.delete('/sms/historico', (req, res) => {
  db.run(
    `DELETE FROM sms_envios`,
    [],
    function (err) {
      if (err) {
        return res.status(500).json({
          success: false,
          mensagem: 'Erro ao excluir historico de SMS.'
        });
      }

      return res.json({
        success: true,
        mensagem: 'Historico de SMS excluido com sucesso.',
        removidos: this.changes || 0
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
      mensagem: 'A mensagem deve ter no maximo 480 caracteres.'
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
          mensagem: 'Cliente nao encontrado.'
        });
      }

      const telefone = normalizarTelefoneBrasil(cliente.telefone);

      if (!telefone || telefone.length < 12) {
        return res.status(400).json({
          success: false,
          mensagem: 'Telefone do cliente invalido. Use DDD + numero.'
        });
      }

      if (!smsConfigurado()) {
        salvarHistorico(
          {
            clienteId,
            telefone,
            mensagem,
            provider: provedorSms(),
            status: 'nao_configurado',
            erro: mensagemConfiguracao()
          },
          () => {}
        );

        return res.status(400).json({
          success: false,
          mensagem: mensagemConfiguracao()
        });
      }

      try {
        const envio = await enviarSms({ telefone, mensagem });

        salvarHistorico(
          {
            clienteId,
            telefone,
            mensagem,
            provider: envio.provider,
            sid: envio.sid,
            status: envio.status
          },
          () => {}
        );

        return res.json({
          success: true,
          mensagem: 'SMS enviado com sucesso.',
          provider: envio.provider,
          sid: envio.sid,
          status: envio.status
        });
      } catch (error) {
        salvarHistorico(
          {
            clienteId,
            telefone,
            mensagem,
            provider: provedorSms(),
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
