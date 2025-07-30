// src/factories/controllers/process-data.js

// Importa as classes necessárias para montar o controlador
import { RawDataRepository } from '../../repositories/raw-data.js';
import { ProcessedDataRepository } from '../../repositories/processed-data.js';
import { ProcessDataUseCase } from '../../usecases/process-data.js';
import { ProcessDataController } from '../../controllers/process-data.js';

export const makeProcessDataController = () => {
  // 1. Instancia Repositórios
  const rawDataRepository = new RawDataRepository();
  const processedDataRepository = new ProcessedDataRepository();

  // 2. Instancia Use Case, injetando Repositórios
  const processDataUseCase = new ProcessDataUseCase(
    rawDataRepository,
    processedDataRepository,
  );

  // 3. Instancia Controller, injetando Use Case
  const processDataController = new ProcessDataController(processDataUseCase);

  return processDataController;
};
