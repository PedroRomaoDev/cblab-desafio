import { ValidationError } from '../errors/validation.js';

export class RawDataUseCase {
  constructor(rawDataRepository) {
    if (!rawDataRepository) {
      throw new Error('RawDataUseCase requires a RawDataRepository instance.');
    }
    this.rawDataRepository = rawDataRepository;
  }
  async execute(apiName, busDt, storeId) {
    console.log(
      `[INFO] RawDataUseCase: Iniciando consulta para Raw Zone: ${apiName}/${busDt}/${storeId}`,
    );

    // Validação de negócio para os parâmetros de entrada
    if (!apiName || typeof apiName !== 'string' || apiName.trim() === '') {
      throw new ValidationError(
        'Nome da API inválido ou ausente para a consulta da Raw Zone.',
      );
    }
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    if (!busDt || typeof busDt !== 'string' || !DATE_REGEX.test(busDt)) {
      throw new ValidationError(
        `Formato da data de negócio (busDt) '${busDt}' inválido. Use o formato YYYY-MM-DD.`,
      );
    }
    if (!storeId || typeof storeId !== 'string' || storeId.trim() === '') {
      throw new ValidationError(
        `ID da loja (storeId) '${storeId}' inválido. Deve ser uma string não vazia.`,
      );
    }

    try {
      const data = await this.rawDataRepository.getByApiDateStore(
        apiName,
        busDt,
        storeId,
      );
      console.log(
        `[INFO] RawDataUseCase: Consulta Raw Zone concluída. Encontrados ${data.length} registros.`,
      );
      return data;
    } catch (error) {
      // Relança o erro com uma mensagem mais contextual para a camada superior (Controller)
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error(
        `[ERROR] RawDataUseCase: Falha ao executar consulta para Raw Zone ${apiName}/${busDt}/${storeId}:`,
        error,
      );
      throw new Error(`Falha na consulta da Raw Zone: ${error.message}`);
    }
  }
}
