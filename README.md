# SISTEMA INTELIGENTE DE MONITORAMENTO DE RECEITAS

Sistema web para cadastro de clientes, monitoramento inteligente de receitas, envio de SMS e apoio na identificacao de medicamentos do Programa Farmacia Popular.

## Como abrir o sistema

1. Abra a pasta do projeto no VS Code.
2. Entre na pasta `backend`.
3. Instale as dependencias:

```powershell
npm install
```

4. Crie o arquivo `backend/.env` usando `backend/.env.example` como modelo.
5. Preencha os dados do MySQL, SMSDev e, se desejar, OpenAI.
6. Inicie o servidor:

```powershell
npm start
```

7. Acesse no navegador:

```text
http://localhost:3000
```

## Configuracao importante

O arquivo real `backend/.env` nao vai para o GitHub porque possui senha e chaves privadas.

Para SMS, o sistema esta preparado para usar SMSDev por padrao:

```env
SMS_PROVIDER=smsdev
SMSDEV_KEY=sua_chave_smsdev_aqui
```

Para analise de receita, o sistema tenta usar OpenAI quando `OPENAI_API_KEY` esta configurada. Se a conta estiver sem quota ou credito, o sistema usa OCR local para imagens JPG/PNG e compara o texto com a lista da Farmacia Popular.

## Observacoes

- O MySQL precisa estar instalado e rodando.
- O banco padrao e `sistema_inteligente_monitoramento_receitas`.
- O OCR local funciona melhor com foto nitida, bem iluminada e sem cortes.
- PDFs ainda funcionam melhor com OpenAI; para usar OCR local, envie uma foto ou imagem da receita.
