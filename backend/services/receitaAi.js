const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');
const {
  buscarMedicamentoFarmaciaPopular,
  resumoMedicamentosFarmaciaPopular
} = require('./farmaciaPopular');
const { analisarReceitaComOcr } = require('./receitaOcr');

const MODELO_PADRAO = 'gpt-4o-mini';

// Verifica se existe chave da OpenAI.
function openAiConfigurado() {
  return Boolean(String(process.env.OPENAI_API_KEY || '').trim());
}

// Decide quando cair para OCR local.
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

// Prepara imagem ou PDF para enviar a OpenAI.
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

// Define o formato esperado da resposta da IA.
function schemaAnaliseReceita() {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['medicamentos', 'observacoes_gerais'],
    properties: {
      medicamentos: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['nome_lido', 'dose_lida', 'posologia', 'confianca', 'observacoes'],
          properties: {
            nome_lido: {
              type: 'string',
              description: 'Nome do medicamento ou principio ativo exatamente como foi possivel ler.'
            },
            dose_lida: {
              type: 'string',
              description: 'Dosagem lida, como 50mg, 850mg, 100ui/ml. Use string vazia se nao houver.'
            },
            posologia: {
              type: 'string',
              description: 'Instrucao de uso lida na receita. Use string vazia se nao houver.'
            },
            confianca: {
              type: 'number',
              description: 'Confianca de leitura entre 0 e 1.'
            },
            observacoes: {
              type: 'string',
              description: 'Incertezas de leitura, rasuras ou trechos ilegiveis.'
            }
          }
        }
      },
      observacoes_gerais: {
        type: 'string'
      }
    }
  };
}

// Cria a instrucao enviada para a IA.
function montarPrompt() {
  return `
Voce e um assistente de leitura de receitas medicas brasileiras.
Tarefa:
1. Leia a imagem ou PDF enviado.
2. Extraia somente medicamentos, principios ativos, dosagens e posologia que estejam visiveis.
3. Nao invente medicamentos. Se nao tiver certeza, coloque baixa confianca e explique em observacoes.
4. Nao faca diagnostico, orientacao medica ou recomendacao de tratamento.
5. Compare mentalmente com esta lista oficial local do Programa Farmacia Popular, mas retorne todos os medicamentos lidos; o sistema fara a validacao final:
${resumoMedicamentosFarmaciaPopular()}
`.trim();
}

// Tenta ler JSON mesmo se vier com texto extra.
function parseJsonSeguro(texto) {
  try {
    return JSON.parse(texto);
  } catch (error) {
    const inicio = texto.indexOf('{');
    const fim = texto.lastIndexOf('}');

    if (inicio >= 0 && fim > inicio) {
      return JSON.parse(texto.slice(inicio, fim + 1));
    }

    throw error;
  }
}

// Marca quais medicamentos sao da Farmacia Popular.
function enriquecerResultado(resultado) {
  const medicamentos = Array.isArray(resultado.medicamentos) ? resultado.medicamentos : [];

  const medicamentosProcessados = medicamentos.map((medicamento) => {
    const nomeCompleto = `${medicamento.nome_lido || ''} ${medicamento.dose_lida || ''}`.trim();
    const match = buscarMedicamentoFarmaciaPopular(nomeCompleto);

    return {
      nome_lido: medicamento.nome_lido || '',
      dose_lida: medicamento.dose_lida || '',
      posologia: medicamento.posologia || '',
      confianca: Number(medicamento.confianca || 0),
      observacoes: medicamento.observacoes || '',
      farmacia_popular: Boolean(match),
      medicamento_programa: match ? match.nome : '',
      indicacao_programa: match ? match.indicacao : '',
      pontuacao_programa: match ? match.pontuacao : 0
    };
  });

  return {
    medicamentos: medicamentosProcessados,
    medicamentos_farmacia_popular: medicamentosProcessados.filter((medicamento) => medicamento.farmacia_popular),
    medicamentos_fora_programa: medicamentosProcessados.filter((medicamento) => !medicamento.farmacia_popular),
    observacoes_gerais: resultado.observacoes_gerais || ''
  };
}

// Analisa receita com OpenAI ou OCR local.
async function analisarReceitaComIa(file) {
  if (!openAiConfigurado()) {
    return analisarReceitaComOcr(file);
  }

  if (!file) {
    const erro = new Error('Envie uma imagem ou PDF da receita para analisar.');
    erro.statusCode = 400;
    throw erro;
  }

  try {
    const client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });

    const response = await client.responses.create({
      model: process.env.OPENAI_RECEITA_MODEL || MODELO_PADRAO,
      input: [
        {
          role: 'user',
          content: [
            { type: 'input_text', text: montarPrompt() },
            criarEntradaArquivo(file)
          ]
        }
      ],
      text: {
        format: {
          type: 'json_schema',
          name: 'analise_receita',
          strict: true,
          schema: schemaAnaliseReceita()
        }
      }
    });

    const bruto = response.output_text || '';
    const parsed = parseJsonSeguro(bruto);
    const enriquecido = enriquecerResultado(parsed);

    return {
      success: true,
      modelo: response.model || process.env.OPENAI_RECEITA_MODEL || MODELO_PADRAO,
      metodo: 'openai',
      ...enriquecido
    };
  } catch (error) {
    if (deveUsarOcrLocal(error)) {
      return analisarReceitaComOcr(file);
    }

    throw error;
  }
}

module.exports = {
  analisarReceitaComIa,
  openAiConfigurado
};
