import { badRequest, serverError, ok, notFound } from './helpers/http.js';
import { ValidationError } from '../errors/validation.js';

export class QueryDataController {
  constructor(queryDataUseCase) {
    if (!queryDataUseCase) {
      throw new Error(
        'QueryDataController requires a QueryDataUseCase instance.',
      );
    }
    this.queryDataUseCase = queryDataUseCase;
  }

  async execute(req, res) {
    const { apiName } = req.params;
    const { busDt, storeId } = req.body;

    console.log(
      `[INFO] QueryDataController: Recebida requisição POST para consulta: ${apiName} com filtros:`,
      { busDt, storeId },
    );

    try {
      if (!apiName || typeof apiName !== 'string' || apiName.trim() === '') {
        throw new ValidationError(
          'Nome da API inválido ou ausente na URL para a consulta.',
        );
      }

      if (
        storeId !== undefined &&
        storeId !== null &&
        storeId.trim() !== '' &&
        !busDt
      ) {
        throw new ValidationError(
          'Se storeId for fornecido, busDt também deve ser fornecido para uma consulta eficiente.',
        );
      }

      const data = await this.queryDataUseCase.execute(apiName, {
        busDt,
        storeId,
      });

      if (data.length === 0) {
        const response = notFound({
          message: `Nenhum dado processado encontrado para ${apiName} com os filtros fornecidos.`,
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
