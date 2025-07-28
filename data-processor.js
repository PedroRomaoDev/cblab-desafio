import { RawDataRepository } from './src/repositories/raw-zone.js';
import { ProcessedDataRepository } from './src/repositories/processed-data.js';
import { ProcessDataUseCase } from './src/usecases/process-data.js'; // Importa o Use Case

/**
 * Script principal para iniciar o processamento de dados.
 * Este script atua como um orquestrador simples para o ProcessDataUseCase.
 * Pode ser executado via `npm run process-data`.
 */
async function main() {
  // Instancia os repositórios
  const rawDataRepository = new RawDataRepository();
  const processedDataRepository = new ProcessedDataRepository();

  // Instancia o Use Case, injetando as dependências dos repositórios
  const processDataUseCase = new ProcessDataUseCase(
    rawDataRepository,
    processedDataRepository,
  );

  console.log(
    `[DEBUG] Caminho base da Raw Zone no script: ${processDataUseCase.rawZoneBasePath}`,
  );

  // Define os filtros de processamento (pode ser vazio para processar tudo)
  // Exemplo: para processar apenas uma data e loja específicas
  // const filters = { busDt: '2025-07-24', storeId: 'store_001' };
  const filters = {}; // Processa tudo por padrão

  try {
    await processDataUseCase.execute(filters);
    console.log(
      '[INFO] Script data-processor.js: Execução concluída com sucesso.',
    );
  } catch (error) {
    console.error(
      '[FATAL] Script data-processor.js: Erro durante a execução do processamento:',
      error.message,
    );
    process.exit(1); // Sai com código de erro
  }
}

// Executa a função principal
main();
