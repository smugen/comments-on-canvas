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
import SignInError from '../types/SignInError';
import SignInInput from '../types/SignInInput';
import SignInOutput from '../types/SignInOutput';
import UserService from './UserService';

@Service()
export default class ApiHandler {
  private readonly bodyParser = koaBody();

  constructor(
    @Inject(() => UserService)
    private readonly userService: UserService,
  ) {}

  register(api: Koa) {
    api.use(this.meRouter.routes()).use(this.meRouter.allowedMethods());
    api.use(this.userRouter.routes()).use(this.userRouter.allowedMethods());
  }

  /** `/Me` */
  private readonly meRouter = new Router()
    .prefix('/Me')
    .get('/', this.getMe.bind(this))
    .put(
      '/',
      this.bodyParser,
      inputValidator(SignInInput),
      this.putMe.bind(this),
    )
    .del('/', this.delMe.bind(this));

  private async getMe(ctx: Koa.Context) {
    const user = await this.userService.authenticate(ctx);
    if (!user) {
      ctx.throw(401);
    }
    ctx.body = { user };
  }

  private async putMe(ctx: ApiContext<SignInInput, SignInOutput>) {
    try {
      ctx.body = await this.userService.signIn(ctx.state.input, ctx);
    } catch (error) {
      if (!(error instanceof SignInError)) {
        throw error;
      }
      ctx.throw(401, error);
    }
  }

  private delMe(ctx: Koa.Context) {
    this.userService.signOut(ctx);
    ctx.status = 205;
  }

  /** `/User` */
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
    ctx.body = await this.userService.addUser(ctx.state.input);
    ctx.status = 201;
  }
}
