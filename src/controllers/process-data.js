import { badRequest, serverError, accepted } from './helpers/http.js';

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
    const filters = req.body; // Pega os filtros do corpo da requisição POST

    console.log(
      `[INFO] ProcessDataController: Recebida requisição para processar dados com filtros:`,
      filters,
    );

    try {
      // O Use Case já lida com a lógica de processamento e logs de sucesso/erro
      await this.processDataUseCase.execute(filters);
      // Retorna 202 Accepted (Requisição aceita para processamento) usando o helper 'accepted'
      const response = accepted({
        message: 'Processamento de dados iniciado com sucesso.',
      });
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      console.error(
        `[ERROR] ProcessDataController: Erro ao processar dados:`,
        error,
      );
      // Trata erros específicos ou retorna um erro genérico 500 usando os helpers
      // Se o erro veio do Use Case, ele já terá uma mensagem contextualizada
      if (error.message.includes('Falha no Use Case de Processamento')) {
        const response = serverError(); // Usa o helper serverError
        response.body.message = error.message; // Sobrescreve a mensagem padrão
        res.status(response.statusCode).json(response.body);
      } else if (
        error.message.includes('ID do item inválido') ||
        error.message.includes('Nome da API inválido')
      ) {
        // Exemplo: se o Use Case lançar erros de validação de entrada, podemos retornar 400
        const response = badRequest({ message: error.message });
        res.status(response.statusCode).json(response.body);
      } else {
        // Para outros erros inesperados
        const response = serverError(); // Usa o helper serverError
        res.status(response.statusCode).json(response.body);
      }
    }
  }
}
