// src/factories/controllers/query-data.js

// Importa as classes necessárias para montar o controlador
import { ProcessedDataRepository } from '../../repositories/processed-data.js';
import { QueryDataUseCase } from '../../usecases/query-data.js';
import { QueryDataController } from '../../controllers/query-data.js';

/**
 * Função de fábrica para criar uma instância completa de QueryDataController
 * com todas as suas dependências injetadas.
 * @returns {QueryDataController} - Uma instância de QueryDataController.
 */
export const makeQueryDataController = () => {
  // 1. Instancia Repositórios
  const processedDataRepository = new ProcessedDataRepository();

  // 2. Instancia Use Case, injetando Repositórios
  const queryDataUseCase = new QueryDataUseCase(processedDataRepository);

  // 3. Instancia Controller, injetando Use Case
  const queryDataController = new QueryDataController(queryDataUseCase);

  return queryDataController;
};
