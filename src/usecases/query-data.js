// src/usecases/query-data.js

// Importa o repositório necessário como dependência
import { ValidationError } from '../errors/validation.js'; // Importa ValidationError

/**
 * Use Case para consultar dados na Processed Zone com base em filtros.
 * Contém a lógica de negócio para buscar e filtrar dados processados.
 */
export class QueryDataUseCase {
  /**
   * @param {ProcessedDataRepository} processedDataRepository - Repositório para ler dados processados.
   */
  constructor(processedDataRepository) {
    if (!processedDataRepository) {
      throw new Error(
        'QueryDataUseCase requires a ProcessedDataRepository instance.',
      );
    }
    this.processedDataRepository = processedDataRepository;
  }

  /**
   * Executa a consulta de dados processados.
   * @param {string} apiName - O nome da API (ex: 'getGuestChecks') para a qual buscar dados.
   * @param {Object} [filters] - Filtros opcionais para a consulta.
   * @param {string} [filters.busDt] - Data de negócio para filtrar (formato 'YYYY-MM-DD').
   * @param {string} [filters.storeId] - ID da loja para filtrar.
   * @returns {Promise<Array<Object>>} - Um array de objetos JSON que correspondem aos filtros.
   */
  async execute(apiName, filters = {}) {
    console.log(
      `[INFO] QueryDataUseCase: Iniciando consulta para API: ${apiName} com filtros:`,
      filters,
    );

    // Validações de negócio simples para os parâmetros de entrada
    if (!apiName || typeof apiName !== 'string' || apiName.trim() === '') {
      throw new ValidationError(
        'Nome da API inválido ou ausente para a consulta.',
      );
    }
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // Regex para formato YYYY-MM-DD
    if (filters.busDt !== undefined && filters.busDt !== null) {
      if (typeof filters.busDt !== 'string') {
        throw new ValidationError(
          `Formato da data de negócio (busDt) '${filters.busDt}' inválido. Deve ser uma string.`,
        );
      }
      if (!DATE_REGEX.test(filters.busDt)) {
        throw new ValidationError(
          `Formato da data de negócio (busDt) '${filters.busDt}' inválido. Use o formato YYYY-MM-DD.`,
        );
      }
    }
    if (filters.storeId !== undefined && filters.storeId !== null) {
      if (
        typeof filters.storeId !== 'string' ||
        filters.storeId.trim() === ''
      ) {
        throw new ValidationError(
          `ID da loja (storeId) '${filters.storeId}' inválido. Deve ser uma string não vazia.`,
        );
      }
    }

    const { busDt, storeId } = filters;

    try {
      // O repositório já lida com a lógica de navegação de pastas e leitura
      const data = await this.processedDataRepository.getByApiDateStore(
        apiName,
        busDt,
        storeId,
      );
      console.log(
        `[INFO] QueryDataUseCase: Consulta concluída. Encontrados ${data.length} registros.`,
      );
      return data;
    } catch (error) {
      // Relança o erro com uma mensagem mais contextual para a camada superior (Controller)
      if (error instanceof ValidationError) {
        // Se for um erro de validação já tratado, relança
        throw error;
      }
      console.error(
        `[ERROR] QueryDataUseCase: Falha ao executar consulta para ${apiName}:`,
        error,
      );
      throw new Error(`Falha na consulta de dados: ${error.message}`);
    }
  }
}
