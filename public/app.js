const API = "http://localhost:3000/api";

let tipoUsuario = "";
let clienteLogado = null;

function abrirCadastroCliente() {
    document.getElementById("inicioAcesso").classList.add("hidden");
    document.getElementById("cadastroClienteBox").classList.remove("hidden");
}

function abrirLoginCliente() {
    document.getElementById("inicioAcesso").classList.add("hidden");
    document.getElementById("loginClienteBox").classList.remove("hidden");
}

function abrirLoginAdm() {
    document.getElementById("inicioAcesso").classList.add("hidden");
    document.getElementById("loginAdmBox").classList.remove("hidden");
}

function previewDocumento() {
    const file = document.getElementById("cadDocumento").files[0];
    const preview = document.getElementById("previewDocumento");
    if (file) {
        preview.innerHTML = `✅ Arquivo selecionado: ${file.name}`;
    } else {
        preview.innerHTML = "";
    }
}

function voltarTelaInicial() {

    document.getElementById("inicioAcesso").classList.remove("hidden");

    document.getElementById("cadastroClienteBox").classList.add("hidden");

    document.getElementById("loginClienteBox").classList.add("hidden");

    document.getElementById("loginAdmBox").classList.add("hidden");
}

async function cadastrarCliente() {

    const nome = document.getElementById("cadNome").value;
    const cpf = document.getElementById("cadCpf").value;
    const telefone = document.getElementById("cadTelefone").value;
    const endereco = document.getElementById("cadEndereco").value;
    const nascimento = document.getElementById("cadNascimento").value;
    const senha = document.getElementById("cadSenha").value;

    if(
        !nome ||
        !cpf ||
        !telefone ||
        !endereco ||
        !nascimento ||
        !senha
    ){
        alert("Preencha todos os campos.");
        return;
    }

    try{

        const resposta = await fetch(`${API}/auth/cadastro`,{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                nome,
                cpf,
                telefone,
                endereco,
                nascimento,
                senha
            })
        });

        const dados = await resposta.json();

        if(resposta.ok){

            alert("Cliente cadastrado com sucesso!");

            voltarTelaInicial();

        }else{
            alert(dados.erro);
        }

    }catch(erro){

        console.log(erro);

        alert("Erro ao cadastrar cliente.");
    }
}

async function loginCliente(){

    const cpf = document.getElementById("loginCpfCliente").value;

    const senha = document.getElementById("loginSenhaCliente").value;

    try{

        const resposta = await fetch(`${API}/auth/login-cliente`,{
            method:"POST",
            headers:{
                "Content-Type":"application/json"
            },
            body:JSON.stringify({
                cpf,
                senha
            })
        });

        const dados = await resposta.json();

        if(resposta.ok){

            tipoUsuario = "cliente";

            clienteLogado = dados.usuario;

            entrarSistema();

        }else{

            alert(dados.erro);
        }

    }catch(erro){

        console.log(erro);

        alert("Erro no login.");
    }
}

function loginAdm(){

    const usuario = document.getElementById("usuarioAdm").value;

    const senha = document.getElementById("senhaAdm").value;

    if(usuario === "adm" && senha === "1"){

        tipoUsuario = "adm";

        entrarSistema();

    }else{

        alert("Usuário ou senha inválidos.");
    }
}

function entrarSistema(){

    document.getElementById("loginScreen").style.display = "none";

    document.getElementById("sistema").style.display = "flex";

    document.getElementById("usuarioLogadoInfo").innerHTML =
        tipoUsuario === "adm"
        ? "Administrador"
        : clienteLogado.nome;

    montarMenu();
}

function montarMenu(){

    const menu = document.getElementById("menu");

    if(tipoUsuario === "adm"){

        menu.innerHTML = `
            <h2>Administrador</h2>

            <button onclick="sairSistema()">Sair</button>
        `;

    }else{

        menu.innerHTML = `
            <h2>Cliente</h2>

            <button onclick="sairSistema()">Sair</button>
        `;
    }

    document.getElementById("conteudo").innerHTML = `
        <h1>Bem-vindo ao Sistema</h1>
    `;
}

function sairSistema(){

    location.reload();
}
