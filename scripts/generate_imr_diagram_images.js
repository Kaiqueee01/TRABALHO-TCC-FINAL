const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'diagramas_imagens');
fs.mkdirSync(outDir, { recursive: true });

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function wrap(text, maxChars) {
  const rawLines = String(text).split('\n');
  const lines = [];
  for (const rawLine of rawLines) {
    const words = rawLine.split(/\s+/).filter(Boolean);
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (candidate.length > maxChars && line) {
        lines.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

function textBlock(x, y, width, text, opts = {}) {
  const size = opts.size || 18;
  const weight = opts.weight || 400;
  const color = opts.color || '#111827';
  const anchor = opts.anchor || 'middle';
  const lineHeight = opts.lineHeight || Math.round(size * 1.25);
  const maxChars = opts.maxChars || Math.max(10, Math.floor(width / (size * 0.55)));
  const lines = wrap(text, maxChars);
  const startY = y - ((lines.length - 1) * lineHeight) / 2;
  return lines.map((line, index) =>
    `<text x="${x}" y="${startY + index * lineHeight}" text-anchor="${anchor}" dominant-baseline="middle" font-size="${size}" font-weight="${weight}" fill="${color}" stroke="none">${esc(line)}</text>`
  ).join('\n');
}

function rect(id, x, y, w, h, text, opts = {}) {
  const fill = opts.fill || '#FFFFFF';
  const stroke = opts.stroke || '#334155';
  const radius = opts.radius ?? 10;
  const sw = opts.sw || 2;
  const dash = opts.dash ? ` stroke-dasharray="${opts.dash}"` : '';
  const body = opts.rawText
    ? rawText(x + 16, y + 20, text, opts)
    : textBlock(x + w / 2, y + h / 2, w - 22, text, { size: opts.size || 18, weight: opts.weight || 400, color: opts.color || '#111827', maxChars: opts.maxChars });
  return `<g id="${esc(id)}">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"${dash}/>
  ${body}
</g>`;
}

function ellipse(id, x, y, w, h, text, opts = {}) {
  const fill = opts.fill || '#FFFFFF';
  const stroke = opts.stroke || '#334155';
  const sw = opts.sw || 2;
  return `<g id="${esc(id)}">
  <ellipse cx="${x + w / 2}" cy="${y + h / 2}" rx="${w / 2}" ry="${h / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
  ${textBlock(x + w / 2, y + h / 2, w - 20, text, { size: opts.size || 17, weight: opts.weight || 400, color: opts.color || '#111827', maxChars: opts.maxChars })}
</g>`;
}

function diamond(id, cx, cy, w, h, text, opts = {}) {
  const fill = opts.fill || '#FFF7ED';
  const stroke = opts.stroke || '#EA580C';
  const points = `${cx},${cy - h / 2} ${cx + w / 2},${cy} ${cx},${cy + h / 2} ${cx - w / 2},${cy}`;
  return `<g id="${esc(id)}">
  <polygon points="${points}" fill="${fill}" stroke="${stroke}" stroke-width="${opts.sw || 2}"/>
  ${textBlock(cx, cy, w - 28, text, { size: opts.size || 17, weight: opts.weight || 500, color: opts.color || '#111827', maxChars: opts.maxChars })}
</g>`;
}

function rawText(x, y, text, opts = {}) {
  const size = opts.size || 16;
  const color = opts.color || '#111827';
  const lineHeight = opts.lineHeight || Math.round(size * 1.3);
  const lines = String(text).split('\n');
  return lines.map((line, index) => {
    const weight = line.startsWith('**') && line.endsWith('**') ? 700 : (opts.weight || 400);
    const clean = line.replace(/^\*\*/, '').replace(/\*\*$/, '');
    return `<text x="${x}" y="${y + index * lineHeight}" text-anchor="start" dominant-baseline="hanging" font-size="${size}" font-weight="${weight}" fill="${color}" stroke="none">${esc(clean)}</text>`;
  }).join('\n');
}

function actor(id, x, y, label) {
  return `<g id="${esc(id)}" stroke="#111827" stroke-width="3" fill="none" stroke-linecap="round">
  <circle cx="${x}" cy="${y}" r="18" fill="#FFFFFF"/>
  <line x1="${x}" y1="${y + 18}" x2="${x}" y2="${y + 75}"/>
  <line x1="${x - 35}" y1="${y + 42}" x2="${x + 35}" y2="${y + 42}"/>
  <line x1="${x}" y1="${y + 75}" x2="${x - 32}" y2="${y + 118}"/>
  <line x1="${x}" y1="${y + 75}" x2="${x + 32}" y2="${y + 118}"/>
  ${textBlock(x, y + 150, 160, label, { size: 18, weight: 700, maxChars: 12 })}
</g>`;
}

function line(x1, y1, x2, y2, opts = {}) {
  const stroke = opts.stroke || '#475569';
  const sw = opts.sw || 2;
  const dash = opts.dash ? ` stroke-dasharray="${opts.dash}"` : '';
  const marker = opts.arrow === false ? '' : ' marker-end="url(#arrow)"';
  const label = opts.label ? `<text x="${(x1 + x2) / 2}" y="${(y1 + y2) / 2 - 8}" text-anchor="middle" font-size="${opts.labelSize || 15}" font-weight="600" fill="${stroke}">${esc(opts.label)}</text>` : '';
  return `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${sw}"${dash}${marker}/>${label}`;
}

function poly(points, opts = {}) {
  const stroke = opts.stroke || '#475569';
  const sw = opts.sw || 2;
  const dash = opts.dash ? ` stroke-dasharray="${opts.dash}"` : '';
  const marker = opts.arrow === false ? '' : ' marker-end="url(#arrow)"';
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ');
  const label = opts.label ? `<text x="${opts.labelX}" y="${opts.labelY}" text-anchor="middle" font-size="${opts.labelSize || 15}" font-weight="600" fill="${stroke}">${esc(opts.label)}</text>` : '';
  return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${sw}"${dash}${marker}/>${label}`;
}

function svg(width, height, title, body) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <marker id="arrow" markerWidth="14" markerHeight="10" refX="12" refY="5" orient="auto" markerUnits="strokeWidth">
      <path d="M 0 0 L 14 5 L 0 10 z" fill="#475569"/>
    </marker>
    <style>
      text { font-family: Arial, Helvetica, sans-serif; }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="#FFFFFF"/>
  <text x="${width / 2}" y="46" text-anchor="middle" font-size="28" font-weight="800" fill="#111827">${esc(title)}</text>
  ${body}
</svg>`;
}

function tableEntity(id, x, y, w, title, rows, opts = {}) {
  const headerH = 42;
  const rowH = opts.rowH || 27;
  const h = headerH + rows.length * rowH + 14;
  const fill = opts.fill || '#F8FAFC';
  const stroke = opts.stroke || '#334155';
  const rowLines = rows.map((row, i) => {
    const yy = y + headerH + 10 + i * rowH;
    return `<text x="${x + 14}" y="${yy}" dominant-baseline="hanging" font-size="${opts.size || 15}" fill="#111827">${esc(row)}</text>`;
  }).join('\n');
  return `<g id="${esc(id)}">
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="2"/>
    <rect x="${x}" y="${y}" width="${w}" height="${headerH}" rx="8" fill="${stroke}" stroke="${stroke}" stroke-width="2"/>
    <text x="${x + w / 2}" y="${y + 22}" text-anchor="middle" dominant-baseline="middle" font-size="18" font-weight="800" fill="#FFFFFF">${esc(title)}</text>
    <line x1="${x}" y1="${y + headerH}" x2="${x + w}" y2="${y + headerH}" stroke="${stroke}" stroke-width="2"/>
    ${rowLines}
  </g>`;
}

function save(name, content) {
  fs.writeFileSync(path.join(outDir, name), content, 'utf8');
}

const useCase = svg(1400, 980, 'Sistema IMR - Diagrama de Caso de Uso', `
<rect x="285" y="105" width="830" height="765" rx="10" fill="#FFFFFF" stroke="#64748B" stroke-width="2" stroke-dasharray="10 8"/>
<text x="700" y="135" text-anchor="middle" dominant-baseline="middle" font-size="19" font-weight="700" fill="#334155" stroke="none">Sistema de Monitoramento de Receitas IMR</text>
${actor('admin', 120, 350, 'Administrador')}
${actor('client', 1280, 350, 'Cliente')}
${actor('sms', 1280, 705, 'Servico SMS')}
${ellipse('login', 605, 170, 190, 72, 'Realizar login', { fill: '#E0F2FE', stroke: '#0284C7' })}
${ellipse('dashboard', 605, 275, 190, 72, 'Consultar dashboard', { fill: '#DCFCE7', stroke: '#16A34A' })}
${ellipse('cad-cli', 350, 205, 210, 72, 'Gerenciar clientes', { fill: '#FEF3C7', stroke: '#D97706' })}
${ellipse('cad-rec', 350, 335, 210, 72, 'Gerenciar receitas', { fill: '#FEF3C7', stroke: '#D97706' })}
${ellipse('notif-adm', 335, 465, 240, 78, 'Acompanhar notificacoes gerais', { fill: '#FCE7F3', stroke: '#DB2777' })}
${ellipse('sms-send', 350, 600, 210, 72, 'Enviar SMS ao cliente', { fill: '#FCE7F3', stroke: '#DB2777' })}
${ellipse('self-register', 840, 205, 210, 72, 'Cadastrar-se', { fill: '#E0F2FE', stroke: '#0284C7' })}
${ellipse('my-data', 840, 335, 210, 72, 'Atualizar meus dados', { fill: '#DCFCE7', stroke: '#16A34A' })}
${ellipse('my-recipes', 820, 465, 250, 82, 'Cadastrar e consultar minhas receitas', { fill: '#DCFCE7', stroke: '#16A34A' })}
${ellipse('my-alerts', 840, 600, 210, 72, 'Visualizar notificacoes', { fill: '#FCE7F3', stroke: '#DB2777' })}
${ellipse('file', 465, 750, 240, 72, 'Anexar arquivo da receita', { fill: '#E0F2FE', stroke: '#0284C7' })}
${ellipse('doc', 755, 750, 250, 72, 'Anexar documento do cliente', { fill: '#E0F2FE', stroke: '#0284C7' })}
${poly([[170, 405], [350, 241]], { arrow: false })}
${poly([[170, 405], [350, 371]], { arrow: false })}
${poly([[170, 405], [335, 504]], { arrow: false })}
${poly([[170, 405], [350, 636]], { arrow: false })}
${poly([[170, 405], [605, 206]], { arrow: false, stroke: '#64748B' })}
${poly([[170, 405], [605, 311]], { arrow: false, stroke: '#64748B' })}
${poly([[1230, 405], [1050, 241]], { arrow: false })}
${poly([[1230, 405], [1050, 371]], { arrow: false })}
${poly([[1230, 405], [1070, 506]], { arrow: false })}
${poly([[1230, 405], [1050, 636]], { arrow: false })}
${poly([[1230, 405], [795, 206]], { arrow: false, stroke: '#64748B' })}
${poly([[1230, 405], [795, 311]], { arrow: false, stroke: '#64748B' })}
${poly([[560, 636], [1140, 755], [1230, 760]], { arrow: false, stroke: '#7C3AED', sw: 3 })}
${poly([[455, 407], [540, 750]], { dash: '8 6', label: 'inclui', labelX: 505, labelY: 575, stroke: '#64748B' })}
${poly([[820, 505], [720, 625], [595, 750]], { dash: '8 6', label: 'inclui', labelX: 710, labelY: 635, stroke: '#64748B' })}
${poly([[945, 277], [1085, 277], [1085, 715], [880, 750]], { dash: '8 6', label: 'inclui', labelX: 1090, labelY: 505, stroke: '#64748B' })}
`);

const sequence = svg(1500, 980, 'Sistema IMR - Diagrama de Sequencia', `
${actor('user', 90, 115, 'Usuario')}
${rect('front', 220, 115, 170, 70, 'Frontend Web\nHTML/CSS/JS', { fill: '#E0F2FE', stroke: '#0284C7', size: 18, weight: 700 })}
${rect('api', 495, 115, 170, 70, 'API Node.js\nExpress', { fill: '#DCFCE7', stroke: '#16A34A', size: 18, weight: 700 })}
${rect('upload', 760, 115, 190, 70, 'Middleware\nMulter Upload', { fill: '#FEF3C7', stroke: '#D97706', size: 18, weight: 700 })}
${rect('db', 1050, 115, 170, 70, 'Banco MySQL\nreceitacerta', { fill: '#FEF3C7', stroke: '#D97706', size: 18, weight: 700 })}
${rect('dash', 1300, 115, 170, 70, 'Dashboard e\nNotificacoes', { fill: '#FCE7F3', stroke: '#DB2777', size: 18, weight: 700 })}
${line(90, 250, 90, 870, { arrow: false, stroke: '#CBD5E1' })}
${line(305, 210, 305, 870, { arrow: false, stroke: '#CBD5E1' })}
${line(580, 210, 580, 870, { arrow: false, stroke: '#CBD5E1' })}
${line(855, 210, 855, 870, { arrow: false, stroke: '#CBD5E1' })}
${line(1135, 210, 1135, 870, { arrow: false, stroke: '#CBD5E1' })}
${line(1385, 210, 1385, 870, { arrow: false, stroke: '#CBD5E1' })}
${line(125, 305, 305, 305, { label: '1. preenche dados da receita', stroke: '#0284C7' })}
${line(305, 340, 580, 340, { label: '2. POST /api/receitas', stroke: '#16A34A' })}
${line(580, 410, 855, 410, { label: '3. valida arquivo', stroke: '#D97706' })}
${line(855, 480, 580, 480, { label: '4. arquivo salvo', stroke: '#D97706', dash: '8 6' })}
${line(580, 550, 1135, 550, { label: '5. INSERT receitas', stroke: '#475569' })}
${line(1135, 620, 580, 620, { label: '6. retorna id', stroke: '#475569', dash: '8 6' })}
${line(580, 690, 305, 690, { label: '7. success=true', stroke: '#16A34A', dash: '8 6' })}
${line(305, 760, 1385, 760, { label: '8. calcula prazos e monta alertas', stroke: '#DB2777' })}
${line(1385, 830, 125, 830, { label: '9. exibe dashboard/notificacoes', stroke: '#DB2777', dash: '8 6' })}
`);

const activities = svg(1500, 1850, 'Sistema IMR - Diagrama de Atividades', `
${ellipse('start', 650, 90, 200, 70, 'Inicio', { fill: '#DCFCE7', stroke: '#16A34A', weight: 700 })}
${rect('login', 610, 205, 280, 80, 'Usuario realiza login', { fill: '#E0F2FE', stroke: '#0284C7', weight: 700 })}
${diamond('profile', 750, 375, 220, 130, 'Perfil de acesso?', { fill: '#FFF7ED', stroke: '#EA580C' })}
${rect('admin', 300, 520, 310, 95, 'Area administrativa\nGerencia clientes, receitas e SMS', { fill: '#FEF3C7', stroke: '#D97706', weight: 700 })}
${rect('client', 890, 520, 310, 95, 'Area do cliente\nConsulta dados e receitas proprias', { fill: '#DCFCE7', stroke: '#16A34A', weight: 700 })}
${rect('recipe', 610, 710, 280, 85, 'Cadastrar ou atualizar receita', { fill: '#FCE7F3', stroke: '#DB2777', weight: 700 })}
${rect('validate', 610, 860, 280, 85, 'Validar campos obrigatorios e arquivo', { fill: '#F8FAFC', stroke: '#64748B', weight: 700 })}
${rect('save', 610, 1010, 280, 85, 'Salvar receita no MySQL\ne arquivo em uploads', { fill: '#FEF3C7', stroke: '#D97706', weight: 700 })}
${rect('calc', 610, 1160, 280, 85, 'Calcular validade e proxima retirada', { fill: '#E0F2FE', stroke: '#0284C7', weight: 700 })}
${diamond('expired', 360, 1360, 210, 125, 'Receita vencida?', { fill: '#FEE2E2', stroke: '#DC2626' })}
${diamond('near', 750, 1360, 220, 125, 'Vence em ate 5 dias?', { fill: '#FEF3C7', stroke: '#D97706' })}
${diamond('withdraw', 1140, 1360, 260, 125, 'Retirada hoje ou em ate 3 dias?', { fill: '#DCFCE7', stroke: '#16A34A' })}
${rect('alert1', 260, 1530, 240, 70, 'Exibir alerta de vencida', { fill: '#FEE2E2', stroke: '#DC2626', weight: 700 })}
${rect('alert2', 630, 1530, 240, 70, 'Exibir alerta de vencimento', { fill: '#FEF3C7', stroke: '#D97706', weight: 700 })}
${rect('alert3', 1010, 1530, 260, 70, 'Exibir lembrete de retirada', { fill: '#DCFCE7', stroke: '#16A34A', weight: 700 })}
${rect('dashboard', 610, 1680, 280, 85, 'Atualizar dashboard e notificacoes', { fill: '#F8FAFC', stroke: '#64748B', weight: 700 })}
${line(750, 160, 750, 205)}
${line(750, 285, 750, 310)}
${line(640, 375, 455, 520, { label: 'Administrador', labelX: 530, labelY: 430 })}
${line(860, 375, 1045, 520, { label: 'Cliente', labelX: 980, labelY: 430 })}
${poly([[455, 615], [455, 665], [750, 665], [750, 710]])}
${poly([[1045, 615], [1045, 665], [750, 665], [750, 710]])}
${line(750, 795, 750, 860)}
${line(750, 945, 750, 1010)}
${line(750, 1095, 750, 1160)}
${poly([[750, 1245], [750, 1295], [360, 1295], [360, 1298]], { stroke: '#DC2626' })}
${line(750, 1245, 750, 1298, { stroke: '#D97706' })}
${poly([[750, 1245], [750, 1295], [1140, 1295], [1140, 1298]], { stroke: '#16A34A' })}
${line(360, 1423, 380, 1530, { label: 'sim', stroke: '#DC2626' })}
${line(750, 1423, 750, 1530, { label: 'sim', stroke: '#D97706' })}
${line(1140, 1423, 1140, 1530, { label: 'sim', stroke: '#16A34A' })}
${poly([[380, 1600], [380, 1645], [750, 1645], [750, 1680]])}
${line(750, 1600, 750, 1680)}
${poly([[1140, 1600], [1140, 1645], [750, 1645], [750, 1680]])}
`);

const classes = svg(1500, 1150, 'Sistema IMR - Classes Conceituais', `
${tableEntity('admin', 70, 120, 280, 'Administrador', ['usuario', 'senha', 'loginAdm()', 'gerenciarClientes()', 'gerenciarReceitas()', 'enviarSms()'], { fill: '#FEF3C7', stroke: '#D97706' })}
${tableEntity('client', 500, 100, 310, 'Cliente', ['id', 'nome', 'cpf', 'telefone', 'endereco', 'nascimento', 'senhaHash', 'documento', 'loginCliente()', 'atualizarDados()', 'consultarReceitas()'], { fill: '#E0F2FE', stroke: '#0284C7' })}
${tableEntity('recipe', 1040, 120, 330, 'Receita', ['id', 'medicamento', 'dataReceita', 'validade', 'proximaRetirada', 'observacoes', 'imagemReceita', 'status', 'calcularDiasRestantes()', 'verificarVencimento()'], { fill: '#DCFCE7', stroke: '#16A34A' })}
${tableEntity('doc', 70, 610, 300, 'Documento', ['nomeArquivo', 'tipoArquivo', 'tamanho', 'caminho', 'validarFormato()', 'salvarArquivo()'], { fill: '#FCE7F3', stroke: '#DB2777' })}
${tableEntity('notif', 500, 635, 310, 'Notificacao', ['id', 'mensagem', 'tipo', 'lida', 'createdAt', 'exibir()', 'marcarComoLida()'], { fill: '#EDE9FE', stroke: '#7C3AED' })}
${tableEntity('sms', 1040, 620, 330, 'SmsEnvio', ['id', 'telefone', 'mensagem', 'provider', 'status', 'erro', 'createdAt', 'enviar()', 'registrarHistorico()'], { fill: '#EDE9FE', stroke: '#7C3AED' })}
${tableEntity('pharmacy', 600, 930, 300, 'Farmacia', ['id', 'nome', 'endereco', 'telefone', 'cadastrarFarmacia()'], { fill: '#FEF3C7', stroke: '#D97706' })}
${line(350, 215, 500, 215, { label: 'gerencia', stroke: '#D97706' })}
${poly([[350, 165], [350, 80], [1205, 80], [1205, 120]], { label: 'gerencia receitas', labelX: 790, labelY: 72, stroke: '#D97706' })}
${line(810, 245, 1040, 245, { label: '1 possui 0..N', stroke: '#16A34A' })}
${poly([[585, 453], [585, 540], [220, 540], [220, 610]], { label: '0..1 documento', labelX: 390, labelY: 530, stroke: '#DB2777' })}
${line(655, 453, 655, 635, { label: '0..N recebe', stroke: '#7C3AED' })}
${poly([[810, 365], [940, 365], [940, 735], [1040, 735]], { label: '0..N historico SMS', labelX: 940, labelY: 560, stroke: '#7C3AED' })}
${rect('pharmacy-note', 925, 970, 360, 70, 'Farmacia prevista para expansao futura do sistema.', { fill: '#F8FAFC', stroke: '#94A3B8', size: 17 })}
`);

const er = svg(1500, 1050, 'Sistema IMR - Entidade e Relacionamento', `
${tableEntity('clientes', 70, 120, 330, 'clientes', ['PK id INT', 'nome VARCHAR(150)', 'cpf VARCHAR(14) UNIQUE', 'telefone VARCHAR(20)', 'endereco VARCHAR(255)', 'nascimento DATE', 'senha VARCHAR(255)', 'documento VARCHAR(255)', 'created_at TIMESTAMP', 'updated_at TIMESTAMP'], { fill: '#E0F2FE', stroke: '#0284C7' })}
${tableEntity('receitas', 585, 110, 340, 'receitas', ['PK id INT', 'FK cliente_id INT', 'medicamento VARCHAR(150)', 'data_receita DATE', 'validade DATE', 'proxima_retirada DATE', 'observacoes TEXT', 'imagem_receita VARCHAR(255)', 'status ENUM', 'created_at TIMESTAMP', 'updated_at TIMESTAMP'], { fill: '#DCFCE7', stroke: '#16A34A' })}
${tableEntity('notificacoes', 1110, 125, 320, 'notificacoes', ['PK id INT', 'FK cliente_id INT NULL', 'mensagem TEXT', 'tipo VARCHAR(50)', 'lida TINYINT(1)', 'created_at TIMESTAMP'], { fill: '#FCE7F3', stroke: '#DB2777' })}
${tableEntity('sms', 1110, 535, 320, 'sms_envios', ['PK id INT', 'FK cliente_id INT NULL', 'telefone VARCHAR(20)', 'mensagem TEXT', 'provider VARCHAR(50)', 'provider_sid VARCHAR(120)', 'status VARCHAR(40)', 'erro TEXT', 'created_at TIMESTAMP'], { fill: '#EDE9FE', stroke: '#7C3AED' })}
${tableEntity('farmacias', 70, 620, 330, 'farmacias', ['PK id INT', 'nome VARCHAR(150)', 'endereco VARCHAR(255)', 'telefone VARCHAR(20)', 'created_at TIMESTAMP'], { fill: '#FEF3C7', stroke: '#D97706' })}
${rect('note', 565, 700, 390, 130, 'Observacao\nA tabela farmacias existe no schema atual, mas ainda nao possui chave estrangeira ligada a receitas ou clientes.', { fill: '#F8FAFC', stroke: '#94A3B8', size: 18 })}
${line(400, 270, 585, 270, { label: '1:N', stroke: '#16A34A' })}
<text x="492" y="300" text-anchor="middle" font-size="14" font-weight="700" fill="#16A34A" stroke="none">CASCADE</text>
${poly([[400, 190], [400, 90], [1270, 90], [1270, 125]], { label: '1:N CASCADE', labelX: 840, labelY: 82, stroke: '#DB2777' })}
${poly([[400, 375], [540, 520], [1110, 665]], { label: '1:N SET NULL', labelX: 735, labelY: 525, stroke: '#7C3AED' })}
`);

save('01_caso_de_uso.svg', useCase);
save('02_diagrama_de_sequencia.svg', sequence);
save('03_diagrama_de_atividades.svg', activities);
save('04_classes_conceituais.svg', classes);
save('05_entidade_relacionamento.svg', er);

const gallery = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Diagramas IMR</title>
  <style>
    body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #eef2f7; color: #111827; }
    main { width: min(1500px, calc(100% - 32px)); margin: 24px auto; display: grid; gap: 28px; }
    section { background: #fff; border: 1px solid #d8e0ec; border-radius: 8px; padding: 16px; }
    h1 { margin: 0 0 10px; }
    h2 { margin: 0 0 14px; font-size: 22px; }
    img { width: 100%; height: auto; display: block; }
  </style>
</head>
<body>
  <main>
    <h1>Diagramas do Sistema IMR</h1>
    ${[
      ['Caso de Uso', '01_caso_de_uso.svg'],
      ['Sequencia', '02_diagrama_de_sequencia.svg'],
      ['Atividades', '03_diagrama_de_atividades.svg'],
      ['Classes Conceituais', '04_classes_conceituais.svg'],
      ['Entidade e Relacionamento', '05_entidade_relacionamento.svg']
    ].map(([title, file]) => `<section><h2>${title}</h2><img src="${file}" alt="${title}"></section>`).join('\n')}
  </main>
</body>
</html>`;

save('index.html', gallery);

console.log(outDir);
