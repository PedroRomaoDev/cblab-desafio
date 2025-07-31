import { ValidationError } from '../errors/validation.js';

export class ItemQueryUseCase {
  constructor(processedDataRepository) {
    if (!processedDataRepository) {
      throw new Error(
        'ItemQueryUseCase requires a ProcessedDataRepository instance.',
      );
    }
    this.processedDataRepository = processedDataRepository;
  }

  async execute(id) {
    console.log(
      `[INFO] ItemQueryUseCase: Iniciando busca por item com ID: ${id}`,
    );

    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError(
        `ID do item '${id}' inválido ou ausente para a busca. Deve ser uma string não vazia.`,
      );
    }

    try {
      const item = await this.processedDataRepository.getItemById(id);
      if (item) {
        console.log(`[INFO] ItemQueryUseCase: Item com ID '${id}' encontrado.`);
      } else {
        console.log(
          `[INFO] ItemQueryUseCase: Item com ID '${id}' não encontrado.`,
        );
      }
      return item;
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error(
        `[ERROR] ItemQueryUseCase: Falha ao buscar item com ID '${id}':`,
        error,
      );
      throw new Error(`Falha na busca por item: ${error.message}`);
    }
  }
}
