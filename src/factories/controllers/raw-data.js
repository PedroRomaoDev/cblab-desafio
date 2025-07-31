import { RawDataRepository } from '../../repositories/index.js';
import { RawDataUseCase } from '../../usecases/index.js';
import { RawDataController } from '../../controllers/index.js';

export const makeRawDataController = () => {
  const rawDataRepository = new RawDataRepository();

  const rawDataUseCase = new RawDataUseCase(rawDataRepository);

  const rawDataController = new RawDataController(rawDataUseCase);

  return rawDataController;
};
