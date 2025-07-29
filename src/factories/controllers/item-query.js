// src/factories/controllers/item-query.js

// Importa as classes necessárias para montar o controlador
import { ProcessedDataRepository } from '../../repositories/processed-data.js';
import { ItemQueryUseCase } from '../../usecases/item-query.js';
import { ItemQueryController } from '../../controllers/item-query.js';

/**
 * Função de fábrica para criar uma instância completa de ItemQueryController
 * com todas as suas dependências injetadas.
 * @returns {ItemQueryController} - Uma instância de ItemQueryController.
 */
export const makeItemQueryController = () => {
  // 1. Instancia Repositórios
  const processedDataRepository = new ProcessedDataRepository();

  // 2. Instancia Use Case, injetando Repositórios
  const itemQueryUseCase = new ItemQueryUseCase(processedDataRepository);

  // 3. Instancia Controller, injetando Use Case
  const itemQueryController = new ItemQueryController(itemQueryUseCase);

  return itemQueryController;
};
