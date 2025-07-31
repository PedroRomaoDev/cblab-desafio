import { ProcessedDataRepository } from '../../repositories/index.js';
import { ItemQueryUseCase } from '../../usecases/index.js';
import { ItemQueryController } from '../../controllers/index.js';

export const makeItemQueryController = () => {
  const processedDataRepository = new ProcessedDataRepository();

  const itemQueryUseCase = new ItemQueryUseCase(processedDataRepository);

  const itemQueryController = new ItemQueryController(itemQueryUseCase);

  return itemQueryController;
};
