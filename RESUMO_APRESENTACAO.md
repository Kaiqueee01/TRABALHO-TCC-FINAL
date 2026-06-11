# Resumo para apresentacao do SISTEMA INTELIGENTE DE MONITORAMENTO DE RECEITAS

O SISTEMA INTELIGENTE DE MONITORAMENTO DE RECEITAS foi desenvolvido para auxiliar no monitoramento de receitas medicas, organizando dados de clientes, receitas cadastradas, prazos de validade, proximas retiradas e notificacoes. A proposta do sistema e reduzir perdas de prazo, melhorar o acompanhamento dos pacientes e facilitar a gestao das informacoes pela administracao.

O sistema possui dois tipos de acesso: cliente e administrador. O cliente pode realizar cadastro, enviar documento, acessar seus dados, atualizar seu perfil, cadastrar suas receitas, consultar receitas ja registradas e acompanhar notificacoes relacionadas a vencimento ou retirada. Caso esqueca a senha, o sistema permite redefinir uma nova senha apos confirmar CPF, telefone e data de nascimento.

O administrador possui um painel de controle com indicadores gerais, gerenciamento de clientes, gerenciamento de receitas e area de notificacoes. Tambem ha integracao com SMS por meio da Twilio, permitindo enviar avisos aos clientes e manter historico dos envios realizados.

No backend, o sistema utiliza Node.js com Express para disponibilizar as rotas da API. Os dados sao armazenados em MySQL, com tabelas para clientes, receitas, notificacoes, farmacias e historico de SMS. As senhas dos clientes sao protegidas com bcrypt, evitando armazenamento em texto puro.

No frontend, a interface foi criada com HTML, CSS e JavaScript. A tela inicial separa o acesso entre cliente e administrador, enquanto as demais telas exibem menus e formularios conforme o perfil do usuario logado. O sistema tambem permite upload de documentos e arquivos de receitas nos formatos PDF, JPG e PNG.

De forma geral, o SISTEMA INTELIGENTE DE MONITORAMENTO DE RECEITAS centraliza o controle de receitas medicas, melhora a organizacao do atendimento e oferece uma base digital para acompanhar clientes, medicamentos, documentos e comunicacoes importantes.
