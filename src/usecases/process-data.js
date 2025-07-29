import { promises as fs } from 'fs';
import path from 'path';
import { ValidationError } from '../errors/validation.js';
export class ProcessDataUseCase {
  static VALID_API_NAMES = [
    'getFiscalInvoice',
    'getGuestChecks',
    'getChargeBack',
    'getTransactions',
    'getCashManagementDetails',
  ];
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
      `ProcessDataUseCase: Iniciando processamento de dados com filtros:`,
      filters,
    );

    const { busDt, storeId, apiName } = filters;
    let totalProcessedCount = 0;
    let anyPathMatchedFilters = false;

    // **VALIDAÇÃO APRIMORADA: apiName**
    if (apiName !== undefined && apiName !== null) {
      if (typeof apiName !== 'string' || apiName.trim() === '') {
        throw new ValidationError(
          `Nome da API '${apiName}' inválido. Deve ser uma string não vazia.`,
        );
      }
      if (!ProcessDataUseCase.VALID_API_NAMES.includes(apiName)) {
        throw new ValidationError(
          `Nome da API '${apiName}' inválido. Nomes válidos são: ${ProcessDataUseCase.VALID_API_NAMES.join(', ')}.`,
        );
      }
    }

    // **VALIDAÇÃO APRIMORADA: busDt**
    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/; // Regex para formato YYYY-MM-DD
    if (busDt !== undefined && busDt !== null) {
      if (typeof busDt !== 'string') {
        throw new ValidationError(
          `Formato da data de negócio (busDt) '${busDt}' inválido. Deve ser uma string.`,
        );
      }
      if (!DATE_REGEX.test(busDt)) {
        throw new ValidationError(
          `Formato da data de negócio (busDt) '${busDt}' inválido. Use o formato YYYY-MM-DD.`,
        );
      }
    }

    // **VALIDAÇÃO APRIMORADA: storeId**
    if (storeId !== undefined && storeId !== null) {
      if (typeof storeId !== 'string' || storeId.trim() === '') {
        throw new ValidationError(
          `ID da loja (storeId) '${storeId}' inválido. Deve ser uma string não vazia.`,
        );
      }
    }
    // **FIM DAS VALIDAÇÕES APRIMORADAS**

    try {
      // Início do bloco try principal
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
          };
        }
        throw error;
      }

      let apiFoldersToProcess = [];
      if (apiName) {
        apiFoldersToProcess = [apiName];
        const specificApiPath = path.join(this.rawZoneBasePath, apiName);
        try {
          await fs.access(specificApiPath);
          anyPathMatchedFilters = true;
        } catch (error) {
          if (error.code === 'ENOENT') {
            console.log(
              `[INFO] ProcessDataUseCase: Pasta da API '${apiName}' não encontrada para o filtro.`,
            );
            return {
              status: 'filter_no_match',
              message: `Nenhum dado correspondente ao filtro 'apiName: ${apiName}' foi encontrado na Raw Zone.`,
            };
          }
          throw error;
        }
      } else {
        const entries = await fs.readdir(this.rawZoneBasePath, {
          withFileTypes: true,
        });
        apiFoldersToProcess = entries
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name);
        if (apiFoldersToProcess.length > 0) {
          anyPathMatchedFilters = true;
        }
      }

      if (apiFoldersToProcess.length === 0 && !apiName) {
        console.log(
          '[INFO] ProcessDataUseCase: Nenhuma pasta de API encontrada na Raw Zone para processar.',
        );
        return {
          status: 'no_api_folders',
          message:
            'Nenhuma pasta de API encontrada na Raw Zone para processar.',
        };
      }

      for (const currentApiName of apiFoldersToProcess) {
        const apiPath = path.join(this.rawZoneBasePath, currentApiName);

        let yearFoldersToProcess = [];
        if (busDt) {
          const year = busDt.substring(0, 4);
          const specificYearPath = path.join(apiPath, year);
          try {
            await fs.access(specificYearPath);
            yearFoldersToProcess = [year];
            anyPathMatchedFilters = true;
          } catch (error) {
            if (error.code === 'ENOENT') {
              continue;
            }
            throw error;
          }
        } else {
          const entries = await fs.readdir(apiPath, { withFileTypes: true });
          yearFoldersToProcess = entries
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
          if (yearFoldersToProcess.length > 0) {
            anyPathMatchedFilters = true;
          }
        }

        for (const year of yearFoldersToProcess) {
          const yearPath = path.join(apiPath, year);

          let monthFoldersToProcess = [];
          if (busDt) {
            const month = busDt.substring(5, 7);
            const specificMonthPath = path.join(yearPath, month);
            try {
              await fs.access(specificMonthPath);
              monthFoldersToProcess = [month];
              anyPathMatchedFilters = true;
            } catch (error) {
              if (error.code === 'ENOENT') {
                continue;
              }
              throw error;
            }
          } else {
            const entries = await fs.readdir(yearPath, { withFileTypes: true });
            monthFoldersToProcess = entries
              .filter((entry) => entry.isDirectory())
              .map((entry) => entry.name);
            if (monthFoldersToProcess.length > 0) {
              anyPathMatchedFilters = true;
            }
          }

          for (const month of monthFoldersToProcess) {
            const monthPath = path.join(yearPath, month);

            let dayFoldersToProcess = [];
            if (busDt) {
              const day = busDt.substring(8, 10);
              const specificDayPath = path.join(monthPath, day);
              try {
                await fs.access(specificDayPath);
                dayFoldersToProcess = [day];
                anyPathMatchedFilters = true;
              } catch (error) {
                if (error.code === 'ENOENT') {
                  continue;
                }
                throw error;
              }
            } else {
              const entries = await fs.readdir(monthPath, {
                withFileTypes: true,
              });
              dayFoldersToProcess = entries
                .filter((entry) => entry.isDirectory())
                .map((entry) => entry.name);
              if (dayFoldersToProcess.length > 0) {
                anyPathMatchedFilters = true;
              }
            }

            for (const day of dayFoldersToProcess) {
              const dayPath = path.join(monthPath, day);

              let storeFoldersToProcess = [];
              if (storeId) {
                const specificStorePath = path.join(dayPath, storeId);
                try {
                  await fs.access(specificStorePath);
                  storeFoldersToProcess = [storeId];
                  anyPathMatchedFilters = true;
                } catch (error) {
                  if (error.code === 'ENOENT') {
                    continue;
                  }
                  throw error;
                }
              } else {
                const entries = await fs.readdir(dayPath, {
                  withFileTypes: true,
                });
                storeFoldersToProcess = entries
                  .filter((entry) => entry.isDirectory())
                  .map((entry) => entry.name);
                if (storeFoldersToProcess.length > 0) {
                  anyPathMatchedFilters = true;
                }
              }

              for (const currentStoreId of storeFoldersToProcess) {
                const currentBusDt = `${year}-${month}-${day}`;

                const rawData = await this.rawDataRepository.getByApiDateStore(
                  currentApiName,
                  currentBusDt,
                  currentStoreId,
                );

                if (rawData.length === 0) {
                  console.log(
                    `[INFO] ProcessDataUseCase: Nenhuns dados brutos encontrados para ${currentApiName}/${currentBusDt}/${currentStoreId}.`,
                  );
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
          console.log(
            '[INFO] ProcessDataUseCase: Processamento de dados concluído.',
          );

          if (totalProcessedCount === 0 && (busDt || storeId || apiName)) {
            if (!anyPathMatchedFilters) {
              return {
                status: 'filter_no_match',
                message:
                  'Nenhum dado correspondente aos filtros fornecidos foi encontrado na Raw Zone.',
              };
            }
            return {
              status: 'success',
              message: `Processamento concluído. Total de 0 itens processados. Os diretórios existiam, mas estavam vazios para os filtros.`,
              processedCount: 0,
            };
          }

          return {
            status: 'success',
            message: `Processamento concluído. Total de ${totalProcessedCount} itens processados.`,
            processedCount: totalProcessedCount,
          };
        }
      }
    } catch (error) {
      // Este é o catch do try principal
      if (error instanceof ValidationError) {
        throw error; // Relança ValidationError para o Controller tratar
      }
      console.error(
        '[FATAL] ProcessDataUseCase: Ocorreu um erro durante o processamento de dados:',
        error,
      );
      throw new Error(`Falha no Use Case de Processamento: ${error.message}`);
    }
  }
}
