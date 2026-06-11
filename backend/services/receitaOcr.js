const path = require('path');
const { createWorker } = require('tesseract.js');
const {
  FARMACIA_POPULAR_MEDICAMENTOS,
  buscarMedicamentoFarmaciaPopular,
  normalizarTexto
} = require('./farmaciaPopular');

// Confere se o arquivo e imagem.
function imagemSuportada(file) {
  return Boolean(file && file.path && String(file.mimetype || '').startsWith('image/'));
}

// Pega a primeira dose encontrada no texto.
function extrairDose(valor) {
  const texto = normalizarTexto(valor);
  const match = texto.match(/\d+(?:,\d+)?\s*(?:mg|mcg|ui\/ml|ui|ml)/);
  return match ? match[0].replace(/\s+/g, '') : '';
}

// Quebra o texto do OCR em linhas uteis.
function linhasDoTexto(texto) {
  return String(texto || '')
    .split(/\r?\n/)
    .map((linha) => linha.trim())
    .filter(Boolean);
}

// Roda OCR usando o idioma informado.
async function reconhecerComIdioma(file, idioma) {
  const worker = await createWorker(idioma, 1, {
    cachePath: path.join(__dirname, '..')
  });

  try {
    const { data } = await worker.recognize(file.path, { rotateAuto: true });
    return data.text || '';
  } finally {
    await worker.terminate();
  }
}

// Extrai texto da imagem com OCR local.
async function extrairTextoComOcr(file) {
  if (!imagemSuportada(file)) {
    const erro = new Error('A verificação local aceita apenas imagens JPG ou PNG. Para PDF, envie uma foto nítida da receita ou tente novamente mais tarde.');
    erro.statusCode = 400;
    throw erro;
  }

  try {
    return await reconhecerComIdioma(file, 'por+eng');
  } catch (error) {
    return reconhecerComIdioma(file, 'eng');
  }
}

// Procura medicamentos da lista no texto lido.
function localizarMedicamentosFarmaciaPopular(texto) {
  const encontrados = new Map();
  const linhas = linhasDoTexto(texto);

  function adicionar(match, evidencia) {
    if (!match || encontrados.has(match.nome)) return;

    encontrados.set(match.nome, {
      nome_lido: match.nome,
      dose_lida: extrairDose(evidencia || match.nome),
      posologia: '',
      confianca: Math.min(0.9, Math.max(0.6, Number(match.pontuacao || 70) / 100)),
      observacoes: evidencia ? `Identificado por OCR no trecho: ${evidencia}` : 'Identificado por OCR local.',
      farmacia_popular: true,
      medicamento_programa: match.nome,
      indicacao_programa: match.indicacao,
      pontuacao_programa: match.pontuacao || 70
    });
  }

  for (const linha of linhas) {
    adicionar(buscarMedicamentoFarmaciaPopular(linha), linha);
  }

  const textoNormalizado = normalizarTexto(texto);

  for (const item of FARMACIA_POPULAR_MEDICAMENTOS) {
    const termos = [item.nome, ...(item.aliases || [])].map(normalizarTexto).filter(Boolean);
    const encontrado = termos.find((termo) => termo.length > 3 && textoNormalizado.includes(termo));

    if (encontrado) {
      adicionar(
        {
          nome: item.nome,
          indicacao: item.indicacao,
          pontuacao: encontrado === normalizarTexto(item.nome) ? 100 : 80
        },
        item.nome
      );
    }
  }

  return [...encontrados.values()];
}

// Decide se o texto parece receita ou documento.
function classificarTextoOcr(texto) {
  const textoNormalizado = normalizarTexto(texto);
  const medicamentos = localizarMedicamentosFarmaciaPopular(texto);
  const temCrm = /\bcrm\b|\bmedico\b|\bmedica\b|\bdra?\b/.test(textoNormalizado);
  const temPosologia = /\buso\b|\btomar\b|\bcomprimido\b|\bcapsula\b|\bgota\b|\ba cada\b|\bvezes ao dia\b|\b\d+\s*x\s*ao\s*dia\b/.test(textoNormalizado);
  const temData = /\b\d{1,2}[/-]\d{1,2}[/-]\d{2,4}\b/.test(textoNormalizado);
  const temDose = /\b\d+(?:,\d+)?\s*(?:mg|mcg|ui\/ml|ui|ml)\b/.test(textoNormalizado);
  const temDocumento = /\bcpf\b|\brg\b|\bcnh\b|\bidentidade\b|\bnascimento\b|\bregistro geral\b/.test(textoNormalizado);

  const sinaisReceita = [
    medicamentos.length > 0,
    temCrm,
    temPosologia,
    temData,
    temDose
  ].filter(Boolean).length;

  if (sinaisReceita >= 2) {
    return {
      tipo: 'receita_medica',
      confianca: medicamentos.length > 0 ? 0.72 : 0.58,
      motivo: 'Classificacao feita por OCR local com sinais de receita medica.',
      sinais: {
        tem_nome_pessoa: false,
        tem_cpf_rg_cnh: temDocumento,
        tem_foto_documento: false,
        tem_nome_medico: temCrm,
        tem_crm: temCrm,
        tem_medicamento: medicamentos.length > 0,
        tem_posologia: temPosologia,
        tem_data: temData
      }
    };
  }

  if (temDocumento) {
    return {
      tipo: 'documento_identificacao',
      confianca: 0.6,
      motivo: 'Classificacao feita por OCR local com sinais de documento.',
      sinais: {
        tem_nome_pessoa: false,
        tem_cpf_rg_cnh: true,
        tem_foto_documento: false,
        tem_nome_medico: false,
        tem_crm: false,
        tem_medicamento: false,
        tem_posologia: false,
        tem_data: temData
      }
    };
  }

  return {
    tipo: 'outro',
    confianca: 0.35,
    motivo: 'OCR local nao encontrou sinais suficientes de receita ou documento.',
    sinais: {
      tem_nome_pessoa: false,
      tem_cpf_rg_cnh: false,
      tem_foto_documento: false,
      tem_nome_medico: false,
      tem_crm: false,
      tem_medicamento: medicamentos.length > 0,
      tem_posologia: temPosologia,
      tem_data: temData
    }
  };
}

// Valida upload usando OCR local.
async function classificarUploadPorOcr(file) {
  const texto = await extrairTextoComOcr(file);
  return classificarTextoOcr(texto);
}

// Analisa receita usando apenas OCR local.
async function analisarReceitaComOcr(file) {
  const texto = await extrairTextoComOcr(file);
  const medicamentos = localizarMedicamentosFarmaciaPopular(texto);

  return {
    success: true,
    modelo: 'ocr-local',
    metodo: 'ocr-local',
    medicamentos,
    medicamentos_farmacia_popular: medicamentos,
    medicamentos_fora_programa: [],
    observacoes_gerais: medicamentos.length > 0
      ? 'Analise feita por OCR local. Revise os campos antes de cadastrar.'
      : 'OCR local nao encontrou medicamentos da lista do Farmacia Popular. Tente uma foto mais nitida, com boa luz e sem cortes.'
  };
}

module.exports = {
  analisarReceitaComOcr,
  classificarUploadPorOcr,
  extrairTextoComOcr,
  localizarMedicamentosFarmaciaPopular
};
