# Configuracao do MySQL

O backend agora usa MySQL.

## 1. Crie o arquivo de ambiente

Copie o exemplo:

```powershell
Copy-Item backend\.env.example backend\.env
```

Depois edite `backend\.env` com seu usuario e senha do MySQL:

```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=sua_senha_aqui
DB_NAME=sistema_inteligente_monitoramento_receitas
```

## 2. Rode o servidor

```powershell
cd backend
npm start
```

Se a conexao estiver correta, o terminal mostrara:

```text
Banco de dados conectado com sucesso.
SISTEMA INTELIGENTE DE MONITORAMENTO DE RECEITAS iniciado com sucesso.
Acesse o sistema em: http://localhost:3000
```

## 3. Opcional: criar pelo Workbench

Se quiser criar as tabelas manualmente, execute o arquivo:

```text
backend/schema.mysql.sql
```

Mesmo sem rodar esse arquivo, o backend cria o banco e as tabelas automaticamente quando inicia.
