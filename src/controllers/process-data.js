import {
  badRequest,
  serverError,
  accepted,
  ok,
  notFound,
} from './helpers/http.js';

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
          // Isso ocorre quando os diretórios existem para os filtros, mas estão vazios,
          // ou quando nenhum filtro foi aplicado e não havia dados na raw zone.
          const response = ok({ message: result.message, processedCount: 0 }); // Usar 200 OK aqui
          res.status(response.statusCode).json(response.body);
        }
      } else if (result.status === 'no_data_source') {
        // Pasta base da Raw Zone não encontrada
        const response = notFound({ message: result.message }); // 404 Not Found
        res.status(response.statusCode).json(response.body);
      } else if (result.status === 'no_api_folders') {
        // Nenhuma pasta de API encontrada na Raw Zone
        const response = notFound({ message: result.message }); // 404 Not Found
        res.status(response.statusCode).json(response.body);
      } else if (result.status === 'filter_no_match') {
        // Filtros fornecidos não encontraram nenhum caminho correspondente
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
      // Trata erros específicos lançados pelo Use Case
      if (error.message.includes('Falha no Use Case de Processamento')) {
        const response = serverError();
        response.body.message = error.message;
        res.status(response.statusCode).json(response.body);
      } else if (
        error.message.includes('Nome da API inválido') ||
        error.message.includes('Formato da data de negócio inválido') ||
        error.message.includes('ID do item inválido')
      ) {
        // Erros de validação de entrada que podem vir do Use Case
        const response = badRequest({ message: error.message });
        res.status(response.statusCode).json(response.body);
      } else {
        // Para outros erros inesperados
        const response = serverError();
        res.status(response.statusCode).json(response.body);
      }
    }
  }
}
