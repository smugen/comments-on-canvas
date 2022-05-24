import { resolve } from 'path';

import Router from '@koa/router';
import { transformAndValidateSync } from 'class-transformer-validator';
import Koa from 'koa';
import koaBody from 'koa-body';
import koaFavicon from 'koa-favicon';
import koaLogger from 'koa-logger';
import mount from 'koa-mount';
import { Inject, Service } from 'typedi';

import logger from '../logger';
import PackageJson from '../types/PackageJson';
import ApiHandler from './ApiHandler';
import { NodeEnv } from './AppEnv';
import MongooseDatabase from './MongooseDatabase';

declare global {
  interface Error {
    status?: number;
  }
}

const API_PATH = '/api';

@Service()
export default class HttpApp {
  private readonly initApp = new Koa();
  private app?: Koa;
  private readonly packageJson = transformAndValidateSync(
    PackageJson,
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('../../package.json'),
    { transformer: { excludeExtraneousValues: true } },
  ) as PackageJson;

  constructor(
    @Inject(() => MongooseDatabase)
    private readonly db: MongooseDatabase,
    @Inject(() => ApiHandler)
    private readonly apiHandler: ApiHandler,
  ) {}

  private async apiInfo(ctx: Koa.Context) {
    const { conn } = this.db;
    const mongodbDb =
      conn.db ??
      (await new Promise((resolve, reject) => {
        const resolveDb = () => resolve(conn.db);
        conn
          .once('error', reject)
          .once('connected', resolveDb)
          .once('reconnected', resolveDb);
      }));

    const mongoVersion = (await mongodbDb.command({ buildInfo: 1 })).version;

    ctx.body = {
      ...this.packageJson,
      mongoVersion,
      requestBody: ctx.request.body,
    };
  }

  private api(): Koa.Middleware {
    const api = new Koa();
    const router = new Router();
    const bodyParser = koaBody();
    const apiInfo = this.apiInfo.bind(this);

    router
      .get('/', apiInfo)
      .put('/', bodyParser, apiInfo)
      .post('/', bodyParser, apiInfo)
      .patch('/', bodyParser, apiInfo);

    api.use(router.routes()).use(router.allowedMethods());
    this.apiHandler.register(api);

    return mount(API_PATH, api);
  }

  getKoa(): Koa {
    if (this.app) {
      return this.app;
    }

    const app = this.initApp
      .on('error', (err, ctx) => logger.error('#app error', { err, ctx }))
      .use(async (ctx, next) => {
        try {
          await next();
        } catch (error) {
          const err = error as Error;
          ctx.status = err.status ??= 500;
          if (err.status >= 500) {
            logger.error('#app error', { err });
          }
          if (NodeEnv.Production === app.env) {
            delete err.stack;
          }
          ctx.body = err;
        }
      })
      .use(koaFavicon(resolve(__dirname, '../../public/favicon.png')))
      .use(koaLogger(str => logger.http(str, { module: 'app' })))
      .use(this.api())
      .use(ctx => ctx.throw(404));

    return (this.app = app);
  }
}
