import { catchError, map, OperatorFunction, pipe } from 'rxjs';
import { HttpException } from '@nestjs/common';

/**
 * This automatically maps Axios errors to HttpExceptions
 * and creates a simple return value.
 * Should be used at the end of an observable pipe in a controller.
 */
export function prepareResult(): OperatorFunction<any, any> {
  return pipe(
    catchError((err) => {
      if (err instanceof HttpException) {
        throw err;
      }
      throw new HttpException(
        err.response.data.errorMessage,
        err.response.status,
      );
    }),
    map(() => ({ ok: true })),
  );
}
