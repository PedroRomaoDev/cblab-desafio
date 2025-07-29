import { badRequest, serverError, ok, notFound } from './helpers/http.js';
import { ValidationError } from '../errors/validation.js'; // Importa ValidationError

/**
 * Controller para consultar dados na Processed Zone.
 * Lida com as requisições HTTP e orquestra o QueryDataUseCase.
 */
export class QueryDataController {
  /**
   * @param {QueryDataUseCase} queryDataUseCase - O Use Case de consulta de dados.
   */
  constructor(queryDataUseCase) {
    if (!queryDataUseCase) {
      throw new Error(
        'QueryDataController requires a QueryDataUseCase instance.',
      );
    }
    this.queryDataUseCase = queryDataUseCase;
  }

  /**
   * Método principal para lidar com a requisição HTTP POST para consulta de dados.
   * Os parâmetros de filtro (busDt, storeId) são passados no corpo da requisição.
   * Ex: POST /query/getGuestChecks
   * Body: { "busDt": "YYYY-MM-DD", "storeId": "store_XXX" }
   * @param {Object} req - Objeto de requisição Express.
   * @param {Object} res - Objeto de resposta Express.
   */
  async execute(req, res) {
    const { apiName } = req.params; // apiName vem do path da URL
    const { busDt, storeId } = req.body; // busDt e storeId vêm do corpo

    console.log(
      `[INFO] QueryDataController: Recebida requisição POST para consulta: ${apiName} com filtros:`,
      { busDt, storeId },
    );

    try {
      // Validação de Requisição (básica antes de passar para o Use Case)
      if (!apiName || typeof apiName !== 'string' || apiName.trim() === '') {
        throw new ValidationError(
          'Nome da API inválido ou ausente na URL para a consulta.',
        );
      }
      // O Use Case já fará validações mais detalhadas de formato.

      const data = await this.queryDataUseCase.execute(apiName, {
        busDt,
        storeId,
      });

      if (data.length === 0) {
        const response = notFound({
          message: `Nenhuns dados processados encontrados para ${apiName} com os filtros fornecidos.`,
        });
        return res.status(response.statusCode).json(response.body);
      }

      const response = ok(data);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      console.error(
        `[ERROR] QueryDataController: Erro ao consultar dados:`,
        error,
      );
      if (error instanceof ValidationError) {
        const response = badRequest({ message: error.message });
        res.status(response.statusCode).json(response.body);
      } else {
        const response = serverError();
        response.body.message =
          'Erro interno do servidor ao buscar dados processados.';
        res.status(response.statusCode).json(response.body);
      }
    }
  }
}
