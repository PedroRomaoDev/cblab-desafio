import { badRequest, serverError, ok, notFound } from './helpers/http.js';
import { ValidationError } from '../errors/validation.js'; // Importa ValidationError

/**
 * Controller para consultar um item específico por ID na Processed Zone.
 * Lida com as requisições HTTP e orquestra o ItemQueryUseCase.
 */
export class ItemQueryController {
  /**
   * @param {ItemQueryUseCase} itemQueryUseCase - O Use Case de consulta de item.
   */
  constructor(itemQueryUseCase) {
    if (!itemQueryUseCase) {
      throw new Error(
        'ItemQueryController requires an ItemQueryUseCase instance.',
      );
    }
    this.itemQueryUseCase = itemQueryUseCase;
  }

  /**
   * Método principal para lidar com a requisição HTTP POST para buscar um item por ID.
   * O ID do item é passado no corpo da requisição.
   * Ex: POST /query/item
   * Body: { "id": "GC-YYYYMMDD-XXXA" }
   * @param {Object} req - Objeto de requisição Express.
   * @param {Object} res - Objeto de resposta Express.
   */
  async execute(req, res) {
    const { id } = req.body; // ID do item a ser buscado no corpo da requisição

    console.log(
      `[INFO] ItemQueryController: Recebida requisição POST para buscar item com ID: ${id}`,
    );

    try {
      // Validação de Requisição (básica antes de passar para o Use Case)
      if (!id || typeof id !== 'string' || id.trim() === '') {
        throw new ValidationError(
          'ID do item inválido ou ausente no corpo da requisição.',
        );
      }
      // O Use Case já fará validações mais detalhadas se necessário.

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
