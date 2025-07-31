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

  async execute(filters = {}) {
    console.log(
      `[INFO] ProcessDataUseCase: Iniciando processamento de dados com filtros:`,
      filters,
    );
    console.log(
      `[DEBUG] Filters received: apiName='${filters.apiName}', busDt='${filters.busDt}', storeId='${filters.storeId}'`,
    );

    const { busDt, busDtEnd, storeId, apiName } = filters;
    let totalProcessedCount = 0;
    const hasFiltersApplied =
      busDt !== undefined ||
      busDtEnd !== undefined ||
      storeId !== undefined ||
      apiName !== undefined;

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

    const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;
    if (busDt !== undefined && busDt !== null) {
      if (typeof busDt !== 'string' || !DATE_REGEX.test(busDt)) {
        throw new ValidationError(
          `Formato da data de negócio (busDt) '${busDt}' inválido. Use o formato YYYY-MM-DD.`,
        );
      }
    }
    if (busDtEnd !== undefined && busDtEnd !== null) {
      if (typeof busDtEnd !== 'string' || !DATE_REGEX.test(busDtEnd)) {
        throw new ValidationError(
          `Formato da data de negócio final (busDtEnd) '${busDtEnd}' inválido. Use o formato YYYY-MM-DD.`,
        );
      }
      if (busDt && busDtEnd < busDt) {
        throw new ValidationError(
          `A data final (busDtEnd) '${busDtEnd}' não pode ser anterior à data inicial (busDt) '${busDt}'.`,
        );
      }
    }

    if (storeId !== undefined && storeId !== null) {
      if (typeof storeId !== 'string' || storeId.trim() === '') {
        throw new ValidationError(
          `ID da loja (storeId) '${storeId}' inválido. Deve ser uma string não vazia.`,
        );
      }
    }

    try {
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

      const pathsToProcess = [];

      const listDirectories = async (currentPath) => {
        try {
          const entries = await fs.readdir(currentPath, {
            withFileTypes: true,
          });
          return entries.filter((e) => e.isDirectory()).map((e) => e.name);
        } catch (error) {
          if (error.code === 'ENOENT') {
            return [];
          }
          throw error;
        }
      };

      const apiFolders = apiName
        ? [apiName]
        : await listDirectories(this.rawZoneBasePath);
      let foundMatchingPathForFilters = false;

      for (const currentApiName of apiFolders) {
        const apiPath = path.join(this.rawZoneBasePath, currentApiName);

        const yearFolders =
          busDt || busDtEnd
            ? [busDt ? busDt.substring(0, 4) : busDtEnd.substring(0, 4)]
            : await listDirectories(apiPath);

        for (const year of yearFolders) {
          const yearPath = path.join(apiPath, year);

          const monthFolders =
            busDt || busDtEnd
              ? [busDt ? busDt.substring(5, 7) : busDtEnd.substring(5, 7)]
              : await listDirectories(yearPath);

          for (const month of monthFolders) {
            const monthPath = path.join(yearPath, month);

            const dayFolders =
              busDt || busDtEnd
                ? [busDt ? busDt.substring(8, 10) : busDtEnd.substring(8, 10)]
                : await listDirectories(monthPath);

            for (const day of dayFolders) {
              const currentBusDt = `${year}-${month}-${day}`;

              if (busDt && currentBusDt < busDt) continue;
              if (busDtEnd && currentBusDt > busDtEnd) continue;

              const dayPath = path.join(monthPath, day);

              const storeFolders = storeId
                ? [storeId]
                : await listDirectories(dayPath);

              for (const currentStoreId of storeFolders) {
                const fullStorePath = path.join(dayPath, currentStoreId);
                try {
                  await fs.access(fullStorePath);
                  foundMatchingPathForFilters = true;
                  pathsToProcess.push({
                    apiName: currentApiName,
                    busDt: currentBusDt,
                    storeId: currentStoreId,
                  });
                } catch (error) {
                  if (error.code === 'ENOENT') {
                    continue;
                  }
                  throw error;
                }
              }
            }
          }
        }
      }

      if (pathsToProcess.length === 0) {
        if (hasFiltersApplied) {
          if (!foundMatchingPathForFilters) {
            return {
              status: 'filter_no_match',
              message:
                'Nenhum dado correspondente aos filtros fornecidos foi encontrado na Raw Zone.',
            };
          }
          return {
            status: 'success',
            message: `Processamento concluído. Total de 0 itens processados. Os diretórios existiam para os filtros, mas estavam vazios.`,
            processedCount: 0,
          };
        } else {
          console.log(
            '[INFO] ProcessDataUseCase: Nenhuma pasta de API encontrada na Raw Zone para processar.',
          );
          return {
            status: 'no_api_folders',
            message:
              'Nenhuma pasta de API encontrada na Raw Zone para processar.',
          };
        }
      }

      for (const pathInfo of pathsToProcess) {
        const {
          apiName: currentApiName,
          busDt: currentBusDt,
          storeId: currentStoreId,
        } = pathInfo;

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
      console.log(
        '[INFO] ProcessDataUseCase: Processamento de dados concluído.',
      );

      return {
        status: 'success',
        message: `Processamento concluído. Total de ${totalProcessedCount} itens processados.`,
        processedCount: totalProcessedCount,
      };
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      console.error(
        '[FATAL] ProcessDataUseCase: Ocorreu um erro durante o processamento de dados:',
        error,
      );
      throw new Error(`Falha no Use Case de Processamento: ${error.message}`);
    }
  }
}
