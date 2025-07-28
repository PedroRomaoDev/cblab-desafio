import {
  badRequest,
  serverError,
  accepted,
  ok,
  notFound,
} from './helpers/http.js';
import { ValidationError } from '../errors/validation.js'; // Importa ValidationError

/**
 * Controller para a funcionalidade de processamento de dados.
 * Lida com as requisições HTTP e orquestra o ProcessDataUseCase.
 */
export class ProcessDataController {
  /**
   * @param {ProcessDataUseCase} processDataUseCase - O Use Case de processamento de dados.
   */
  constructor(processDataUseCase) {
    if (!processDataUseCase) {
      throw new Error(
        'ProcessDataController requires a ProcessDataUseCase instance.',
      );
    }
    this.processDataUseCase = processDataUseCase;
  }

  /**
   * Método principal para lidar com a requisição HTTP POST para processamento de dados.
   * O corpo da requisição pode conter filtros (busDt, storeId, apiName).
   * @param {Object} req - Objeto de requisição Express.
   * @param {Object} res - Objeto de resposta Express.
   */
  async execute(req, res) {
    const filters = req.body;

    console.log(
      `[INFO] ProcessDataController: Recebida requisição para processar dados com filtros:`,
      filters,
    );

    try {
      const result = await this.processDataUseCase.execute(filters); // Pega o resultado do Use Case

      if (result.status === 'success') {
        if (result.processedCount > 0) {
          // Processamento concluído e itens foram processados
          const response = accepted({
            message: result.message,
            processedCount: result.processedCount,
          });
          res.status(response.statusCode).json(response.body);
        } else {
          // Processamento concluído, mas 0 itens processados.
          // Isso ocorre quando os diretórios existiam para os filtros, mas estavam vazios,
          // ou quando nenhum filtro foi aplicado e não havia dados na raw zone.
          const response = ok({ message: result.message, processedCount: 0 }); // Usar 200 OK aqui
          res.status(response.statusCode).json(response.body);
        }
      } else if (
        result.status === 'no_data_source' ||
        result.status === 'no_api_folders' ||
        result.status === 'filter_no_match'
      ) {
        // Para casos onde a Raw Zone ou pastas de API/filtros não foram encontrados
        const response = notFound({ message: result.message }); // 404 Not Found
        res.status(response.statusCode).json(response.body);
      } else {
        // Caso de um status inesperado do Use Case (deveria ser tratado como erro)
        const response = serverError();
        response.body.message = 'Status de processamento inesperado.';
        res.status(response.statusCode).json(response.body);
      }
    } catch (error) {
      console.error(
        `[ERROR] ProcessDataController: Erro ao processar dados:`,
        error,
      );
      // Verifica se o erro é uma instância de ValidationError
      if (error instanceof ValidationError) {
        const response = badRequest({ message: error.message }); // 400 Bad Request
        res.status(response.statusCode).json(response.body);
      } else if (error.message.includes('Falha no Use Case de Processamento')) {
        // Para outros erros específicos do Use Case
        const response = serverError();
        response.body.message = error.message;
        res.status(response.statusCode).json(response.body);
      } else {
        // Para outros erros inesperados
        const response = serverError();
        res.status(response.statusCode).json(response.body);
      }
    }
  }
}
