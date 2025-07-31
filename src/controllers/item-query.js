import { badRequest, serverError, ok, notFound } from './helpers/http.js';
import { ValidationError } from '../errors/validation.js';

export class ItemQueryController {
  constructor(itemQueryUseCase) {
    if (!itemQueryUseCase) {
      throw new Error(
        'ItemQueryController requires an ItemQueryUseCase instance.',
      );
    }
    this.itemQueryUseCase = itemQueryUseCase;
  }

  async execute(req, res) {
    const { id } = req.body;

    console.log(
      `[INFO] ItemQueryController: Recebida requisição POST para buscar item com ID: ${id}`,
    );

    try {
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new ValidationError(
          'ID do item inválido ou ausente no corpo da requisição.',
        );
      }

      const item = await this.itemQueryUseCase.execute(id);

      if (item) {
        const response = ok(item);
        res.status(response.statusCode).json(response.body);
      } else {
        const response = notFound({
          message: `Item com ID '${id}' não encontrado nos dados processados.`,
        });
        res.status(response.statusCode).json(response.body);
      }
    } catch (error) {
      console.error(
        `[ERROR] ItemQueryController: Erro ao buscar item por ID:`,
        error,
      );
      if (error instanceof ValidationError) {
        const response = badRequest({ message: error.message });
        res.status(response.statusCode).json(response.body);
      } else {
        const response = serverError();
        response.body.message = 'Erro interno do servidor ao buscar item.';
        res.status(response.statusCode).json(response.body);
      }
    }
  }
}
