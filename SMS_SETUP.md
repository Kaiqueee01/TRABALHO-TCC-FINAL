# Configuracao de SMS

O sistema envia SMS usando Twilio.

## 1. Criar conta e numero

Crie uma conta em:

```text
https://www.twilio.com/
```

No painel da Twilio, pegue:

- Account SID
- Auth Token
- Um numero Twilio com capacidade de SMS

Em conta trial, a Twilio pode exigir que o telefone de destino esteja verificado.

## 2. Configurar o projeto

Edite:

```text
backend/.env
```

Preencha:

```env
TWILIO_ACCOUNT_SID=seu_account_sid
TWILIO_AUTH_TOKEN=seu_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

O telefone deve ficar em formato internacional, com `+`.

## 3. Rodar

```powershell
cd backend
npm start
```

No sistema, entre como administrador e abra:

```text
Notificacoes Gerais > Envio de SMS
```

O sistema registra o historico na tabela `sms_envios`.
