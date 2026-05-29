const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const root = path.resolve(__dirname, '..');
const outDir = path.join(root, 'diagramas_drawio');

fs.mkdirSync(outDir, { recursive: true });

function esc(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function cell(id, value, style, x, y, w, h, extra = '') {
  return `        <mxCell id="${esc(id)}" value="${esc(value)}" style="${esc(style)}" vertex="1" parent="1"${extra}>
          <mxGeometry x="${x}" y="${y}" width="${w}" height="${h}" as="geometry"/>
        </mxCell>`;
}

function edge(id, source, target, value = '', style = 'endArrow=block;html=1;rounded=0;strokeColor=#475569;strokeWidth=2;') {
  return `        <mxCell id="${esc(id)}" value="${esc(value)}" style="${esc(style)}" edge="1" parent="1" source="${esc(source)}" target="${esc(target)}">
          <mxGeometry relative="1" as="geometry"/>
        </mxCell>`;
}

function graphModel(cells, height = 827) {
  return `    <mxGraphModel dx="1422" dy="794" grid="1" gridSize="10" guides="1" tooltips="1" connect="1" arrows="1" fold="1" page="1" pageScale="1" pageWidth="1169" pageHeight="${height}" background="#FFFFFF" math="0" shadow="0">
      <root>
        <mxCell id="0"/>
        <mxCell id="1" parent="0"/>
${cells.join('\n')}
      </root>
    </mxGraphModel>`;
}

function diagram(id, name, cells, height) {
  return `  <diagram id="${esc(id)}" name="${esc(name)}">
${graphModel(cells, height)}
  </diagram>`;
}

const titleStyle = 'text;html=1;strokeColor=none;fillColor=none;align=center;verticalAlign=middle;whiteSpace=wrap;rounded=0;fontSize=22;fontStyle=1;fontColor=#111827;';
const boundaryStyle = 'rounded=1;whiteSpace=wrap;html=1;arcSize=6;strokeWidth=2;dashed=1;fillColor=#FFFFFF;strokeColor=#64748B;fontStyle=1;verticalAlign=top;spacingTop=12;fontSize=15;fontColor=#334155;';
const useCaseStyle = 'ellipse;whiteSpace=wrap;html=1;fillColor=#E0F2FE;strokeColor=#0284C7;fontSize=13;fontColor=#0F172A;';
const useCaseGreen = 'ellipse;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;fontSize=13;fontColor=#0F172A;';
const useCasePink = 'ellipse;whiteSpace=wrap;html=1;fillColor=#FCE7F3;strokeColor=#DB2777;fontSize=13;fontColor=#0F172A;';
const useCaseYellow = 'ellipse;whiteSpace=wrap;html=1;fillColor=#FEF3C7;strokeColor=#D97706;fontSize=13;fontColor=#0F172A;';
const actorStyle = 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fontSize=14;fontStyle=1;fontColor=#111827;strokeColor=#111827;';
const processBlue = 'rounded=1;whiteSpace=wrap;html=1;arcSize=8;fillColor=#E0F2FE;strokeColor=#0284C7;fontSize=13;fontColor=#0F172A;';
const processGreen = 'rounded=1;whiteSpace=wrap;html=1;arcSize=8;fillColor=#DCFCE7;strokeColor=#16A34A;fontSize=13;fontColor=#0F172A;';
const processYellow = 'rounded=1;whiteSpace=wrap;html=1;arcSize=8;fillColor=#FEF3C7;strokeColor=#D97706;fontSize=13;fontColor=#0F172A;';
const processPink = 'rounded=1;whiteSpace=wrap;html=1;arcSize=8;fillColor=#FCE7F3;strokeColor=#DB2777;fontSize=13;fontColor=#0F172A;';
const processGray = 'rounded=1;whiteSpace=wrap;html=1;arcSize=8;fillColor=#F8FAFC;strokeColor=#64748B;fontSize=13;fontColor=#0F172A;';
const decisionStyle = 'rhombus;whiteSpace=wrap;html=1;fillColor=#FFF7ED;strokeColor=#EA580C;fontSize=13;fontColor=#0F172A;';
const erStyleBlue = 'rounded=1;whiteSpace=wrap;html=1;arcSize=4;fillColor=#E0F2FE;strokeColor=#0284C7;fontSize=12;fontColor=#0F172A;align=left;verticalAlign=top;spacing=10;';
const erStyleGreen = 'rounded=1;whiteSpace=wrap;html=1;arcSize=4;fillColor=#DCFCE7;strokeColor=#16A34A;fontSize=12;fontColor=#0F172A;align=left;verticalAlign=top;spacing=10;';
const erStylePink = 'rounded=1;whiteSpace=wrap;html=1;arcSize=4;fillColor=#FCE7F3;strokeColor=#DB2777;fontSize=12;fontColor=#0F172A;align=left;verticalAlign=top;spacing=10;';
const erStylePurple = 'rounded=1;whiteSpace=wrap;html=1;arcSize=4;fillColor=#EDE9FE;strokeColor=#7C3AED;fontSize=12;fontColor=#0F172A;align=left;verticalAlign=top;spacing=10;';
const erStyleYellow = 'rounded=1;whiteSpace=wrap;html=1;arcSize=4;fillColor=#FEF3C7;strokeColor=#D97706;fontSize=12;fontColor=#0F172A;align=left;verticalAlign=top;spacing=10;';
const relationStyle = 'edgeStyle=orthogonalEdgeStyle;rounded=0;orthogonalLoop=1;jettySize=auto;html=1;startArrow=ERone;endArrow=ERmany;strokeWidth=2;strokeColor=#475569;fontSize=12;fontColor=#334155;';

const useCaseCells = [
  cell('uc-title', 'Sistema IMR - Diagrama de Caso de Uso', titleStyle, 250, 25, 670, 40),
  cell('uc-boundary', 'Sistema de Monitoramento de Receitas IMR', boundaryStyle, 250, 85, 680, 640),
  cell('uc-admin', 'Administrador', actorStyle, 70, 245, 80, 125),
  cell('uc-client', 'Cliente', actorStyle, 1020, 275, 80, 125),
  cell('uc-twilio', 'Servico SMS Twilio', actorStyle, 1010, 560, 95, 125),
  cell('uc-login', 'Realizar login', useCaseStyle, 520, 120, 155, 58),
  cell('uc-dashboard', 'Consultar dashboard', useCaseGreen, 520, 205, 155, 58),
  cell('uc-self-register', 'Cadastrar-se', useCaseStyle, 720, 150, 160, 58),
  cell('uc-own-data', 'Atualizar meus dados', useCaseGreen, 720, 250, 160, 58),
  cell('uc-own-recipes', 'Cadastrar e consultar minhas receitas', useCaseGreen, 695, 355, 210, 70),
  cell('uc-client-alerts', 'Visualizar notificacoes', useCasePink, 720, 485, 160, 58),
  cell('uc-manage-client', 'Gerenciar clientes', useCaseYellow, 305, 180, 165, 58),
  cell('uc-manage-recipe', 'Gerenciar receitas', useCaseYellow, 305, 290, 165, 58),
  cell('uc-admin-alerts', 'Acompanhar notificacoes gerais', useCasePink, 295, 405, 185, 66),
  cell('uc-send-sms', 'Enviar SMS ao cliente', useCasePink, 305, 535, 165, 58),
  cell('uc-upload-doc', 'Anexar documento do cliente', useCaseStyle, 505, 610, 180, 58),
  cell('uc-upload-recipe', 'Anexar arquivo da receita', useCaseStyle, 715, 610, 170, 58),
  edge('uc-e1', 'uc-admin', 'uc-login', '', 'endArrow=none;html=1;rounded=0;strokeColor=#475569;'),
  edge('uc-e2', 'uc-client', 'uc-login', '', 'endArrow=none;html=1;rounded=0;strokeColor=#475569;'),
  edge('uc-e3', 'uc-admin', 'uc-dashboard', '', 'endArrow=none;html=1;rounded=0;strokeColor=#475569;'),
  edge('uc-e4', 'uc-client', 'uc-dashboard', '', 'endArrow=none;html=1;rounded=0;strokeColor=#475569;'),
  edge('uc-e5', 'uc-admin', 'uc-manage-client', '', 'endArrow=none;html=1;rounded=0;strokeColor=#475569;'),
  edge('uc-e6', 'uc-admin', 'uc-manage-recipe', '', 'endArrow=none;html=1;rounded=0;strokeColor=#475569;'),
  edge('uc-e7', 'uc-admin', 'uc-admin-alerts', '', 'endArrow=none;html=1;rounded=0;strokeColor=#475569;'),
  edge('uc-e8', 'uc-admin', 'uc-send-sms', '', 'endArrow=none;html=1;rounded=0;strokeColor=#475569;'),
  edge('uc-e9', 'uc-client', 'uc-self-register', '', 'endArrow=none;html=1;rounded=0;strokeColor=#475569;'),
  edge('uc-e10', 'uc-client', 'uc-own-data', '', 'endArrow=none;html=1;rounded=0;strokeColor=#475569;'),
  edge('uc-e11', 'uc-client', 'uc-own-recipes', '', 'endArrow=none;html=1;rounded=0;strokeColor=#475569;'),
  edge('uc-e12', 'uc-client', 'uc-client-alerts', '', 'endArrow=none;html=1;rounded=0;strokeColor=#475569;'),
  edge('uc-e13', 'uc-self-register', 'uc-upload-doc', 'inclui', 'endArrow=open;endFill=0;dashed=1;html=1;rounded=0;strokeColor=#64748B;fontColor=#475569;'),
  edge('uc-e14', 'uc-manage-client', 'uc-upload-doc', 'inclui', 'endArrow=open;endFill=0;dashed=1;html=1;rounded=0;strokeColor=#64748B;fontColor=#475569;'),
  edge('uc-e15', 'uc-own-recipes', 'uc-upload-recipe', 'inclui', 'endArrow=open;endFill=0;dashed=1;html=1;rounded=0;strokeColor=#64748B;fontColor=#475569;'),
  edge('uc-e16', 'uc-manage-recipe', 'uc-upload-recipe', 'inclui', 'endArrow=open;endFill=0;dashed=1;html=1;rounded=0;strokeColor=#64748B;fontColor=#475569;'),
  edge('uc-e17', 'uc-send-sms', 'uc-twilio', '', 'endArrow=none;html=1;rounded=0;strokeColor=#7C3AED;strokeWidth=2;')
];

const sequenceCells = [
  cell('seq-title', 'Sistema IMR - Diagrama de Sequencia: Cadastro e Monitoramento de Receita', titleStyle, 135, 25, 900, 40),
  cell('seq-actor', 'Cliente / Administrador', 'shape=umlActor;verticalLabelPosition=bottom;verticalAlign=top;html=1;outlineConnect=0;fontSize=13;fontStyle=1;fontColor=#111827;strokeColor=#111827;', 70, 95, 75, 115),
  cell('seq-front', 'Frontend Web\\nHTML/CSS/JS', processBlue, 220, 95, 130, 55),
  cell('seq-api', 'API Node.js\\nExpress', processGreen, 430, 95, 130, 55),
  cell('seq-upload', 'Middleware\\nMulter Upload', processYellow, 620, 95, 140, 55),
  cell('seq-db', 'Banco MySQL\\nreceitacerta', 'shape=cylinder3d;whiteSpace=wrap;html=1;boundedLbl=1;backgroundOutline=1;size=15;fillColor=#FEF3C7;strokeColor=#D97706;fontSize=13;fontColor=#0F172A;', 820, 90, 140, 70),
  cell('seq-notif', 'Dashboard e\\nNotificacoes', processPink, 1010, 95, 130, 55),
  cell('seq-l1', '', 'line;strokeWidth=1;html=1;strokeColor=#94A3B8;', 107, 220, 10, 540),
  cell('seq-l2', '', 'line;strokeWidth=1;html=1;strokeColor=#94A3B8;', 285, 175, 10, 585),
  cell('seq-l3', '', 'line;strokeWidth=1;html=1;strokeColor=#94A3B8;', 495, 175, 10, 585),
  cell('seq-l4', '', 'line;strokeWidth=1;html=1;strokeColor=#94A3B8;', 690, 175, 10, 585),
  cell('seq-l5', '', 'line;strokeWidth=1;html=1;strokeColor=#94A3B8;', 890, 175, 10, 585),
  cell('seq-l6', '', 'line;strokeWidth=1;html=1;strokeColor=#94A3B8;', 1075, 175, 10, 585),
  edge('seq-e1', 'seq-actor', 'seq-front', '1. Preenche dados da receita', 'endArrow=block;html=1;rounded=0;strokeColor=#0284C7;fontColor=#075985;'),
  edge('seq-e2', 'seq-front', 'seq-api', '2. POST /api/receitas multipart', 'endArrow=block;html=1;rounded=0;strokeColor=#16A34A;fontColor=#166534;'),
  edge('seq-e3', 'seq-api', 'seq-upload', '3. Valida tipo/tamanho do arquivo', 'endArrow=block;html=1;rounded=0;strokeColor=#D97706;fontColor=#92400E;'),
  edge('seq-e4', 'seq-upload', 'seq-api', '4. Retorna nome do arquivo salvo', 'endArrow=block;dashed=1;html=1;rounded=0;strokeColor=#D97706;fontColor=#92400E;'),
  edge('seq-e5', 'seq-api', 'seq-db', '5. INSERT receitas', 'endArrow=block;html=1;rounded=0;strokeColor=#475569;fontColor=#334155;'),
  edge('seq-e6', 'seq-db', 'seq-api', '6. Retorna id da receita', 'endArrow=block;dashed=1;html=1;rounded=0;strokeColor=#475569;fontColor=#334155;'),
  edge('seq-e7', 'seq-api', 'seq-front', '7. Resposta success=true', 'endArrow=block;dashed=1;html=1;rounded=0;strokeColor=#16A34A;fontColor=#166534;'),
  edge('seq-e8', 'seq-front', 'seq-api', '8. GET /api/receitas', 'endArrow=block;html=1;rounded=0;strokeColor=#16A34A;fontColor=#166534;'),
  edge('seq-e9', 'seq-api', 'seq-db', '9. SELECT receitas + clientes', 'endArrow=block;html=1;rounded=0;strokeColor=#475569;fontColor=#334155;'),
  edge('seq-e10', 'seq-db', 'seq-api', '10. Lista de receitas', 'endArrow=block;dashed=1;html=1;rounded=0;strokeColor=#475569;fontColor=#334155;'),
  edge('seq-e11', 'seq-api', 'seq-front', '11. JSON atualizado', 'endArrow=block;dashed=1;html=1;rounded=0;strokeColor=#16A34A;fontColor=#166534;'),
  edge('seq-e12', 'seq-front', 'seq-notif', '12. Calcula dias restantes e monta alertas', 'endArrow=block;html=1;rounded=0;strokeColor=#DB2777;fontColor=#9D174D;'),
  edge('seq-e13', 'seq-notif', 'seq-actor', '13. Exibe dashboard/notificacoes', 'endArrow=block;dashed=1;html=1;rounded=0;strokeColor=#DB2777;fontColor=#9D174D;')
];

const activityCells = [
  cell('act-title', 'Sistema IMR - Diagrama de Atividades', titleStyle, 245, 25, 680, 40),
  cell('act-start', 'Inicio', 'ellipse;whiteSpace=wrap;html=1;fillColor=#DCFCE7;strokeColor=#16A34A;fontSize=14;fontStyle=1;fontColor=#0F172A;', 515, 90, 140, 55),
  cell('act-login', 'Usuario realiza login', processBlue, 475, 175, 220, 65),
  cell('act-profile', 'Perfil de acesso?', decisionStyle, 505, 270, 160, 95),
  cell('act-admin', 'Area administrativa\\nGerencia clientes, receitas e SMS', processYellow, 250, 405, 240, 80),
  cell('act-client', 'Area do cliente\\nConsulta dados e receitas proprias', processGreen, 680, 405, 240, 80),
  cell('act-recipe', 'Cadastrar ou atualizar receita', processPink, 475, 525, 220, 70),
  cell('act-validate', 'Validar campos obrigatorios e arquivo', processGray, 475, 625, 220, 70),
  cell('act-save', 'Salvar receita no MySQL\\ne arquivo em uploads', processYellow, 475, 725, 220, 70),
  cell('act-calc', 'Calcular validade e proxima retirada', processBlue, 475, 825, 220, 70),
  cell('act-vencida', 'Receita vencida?', decisionStyle, 225, 935, 150, 90),
  cell('act-proxima', 'Vence em ate 5 dias?', decisionStyle, 510, 935, 150, 90),
  cell('act-retirada', 'Retirada hoje ou em ate 3 dias?', decisionStyle, 785, 935, 170, 90),
  cell('act-alert1', 'Exibir alerta de vencida', processPink, 180, 1055, 185, 55),
  cell('act-alert2', 'Exibir alerta de vencimento', processYellow, 495, 1055, 180, 55),
  cell('act-alert3', 'Exibir lembrete de retirada', processGreen, 770, 1055, 200, 55),
  cell('act-dashboard', 'Atualizar dashboard e notificacoes', processGray, 475, 1165, 220, 70),
  cell('act-sms-question', 'Administrador deseja enviar SMS?', decisionStyle, 500, 1265, 170, 90),
  cell('act-sms', 'Enviar SMS e registrar historico', processPink, 755, 1280, 210, 60),
  cell('act-end', 'Fim', 'ellipse;whiteSpace=wrap;html=1;fillColor=#F1F5F9;strokeColor=#64748B;fontSize=14;fontStyle=1;fontColor=#0F172A;', 515, 1400, 140, 55),
  edge('act-e1', 'act-start', 'act-login'),
  edge('act-e2', 'act-login', 'act-profile'),
  edge('act-e3', 'act-profile', 'act-admin', 'Administrador'),
  edge('act-e4', 'act-profile', 'act-client', 'Cliente'),
  edge('act-e5', 'act-admin', 'act-recipe'),
  edge('act-e6', 'act-client', 'act-recipe'),
  edge('act-e7', 'act-recipe', 'act-validate'),
  edge('act-e8', 'act-validate', 'act-save'),
  edge('act-e9', 'act-save', 'act-calc'),
  edge('act-e10', 'act-calc', 'act-vencida', '', 'endArrow=block;html=1;rounded=0;strokeColor=#DB2777;strokeWidth=2;'),
  edge('act-e11', 'act-calc', 'act-proxima', '', 'endArrow=block;html=1;rounded=0;strokeColor=#D97706;strokeWidth=2;'),
  edge('act-e12', 'act-calc', 'act-retirada', '', 'endArrow=block;html=1;rounded=0;strokeColor=#16A34A;strokeWidth=2;'),
  edge('act-e13', 'act-vencida', 'act-alert1', 'sim'),
  edge('act-e14', 'act-proxima', 'act-alert2', 'sim'),
  edge('act-e15', 'act-retirada', 'act-alert3', 'sim'),
  edge('act-e16', 'act-alert1', 'act-dashboard'),
  edge('act-e17', 'act-alert2', 'act-dashboard'),
  edge('act-e18', 'act-alert3', 'act-dashboard'),
  edge('act-e19', 'act-dashboard', 'act-sms-question'),
  edge('act-e20', 'act-sms-question', 'act-sms', 'sim'),
  edge('act-e21', 'act-sms', 'act-end'),
  edge('act-e22', 'act-sms-question', 'act-end', 'nao')
];

const classCells = [
  cell('class-title', 'Sistema IMR - Diagrama de Classes Conceituais', titleStyle, 210, 25, 750, 40),
  cell('class-admin', 'Administrador\\n--------------------\\nusuario\\nsenha\\n--------------------\\nloginAdm()\\ngerenciarClientes()\\ngerenciarReceitas()\\nenviarSms()', erStyleYellow, 70, 125, 230, 215),
  cell('class-client', 'Cliente\\n--------------------\\nid\\nnome\\ncpf\\ntelefone\\nendereco\\nnascimento\\nsenhaHash\\ndocumento\\n--------------------\\nloginCliente()\\natualizarDados()\\nconsultarReceitas()', erStyleBlue, 430, 105, 250, 300),
  cell('class-recipe', 'Receita\\n--------------------\\nid\\nmedicamento\\ndataReceita\\nvalidade\\nproximaRetirada\\nobservacoes\\nimagemReceita\\nstatus\\n--------------------\\ncalcularDiasRestantes()\\nverificarVencimento()', erStyleGreen, 805, 115, 260, 280),
  cell('class-doc', 'Documento\\n--------------------\\nnomeArquivo\\ntipoArquivo\\ntamanho\\ncaminho\\n--------------------\\nvalidarFormato()\\nsalvarArquivo()', erStylePink, 80, 470, 230, 220),
  cell('class-notif', 'Notificacao\\n--------------------\\nid\\nmensagem\\ntipo\\nlida\\ncreatedAt\\n--------------------\\nexibir()\\nmarcarComoLida()', erStylePurple, 430, 495, 250, 210),
  cell('class-sms', 'SmsEnvio\\n--------------------\\nid\\ntelefone\\nmensagem\\nprovider\\nstatus\\nerro\\ncreatedAt\\n--------------------\\nenviar()\\nregistrarHistorico()', erStylePurple, 805, 485, 260, 230),
  cell('class-pharmacy', 'Farmacia\\n--------------------\\nid\\nnome\\nendereco\\ntelefone\\n--------------------\\ncadastrarFarmacia()', erStyleYellow, 435, 735, 240, 180),
  edge('class-e1', 'class-admin', 'class-client', 'gerencia', 'endArrow=block;html=1;rounded=0;strokeColor=#D97706;fontColor=#92400E;strokeWidth=2;'),
  edge('class-e2', 'class-admin', 'class-recipe', 'gerencia', 'endArrow=block;html=1;rounded=0;strokeColor=#D97706;fontColor=#92400E;strokeWidth=2;'),
  edge('class-e3', 'class-client', 'class-recipe', '1 possui 0..N', 'endArrow=block;html=1;rounded=0;strokeColor=#16A34A;fontColor=#166534;strokeWidth=2;'),
  edge('class-e4', 'class-client', 'class-doc', '0..1 documento', 'endArrow=block;html=1;rounded=0;strokeColor=#DB2777;fontColor=#9D174D;strokeWidth=2;'),
  edge('class-e5', 'class-recipe', 'class-doc', '0..1 arquivo', 'endArrow=block;html=1;rounded=0;strokeColor=#DB2777;fontColor=#9D174D;strokeWidth=2;'),
  edge('class-e6', 'class-client', 'class-notif', '0..N recebe', 'endArrow=block;html=1;rounded=0;strokeColor=#7C3AED;fontColor=#5B21B6;strokeWidth=2;'),
  edge('class-e7', 'class-client', 'class-sms', '0..N historico', 'endArrow=block;html=1;rounded=0;strokeColor=#7C3AED;fontColor=#5B21B6;strokeWidth=2;'),
  edge('class-e8', 'class-admin', 'class-sms', 'envia', 'endArrow=block;html=1;rounded=0;strokeColor=#7C3AED;fontColor=#5B21B6;strokeWidth=2;'),
  edge('class-e9', 'class-pharmacy', 'class-recipe', 'previsto para expansao', 'endArrow=open;endFill=0;dashed=1;html=1;rounded=0;strokeColor=#64748B;fontColor=#475569;')
];

const erCells = [
  cell('er-title', 'Sistema IMR - Diagrama Entidade-Relacionamento', titleStyle, 230, 25, 710, 40),
  cell('er-clientes', 'clientes\\n--------------------\\nPK id INT\\nnome VARCHAR(150)\\ncpf VARCHAR(14) UNIQUE\\ntelefone VARCHAR(20)\\nendereco VARCHAR(255)\\nnascimento DATE\\nsenha VARCHAR(255)\\ndocumento VARCHAR(255)\\ncreated_at TIMESTAMP\\nupdated_at TIMESTAMP', erStyleBlue, 70, 115, 255, 280),
  cell('er-receitas', 'receitas\\n--------------------\\nPK id INT\\nFK cliente_id INT\\nmedicamento VARCHAR(150)\\ndata_receita DATE\\nvalidade DATE\\nproxima_retirada DATE\\nobservacoes TEXT\\nimagem_receita VARCHAR(255)\\nstatus ENUM\\ncreated_at TIMESTAMP\\nupdated_at TIMESTAMP', erStyleGreen, 455, 100, 270, 310),
  cell('er-notif', 'notificacoes\\n--------------------\\nPK id INT\\nFK cliente_id INT NULL\\nmensagem TEXT\\ntipo VARCHAR(50)\\nlida TINYINT(1)\\ncreated_at TIMESTAMP', erStylePink, 850, 115, 250, 210),
  cell('er-sms', 'sms_envios\\n--------------------\\nPK id INT\\nFK cliente_id INT NULL\\ntelefone VARCHAR(20)\\nmensagem TEXT\\nprovider VARCHAR(50)\\nprovider_sid VARCHAR(120)\\nstatus VARCHAR(40)\\nerro TEXT\\ncreated_at TIMESTAMP', erStylePurple, 850, 425, 250, 270),
  cell('er-farmacia', 'farmacias\\n--------------------\\nPK id INT\\nnome VARCHAR(150)\\nendereco VARCHAR(255)\\ntelefone VARCHAR(20)\\ncreated_at TIMESTAMP', erStyleYellow, 70, 520, 255, 175),
  cell('er-note', 'Observacao\\n--------------------\\nA tabela farmacias existe no schema atual, mas ainda nao possui chave estrangeira ligada a receitas ou clientes.', 'shape=note;whiteSpace=wrap;html=1;backgroundOutline=1;darkOpacity=0.05;fillColor=#F8FAFC;strokeColor=#94A3B8;fontSize=12;fontColor=#475569;align=left;spacing=10;', 440, 540, 300, 125),
  edge('er-e1', 'er-clientes', 'er-receitas', '1:N\\nON DELETE CASCADE', relationStyle),
  edge('er-e2', 'er-clientes', 'er-notif', '1:N\\nON DELETE CASCADE', relationStyle),
  edge('er-e3', 'er-clientes', 'er-sms', '1:N\\nON DELETE SET NULL', relationStyle)
];

const diagrams = [
  { id: 'imr-caso-uso', name: '01 - Caso de Uso', cells: useCaseCells, height: 827 },
  { id: 'imr-sequencia', name: '02 - Sequencia', cells: sequenceCells, height: 827 },
  { id: 'imr-atividades', name: '03 - Atividades', cells: activityCells, height: 1510 },
  { id: 'imr-classes', name: '04 - Classes Conceituais', cells: classCells, height: 1000 },
  { id: 'imr-er', name: '05 - Entidade Relacionamento', cells: erCells, height: 827 }
];

const mxfile = `<mxfile host="app.diagrams.net" modified="2026-05-29T00:00:00.000Z" agent="Codex" version="24.7.17" type="device">
${diagrams.map((d) => diagram(d.id, d.name, d.cells, d.height)).join('\n')}
</mxfile>
`;

const uncompressedPath = path.join(outDir, 'IMR_DIAGRAMAS_MODELAGEM_ATUALIZADOS.drawio');
fs.writeFileSync(uncompressedPath, mxfile, 'utf8');

function compressModel(modelXml) {
  const encoded = encodeURIComponent(modelXml);
  return zlib.deflateRawSync(Buffer.from(encoded, 'utf8')).toString('base64');
}

const compressed = `<mxfile host="app.diagrams.net" modified="2026-05-29T00:00:00.000Z" agent="Codex" version="24.7.17" type="device">
${diagrams.map((d) => `  <diagram id="${esc(d.id)}" name="${esc(d.name)}">${compressModel(graphModel(d.cells, d.height))}</diagram>`).join('\n')}
</mxfile>
`;

fs.writeFileSync(path.join(outDir, 'IMR_DIAGRAMAS_MODELAGEM_ATUALIZADOS_COMPATIVEL.drawio'), compressed, 'utf8');

for (const [index, d] of diagrams.entries()) {
  const safe = d.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
  const single = `<mxfile host="app.diagrams.net" modified="2026-05-29T00:00:00.000Z" agent="Codex" version="24.7.17" type="device">
  <diagram id="${esc(d.id)}" name="${esc(d.name)}">${compressModel(graphModel(d.cells, d.height))}</diagram>
</mxfile>
`;
  fs.writeFileSync(path.join(outDir, `modelagem_${String(index + 1).padStart(2, '0')}_${safe}.drawio`), single, 'utf8');
}

const openerHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Abrir Diagramas IMR Atualizados</title>
  <style>
    body { margin: 0; min-height: 100vh; display: grid; place-items: center; padding: 24px; font-family: Arial, Helvetica, sans-serif; background: #f4f7fb; color: #172033; }
    main { width: min(780px, 100%); background: #fff; border: 1px solid #d8e0ec; border-radius: 8px; padding: 28px; box-shadow: 0 18px 45px rgba(23, 32, 51, 0.10); }
    h1 { margin: 0 0 10px; font-size: 28px; line-height: 1.2; }
    p { margin: 0 0 18px; line-height: 1.55; color: #46556f; }
    button { border: 0; border-radius: 6px; background: #0b72f0; color: #fff; font-size: 18px; font-weight: 700; padding: 16px 22px; cursor: pointer; width: 100%; }
    button:disabled { opacity: .65; cursor: wait; }
    .status { margin-top: 18px; padding: 14px 16px; border-radius: 6px; background: #eef5ff; color: #173d76; font-size: 15px; min-height: 22px; }
    .links { margin-top: 18px; display: grid; gap: 8px; }
    a { color: #0b72f0; word-break: break-all; }
  </style>
</head>
<body>
  <main>
    <h1>Diagramas atualizados do Sistema IMR</h1>
    <p>Este pacote abre no Draw.io com cinco paginas: caso de uso, sequencia, atividades, classes conceituais e entidade-relacionamento.</p>
    <button id="openButton" type="button">Abrir no Draw.io</button>
    <div id="status" class="status">Pronto para abrir.</div>
    <div class="links">
      <a href="/IMR_DIAGRAMAS_MODELAGEM_ATUALIZADOS_COMPATIVEL.drawio" target="_blank" rel="noopener">Baixar arquivo Draw.io compativel</a>
      <a href="/links_modelagem_atualizada.html" target="_blank" rel="noopener">Abrir links separados por diagrama</a>
    </div>
  </main>
  <script>
    const button = document.getElementById('openButton');
    const statusBox = document.getElementById('status');
    let drawioWindow = null;
    let diagramXml = '';
    let sent = false;

    function setStatus(message) {
      statusBox.textContent = message;
    }

    function sendDiagram() {
      if (!drawioWindow || drawioWindow.closed || !diagramXml) return;
      drawioWindow.postMessage(diagramXml, 'https://app.diagrams.net');
      sent = true;
      setStatus('Diagramas enviados para o Draw.io. Se aparecer uma pergunta, escolha Device/Dispositivo.');
    }

    window.addEventListener('message', (event) => {
      if (event.origin !== 'https://app.diagrams.net') return;
      const data = event.data;
      const isReady = data === 'ready'
        || data === 'init'
        || (typeof data === 'string' && data.includes('ready'))
        || (data && typeof data === 'object' && (data.event === 'ready' || data.event === 'init'));
      if (isReady && !sent) sendDiagram();
    });

    button.addEventListener('click', async () => {
      button.disabled = true;
      sent = false;
      setStatus('Carregando diagramas...');
      try {
        const response = await fetch('/IMR_DIAGRAMAS_MODELAGEM_ATUALIZADOS.drawio', { cache: 'no-store' });
        if (!response.ok) throw new Error('Nao foi possivel carregar o arquivo local.');
        diagramXml = await response.text();
        setStatus('Abrindo Draw.io...');
        drawioWindow = window.open('https://app.diagrams.net/?client=1&lang=pt-br&local=1&title=IMR_DIAGRAMAS_MODELAGEM_ATUALIZADOS.drawio', '_blank', 'noopener=false');
        if (!drawioWindow) throw new Error('O navegador bloqueou a nova aba. Permita pop-ups para 127.0.0.1 e clique novamente.');
        setTimeout(sendDiagram, 1800);
        setTimeout(sendDiagram, 3500);
        setTimeout(sendDiagram, 6000);
      } catch (error) {
        setStatus(error.message || 'Erro ao abrir no Draw.io.');
      } finally {
        button.disabled = false;
      }
    });
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'abrir_modelagem_atualizada.html'), openerHtml, 'utf8');

const linkItems = diagrams.map((d) => {
  const singleMxfile = `<mxfile host="app.diagrams.net" modified="2026-05-29T00:00:00.000Z" agent="Codex" version="24.7.17" type="device"><diagram id="${esc(d.id)}" name="${esc(d.name)}">${graphModel(d.cells, d.height)}</diagram></mxfile>`;
  const url = `https://app.diagrams.net/?lang=pt-br&local=1#R${encodeURIComponent(singleMxfile)}`;
  return `<li><a href="${url}" target="_blank" rel="noopener">${esc(d.name)}</a></li>`;
}).join('\n');

const linksHtml = `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Links Diretos - Modelagem IMR</title>
  <style>
    body { font-family: Arial, Helvetica, sans-serif; margin: 32px; background: #f7fafc; color: #172033; }
    main { max-width: 780px; margin: auto; background: #fff; border: 1px solid #d8e0ec; border-radius: 8px; padding: 24px; }
    li { margin: 12px 0; font-size: 18px; }
    a { color: #0b72f0; }
  </style>
</head>
<body>
  <main>
    <h1>Links diretos para Draw.io</h1>
    <p>Cada link abre um diagrama separado no Draw.io.</p>
    <ol>
      ${linkItems}
    </ol>
  </main>
</body>
</html>
`;

fs.writeFileSync(path.join(outDir, 'links_modelagem_atualizada.html'), linksHtml, 'utf8');

console.log(`Diagramas gerados em: ${outDir}`);
