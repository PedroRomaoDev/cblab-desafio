import { ProcessedDataRepository } from '../../repositories/index.js';
import { QueryDataUseCase } from '../../usecases/index.js';
import { QueryDataController } from '../../controllers/index.js';

export const makeQueryDataController = () => {
  const processedDataRepository = new ProcessedDataRepository();

  const queryDataUseCase = new QueryDataUseCase(processedDataRepository);

  const queryDataController = new QueryDataController(queryDataUseCase);

  return queryDataController;
};
