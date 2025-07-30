import { badRequest, serverError, ok, notFound } from './helpers/http.js';
import { ValidationError } from '../errors/validation.js';

/**
 * Controller para expor dados da Raw Zone via API.
 */
export class RawDataController {
  /**
   * @param {RawDataUseCase} rawDataUseCase - Use Case para consultar dados brutos.
   */
  constructor(rawDataUseCase) {
    // NOVO: Recebe RawDataUseCase
    if (!rawDataUseCase) {
      // NOVO: Validação para RawDataUseCase
      throw new Error('RawZoneController requires a RawDataUseCase instance.');
    }
    this.rawDataUseCase = rawDataUseCase; // NOVO: Atribui RawDataUseCase
  }

  /**
   * Obtém dados brutos da Raw Zone com base nos parâmetros de query.
   * Ex: GET /raw-zone?apiName=getFiscalInvoice&busDt=2025-07-24&storeId=store_001
   * @param {Object} req - Objeto de requisição Express.
   * @param {Object} res - Objeto de resposta Express.
   */
  async getRawData(req, res) {
    const { apiName, busDt, storeId } = req.query; // Parâmetros de query para filtros

    console.log(
      `[INFO] RawZoneController: Recebida requisição GET para raw data: ${apiName}/${busDt}/${storeId}`,
    );

    try {
      // O Use Case agora lida com as validações e a chamada ao repositório
      const data = await this.rawDataUseCase.execute(apiName, busDt, storeId); // NOVO: Chama RawDataUseCase.execute()

      if (data.length === 0) {
        const response = notFound({
          message: `Nenhuns dados brutos encontrados para ${apiName}/${busDt}/${storeId}.`,
        });
        return res.status(response.statusCode).json(response.body);
      }

      const response = ok(data);
      res.status(response.statusCode).json(response.body);
    } catch (error) {
      console.error(
        `[ERROR] RawZoneController: Falha ao obter dados brutos:`,
        error,
      );
      if (error instanceof ValidationError) {
        const response = badRequest({ message: error.message });
        res.status(response.statusCode).json(response.body);
      } else {
        const response = serverError();
        response.body.message =
          'Erro interno do servidor ao buscar dados brutos.';
        res.status(response.statusCode).json(response.body);
      }
    }
  }
}
