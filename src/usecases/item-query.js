import { ValidationError } from '../errors/validation.js'; // Importa ValidationError

/**
 * Use Case para consultar um item específico por ID na Processed Zone.
 */
export class ItemQueryUseCase {
  /**
   * @param {ProcessedDataRepository} processedDataRepository - Repositório para ler dados processados.
   */
  constructor(processedDataRepository) {
    if (!processedDataRepository) {
      throw new Error(
        'ItemQueryUseCase requires a ProcessedDataRepository instance.',
      );
    }
    this.processedDataRepository = processedDataRepository;
  }

  /**
   * Executa a busca por um item específico por ID.
   * @param {string} id - O ID do item a ser buscado.
   * @returns {Promise<Object|null>} - O item encontrado ou null.
   */
  async execute(id) {
    console.log(
      `[INFO] ItemQueryUseCase: Iniciando busca por item com ID: ${id}`,
    );

    // Validação de negócio simples para o ID
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
      // Relança o erro com uma mensagem mais contextual para a camada superior (Controller)
      if (error instanceof ValidationError) {
        // Se for um erro de validação já tratado, relança
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
