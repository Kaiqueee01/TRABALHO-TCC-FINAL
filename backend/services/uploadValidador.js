const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const { classificarUploadPorOcr } = require('./receitaOcr');

const MODELO_PADRAO = 'gpt-4o-mini';

function openAiConfigurado() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

function deveUsarOcrLocal(error) {
  const textoErro = String(error && (error.message || error.code || '')).toLowerCase();

  return (
    error?.status === 429 ||
    error?.statusCode === 429 ||
    textoErro.includes('quota') ||
    textoErro.includes('rate limit') ||
    textoErro.includes('insufficient_quota') ||
    textoErro.includes('billing')
  );
}

function excluirArquivoUpload(file) {
  if (!file || !file.path) return;

  fs.promises.unlink(file.path).catch(() => {});
}

function criarEntradaArquivo(file) {
  const base64 = fs.readFileSync(file.path, 'base64');
  const mimetype = file.mimetype || '';

  if (mimetype === 'application/pdf') {
    return {
      type: 'input_file',
      filename: file.originalname || path.basename(file.path),
      file_data: base64
    };
  }

  return {
    type: 'input_image',
    image_url: `data:${mimetype};base64,${base64}`,
    detail: 'high'
  };
}

function schemaClassificacaoUpload() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['tipo', 'confianca', 'motivo', 'sinais'],
    properties: {
      tipo: {
        type: 'string',
        enum: ['documento_identificacao', 'receita_medica', 'outro']
      },
      confianca: {
        type: 'number',
        description: 'Confianca entre 0 e 1.'
      },
      motivo: {
        type: 'string',
        description: 'Explicacao curta da classificacao.'
      },
      sinais: {
        type: 'object',
        additionalProperties: false,
        required: [
          'tem_nome_pessoa',
          'tem_cpf_rg_cnh',
          'tem_foto_documento',
          'tem_nome_medico',
          'tem_crm',
          'tem_medicamento',
          'tem_posologia',
          'tem_data'
        ],
        properties: {
          tem_nome_pessoa: { type: 'boolean' },
          tem_cpf_rg_cnh: { type: 'boolean' },
          tem_foto_documento: { type: 'boolean' },
          tem_nome_medico: { type: 'boolean' },
          tem_crm: { type: 'boolean' },
          tem_medicamento: { type: 'boolean' },
          tem_posologia: { type: 'boolean' },
          tem_data: { type: 'boolean' }
        }
      }
    }
  };
}

function promptClassificacao() {
  return `
Voce vai classificar um arquivo enviado para um sistema de monitoramento de receitas.
Responda somente no schema solicitado.

Classifique como:
- documento_identificacao: documento pessoal/cadastral brasileiro, como RG, CPF, CNH, documento oficial com foto, ou documento equivalente usado para identificar o cliente.
- receita_medica: prescricao/receita medica, fisica ou digital, contendo sinais como medicamento, posologia, paciente, medico, CRM, assinatura/carimbo ou data.
- outro: qualquer coisa que nao seja claramente documento de identificacao nem receita medica.

Regras:
- Nao aprove arquivos em branco, paisagens, imagens aleatorias, prints sem relacao, comprovantes sem identificacao clara ou documentos ilegiveis.
- Se a imagem/PDF estiver muito ilegivel, use tipo "outro" com baixa confianca.
- Use "receita_medica" mesmo se nem todos os campos estiverem visiveis, desde que haja sinais fortes de prescricao medica.
- Use "documento_identificacao" quando o arquivo parecer servir para identificar o cliente.
`.trim();
}

async function classificarUpload(file) {
  if (!openAiConfigurado()) {
    return classificarUploadPorOcr(file);
  }

  if (!file) {
    const erro = new Error('Nenhum arquivo enviado.');
    erro.statusCode = 400;
    throw erro;
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.responses.create({
      model: process.env.OPENAI_UPLOAD_MODEL || process.env.OPENAI_RECEITA_MODEL || MODELO_PADRAO,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: promptClassificacao() },
            criarEntradaArquivo(file)
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'classificacao_upload',
          strict: true,
          schema: schemaClassificacaoUpload()
        }
      }
    });

    return JSON.parse(response.output_text || '{}');
  } catch (error) {
    if (deveUsarOcrLocal(error)) {
      return classificarUploadPorOcr(file);
    }

    throw error;
  }
}

function mensagemTipo(tipoEsperado) {
  if (tipoEsperado === 'receita_medica') {
    return 'O arquivo enviado nao parece ser uma receita medica. Envie uma foto ou PDF da receita.';
  }

  return 'O arquivo enviado nao parece ser um documento de identificacao. Envie RG, CPF, CNH ou documento equivalente.';
}

async function validarUpload(file, tipoEsperado) {
  if (!file) return null;

  const resultado = await classificarUpload(file);
  const confianca = Number(resultado.confianca || 0);

  if (resultado.tipo !== tipoEsperado || confianca < 0.55) {
    const erro = new Error(`${mensagemTipo(tipoEsperado)} Motivo: ${resultado.motivo || 'classificacao incerta'}`);
    erro.statusCode = 400;
    erro.resultadoValidacao = resultado;
    throw erro;
  }

  return resultado;
}

function validarUploadDocumento(file) {
  return validarUpload(file, 'documento_identificacao');
}

function validarUploadReceita(file) {
  return validarUpload(file, 'receita_medica');
}

module.exports = {
  classificarUpload,
  excluirArquivoUpload,
  validarUploadDocumento,
  validarUploadReceita
};
