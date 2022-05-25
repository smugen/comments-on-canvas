import { ClassType, transformAndValidate } from 'class-transformer-validator';
import { ValidationError } from 'class-validator';
import Koa from 'koa';

export type ApiContext<Input, Output> = Koa.ParameterizedContext<
  ValidatedInput<Input>,
  Koa.DefaultContext,
  Output
>;

interface ValidatedInput<T> extends Koa.DefaultState {
  input: T;
  inputs: T[];
}

export function inputValidator<T extends object>(
  classType: ClassType<T>,
): Koa.Middleware<ValidatedInput<T>> {
  return async (ctx, next) => {
    try {
      const validated = await transformAndValidate(
        classType,
        ctx.request.body,
        {
          transformer: { excludeExtraneousValues: true },
        },
      );

      const { state } = ctx;
      if (Array.isArray(validated)) {
        state.input = validated[0];
        state.inputs = validated;
      } else {
        state.input = validated;
        state.inputs = [validated];
      }
    } catch (validationErrors) {
      if (
        !(Array.isArray(validationErrors)
          ? validationErrors.every(e => e instanceof ValidationError)
          : validationErrors instanceof ValidationError)
      ) {
        throw validationErrors;
      }

      ctx.throw(400, { validationErrors });
    }

    try {
      await next();
    } catch (err) {
      const validationError = err as Error;
      if (validationError.name !== 'ValidationError') {
        throw validationError;
      }

      ctx.throw(400, { validationError });
    }
  };
}

export async function mongoServerError11000ToHttp409(
  ctx: Koa.Context,
  next: Koa.Next,
) {
  try {
    await next();
  } catch (error) {
    const err = error as Error & { code: number };
    if (err.name === 'MongoServerError' && err.code === 11000) {
      ctx.throw(409, { error });
    }
    throw error;
  }
}
