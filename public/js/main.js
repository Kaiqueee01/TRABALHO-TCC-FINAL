  const frontendSeparado = window.location.protocol === 'file:' || ['5500', '5501'].includes(window.location.port);
  const API_ORIGIN = frontendSeparado ? 'http://localhost:3000' : window.location.origin;
  const API = `${API_ORIGIN}/api`;

  // =========================
  // BASE DE DADOS LOCAL
  // =========================
  let tipoUsuario = '';

  let clienteLogado = null;

  let clientes = JSON.parse(localStorage.getItem('clientes')) || [];
  let receitas = JSON.parse(localStorage.getItem('receitas')) || [];
  const NOTIFICACOES_ADM_OCULTAS_KEY = 'notificacoesAdmOcultas';

  function salvarDados() {
    localStorage.setItem('clientes', JSON.stringify(clientes));
    localStorage.setItem('receitas', JSON.stringify(receitas));
  }

  function escapeHtml(valor) {
    return String(valor ?? '').replace(/[&<>"']/g, (char) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    }[char]));
  }

  function dataCurta(valor) {
    if (!valor) return '';
    return String(valor).slice(0, 10);
  }

  function arquivoSeguro(arquivo, pasta = '') {
    if (typeof arquivo === 'string' && arquivo) {
      return {
        nome: escapeHtml(arquivo),
        dados: `${API_ORIGIN}/uploads/${pasta}/${encodeURIComponent(arquivo)}`
      };
    }

    if (!arquivo || typeof arquivo.dados !== 'string') return null;

    const tipoValido = /^data:(application\/pdf|image\/png|image\/jpe?g);base64,/i.test(arquivo.dados);
    if (!tipoValido) return null;

    return {
      nome: escapeHtml(arquivo.nome || 'arquivo'),
      dados: escapeHtml(arquivo.dados)
    };
  }

  function clienteApiParaTela(cliente) {
    return {
      id: Number(cliente.id),
      nome: cliente.nome,
      cpf: cliente.cpf,
      telefone: cliente.telefone,
      endereco: cliente.endereco,
      nascimento: dataCurta(cliente.nascimento),
      documento: cliente.documento || null
    };
  }

  function receitaApiParaTela(receita) {
    return {
      id: Number(receita.id),
      clienteId: Number(receita.cliente_id),
      medicamento: receita.medicamento,
      dataReceita: dataCurta(receita.data_receita),
      validade: dataCurta(receita.validade),
      proximaRetirada: dataCurta(receita.proxima_retirada),
      observacoes: receita.observacoes || '',
      arquivoReceita: receita.imagem_receita || null
    };
  }

  async function apiJson(caminho, opcoes = {}) {
    const resposta = await fetch(`${API}${caminho}`, opcoes);
    const dados = await resposta.json().catch(() => ({}));

    if (!resposta.ok) {
      throw new Error(dados.mensagem || dados.erro || 'Erro na comunicação com o servidor.');
    }

    return dados;
  }

  async function sincronizarDadosBackend() {
    const [dadosClientes, dadosReceitas] = await Promise.all([
      apiJson('/clientes'),
      apiJson('/receitas')
    ]);

    clientes = (dadosClientes.clientes || []).map(clienteApiParaTela);
    receitas = (dadosReceitas.receitas || []).map(receitaApiParaTela);
    salvarDados();
  }

  async function lerArquivoBase64(inputId) {
    const input = document.getElementById(inputId);
    if (!input || !input.files || input.files.length === 0) return null;
    const file = input.files[0];
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve({
        nome: file.name,
        tipo: file.type,
        dados: reader.result
      });
      reader.onerror = () => reject(new Error('Erro ao ler arquivo'));
      reader.readAsDataURL(file);
    });
  }

  function previewUpload(inputId, previewId) {
    const input = document.getElementById(inputId);
    const preview = document.getElementById(previewId);
    const buttonId = input && input.dataset ? input.dataset.buttonId : null;
    const button = buttonId ? document.getElementById(buttonId) : null;
    const defaultText = button ? button.dataset.defaultText : null;
    if (preview) {
      const file = input && input.files ? input.files[0] : null;
      preview.innerHTML = file ? `✅ Arquivo selecionado: ${escapeHtml(file.name)}` : '';
      if (button) {
        button.textContent = file ? `Selecionado: ${file.name}` : (defaultText || button.textContent);
      }
    }
  }

  async function cadastrarCliente() {
    const nome = document.getElementById('cadNome').value.trim();
    const cpf = document.getElementById('cadCpf').value.trim();
    const telefone = document.getElementById('cadTelefone').value.trim();
    const endereco = document.getElementById('cadEndereco').value.trim();
    const nascimento = document.getElementById('cadNascimento').value.trim();
    const senha = document.getElementById('cadSenha').value;
    const arquivo = document.getElementById('cadDocumento').files?.[0];

    const msgBox = document.getElementById('msgCadastroCliente');
    if (msgBox) msgBox.innerHTML = '';

    if (!nome || !cpf || !telefone || !endereco || !nascimento || !senha || !arquivo) {
      if (msgBox) msgBox.innerHTML = mensagemErro('Preencha todos os campos e anexe o documento.');
      return;
    }

    try {
      const respCadastro = await fetch(`${API}/auth/cadastro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cpf, telefone, endereco, nascimento, senha })
      });

      const dadosCadastro = await respCadastro.json();
      if (!respCadastro.ok) {
        if (msgBox) msgBox.innerHTML = mensagemErro(dadosCadastro.erro || dadosCadastro.mensagem || 'Erro no cadastro.');
        return;
      }

      const form = new FormData();
      form.append('cpf', cpf);
      form.append('documento', arquivo);

      const respDoc = await fetch(`${API}/auth/cadastro-documento`, {
        method: 'POST',
        body: form
      });

      const dadosDoc = await respDoc.json();
      if (!respDoc.ok) {
        if (msgBox) msgBox.innerHTML = mensagemErro(dadosDoc.erro || dadosDoc.mensagem || 'Erro ao enviar documento.');
        return;
      }

      if (msgBox) msgBox.innerHTML = mensagemSucesso('Cadastro e documento enviados com sucesso. Entrando no sistema...');
      await sincronizarDadosBackend();

      tipoUsuario = 'cliente';
      clienteLogado = clientes.find(c => c.cpf === cpf) || {
        id: Number(dadosCadastro.cliente?.id),
        nome,
        cpf,
        telefone,
        endereco,
        nascimento,
        documento: dadosDoc.documento || null
      };

      entrarSistema();
    } catch (e) {
      if (msgBox) msgBox.innerHTML = mensagemErro(e.message || 'Erro ao cadastrar.');
    }
  }


  // =========================
  // DADOS INICIAIS DEMO
  // =========================
  if (clientes.length === 0) {
    clientes.push({
      id: Date.now(),
      nome: "Maria da Silva",
      cpf: "12345678900",
      telefone: "19999999999",
      endereco: "Rua das Flores, 120 - Centro",
      nascimento: "1990-05-10"
    });

    receitas.push({
      id: Date.now() + 1,
      clienteId: clientes[0].id,
      medicamento: "Losartana 50mg",
      dataReceita: "2026-04-01",
      validade: "2026-04-20",
      proximaRetirada: "2026-04-10",
      observacoes: "Uso contínuo"
    });

    salvarDados();
  }

  // =========================
  // UTILIDADES
  // =========================
  function gerarId() {
    return Date.now() + Math.floor(Math.random() * 1000);
  }

  function limparConteudo(id) {
    const el = document.getElementById(id);
    if (el) el.innerHTML = '';
  }

  function formatarData(data) {
    if (!data) return '-';
    const [ano, mes, dia] = data.split('-');
    return `${dia}/${mes}/${ano}`;
  }

  function diasRestantes(data) {
    const hoje = new Date();
    const alvo = new Date(data + "T00:00:00");
    const diff = Math.ceil((alvo - hoje) / (1000 * 60 * 60 * 24));
    return diff;
  }

  function statusReceita(validade) {
    const dias = diasRestantes(validade);
    if (dias < 0) return `<span class="badge badge-vencida">Vencida</span>`;
    if (dias <= 5) return `<span class="badge badge-alerta">Próxima do vencimento</span>`;
    return `<span class="badge badge-ok">Ativa</span>`;
  }

  function mensagemSucesso(msg) {
    return `<div class="success">${escapeHtml(msg)}</div>`;
  }

  function mensagemErro(msg) {
    return `<div class="error">${escapeHtml(msg)}</div>`;
  }

  function mensagemAlerta(msg) {
    return `<div class="alert">${escapeHtml(msg)}</div>`;
  }

  function carregarNotificacoesAdmOcultas() {
    try {
      return new Set(JSON.parse(localStorage.getItem(NOTIFICACOES_ADM_OCULTAS_KEY)) || []);
    } catch (error) {
      return new Set();
    }
  }

  function salvarNotificacoesAdmOcultas(ids) {
    localStorage.setItem(NOTIFICACOES_ADM_OCULTAS_KEY, JSON.stringify([...ids]));
  }

  // =========================
  // LOGIN / ACESSO
  // =========================
  function abrirLoginCliente() {
    document.getElementById('inicioAcesso').classList.add('hidden');
    document.getElementById('loginClienteBox').classList.remove('hidden');
    document.getElementById('cadastroClienteBox').classList.add('hidden');
  }

  function abrirCadastroCliente() {
    document.getElementById('inicioAcesso').classList.add('hidden');
    document.getElementById('loginClienteBox').classList.add('hidden');
    document.getElementById('cadastroClienteBox').classList.remove('hidden');
    const msg = document.getElementById('msgCadastroCliente');
    if (msg) msg.innerHTML = '';
  }

  function abrirLoginAdm() {
    document.getElementById('inicioAcesso').classList.add('hidden');
    document.getElementById('loginAdmBox').classList.remove('hidden');
  }

  function voltarTelaInicial() {
    document.getElementById('inicioAcesso').classList.remove('hidden');
    document.getElementById('loginClienteBox').classList.add('hidden');
    document.getElementById('cadastroClienteBox').classList.add('hidden');
    document.getElementById('loginAdmBox').classList.add('hidden');
    limparConteudo('msgLoginCliente');
    limparConteudo('msgCadastroCliente');
    limparConteudo('msgLoginAdm');
  }


  async function loginAdm() {
    const usuario = document.getElementById('usuarioAdm').value.trim();
    const senha = document.getElementById('senhaAdm').value.trim();

    if (!usuario || !senha) {
      document.getElementById('msgLoginAdm').innerHTML = mensagemErro("Digite usuário e senha.");
      return;
    }

    try {
      const resposta = await fetch(`${API}/auth/login/adm`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ usuario, senha })
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        document.getElementById('msgLoginAdm').innerHTML = mensagemErro(dados.mensagem || 'Usuário ou senha inválidos.');
        return;
      }

      tipoUsuario = 'adm';
      clienteLogado = null;
      await sincronizarDadosBackend();
      entrarSistema();
    } catch (e) {
      document.getElementById('msgLoginAdm').innerHTML = mensagemErro("Erro no login do administrador.");
    }
  }

  async function loginCliente() {
    const cpf = document.getElementById('loginCpfCliente').value.trim();
    const senha = document.getElementById('loginSenhaCliente').value.trim();

    if (!cpf || !senha) {
      document.getElementById('msgLoginCliente').innerHTML = mensagemErro("Digite CPF e senha para acessar.");
      return;
    }

    try {
      const resposta = await fetch(`${API}/auth/login/cliente`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cpf, senha })
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        document.getElementById('msgLoginCliente').innerHTML = mensagemErro(dados.mensagem || dados.erro || 'Login inválido.');
        return;
      }

      tipoUsuario = 'cliente';
      clienteLogado = clienteApiParaTela(dados.cliente);
      await sincronizarDadosBackend();
      clienteLogado = clientes.find(c => c.id === clienteLogado.id) || clienteLogado;
      entrarSistema();
    } catch (e) {
      document.getElementById('msgLoginCliente').innerHTML = mensagemErro('Erro no login.');
    }
  }


  function entrarSistema() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('sistema').style.display = 'grid';
    document.getElementById('usuarioLogadoInfo').innerHTML = tipoUsuario === 'adm'
      ? '🛡️ Administrador'
      : `👤 ${escapeHtml(clienteLogado.nome)}`;
    montarMenu();
    dashboard();
  }

  function sairSistema() {
    tipoUsuario = '';
    clienteLogado = null;
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('sistema').style.display = 'none';
    document.getElementById('usuarioLogadoInfo').innerHTML = '';
    voltarTelaInicial();
  }

  // =========================
  // MENU
  // =========================
  function montarMenu() {
    const menu = document.getElementById('menu');
    menu.innerHTML = `<h3>📋 Menu Principal</h3>`;

    if (tipoUsuario === 'cliente') {
      menu.innerHTML += `
        <button onclick="dashboard()">🏠 Meu Dashboard</button>
        <button onclick="telaMeuPerfil()">👤 Meus Dados</button>
        <button onclick="telaMinhasReceitas()">📄 Minhas Receitas</button>
        <button onclick="telaCadastrarMinhaReceita()">➕ Cadastrar Minha Receita</button>
        <button onclick="telaMinhasNotificacoes()">🔔 Minhas Notificações</button>
        <button onclick="sairSistema()">🚪 Sair</button>
      `;
    }

    if (tipoUsuario === 'adm') {
      menu.innerHTML += `
        <button onclick="dashboard()">🏠 Dashboard ADM</button>
        <button onclick="telaCadastroClienteAdm()">👥 Gerenciar Clientes</button>
        <button onclick="telaReceitasAdm()">📄 Gerenciar Receitas</button>
        <button onclick="telaNotificacoesAdm()">🔔 Notificações Gerais</button>
        <button onclick="sairSistema()">🚪 Sair</button>
      `;
    }
  }

  // =========================
  // DASHBOARD
  // =========================
  function dashboard() {
    if (tipoUsuario === 'adm') {
      const totalClientes = clientes.length;
      const totalReceitas = receitas.length;
      const receitasVencendo = receitas.filter(r => diasRestantes(r.validade) <= 5 && diasRestantes(r.validade) >= 0).length;
      const receitasVencidas = receitas.filter(r => diasRestantes(r.validade) < 0).length;

      document.getElementById('conteudo').innerHTML = `
        <div class="stats">
          <div class="stat-card">
            <h4>Total de Clientes</h4>
            <div class="number">${totalClientes}</div>
          </div>
          <div class="stat-card">
            <h4>Total de Receitas</h4>
            <div class="number">${totalReceitas}</div>
          </div>
          <div class="stat-card">
            <h4>Receitas Próximas do Vencimento</h4>
            <div class="number">${receitasVencendo}</div>
          </div>
          <div class="stat-card">
            <h4>Receitas Vencidas</h4>
            <div class="number">${receitasVencidas}</div>
          </div>
        </div>

        <div class="card">
          <h2>📊 Dashboard Administrativo</h2>
          <p>Bem-vindo ao painel administrativo do <strong>Sistema de Monitoramentos de Receitas IMR</strong>.</p>
          <p>Este sistema foi projetado para monitorar receitas médicas, acompanhar prazos de retirada de medicamentos e apoiar a gestão de pacientes em programas públicos de assistência farmacêutica.</p>
          <div class="footer-note">
            Sistema desenvolvido em versão acadêmica avançada para TCC de Análise e Desenvolvimento de Sistemas.
          </div>
        </div>
      `;
    }

    if (tipoUsuario === 'cliente' && clienteLogado) {
      const minhasReceitas = receitas.filter(r => r.clienteId === clienteLogado.id);
      const vencendo = minhasReceitas.filter(r => diasRestantes(r.validade) <= 5 && diasRestantes(r.validade) >= 0).length;
      const vencidas = minhasReceitas.filter(r => diasRestantes(r.validade) < 0).length;
      const retiradasHoje = minhasReceitas.filter(r => diasRestantes(r.proximaRetirada) === 0).length;

      document.getElementById('conteudo').innerHTML = `
        <div class="stats">
          <div class="stat-card">
            <h4>Minhas Receitas</h4>
            <div class="number">${minhasReceitas.length}</div>
          </div>
          <div class="stat-card">
            <h4>Próximas do Vencimento</h4>
            <div class="number">${vencendo}</div>
          </div>
          <div class="stat-card">
            <h4>Receitas Vencidas</h4>
            <div class="number">${vencidas}</div>
          </div>
          <div class="stat-card">
            <h4>Retirada Hoje</h4>
            <div class="number">${retiradasHoje}</div>
          </div>
        </div>

        <div class="card">
          <h2>👤 Meu Dashboard</h2>
          <p>Olá, <strong>${escapeHtml(clienteLogado.nome)}</strong>! Aqui você acompanha apenas suas informações, receitas e notificações pessoais.</p>
          <p>Use o menu lateral para atualizar seus dados, cadastrar uma nova receita ou verificar avisos de retirada e vencimento.</p>
        </div>
      `;
    }
  }

  // =========================
  // CLIENTE - PERFIL
  // =========================
  function telaMeuPerfil() {
    if (!clienteLogado) return;

    document.getElementById('conteudo').innerHTML = `
      <div class="card">
        <h2>👤 Meus Dados</h2>
        <div class="grid-2">
          <div>
            <label>Nome Completo</label>
            <input type="text" id="editNomeCliente" value="${escapeHtml(clienteLogado.nome || '')}">
          </div>
          <div>
            <label>CPF</label>
            <input type="text" id="editCpfCliente" value="${escapeHtml(clienteLogado.cpf || '')}">
          </div>
          <div>
            <label>Telefone</label>
            <input type="text" id="editTelefoneCliente" value="${escapeHtml(clienteLogado.telefone || '')}">
          </div>
          <div>
            <label>Data de Nascimento</label>
            <input type="date" id="editNascimentoCliente" value="${escapeHtml(clienteLogado.nascimento || '')}">
          </div>
        </div>
        <label>Endereço</label>
        <input type="text" id="editEnderecoCliente" value="${escapeHtml(clienteLogado.endereco || '')}">

        <button class="primary" onclick="salvarMeuPerfil()">Salvar Alterações</button>
        <button class="secondary" onclick="dashboard()">Atualizar Tela</button>

        <div id="msgMeuPerfil"></div>
      </div>
    `;
  }

  async function salvarMeuPerfil() {
    const nome = document.getElementById('editNomeCliente').value.trim();
    const cpf = document.getElementById('editCpfCliente').value.trim();
    const telefone = document.getElementById('editTelefoneCliente').value.trim();
    const nascimento = document.getElementById('editNascimentoCliente').value.trim();
    const endereco = document.getElementById('editEnderecoCliente').value.trim();

    if (!nome || !cpf || !telefone || !endereco) {
      document.getElementById('msgMeuPerfil').innerHTML = mensagemErro("Preencha todos os campos obrigatórios: Nome, CPF, Telefone e Endereço.");
      return;
    }

    const cpfDuplicado = clientes.find(c => c.cpf === cpf && c.id !== clienteLogado.id);
    if (cpfDuplicado) {
      document.getElementById('msgMeuPerfil').innerHTML = mensagemErro("Já existe outro cliente cadastrado com este CPF.");
      return;
    }

    try {
      await apiJson(`/clientes/${clienteLogado.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome, cpf, telefone, nascimento, endereco })
      });

      await sincronizarDadosBackend();
      clienteLogado = clientes.find(c => c.id === clienteLogado.id) || {
        ...clienteLogado,
        nome,
        cpf,
        telefone,
        nascimento,
        endereco
      };

      document.getElementById('usuarioLogadoInfo').innerHTML = `👤 ${escapeHtml(clienteLogado.nome)}`;
      document.getElementById('msgMeuPerfil').innerHTML = mensagemSucesso("Dados atualizados com sucesso.");
    } catch (error) {
      document.getElementById('msgMeuPerfil').innerHTML = mensagemErro(error.message);
    }
  }

  // =========================
  // CLIENTE - RECEITAS
  // =========================
  function telaMinhasReceitas() {
    if (!clienteLogado) return;

    const minhasReceitas = receitas.filter(r => r.clienteId === clienteLogado.id);

    document.getElementById('conteudo').innerHTML = `
      <div class="card">
        <h2>📄 Minhas Receitas</h2>
        <button class="secondary" onclick="telaMinhasReceitas()">Atualizar Lista</button>
        <div id="listaMinhasReceitas"></div>
      </div>
    `;

    const lista = document.getElementById('listaMinhasReceitas');

    if (minhasReceitas.length === 0) {
      lista.innerHTML = mensagemAlerta("Você ainda não possui receitas cadastradas.");
      return;
    }

    lista.innerHTML = minhasReceitas.map(r => {
      const arquivoReceita = arquivoSeguro(r.arquivoReceita, 'receitas');
      return `
      <div class="item-box">
        <h3>${escapeHtml(r.medicamento)} ${statusReceita(r.validade)}</h3>
        <p><strong>Data da Receita:</strong> ${formatarData(r.dataReceita)}</p>
        <p><strong>Validade:</strong> ${formatarData(r.validade)}</p>
        <p><strong>Próxima Retirada:</strong> ${formatarData(r.proximaRetirada)}</p>
        <p><strong>Observações:</strong> ${escapeHtml(r.observacoes || 'Nenhuma')}</p>
        <p><strong>Arquivo da Receita:</strong> ${arquivoReceita ? `<a href="${arquivoReceita.dados}" download="${arquivoReceita.nome}">${arquivoReceita.nome}</a>` : 'Nenhum arquivo'}</p>

        <button class="warning" onclick="editarMinhaReceita(${r.id})">Editar</button>
      </div>
    `;
    }).join('');
  }

  function telaCadastrarMinhaReceita() {
    if (!clienteLogado) return;

    document.getElementById('conteudo').innerHTML = `
      <div class="card">
        <h2>➕ Cadastrar Minha Receita</h2>
        <div class="grid-2">
          <div>
            <label>Medicamento</label>
            <input type="text" id="medicamentoCliente" placeholder="Ex: Losartana 50mg">
          </div>
          <div>
            <label>Data da Receita</label>
            <input type="date" id="dataReceitaCliente">
          </div>
          <div>
            <label>Validade da Receita</label>
            <input type="date" id="validadeReceitaCliente">
          </div>
          <div>
            <label>Próxima Retirada do Medicamento</label>
            <input type="date" id="retiradaReceitaCliente">
          </div>
        </div>

        <label>Observações</label>
        <textarea id="obsReceitaCliente" rows="4" placeholder="Informações adicionais sobre a receita"></textarea>

        <div class="upload-group">
          <label>Upload da Receita (PDF, JPG, PNG)</label>
          <div class="upload-guide">Anexe a receita digitalizada ou uma foto do receituario. O sistema recusara arquivos que nao parecam receita medica.</div>
          <label class="file-upload-button" for="arquivoReceitaCliente" id="buttonArquivoReceitaCliente" data-default-text="Selecionar arquivo">Selecionar arquivo</label>
          <input type="file" id="arquivoReceitaCliente" accept=".pdf,.jpg,.jpeg,.png" data-button-id="buttonArquivoReceitaCliente" onchange="previewUpload('arquivoReceitaCliente','previewArquivoReceitaCliente')">
          <div id="previewArquivoReceitaCliente" class="file-preview"></div>
          <button class="secondary" onclick="analisarReceitaCliente()">Analisar Receita</button>
          <div id="resultadoAnaliseReceitaCliente"></div>
        </div>

        <button class="primary" onclick="cadastrarMinhaReceita()">Cadastrar Receita</button>
        <button class="secondary" onclick="telaMinhasReceitas()">Atualizar Lista</button>

        <div id="msgCadastroMinhaReceita"></div>
      </div>
    `;
  }

  function formatarMedicamentoAnalise(medicamento) {
    return medicamento.medicamento_programa ||
      `${medicamento.nome_lido || ''} ${medicamento.dose_lida || ''}`.trim();
  }

  function renderizarResultadoAnalise(dados) {
    const medicamentos = dados.medicamentos || [];

    if (medicamentos.length === 0) {
      return mensagemAlerta('A analise nao conseguiu identificar medicamentos na receita. Confira se a foto esta legivel.');
    }

    const itens = medicamentos.map((medicamento) => {
      const nome = formatarMedicamentoAnalise(medicamento);
      const status = medicamento.farmacia_popular
        ? `Farmacia Popular - ${escapeHtml(medicamento.indicacao_programa || 'programa')}`
        : 'Fora da lista do Farmacia Popular';
      const confianca = Math.round(Number(medicamento.confianca || 0) * 100);

      return `
        <div class="item-box">
          <h3>${escapeHtml(nome)} ${medicamento.farmacia_popular ? '<span class="badge badge-ok">Programa</span>' : '<span class="badge badge-alerta">Revisar</span>'}</h3>
          <p><strong>Status:</strong> ${status}</p>
          <p><strong>Lido na receita:</strong> ${escapeHtml(`${medicamento.nome_lido || ''} ${medicamento.dose_lida || ''}`.trim() || '-')}</p>
          <p><strong>Confianca:</strong> ${confianca}%</p>
          ${medicamento.posologia ? `<p><strong>Posologia:</strong> ${escapeHtml(medicamento.posologia)}</p>` : ''}
          ${medicamento.observacoes ? `<p><strong>Observacoes:</strong> ${escapeHtml(medicamento.observacoes)}</p>` : ''}
        </div>
      `;
    }).join('');

    return `
      ${mensagemSucesso('Analise concluida. Revise os medicamentos antes de cadastrar.')}
      ${itens}
    `;
  }

  function preencherMedicamentosFarmaciaPopular(dados) {
    const encontrados = dados.medicamentos_farmacia_popular || [];
    if (encontrados.length === 0) return false;

    const nomes = [...new Set(encontrados.map(formatarMedicamentoAnalise).filter(Boolean))];
    const campoMedicamento = document.getElementById('medicamentoCliente');
    const campoObservacoes = document.getElementById('obsReceitaCliente');

    if (campoMedicamento && nomes.length > 0) {
      campoMedicamento.value = nomes.join('; ');
    }

    if (campoObservacoes) {
      const resumo = encontrados
        .map((medicamento) => `- ${formatarMedicamentoAnalise(medicamento)} (${medicamento.indicacao_programa || 'Farmacia Popular'})`)
        .join('\n');
      const bloco = `Medicamentos do Farmacia Popular identificados pela analise:\n${resumo}`;

      if (!campoObservacoes.value.includes('Medicamentos do Farmacia Popular identificados pela analise')) {
        campoObservacoes.value = [campoObservacoes.value.trim(), bloco].filter(Boolean).join('\n\n');
      }
    }

    return true;
  }

  async function analisarReceitaCliente() {
    const input = document.getElementById('arquivoReceitaCliente');
    const resultadoBox = document.getElementById('resultadoAnaliseReceitaCliente');
    const arquivo = input?.files?.[0];

    if (!resultadoBox) return;

    if (!arquivo) {
      resultadoBox.innerHTML = mensagemErro('Selecione a foto ou PDF da receita antes de analisar.');
      return;
    }

    resultadoBox.innerHTML = mensagemAlerta('Analisando receita. Se a IA estiver sem credito, o OCR local sera usado.');

    try {
      const form = new FormData();
      form.append('fotoReceita', arquivo);

      const dados = await apiJson('/receitas/analisar', {
        method: 'POST',
        body: form
      });

      const preencheu = preencherMedicamentosFarmaciaPopular(dados);
      resultadoBox.innerHTML = renderizarResultadoAnalise(dados);

      if (!preencheu) {
        resultadoBox.innerHTML =
          mensagemAlerta('A IA leu a receita, mas nao encontrou medicamentos da lista do Farmacia Popular.') +
          resultadoBox.innerHTML;
      }
    } catch (error) {
      resultadoBox.innerHTML = mensagemErro(error.message);
    }
  }

  async function cadastrarMinhaReceita() {
    const medicamento = document.getElementById('medicamentoCliente').value.trim();
    const dataReceita = document.getElementById('dataReceitaCliente').value.trim();
    const validade = document.getElementById('validadeReceitaCliente').value.trim();
    const proximaRetirada = document.getElementById('retiradaReceitaCliente').value.trim();
    const observacoes = document.getElementById('obsReceitaCliente').value.trim();
    const arquivo = document.getElementById('arquivoReceitaCliente').files?.[0];

    if (!medicamento || !dataReceita || !validade || !proximaRetirada) {
      document.getElementById('msgCadastroMinhaReceita').innerHTML = mensagemErro("Preencha todos os campos obrigatórios da receita: Medicamento, Data da Receita, Validade e Próxima Retirada.");
      return;
    }

    try {
      const form = new FormData();
      form.append('cliente_id', clienteLogado.id);
      form.append('medicamento', medicamento);
      form.append('data_receita', dataReceita);
      form.append('validade', validade);
      form.append('proxima_retirada', proximaRetirada);
      form.append('observacoes', observacoes);
      if (arquivo) form.append('fotoReceita', arquivo);

      await apiJson('/receitas', {
        method: 'POST',
        body: form
      });

      await sincronizarDadosBackend();
      document.getElementById('msgCadastroMinhaReceita').innerHTML = mensagemSucesso("Receita cadastrada com sucesso.");
    } catch (error) {
      document.getElementById('msgCadastroMinhaReceita').innerHTML = mensagemErro(error.message);
    }
  }

  function editarMinhaReceita(id) {
    if (!clienteLogado) return;

    const receita = receitas.find(r => r.id === id && r.clienteId === clienteLogado.id);
    if (!receita) return;

    const arquivoReceita = arquivoSeguro(receita.arquivoReceita, 'receitas');

    document.getElementById('conteudo').innerHTML = `
      <div class="card">
        <h2>Editar Minha Receita</h2>

        <div class="grid-2">
          <div>
            <label>Medicamento</label>
            <input type="text" id="editMedicamentoCliente" value="${escapeHtml(receita.medicamento || '')}">
          </div>
          <div>
            <label>Data da Receita</label>
            <input type="date" id="editDataReceitaCliente" value="${escapeHtml(receita.dataReceita || '')}">
          </div>
          <div>
            <label>Validade da Receita</label>
            <input type="date" id="editValidadeReceitaCliente" value="${escapeHtml(receita.validade || '')}">
          </div>
          <div>
            <label>Próxima Retirada do Medicamento</label>
            <input type="date" id="editRetiradaReceitaCliente" value="${escapeHtml(receita.proximaRetirada || '')}">
          </div>
        </div>

        <label>Observações</label>
        <textarea id="editObsReceitaCliente" rows="4">${escapeHtml(receita.observacoes || '')}</textarea>

        <div class="upload-group">
          <label>Upload da Receita</label>
          <div class="upload-guide">Envie apenas se quiser substituir o arquivo atual. O sistema recusara arquivos que nao parecam receita medica.</div>
          <label class="file-upload-button" for="editArquivoReceitaCliente" id="buttonEditArquivoReceitaCliente" data-default-text="Selecionar novo arquivo">Selecionar novo arquivo</label>
          <input type="file" id="editArquivoReceitaCliente" accept=".pdf,.jpg,.jpeg,.png" data-button-id="buttonEditArquivoReceitaCliente" onchange="previewUpload('editArquivoReceitaCliente','previewEditArquivoReceitaCliente')">
          <div id="previewEditArquivoReceitaCliente" class="file-preview">${arquivoReceita ? `Arquivo atual: ${arquivoReceita.nome}` : 'Nenhum arquivo carregado'}</div>
        </div>

        <button class="primary" onclick="salvarEdicaoMinhaReceita(${receita.id})">Salvar Alterações</button>
        <button class="secondary" onclick="telaMinhasReceitas()">Voltar</button>

        <div id="msgEditarMinhaReceita"></div>
      </div>
    `;
  }

  async function salvarEdicaoMinhaReceita(id) {
    if (!clienteLogado) return;

    const medicamento = document.getElementById('editMedicamentoCliente').value.trim();
    const dataReceita = document.getElementById('editDataReceitaCliente').value.trim();
    const validade = document.getElementById('editValidadeReceitaCliente').value.trim();
    const proximaRetirada = document.getElementById('editRetiradaReceitaCliente').value.trim();
    const observacoes = document.getElementById('editObsReceitaCliente').value.trim();

    if (!medicamento || !dataReceita || !validade || !proximaRetirada) {
      document.getElementById('msgEditarMinhaReceita').innerHTML = mensagemErro("Preencha todos os campos obrigatórios da receita.");
      return;
    }

    try {
      const receitaAtual = receitas.find(r => r.id === id && r.clienteId === clienteLogado.id);
      if (!receitaAtual) {
        document.getElementById('msgEditarMinhaReceita').innerHTML = mensagemErro("Receita não encontrada.");
        return;
      }

      const arquivo = document.getElementById('editArquivoReceitaCliente').files?.[0];
      const form = new FormData();
      form.append('cliente_id', clienteLogado.id);
      form.append('medicamento', medicamento);
      form.append('data_receita', dataReceita);
      form.append('validade', validade);
      form.append('proxima_retirada', proximaRetirada);
      form.append('observacoes', observacoes);
      if (receitaAtual.arquivoReceita) form.append('imagem_receita', receitaAtual.arquivoReceita);
      if (arquivo) form.append('fotoReceita', arquivo);

      await apiJson(`/receitas/${id}`, {
        method: 'PUT',
        body: form
      });

      await sincronizarDadosBackend();
      clienteLogado = clientes.find(c => c.id === clienteLogado.id) || clienteLogado;
      document.getElementById('msgEditarMinhaReceita').innerHTML = mensagemSucesso("Receita atualizada com sucesso.");
    } catch (error) {
      document.getElementById('msgEditarMinhaReceita').innerHTML = mensagemErro(error.message);
    }
  }

  // =========================
  // CLIENTE - NOTIFICAÇÕES
  // =========================
  function telaMinhasNotificacoes() {
    if (!clienteLogado) return;

    const minhasReceitas = receitas.filter(r => r.clienteId === clienteLogado.id);

    document.getElementById('conteudo').innerHTML = `
      <div class="card">
        <h2>🔔 Minhas Notificações</h2>
        <button class="primary" onclick="telaMinhasNotificacoes()">Verificar Novamente</button>
        <div id="listaNotificacoesCliente"></div>
      </div>
    `;

    const lista = document.getElementById('listaNotificacoesCliente');
    let html = '';

    minhasReceitas.forEach(r => {
      const diasValidade = diasRestantes(r.validade);
      const diasRetirada = diasRestantes(r.proximaRetirada);
      const medicamento = escapeHtml(r.medicamento);

      if (diasValidade < 0) {
        html += `<div class="alert">⚠️ Sua receita de <strong>${medicamento}</strong> está vencida.</div>`;
      } else if (diasValidade <= 5) {
        html += `<div class="alert">📄 Sua receita de <strong>${medicamento}</strong> vence em <strong>${diasValidade}</strong> dia(s).</div>`;
      }

      if (diasRetirada === 0) {
        html += `<div class="success">💊 Hoje é o dia de retirada do medicamento <strong>${medicamento}</strong>.</div>`;
      } else if (diasRetirada > 0 && diasRetirada <= 3) {
        html += `<div class="alert">⏰ Falta(m) <strong>${diasRetirada}</strong> dia(s) para retirar o medicamento <strong>${medicamento}</strong>.</div>`;
      }
    });

    if (!html) {
      html = mensagemSucesso("Nenhuma notificação pendente no momento.");
    }

    lista.innerHTML = html;
  }

  // =========================
  // ADM - CLIENTES
  // =========================
  async function telaCadastroClienteAdm() {
    await sincronizarDadosBackend();

    document.getElementById('conteudo').innerHTML = `
      <div class="card">
        <h2>👥 Gerenciar Clientes</h2>

        <div class="grid-2">
          <div>
            <label>Nome Completo</label>
            <input type="text" id="nomeCliente" placeholder="Digite o nome do cliente">
          </div>
          <div>
            <label>CPF</label>
            <input type="text" id="cpfCliente" placeholder="Digite seu CPF">
          </div>
          <div>
            <label>Telefone</label>
            <input type="text" id="telefoneCliente" placeholder="Digite seu telefone">
          </div>
          <div>
            <label>Data de Nascimento</label>
            <input type="date" id="nascimentoCliente">
          </div>
        </div>

        <label>Endereço</label>
        <input type="text" id="enderecoCliente" placeholder="Digite o endereço completo">

        <label>Senha de Acesso</label>
        <input type="password" id="senhaClienteAdm" placeholder="Crie uma senha para o cliente">

        <div class="upload-group">
          <label>Upload de Documento (CPF, RG ou CNH)</label>
          <div class="upload-guide">Selecione PDF, JPG ou PNG. O sistema aceita apenas documentos de identificacao.</div>
          <label class="file-upload-button" for="documentoCliente" id="buttonDocumentoCliente" data-default-text="Selecionar documento">Selecionar documento</label>
          <input type="file" id="documentoCliente" accept=".pdf,.jpg,.jpeg,.png" data-button-id="buttonDocumentoCliente" onchange="previewUpload('documentoCliente','previewDocumentoCliente')">
          <div id="previewDocumentoCliente" class="file-preview"></div>
        </div>

        <button class="primary" onclick="addClienteAdm()">Cadastrar Cliente</button>
        <button class="secondary" onclick="telaCadastroClienteAdm()">Atualizar Lista</button>

        <div id="msgClienteAdm"></div>
      </div>

      <div class="card">
        <h2>📋 Lista de Clientes</h2>
        <div id="listaClientesAdm"></div>
      </div>
    `;

    atualizarListaClientesAdm();
  }

  async function addClienteAdm() {
    const nome = document.getElementById('nomeCliente').value.trim();
    const cpf = document.getElementById('cpfCliente').value.trim();
    const telefone = document.getElementById('telefoneCliente').value.trim();
    const nascimento = document.getElementById('nascimentoCliente').value.trim();
    const endereco = document.getElementById('enderecoCliente').value.trim();
    const senha = document.getElementById('senhaClienteAdm').value;
    const arquivo = document.getElementById('documentoCliente').files?.[0];

    if (!nome || !cpf || !telefone || !nascimento || !endereco || !senha) {
      document.getElementById('msgClienteAdm').innerHTML = mensagemErro("Preencha todos os campos obrigatórios: Nome, CPF, Telefone, Nascimento, Endereço e Senha.");
      return;
    }

    const cpfExistente = clientes.find(c => c.cpf === cpf);
    if (cpfExistente) {
      document.getElementById('msgClienteAdm').innerHTML = mensagemErro("Já existe um cliente cadastrado com este CPF.");
      return;
    }

    if (!arquivo) {
      document.getElementById('msgClienteAdm').innerHTML = mensagemErro("O upload do documento do cliente é obrigatório.");
      return;
    }

    try {
      const form = new FormData();
      form.append('nome', nome);
      form.append('cpf', cpf);
      form.append('telefone', telefone);
      form.append('nascimento', nascimento);
      form.append('endereco', endereco);
      form.append('senha', senha);
      form.append('documento', arquivo);

      await apiJson('/clientes', {
        method: 'POST',
        body: form
      });

      await sincronizarDadosBackend();
      atualizarListaClientesAdm();
      document.getElementById('msgClienteAdm').innerHTML = mensagemSucesso("Cliente cadastrado com sucesso.");
    } catch (error) {
      document.getElementById('msgClienteAdm').innerHTML = mensagemErro(error.message);
    }
  }

  function atualizarListaClientesAdm() {
    const lista = document.getElementById('listaClientesAdm');
    if (!lista) return;

    if (clientes.length === 0) {
      lista.innerHTML = mensagemAlerta("Nenhum cliente cadastrado.");
      return;
    }

    lista.innerHTML = clientes.map(c => {
      const documento = arquivoSeguro(c.documento, 'documentos');

      return `
      <div class="item-box">
        <h3>${escapeHtml(c.nome)}</h3>
        <p><strong>CPF:</strong> ${escapeHtml(c.cpf)}</p>
        <p><strong>Telefone:</strong> ${escapeHtml(c.telefone || '-')}</p>
        <p><strong>Endereço:</strong> ${escapeHtml(c.endereco || '-')}</p>
        <p><strong>Nascimento:</strong> ${c.nascimento ? formatarData(c.nascimento) : '-'}</p>
        <p><strong>Documento:</strong> ${documento ? `<a href="${documento.dados}" download="${documento.nome}">${documento.nome}</a>` : 'Nenhum documento'}</p>

        <button class="warning" onclick="editarClienteAdm(${c.id})">Editar</button>
        <button class="danger" onclick="excluirClienteAdm(${c.id})">Excluir</button>
      </div>
    `;
    }).join('');
  }

  function editarClienteAdm(id) {
    const cliente = clientes.find(c => c.id === id);
    if (!cliente) return;
    const documento = arquivoSeguro(cliente.documento, 'documentos');

    document.getElementById('conteudo').innerHTML = `
      <div class="card">
        <h2>✏️ Editar Cliente</h2>

        <div class="grid-2">
          <div>
            <label>Nome Completo</label>
            <input type="text" id="editNomeAdm" value="${escapeHtml(cliente.nome || '')}">
          </div>
          <div>
            <label>CPF</label>
            <input type="text" id="editCpfAdm" value="${escapeHtml(cliente.cpf || '')}">
          </div>
          <div>
            <label>Telefone</label>
            <input type="text" id="editTelefoneAdm" value="${escapeHtml(cliente.telefone || '')}">
          </div>
          <div>
            <label>Data de Nascimento</label>
            <input type="date" id="editNascimentoAdm" value="${escapeHtml(cliente.nascimento || '')}">
          </div>
        </div>

        <label>Endereço</label>
        <input type="text" id="editEnderecoAdm" value="${escapeHtml(cliente.endereco || '')}">

        <label>Nova Senha</label>
        <input type="password" id="editSenhaAdm" placeholder="Preencha apenas se quiser trocar">

        <div class="upload-group">
          <label>Upload de Documento Atual</label>
          <div class="upload-guide">Envie apenas se quiser substituir o documento atual. O sistema aceita apenas documentos de identificacao.</div>
          <label class="file-upload-button" for="editDocumentoCliente" id="buttonEditDocumentoCliente" data-default-text="Selecionar novo documento">Selecionar novo documento</label>
          <input type="file" id="editDocumentoCliente" accept=".pdf,.jpg,.jpeg,.png" data-button-id="buttonEditDocumentoCliente" onchange="previewUpload('editDocumentoCliente','previewEditDocumentoCliente')">
          <div id="previewEditDocumentoCliente" class="file-preview">${documento ? `Arquivo atual: ${documento.nome}` : 'Nenhum documento carregado'}</div>
        </div>

        <button class="primary" onclick="salvarEdicaoClienteAdm(${cliente.id})">Salvar Alterações</button>
        <button class="secondary" onclick="telaCadastroClienteAdm()">Voltar</button>

        <div id="msgEditarClienteAdm"></div>
      </div>
    `;
  }

  async function salvarEdicaoClienteAdm(id) {
    const nome = document.getElementById('editNomeAdm').value.trim();
    const cpf = document.getElementById('editCpfAdm').value.trim();
    const telefone = document.getElementById('editTelefoneAdm').value.trim();
    const nascimento = document.getElementById('editNascimentoAdm').value.trim();
    const endereco = document.getElementById('editEnderecoAdm').value.trim();
    const senha = document.getElementById('editSenhaAdm').value;
    const arquivo = document.getElementById('editDocumentoCliente').files?.[0];

    if (!nome || !cpf || !telefone || !endereco) {
      document.getElementById('msgEditarClienteAdm').innerHTML = mensagemErro("Preencha todos os campos obrigatórios: Nome, CPF, Telefone e Endereço.");
      return;
    }

    const duplicado = clientes.find(c => c.cpf === cpf && c.id !== id);
    if (duplicado) {
      document.getElementById('msgEditarClienteAdm').innerHTML = mensagemErro("Já existe outro cliente com este CPF.");
      return;
    }

    try {
      const form = new FormData();
      form.append('nome', nome);
      form.append('cpf', cpf);
      form.append('telefone', telefone);
      form.append('nascimento', nascimento);
      form.append('endereco', endereco);
      if (senha) form.append('senha', senha);
      if (arquivo) form.append('documento', arquivo);

      await apiJson(`/clientes/${id}`, {
        method: 'PUT',
        body: form
      });

      await sincronizarDadosBackend();
      document.getElementById('msgEditarClienteAdm').innerHTML = mensagemSucesso("Cliente atualizado com sucesso.");
    } catch (error) {
      document.getElementById('msgEditarClienteAdm').innerHTML = mensagemErro(error.message);
    }
  }

  async function excluirClienteAdm(id) {
    if (!confirm("Deseja realmente excluir este cliente? Todas as receitas relacionadas também serão removidas.")) return;

    try {
      await apiJson(`/clientes/${id}`, {
        method: 'DELETE'
      });

      await sincronizarDadosBackend();
      telaCadastroClienteAdm();
    } catch (error) {
      alert(error.message);
    }
  }

  // =========================
  // ADM - RECEITAS
  // =========================
  async function telaReceitasAdm() {
    await sincronizarDadosBackend();

    document.getElementById('conteudo').innerHTML = `
      <div class="card">
        <h2>📄 Gerenciar Receitas</h2>

        <div class="grid-2">
          <div>
            <label>Cliente</label>
            <select id="clienteSelectAdm"></select>
          </div>
          <div>
            <label>Medicamento</label>
            <input type="text" id="medicamentoAdm" placeholder="Ex: Metformina 850mg">
          </div>
          <div>
            <label>Data da Receita</label>
            <input type="date" id="dataReceitaAdm">
          </div>
          <div>
            <label>Validade da Receita</label>
            <input type="date" id="validadeReceitaAdm">
          </div>
          <div>
            <label>Próxima Retirada</label>
            <input type="date" id="retiradaReceitaAdm">
          </div>
        </div>

        <label>Observações</label>
        <textarea id="obsReceitaAdm" rows="4" placeholder="Observações sobre a receita"></textarea>

        <div class="upload-group">
          <label>Upload da Receita (PDF, JPG, PNG)</label>
          <div class="upload-guide">Anexe aqui a receita digitalizada ou foto do receituario. O sistema recusara arquivos que nao parecam receita medica.</div>
          <label class="file-upload-button" for="arquivoReceitaAdm" id="buttonArquivoReceitaAdm" data-default-text="Selecionar arquivo">Selecionar arquivo</label>
          <input type="file" id="arquivoReceitaAdm" accept=".pdf,.jpg,.jpeg,.png" data-button-id="buttonArquivoReceitaAdm" onchange="previewUpload('arquivoReceitaAdm','previewArquivoReceitaAdm')">
          <div id="previewArquivoReceitaAdm" class="file-preview"></div>
        </div>

        <button class="primary" onclick="addReceitaAdm()">Cadastrar Receita</button>
        <button class="secondary" onclick="telaReceitasAdm()">Atualizar Lista</button>

        <div id="msgReceitaAdm"></div>
      </div>

      <div class="card">
        <h2>📋 Lista de Receitas</h2>
        <div id="listaReceitasAdm"></div>
      </div>
    `;

    atualizarSelectClientesAdm();
    atualizarListaReceitasAdm();
  }

  function atualizarSelectClientesAdm() {
    const select = document.getElementById('clienteSelectAdm');
    if (!select) return;

    if (clientes.length === 0) {
      select.innerHTML = `<option value="">Nenhum cliente cadastrado</option>`;
      return;
    }

    select.innerHTML = clientes.map(c => `
      <option value="${c.id}">${escapeHtml(c.nome)} - CPF: ${escapeHtml(c.cpf)}</option>
    `).join('');
  }

  async function addReceitaAdm() {
    const clienteId = Number(document.getElementById('clienteSelectAdm').value);
    const medicamento = document.getElementById('medicamentoAdm').value.trim();
    const dataReceita = document.getElementById('dataReceitaAdm').value.trim();
    const validade = document.getElementById('validadeReceitaAdm').value.trim();
    const proximaRetirada = document.getElementById('retiradaReceitaAdm').value.trim();
    const observacoes = document.getElementById('obsReceitaAdm').value.trim();

    if (!clienteId || !medicamento || !dataReceita || !validade || !proximaRetirada) {
      document.getElementById('msgReceitaAdm').innerHTML = mensagemErro("Preencha todos os campos obrigatórios da receita: Cliente, Medicamento, Data da Receita, Validade e Próxima Retirada.");
      return;
    }

    try {
      const arquivo = document.getElementById('arquivoReceitaAdm').files?.[0];
      const form = new FormData();
      form.append('cliente_id', clienteId);
      form.append('medicamento', medicamento);
      form.append('data_receita', dataReceita);
      form.append('validade', validade);
      form.append('proxima_retirada', proximaRetirada);
      form.append('observacoes', observacoes);
      if (arquivo) form.append('fotoReceita', arquivo);

      await apiJson('/receitas', {
        method: 'POST',
        body: form
      });

      await sincronizarDadosBackend();
      atualizarListaReceitasAdm();
      document.getElementById('msgReceitaAdm').innerHTML = mensagemSucesso("Receita cadastrada com sucesso.");
    } catch (error) {
      document.getElementById('msgReceitaAdm').innerHTML = mensagemErro(error.message);
    }
  }

  function atualizarListaReceitasAdm() {
    const lista = document.getElementById('listaReceitasAdm');
    if (!lista) return;

    if (receitas.length === 0) {
      lista.innerHTML = mensagemAlerta("Nenhuma receita cadastrada.");
      return;
    }

    lista.innerHTML = receitas.map(r => {
      const cliente = clientes.find(c => c.id === r.clienteId);
      const arquivoReceita = arquivoSeguro(r.arquivoReceita, 'receitas');
      return `
        <div class="item-box">
          <h3>${escapeHtml(r.medicamento)} ${statusReceita(r.validade)}</h3>
          <p><strong>Cliente:</strong> ${cliente ? escapeHtml(cliente.nome) : 'Não encontrado'}</p>
          <p><strong>Data da Receita:</strong> ${formatarData(r.dataReceita)}</p>
          <p><strong>Validade:</strong> ${formatarData(r.validade)}</p>
          <p><strong>Próxima Retirada:</strong> ${formatarData(r.proximaRetirada)}</p>
          <p><strong>Observações:</strong> ${escapeHtml(r.observacoes || 'Nenhuma')}</p>
          <p><strong>Arquivo da Receita:</strong> ${arquivoReceita ? `<a href="${arquivoReceita.dados}" download="${arquivoReceita.nome}">${arquivoReceita.nome}</a>` : 'Nenhum arquivo'}</p>

          <button class="warning" onclick="editarReceitaAdm(${r.id})">Editar</button>
          <button class="danger" onclick="excluirReceitaAdm(${r.id})">Excluir</button>
        </div>
      `;
    }).join('');
  }

  function editarReceitaAdm(id) {
    const receita = receitas.find(r => r.id === id);
    if (!receita) return;
    const arquivoReceita = arquivoSeguro(receita.arquivoReceita, 'receitas');

    document.getElementById('conteudo').innerHTML = `
      <div class="card">
        <h2>✏️ Editar Receita</h2>

        <div class="grid-2">
          <div>
            <label>Cliente</label>
            <select id="editClienteReceitaAdm"></select>
          </div>
          <div>
            <label>Medicamento</label>
            <input type="text" id="editMedicamentoReceitaAdm" value="${escapeHtml(receita.medicamento || '')}">
          </div>
          <div>
            <label>Data da Receita</label>
            <input type="date" id="editDataReceitaAdm" value="${escapeHtml(receita.dataReceita || '')}">
          </div>
          <div>
            <label>Validade da Receita</label>
            <input type="date" id="editValidadeReceitaAdm" value="${escapeHtml(receita.validade || '')}">
          </div>
          <div>
            <label>Próxima Retirada</label>
            <input type="date" id="editRetiradaReceitaAdm" value="${escapeHtml(receita.proximaRetirada || '')}">
          </div>
        </div>

        <label>Observações</label>
        <textarea id="editObsReceitaAdm" rows="4">${escapeHtml(receita.observacoes || '')}</textarea>

        <div class="upload-group">
          <label>Upload de Receita Atual</label>
          <div class="upload-guide">Envie apenas se quiser substituir o arquivo de receita atual. O sistema recusara arquivos que nao parecam receita medica.</div>
          <label class="file-upload-button" for="editArquivoReceitaAdm" id="buttonEditArquivoReceitaAdm" data-default-text="Selecionar novo arquivo">Selecionar novo arquivo</label>
          <input type="file" id="editArquivoReceitaAdm" accept=".pdf,.jpg,.jpeg,.png" data-button-id="buttonEditArquivoReceitaAdm" onchange="previewUpload('editArquivoReceitaAdm','previewEditArquivoReceitaAdm')">
          <div id="previewEditArquivoReceitaAdm" class="file-preview">${arquivoReceita ? `Arquivo atual: ${arquivoReceita.nome}` : 'Nenhum arquivo carregado'}</div>
        </div>

        <button class="primary" onclick="salvarEdicaoReceitaAdm(${receita.id})">Salvar Alterações</button>
        <button class="secondary" onclick="telaReceitasAdm()">Voltar</button>

        <div id="msgEditarReceitaAdm"></div>
      </div>
    `;

    const select = document.getElementById('editClienteReceitaAdm');
    select.innerHTML = clientes.map(c => `
      <option value="${c.id}" ${c.id === receita.clienteId ? 'selected' : ''}>${escapeHtml(c.nome)} - CPF: ${escapeHtml(c.cpf)}</option>
    `).join('');
  }

  async function salvarEdicaoReceitaAdm(id) {
    const clienteId = Number(document.getElementById('editClienteReceitaAdm').value);
    const medicamento = document.getElementById('editMedicamentoReceitaAdm').value.trim();
    const dataReceita = document.getElementById('editDataReceitaAdm').value.trim();
    const validade = document.getElementById('editValidadeReceitaAdm').value.trim();
    const proximaRetirada = document.getElementById('editRetiradaReceitaAdm').value.trim();
    const observacoes = document.getElementById('editObsReceitaAdm').value.trim();

    if (!clienteId || !medicamento || !dataReceita || !validade || !proximaRetirada) {
      document.getElementById('msgEditarReceitaAdm').innerHTML = mensagemErro("Preencha todos os campos obrigatórios da receita.");
      return;
    }

    try {
      const receitaAtual = receitas.find(r => r.id === id);
      const arquivo = document.getElementById('editArquivoReceitaAdm').files?.[0];
      const form = new FormData();
      form.append('cliente_id', clienteId);
      form.append('medicamento', medicamento);
      form.append('data_receita', dataReceita);
      form.append('validade', validade);
      form.append('proxima_retirada', proximaRetirada);
      form.append('observacoes', observacoes);
      if (receitaAtual?.arquivoReceita) form.append('imagem_receita', receitaAtual.arquivoReceita);
      if (arquivo) form.append('fotoReceita', arquivo);

      await apiJson(`/receitas/${id}`, {
        method: 'PUT',
        body: form
      });

      await sincronizarDadosBackend();
      document.getElementById('msgEditarReceitaAdm').innerHTML = mensagemSucesso("Receita atualizada com sucesso.");
    } catch (error) {
      document.getElementById('msgEditarReceitaAdm').innerHTML = mensagemErro(error.message);
    }
  }

  async function excluirReceitaAdm(id) {
    if (!confirm("Deseja realmente excluir esta receita?")) return;

    try {
      await apiJson(`/receitas/${id}`, {
        method: 'DELETE'
      });

      await sincronizarDadosBackend();
      telaReceitasAdm();
    } catch (error) {
      alert(error.message);
    }
  }

  // =========================
  // ADM - NOTIFICAÇÕES GERAIS
  // =========================
  function gerarNotificacoesAdm() {
    const notificacoes = [];

    receitas.forEach(r => {
      const cliente = clientes.find(c => c.id === r.clienteId);
      const diasValidade = diasRestantes(r.validade);
      const diasRetirada = diasRestantes(r.proximaRetirada);
      const nomeCliente = escapeHtml(cliente?.nome || 'Cliente');
      const medicamento = escapeHtml(r.medicamento);

      if (diasValidade < 0) {
        notificacoes.push({
          id: `validade-vencida:${r.id}:${r.validade}`,
          html: `<div class="alert">A receita de <strong>${nomeCliente}</strong> para <strong>${medicamento}</strong> esta vencida.</div>`
        });
      } else if (diasValidade <= 5) {
        notificacoes.push({
          id: `validade-vencendo:${r.id}:${r.validade}`,
          html: `<div class="alert">A receita de <strong>${nomeCliente}</strong> para <strong>${medicamento}</strong> vence em <strong>${diasValidade}</strong> dia(s).</div>`
        });
      }

      if (diasRetirada === 0) {
        notificacoes.push({
          id: `retirada-hoje:${r.id}:${r.proximaRetirada}`,
          html: `<div class="success">Hoje e o dia de retirada do medicamento <strong>${medicamento}</strong> para <strong>${nomeCliente}</strong>.</div>`
        });
      } else if (diasRetirada > 0 && diasRetirada <= 3) {
        notificacoes.push({
          id: `retirada-proxima:${r.id}:${r.proximaRetirada}`,
          html: `<div class="alert">Faltam <strong>${diasRetirada}</strong> dia(s) para <strong>${nomeCliente}</strong> retirar o medicamento <strong>${medicamento}</strong>.</div>`
        });
      }
    });

    return notificacoes;
  }

  async function telaNotificacoesAdm() {
    await sincronizarDadosBackend();

    document.getElementById('conteudo').innerHTML = `
      <div class="card">
        <h2>🔔 Notificações Gerais</h2>
        <button class="primary" onclick="telaNotificacoesAdm()">Verificar Novamente</button>
        <button class="danger" onclick="excluirHistoricoNotificacoesAdm()">Excluir Historico</button>
        <div id="msgNotificacoesAdm"></div>
        <div id="listaNotificacoesAdm"></div>
      </div>

      <div class="card">
        <h2>📲 Envio de SMS</h2>
        <div class="grid-2">
          <div>
            <label>Cliente</label>
            <select id="smsClienteSelect"></select>
          </div>
          <div>
            <label>Modelo Rápido</label>
            <select id="smsModeloSelect" onchange="aplicarModeloSms()">
              <option value="">Mensagem personalizada</option>
              <option value="retirada">Lembrete de retirada</option>
              <option value="validade">Aviso de validade</option>
              <option value="documento">Atualização de cadastro</option>
            </select>
          </div>
        </div>
        <label>Mensagem</label>
        <textarea id="smsMensagem" rows="4" maxlength="480" placeholder="Digite a mensagem que será enviada por SMS"></textarea>
        <button class="primary" onclick="enviarSmsAdm()">Enviar SMS</button>
        <button class="secondary" onclick="carregarHistoricoSms()">Atualizar Histórico</button>
        <button class="danger" onclick="excluirHistoricoSms()">Excluir Histórico</button>
        <div id="msgSmsAdm"></div>
        <div id="statusSmsAdm"></div>
        <div id="historicoSmsAdm"></div>
      </div>
    `;

    const lista = document.getElementById('listaNotificacoesAdm');
    const ocultas = carregarNotificacoesAdmOcultas();
    let html = gerarNotificacoesAdm()
      .filter(item => !ocultas.has(item.id))
      .map(item => item.html)
      .join('');

    // Bloco antigo preservado, mas desativado pelo filtro de historico.
    if (false) receitas.forEach(r => {
      const cliente = clientes.find(c => c.id === r.clienteId);
      const diasValidade = diasRestantes(r.validade);
      const diasRetirada = diasRestantes(r.proximaRetirada);
      const nomeCliente = escapeHtml(cliente?.nome || 'Cliente');
      const medicamento = escapeHtml(r.medicamento);

      if (diasValidade < 0) {
        html += `<div class="alert">⚠️ A receita de <strong>${nomeCliente}</strong> para <strong>${medicamento}</strong> está vencida.</div>`;
      } else if (diasValidade <= 5) {
        html += `<div class="alert">📄 A receita de <strong>${nomeCliente}</strong> para <strong>${medicamento}</strong> vence em <strong>${diasValidade}</strong> dia(s).</div>`;
      }

      if (diasRetirada === 0) {
        html += `<div class="success">💊 Hoje é o dia de retirada do medicamento <strong>${medicamento}</strong> para <strong>${nomeCliente}</strong>.</div>`;
      } else if (diasRetirada > 0 && diasRetirada <= 3) {
        html += `<div class="alert">⏰ Faltam <strong>${diasRetirada}</strong> dia(s) para <strong>${nomeCliente}</strong> retirar o medicamento <strong>${medicamento}</strong>.</div>`;
      }
    });

    if (!html) {
      html = mensagemSucesso("Nenhuma notificação pendente no momento.");
    }

    lista.innerHTML = html;
    montarSelectSmsClientes();
    atualizarPainelSmsAdm();
  }

  async function excluirHistoricoNotificacoesAdm() {
    if (!confirm('Deseja realmente excluir o historico de notificacoes?')) return;

    try {
      const resultado = await apiJson('/notificacoes/historico', {
        method: 'DELETE'
      });

      const ocultas = carregarNotificacoesAdmOcultas();
      gerarNotificacoesAdm().forEach(item => ocultas.add(item.id));
      salvarNotificacoesAdmOcultas(ocultas);

      await telaNotificacoesAdm();

      const msgBox = document.getElementById('msgNotificacoesAdm');
      if (msgBox) {
        msgBox.innerHTML = mensagemSucesso(resultado.mensagem || 'Historico de notificacoes excluido com sucesso.');
      }
    } catch (error) {
      const msgBox = document.getElementById('msgNotificacoesAdm');
      if (msgBox) {
        msgBox.innerHTML = mensagemErro(error.message);
      } else {
        alert(error.message);
      }
    }
  }

  function montarSelectSmsClientes() {
    const select = document.getElementById('smsClienteSelect');
    if (!select) return;

    if (clientes.length === 0) {
      select.innerHTML = `<option value="">Nenhum cliente cadastrado</option>`;
      return;
    }

    select.innerHTML = clientes.map(c => `
      <option value="${c.id}">${escapeHtml(c.nome)} - ${escapeHtml(c.telefone || 'sem telefone')}</option>
    `).join('');
  }

  function aplicarModeloSms() {
    const modelo = document.getElementById('smsModeloSelect').value;
    const clienteId = Number(document.getElementById('smsClienteSelect').value);
    const cliente = clientes.find(c => c.id === clienteId);
    const nome = cliente ? cliente.nome.split(' ')[0] : 'cliente';
    const campoMensagem = document.getElementById('smsMensagem');

    const modelos = {
      retirada: `Olá, ${nome}. Lembrete do Sistema IMR: verifique a data de retirada do seu medicamento e compareça à farmácia no prazo indicado.`,
      validade: `Olá, ${nome}. Sistema IMR: sua receita pode estar próxima do vencimento. Confira suas informações e procure atendimento se necessário.`,
      documento: `Olá, ${nome}. Sistema IMR: há uma atualização importante sobre seu cadastro. Entre em contato com a unidade responsável.`
    };

    campoMensagem.value = modelos[modelo] || '';
  }

  async function atualizarPainelSmsAdm() {
    try {
      const config = await apiJson('/sms/configuracao');
      const status = document.getElementById('statusSmsAdm');

      if (status) {
        status.innerHTML = config.configurado
          ? mensagemSucesso('SMS configurado e pronto para envio.')
          : mensagemAlerta('SMS ainda nao configurado. Confira o backend/.env.');
      }

      await carregarHistoricoSms();
    } catch (error) {
      const status = document.getElementById('statusSmsAdm');
      if (status) status.innerHTML = mensagemErro(error.message);
    }
  }

  async function carregarHistoricoSms() {
    const historicoBox = document.getElementById('historicoSmsAdm');
    if (!historicoBox) return;

    try {
      const dados = await apiJson('/sms/historico');
      const historico = dados.historico || [];

      if (historico.length === 0) {
        historicoBox.innerHTML = mensagemAlerta('Nenhum SMS enviado até o momento.');
        return;
      }

      historicoBox.innerHTML = historico.map(item => `
        <div class="item-box sms-log">
          <h3>${escapeHtml(item.cliente_nome || 'Cliente não encontrado')}</h3>
          <p><strong>Telefone:</strong> ${escapeHtml(item.telefone)}</p>
          <p><strong>Status:</strong> ${escapeHtml(item.status || '-')}</p>
          <p><strong>Mensagem:</strong> ${escapeHtml(item.mensagem)}</p>
          ${item.erro ? `<p><strong>Erro:</strong> ${escapeHtml(item.erro)}</p>` : ''}
        </div>
      `).join('');
    } catch (error) {
      historicoBox.innerHTML = mensagemErro(error.message);
    }
  }

  async function excluirHistoricoSms() {
    if (!confirm('Deseja realmente excluir todo o historico de SMS?')) return;

    const msgBox = document.getElementById('msgSmsAdm');

    try {
      const resultado = await apiJson('/sms/historico', {
        method: 'DELETE'
      });

      if (msgBox) {
        msgBox.innerHTML = mensagemSucesso(resultado.mensagem || 'Historico excluido com sucesso.');
      }

      await carregarHistoricoSms();
    } catch (error) {
      if (msgBox) {
        msgBox.innerHTML = mensagemErro(error.message);
      }
    }
  }

  async function enviarSmsAdm() {
    const clienteId = Number(document.getElementById('smsClienteSelect').value);
    const mensagem = document.getElementById('smsMensagem').value.trim();
    const msgBox = document.getElementById('msgSmsAdm');

    if (!clienteId || !mensagem) {
      msgBox.innerHTML = mensagemErro('Selecione um cliente e escreva a mensagem.');
      return;
    }

    try {
      const resultado = await apiJson('/sms/enviar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cliente_id: clienteId,
          mensagem
        })
      });

      msgBox.innerHTML = mensagemSucesso(resultado.mensagem || 'SMS enviado com sucesso.');
      document.getElementById('smsMensagem').value = '';
      await carregarHistoricoSms();
    } catch (error) {
      msgBox.innerHTML = mensagemErro(error.message);
      await carregarHistoricoSms();
    }
  }
