# Configuracao de SMS

O sistema consegue enviar SMS por dois provedores:

- Twilio
- SMSDev

Se a Twilio estiver dando erro `Authenticate`, use SMSDev. O sistema continua usando a mesma tela:

```text
Notificacoes Gerais > Envio de SMS
```

## Opcao 1: SMSDev

Crie uma conta em:

```text
https://painel.smsdev.com.br/criar-conta
```

Depois acesse o painel da conta e copie sua chave `Key`.

Edite:

```text
backend/.env
```

Preencha:

```env
SMS_PROVIDER=smsdev
SMSDEV_KEY=sua_chave_key_aqui
```

O telefone do cliente deve estar com DDD + numero de celular. Exemplos aceitos pelo provedor:

```text
11988887777
5511988887777
```

## Opcao 2: Twilio

Crie uma conta em:

```text
https://www.twilio.com/
```

No painel da Twilio, pegue:

- Account SID
- Auth Token
- Um numero Twilio com capacidade de SMS

Em conta trial, a Twilio pode exigir que o telefone de destino esteja verificado.

Edite:

```text
backend/.env
```

Preencha:

```env
SMS_PROVIDER=twilio
TWILIO_ACCOUNT_SID=seu_account_sid
TWILIO_AUTH_TOKEN=seu_auth_token
TWILIO_PHONE_NUMBER=+15551234567
```

## Rodar de novo

Depois de mudar o `.env`, reinicie o servidor:

```powershell
netstat -ano | findstr :3000
Stop-Process -Id NUMERO_DO_PID -Force

cd backend
npm start
```

O sistema registra o historico na tabela `sms_envios`, incluindo o provedor usado.
