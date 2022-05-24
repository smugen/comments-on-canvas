import Router from '@koa/router';
import Koa from 'koa';
import koaBody from 'koa-body';
import { Inject, Service } from 'typedi';

import {
  ApiContext,
  inputValidator,
  mongoServerError11000ToHttp409,
} from '../helpers/apiMiddleware';
import AddUserInput from '../types/AddUserInput';
import AddUserOutput from '../types/AddUserOutput';
import MongooseDatabase from './MongooseDatabase';

@Service()
export default class ApiHandler {
  private readonly bodyParser = koaBody();

  constructor(
    @Inject(() => MongooseDatabase)
    private readonly db: MongooseDatabase,
  ) {
    this.db;
  }

  register(api: Koa) {
    api.use(this.meRouter.routes()).use(this.meRouter.allowedMethods());
    api.use(this.userRouter.routes()).use(this.userRouter.allowedMethods());
  }

  private readonly meRouter = new Router()
    .prefix('/Me')
    .get('/', this.getMe.bind(this));

  private async getMe(ctx: Koa.Context) {
    ctx.body = { hello: 'John' };
  }

  private readonly userRouter = new Router()
    .prefix('/User')
    .post(
      '/',
      this.bodyParser,
      inputValidator(AddUserInput),
      mongoServerError11000ToHttp409,
      this.addUser.bind(this),
    );

  private async addUser(ctx: ApiContext<AddUserInput, AddUserOutput>) {
    const { User } = this.db.models;
    const { input } = ctx.state;
    const { name, username, password } = Array.isArray(input)
      ? input[0]
      : input;

    const user = await (
      await new User({ name, username }).setPassword(password)
    ).save();

    ctx.body = { user, password };
  }
}
