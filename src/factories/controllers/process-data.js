import { RawDataRepository } from '../../repositories/index.js';
import { ProcessedDataRepository } from '../../repositories/index.js';
import { ProcessDataUseCase } from '../../usecases/index.js';
import { ProcessDataController } from '../../controllers/index.js';

export const makeProcessDataController = () => {
  const rawDataRepository = new RawDataRepository();
  const processedDataRepository = new ProcessedDataRepository();

  const processDataUseCase = new ProcessDataUseCase(
    rawDataRepository,
    processedDataRepository,
  );

  const processDataController = new ProcessDataController(processDataUseCase);

  return processDataController;
};
