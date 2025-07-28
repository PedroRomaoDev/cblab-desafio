// src/usecases/process-data.js
import { promises as fs } from 'fs'; // Para iterar diretórios
import path from 'path'; // Para construir caminhos

/**
 * Use Case para processar dados brutos da Raw Zone e salvá-los na Processed Zone.
 * Contém a lógica de negócio de transformação.
 */
export class ProcessDataUseCase {
  /**
   * @param {RawDataRepository} rawDataRepository - Repositório para ler dados brutos.
   * @param {ProcessedDataRepository} processedDataRepository - Repositório para salvar dados processados.
   */
  constructor(rawDataRepository, processedDataRepository) {
    if (!rawDataRepository || !processedDataRepository) {
      throw new Error(
        'ProcessDataUseCase requires RawDataRepository and ProcessedDataRepository instances.',
      );
    }
    this.rawDataRepository = rawDataRepository;
    this.processedDataRepository = processedDataRepository;
    this.rawZoneBasePath = path.join(process.cwd(), 'nodered_data', 'raw');
  }

  /**
   * Executa o processo de transformação de dados.
   * Pode processar todos os dados ou dados específicos com base em filtros.
   * @param {Object} [filters] - Filtros opcionais para processamento seletivo.
   * @param {string} [filters.busDt] - Data de negócio para processar (formato 'YYYY-MM-DD').
   * @param {string} [filters.storeId] - ID da loja para processar.
   * @param {string} [filters.apiName] - Nome da API para processar.
   * @returns {Promise<{status: string, message: string, processedCount?: number}>} - Objeto com o resultado do processamento.
   */
  async execute(filters = {}) {
    console.log(
      `[INFO] ProcessDataUseCase: Iniciando processamento de dados com filtros:`,
      filters,
    );

    const { busDt, storeId, apiName } = filters;
    let totalProcessedCount = 0; // Contador de itens processados
    let filterMatchFound = false; // Flag para saber se os filtros encontraram pelo menos um caminho

    try {
      // 1. Verifica se a pasta rawZoneBasePath existe
      try {
        await fs.access(this.rawZoneBasePath);
      } catch (error) {
        if (error.code === 'ENOENT') {
          console.warn(
            `[WARN] ProcessDataUseCase: Raw Zone base path '${this.rawZoneBasePath}' não encontrada. Nenhuns dados para processar.`,
          );
          return {
            status: 'no_data_source',
            message: `Raw Zone base path '${this.rawZoneBasePath}' não encontrada.`,
          }; // Retorno específico
        }
        throw error; // Relança outros erros de acesso
      }

      let apiFoldersToProcess = [];
      if (apiName) {
        apiFoldersToProcess = [apiName];
      } else {
        const entries = await fs.readdir(this.rawZoneBasePath, {
          withFileTypes: true,
        });
        apiFoldersToProcess = entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name);
      }

      if (apiFoldersToProcess.length === 0) {
        console.log(
          '[INFO] ProcessDataUseCase: Nenhuma pasta de API encontrada na Raw Zone para processar.',
        );
        return {
          status: 'no_api_folders',
          message:
            'Nenhuma pasta de API encontrada na Raw Zone para processar.',
        }; // Retorno específico
      }

      for (const currentApiName of apiFoldersToProcess) {
        const apiPath = path.join(this.rawZoneBasePath, currentApiName);

        let yearFoldersToProcess = [];
        if (busDt) {
          yearFoldersToProcess = [busDt.substring(0, 4)];
        } else {
          const entries = await fs.readdir(apiPath, { withFileTypes: true });
          yearFoldersToProcess = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
        }

        for (const year of yearFoldersToProcess) {
          const yearPath = path.join(apiPath, year);

          let monthFoldersToProcess = [];
          if (busDt) {
            monthFoldersToProcess = [busDt.substring(5, 7)];
          } else {
            const entries = await fs.readdir(yearPath, { withFileTypes: true });
            monthFoldersToProcess = entries
              .filter((entry) => entry.isDirectory())
              .map((entry) => entry.name);
          }

          for (const month of monthFoldersToProcess) {
            const monthPath = path.join(yearPath, month);

            let dayFoldersToProcess = [];
            if (busDt) {
              dayFoldersToProcess = [busDt.substring(8, 10)];
            } else {
              const entries = await fs.readdir(monthPath, {
                withFileTypes: true,
              });
              dayFoldersToProcess = entries
                .filter((entry) => entry.isDirectory())
                .map((entry) => entry.name);
            }

            for (const day of dayFoldersToProcess) {
              const dayPath = path.join(monthPath, day);

              let storeFoldersToProcess = [];
              if (storeId) {
                storeFoldersToProcess = [storeId];
              } else {
                const entries = await fs.readdir(dayPath, {
                  withFileTypes: true,
                });
                storeFoldersToProcess = entries
                  .filter((entry) => entry.isDirectory())
                  .map((entry) => entry.name);
              }

              for (const currentStoreId of storeFoldersToProcess) {
                const currentBusDt = `${year}-${month}-${day}`;

                // Verifica se o caminho específico para os filtros existe antes de chamar o repositório
                const specificPath = path.join(
                  this.rawZoneBasePath,
                  currentApiName,
                  year,
                  month,
                  day,
                  currentStoreId,
                );
                try {
                  await fs.access(specificPath); // Tenta acessar o diretório
                  filterMatchFound = true; // Pelo menos um filtro encontrou um caminho
                } catch (error) {
                  if (error.code === 'ENOENT') {
                    // console.log(`[INFO] ProcessDataUseCase: Caminho filtrado não encontrado: ${specificPath}`);
                    continue; // Pula para a próxima iteração se o caminho filtrado não existir
                  }
                  throw error; // Relança outros erros de acesso
                }

                const rawData = await this.rawDataRepository.getByApiDateStore(
                  currentApiName,
                  currentBusDt,
                  currentStoreId,
                );

                if (rawData.length === 0) {
                  console.log(
                    `[INFO] ProcessDataUseCase: Nenhuns dados brutos encontrados para ${currentApiName}/${currentBusDt}/${currentStoreId}.`,
                  );
                  // Não há dados para esta combinação, apenas continua o loop
                  continue;
                }

                let processedData = rawData.map((item) => {
                  const newItem = { ...item };
                  if (
                    currentApiName === 'getGuestChecks' &&
                    newItem.taxes !== undefined &&
                    newItem.taxation === undefined
                  ) {
                    newItem.taxation = newItem.taxes;
                    delete newItem.taxes;
                  }
                  return {
                    ...newItem,
                    _processedAt: new Date().toISOString(),
                    _processorVersion: '1.0',
                  };
                });
                totalProcessedCount += processedData.length;

                const outputPath =
                  await this.processedDataRepository.saveToProcessedZone(
                    currentApiName,
                    currentBusDt,
                    currentStoreId,
                    processedData,
                  );
                console.log(
                  `[SUCCESS] ProcessDataUseCase: Dados processados e salvos em: ${outputPath}`,
                );
              }
            }
          }
        }
      }
      console.log(
        '[INFO] ProcessDataUseCase: Processamento de dados concluído.',
      );

      // Retorno final baseado nos resultados
      if (totalProcessedCount === 0 && (busDt || storeId || apiName)) {
        // Se filtros foram aplicados e nada foi processado,
        // e se nenhum caminho correspondente aos filtros existia
        if (!filterMatchFound) {
          return {
            status: 'filter_no_match',
            message:
              'Nenhum dado correspondente aos filtros fornecidos foi encontrado na Raw Zone.',
          };
        }
        // Se filterMatchFound é true, mas totalProcessedCount é 0, significa que os diretórios existiam, mas estavam vazios.
        return {
          status: 'success',
          message: `Processamento concluído. Total de 0 itens processados. Os diretórios existiam, mas estavam vazios para os filtros.`,
          processedCount: 0,
        };
      }

      // Retorno de sucesso com a contagem total para quando há dados ou nenhum filtro
      return {
        status: 'success',
        message: `Processamento concluído. Total de ${totalProcessedCount} itens processados.`,
        processedCount: totalProcessedCount,
      };
    } catch (error) {
      console.error(
        '[FATAL] ProcessDataUseCase: Ocorreu um erro durante o processamento de dados:',
        error,
      );
      throw new Error(`Falha no Use Case de Processamento: ${error.message}`);
    }
  }
}
