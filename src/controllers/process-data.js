import {
  badRequest,
  serverError,
  accepted,
  ok,
  notFound,
} from './helpers/http.js';
import { ValidationError } from '../errors/validation.js';

export class ProcessDataController {
  constructor(processDataUseCase) {
    if (!processDataUseCase) {
      throw new Error(
        'ProcessDataController requires a ProcessDataUseCase instance.',
      );
    }
    this.processDataUseCase = processDataUseCase;
  }

  async execute(req, res) {
    const filters = req.body;

    console.log(
      `[INFO] ProcessDataController: Recebida requisição para processar dados com filtros:`,
      filters,
    );

    try {
      const result = await this.processDataUseCase.execute(filters);

      if (result.status === 'success') {
        if (result.processedCount > 0) {
          const response = accepted({
            message: result.message,
            processedCount: result.processedCount,
          });
          res.status(response.statusCode).json(response.body);
        } else {
          const response = ok({ message: result.message, processedCount: 0 });
          res.status(response.statusCode).json(response.body);
        }
      } else if (
        result.status === 'no_data_source' ||
        result.status === 'no_api_folders' ||
        result.status === 'filter_no_match'
      ) {
        const response = notFound({ message: result.message });
        res.status(response.statusCode).json(response.body);
      } else {
        const response = serverError();
        response.body.message = 'Status de processamento inesperado.';
        res.status(response.statusCode).json(response.body);
      }
    } catch (error) {
      console.error(
        `[ERROR] ProcessDataController: Erro ao processar dados:`,
        error,
      );
      if (error instanceof ValidationError) {
        const response = badRequest({ message: error.message });
        res.status(response.statusCode).json(response.body);
      } else if (error.message.includes('Falha no Use Case de Processamento')) {
        const response = serverError();
        response.body.message = error.message;
        res.status(response.statusCode).json(response.body);
      } else {
        const response = serverError();
        res.status(response.statusCode).json(response.body);
      }
    }
  }
}
