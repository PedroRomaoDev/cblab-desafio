import { RawDataRepository } from '../../repositories/raw-data.js';
import { RawDataUseCase } from '../../usecases/raw-data.js';
import { RawDataController } from '../../controllers/raw-data.js';

export const makeRawDataController = () => {
  // 1. Instancia Repositório
  const rawDataRepository = new RawDataRepository();

  // 2. Instancia Use Case, injetando o Repositório
  const rawDataUseCase = new RawDataUseCase(rawDataRepository);

  // 3. Instancia Controller, injetando o Use Case
  const rawDataController = new RawDataController(rawDataUseCase);

  return rawDataController;
};
