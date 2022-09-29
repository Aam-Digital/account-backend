import { catchError, map, OperatorFunction, pipe } from 'rxjs';
import { HttpException } from '@nestjs/common';

export function prepareResult(): OperatorFunction<any, any> {
  return pipe(
    catchError((err) => {
      throw new HttpException(
        err.response.data.errorMessage,
        err.response.status,
      );
    }),
    map(() => ({ ok: true })),
  );
}
