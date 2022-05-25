import { ClassType, transformAndValidate } from 'class-transformer-validator';
import { ValidationError } from 'class-validator';
import Koa from 'koa';
import Container from 'typedi';

import { UserDocument } from '../models';
import UserService from '../services/UserService';

export type ApiContext<
  Input = unknown,
  Output = unknown,
> = Koa.ParameterizedContext<
  MiddlewareState<Input>,
  Koa.DefaultContext,
  Output
>;

interface MiddlewareState<T> extends Koa.DefaultState {
  user?: UserDocument;
  input?: T;
  inputs?: T[];
}

export async function authenticate(ctx: ApiContext, next: Koa.Next) {
  const userService = Container.get(UserService);
  ctx.state.user = await userService.authenticate(ctx);
  return next();
}

export function inputValidator<T extends object>(
  classType: ClassType<T>,
  statusCode = 400,
): Koa.Middleware<MiddlewareState<T>> {
  return async (ctx, next) => {
    const {
      // path,
      request: { body },
      params,
    } = ctx;
    const input = { ...(body ?? {}), ...(params ?? {}) };
    // logger.debug('inputValidator', { path, body, params, input });

    try {
      const validated = await transformAndValidate(classType, input, {
        transformer: { excludeExtraneousValues: true },
      });

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

      ctx.throw(statusCode, { validationErrors });
    }

    try {
      await next();
    } catch (err) {
      const validationError = err as Error;
      if (validationError.name !== 'ValidationError') {
        throw validationError;
      }

      ctx.throw(statusCode, { validationError });
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
