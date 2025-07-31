import { badRequest, serverError, ok, notFound } from './helpers/http.js';
import { ValidationError } from '../errors/validation.js';

export class RawDataController {
  constructor(rawDataUseCase) {
    if (!rawDataUseCase) {
      throw new Error('RawZoneController requires a RawDataUseCase instance.');
    }
    this.rawDataUseCase = rawDataUseCase;
  }

  async getRawData(req, res) {
    const { apiName, busDt, storeId } = req.query;

    console.log(
      `[INFO] RawZoneController: Recebida requisição GET para raw data: ${apiName}/${busDt}/${storeId}`,
    );

    try {
      const data = await this.rawDataUseCase.execute(apiName, busDt, storeId);

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
