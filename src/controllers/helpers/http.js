export const badRequest = (body) => ({
  statusCode: 400,
  body,
});

export const created = (body) => ({
  statusCode: 201,
  body,
});

export const serverError = () => ({
  statusCode: 500,
  body: {
    message: 'Erro interno do servidor ao processar dados.',
  },
});

export const ok = (body) => ({
  statusCode: 200,
  body,
});

export const notFound = (body) => ({
  statusCode: 404,
  body,
});

export const accepted = (body) => ({
  statusCode: 202,
  body,
});
