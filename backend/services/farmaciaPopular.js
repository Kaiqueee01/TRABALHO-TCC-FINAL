const FARMACIA_POPULAR_MEDICAMENTOS = [
  { nome: 'brometo de ipratropio 0,02mg', indicacao: 'Asma', aliases: ['ipratropio 0,02mg', 'ipratropio'] },
  { nome: 'brometo de ipratropio 0,25mg', indicacao: 'Asma', aliases: ['ipratropio 0,25mg', 'ipratropio'] },
  { nome: 'dipropionato de beclometasona 200mcg', indicacao: 'Asma', aliases: ['beclometasona 200mcg', 'beclometasona'] },
  { nome: 'dipropionato de beclometasona 250mcg', indicacao: 'Asma', aliases: ['beclometasona 250mcg', 'beclometasona'] },
  { nome: 'dipropionato de beclometasona 50mcg', indicacao: 'Asma', aliases: ['beclometasona 50mcg', 'beclometasona'] },
  { nome: 'sulfato de salbutamol 100mcg', indicacao: 'Asma', aliases: ['salbutamol 100mcg', 'salbutamol'] },
  { nome: 'sulfato de salbutamol 5mg', indicacao: 'Asma', aliases: ['salbutamol 5mg', 'salbutamol'] },

  { nome: 'cloridrato de metformina 500mg', indicacao: 'Diabetes', aliases: ['metformina 500mg', 'metformina'] },
  { nome: 'cloridrato de metformina 500mg - acao prolongada', indicacao: 'Diabetes', aliases: ['metformina 500mg xr', 'metformina 500mg acao prolongada', 'metformina xr', 'metformina'] },
  { nome: 'cloridrato de metformina 850mg', indicacao: 'Diabetes', aliases: ['metformina 850mg', 'metformina'] },
  { nome: 'glibenclamida 5mg', indicacao: 'Diabetes', aliases: ['glibenclamida'] },
  { nome: 'insulina humana regular 100ui/ml', indicacao: 'Diabetes', aliases: ['insulina regular', 'insulina humana regular'] },
  { nome: 'insulina humana 100ui/ml', indicacao: 'Diabetes', aliases: ['insulina humana', 'nph', 'insulina nph'] },

  { nome: 'atenolol 25mg', indicacao: 'Hipertensao', aliases: ['atenolol'] },
  { nome: 'besilato de anlodipino 5mg', indicacao: 'Hipertensao', aliases: ['anlodipino 5mg', 'amlodipino 5mg', 'anlodipino', 'amlodipino'] },
  { nome: 'captopril 25mg', indicacao: 'Hipertensao', aliases: ['captopril'] },
  { nome: 'cloridrato de propranolol 40mg', indicacao: 'Hipertensao', aliases: ['propranolol 40mg', 'propranolol'] },
  { nome: 'hidroclorotiazida 25mg', indicacao: 'Hipertensao', aliases: ['hidroclorotiazida'] },
  { nome: 'losartana potassica 50mg', indicacao: 'Hipertensao', aliases: ['losartana 50mg', 'losartana potassica', 'losartana'] },
  { nome: 'maleato de enalapril 10mg', indicacao: 'Hipertensao', aliases: ['enalapril 10mg', 'enalapril'] },
  { nome: 'espironolactona 25mg', indicacao: 'Hipertensao', aliases: ['espironolactona'] },
  { nome: 'furosemida 40mg', indicacao: 'Hipertensao', aliases: ['furosemida'] },
  { nome: 'succinato de metoprolol 25mg', indicacao: 'Hipertensao', aliases: ['metoprolol 25mg', 'metoprolol'] },

  { nome: 'acetato de medroxiprogesterona 150mg', indicacao: 'Anticoncepcao', aliases: ['medroxiprogesterona 150mg', 'medroxiprogesterona'] },
  { nome: 'etinilestradiol 0,03mg + levonorgestrel 0,15mg', indicacao: 'Anticoncepcao', aliases: ['etinilestradiol levonorgestrel', 'levonorgestrel 0,15mg'] },
  { nome: 'noretisterona 0,35mg', indicacao: 'Anticoncepcao', aliases: ['noretisterona'] },
  { nome: 'valerato de estradiol 5mg + enantato de noretisterona 50mg', indicacao: 'Anticoncepcao', aliases: ['valerato de estradiol enantato de noretisterona', 'estradiol noretisterona'] },

  { nome: 'alendronato de sodio 70mg', indicacao: 'Osteoporose', aliases: ['alendronato 70mg', 'alendronato'] },

  { nome: 'sinvastatina 10mg', indicacao: 'Dislipidemia', aliases: ['sinvastatina'] },
  { nome: 'sinvastatina 20mg', indicacao: 'Dislipidemia', aliases: ['sinvastatina'] },
  { nome: 'sinvastatina 40mg', indicacao: 'Dislipidemia', aliases: ['sinvastatina'] },

  { nome: 'carbidopa 25mg + levodopa 250mg', indicacao: 'Doenca de Parkinson', aliases: ['carbidopa levodopa', 'levodopa carbidopa'] },
  { nome: 'cloridrato de benserazida 25mg + levodopa 100mg', indicacao: 'Doenca de Parkinson', aliases: ['benserazida levodopa', 'levodopa benserazida'] },

  { nome: 'maleato de timolol 2,5mg', indicacao: 'Glaucoma', aliases: ['timolol 2,5mg', 'timolol'] },
  { nome: 'maleato de timolol 5mg', indicacao: 'Glaucoma', aliases: ['timolol 5mg', 'timolol'] },

  { nome: 'budesonida 32mcg', indicacao: 'Rinite', aliases: ['budesonida 32mcg', 'budesonida'] },
  { nome: 'budesonida 50mcg', indicacao: 'Rinite', aliases: ['budesonida 50mcg', 'budesonida'] },
  { nome: 'dipropionato de beclometasona 50mcg/dose', indicacao: 'Rinite', aliases: ['beclometasona 50mcg dose', 'beclometasona'] },

  { nome: 'dapagliflozina 10mg', indicacao: 'Diabetes mellitus + doenca cardiovascular', aliases: ['dapagliflozina'] },

  { nome: 'absorvente higienico', indicacao: 'Dignidade menstrual', aliases: ['absorvente'] },
  { nome: 'fralda geriatrica', indicacao: 'Incontinencia urinaria', aliases: ['fralda'] }
];

function normalizarTexto(valor) {
  return String(valor || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/µ/g, 'u')
    .replace(/([0-9])\s+(mg|mcg|ui|ml)/g, '$1$2')
    .replace(/[^a-z0-9,+/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extrairDoses(valor) {
  const texto = normalizarTexto(valor);
  return Array.from(texto.matchAll(/\d+(?:,\d+)?\s*(?:mg|mcg|ui\/ml|ui|ml)/g))
    .map((match) => match[0].replace(/\s+/g, ''));
}

function dosesCompativeis(entrada, item) {
  const dosesEntrada = extrairDoses(entrada);
  const dosesItem = extrairDoses(item.nome);

  if (dosesEntrada.length === 0 || dosesItem.length === 0) return true;

  return dosesEntrada.some((dose) => dosesItem.includes(dose));
}

function prepararMedicamento(item) {
  return {
    ...item,
    normalizado: normalizarTexto(item.nome),
    aliasesNormalizados: (item.aliases || []).map(normalizarTexto)
  };
}

const MEDICAMENTOS_INDEXADOS = FARMACIA_POPULAR_MEDICAMENTOS.map(prepararMedicamento);

function pontuarMedicamento(entradaNormalizada, item) {
  const termos = [item.normalizado, ...item.aliasesNormalizados].filter(Boolean);
  let melhorPontuacao = 0;

  for (const termo of termos) {
    if (!termo || !dosesCompativeis(entradaNormalizada, item)) continue;

    if (entradaNormalizada === termo || entradaNormalizada.includes(termo)) {
      melhorPontuacao = Math.max(melhorPontuacao, 100);
      continue;
    }

    const tokensTermo = termo.split(' ').filter((token) => token.length > 2 && !/^\d/.test(token));
    const tokensEntrada = new Set(entradaNormalizada.split(' '));
    const comuns = tokensTermo.filter((token) => tokensEntrada.has(token)).length;

    if (tokensTermo.length > 0) {
      melhorPontuacao = Math.max(melhorPontuacao, Math.round((comuns / tokensTermo.length) * 80));
    }
  }

  return melhorPontuacao;
}

function buscarMedicamentoFarmaciaPopular(valor) {
  const entradaNormalizada = normalizarTexto(valor);
  if (!entradaNormalizada) return null;

  let melhor = null;
  let melhorPontuacao = 0;

  for (const item of MEDICAMENTOS_INDEXADOS) {
    const pontuacao = pontuarMedicamento(entradaNormalizada, item);

    if (pontuacao > melhorPontuacao) {
      melhor = item;
      melhorPontuacao = pontuacao;
    }
  }

  if (!melhor || melhorPontuacao < 70) return null;

  return {
    nome: melhor.nome,
    indicacao: melhor.indicacao,
    pontuacao: melhorPontuacao
  };
}

function resumoMedicamentosFarmaciaPopular() {
  return FARMACIA_POPULAR_MEDICAMENTOS
    .map((item) => `${item.nome} (${item.indicacao})`)
    .join('; ');
}

module.exports = {
  FARMACIA_POPULAR_MEDICAMENTOS,
  buscarMedicamentoFarmaciaPopular,
  normalizarTexto,
  resumoMedicamentosFarmaciaPopular
};
