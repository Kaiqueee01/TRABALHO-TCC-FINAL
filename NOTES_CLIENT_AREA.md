Observações (Área do Cliente)

- Cadastro do cliente: 2 passos
  1) POST /api/auth/cadastro (JSON)
  2) POST /api/auth/cadastro-documento (multipart fieldname: 'documento') com body cpf

- Front deve enviar:
  - JSON: { nome, cpf, telefone, endereco, nascimento, senha }
  - multipart: formData.append('cpf', cpf) + formData.append('documento', arquivo)

- Backend já implementa upload usando backend/middlewares/upload.js (salva em uploads/documentos/)

