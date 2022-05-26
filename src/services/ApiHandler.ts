import Router from '@koa/router';
import Koa from 'koa';
import koaBody from 'koa-body';
import { Inject, Service } from 'typedi';

import {
  ApiContext,
  authenticate,
  inputValidator,
  mongoServerError11000ToHttp409,
} from '../helpers/apiMiddleware';
import AddImageInput from '../types/AddImageInput';
import AddImageOutput from '../types/AddImageOutput';
import AddUserInput from '../types/AddUserInput';
import AddUserOutput from '../types/AddUserOutput';
import GetImageInput from '../types/GetImageInput';
import GetImageOutput from '../types/GetImageOutput';
import ListImageOutput from '../types/ListImageOutput';
import SignInError from '../types/SignInError';
import SignInInput from '../types/SignInInput';
import SignInOutput from '../types/SignInOutput';
import UpdateImageInput from '../types/UpdateImageInput';
import UpdateImageOutput from '../types/UpdateImageOutput';
import { SERVE_UPLOAD_PATH } from './HttpApp';
import ImageService from './ImageService';
import UserService from './UserService';

@Service()
export default class ApiHandler {
  private readonly bodyParser = koaBody();

  constructor(
    @Inject(() => UserService)
    private readonly userService: UserService,
    @Inject(() => ImageService)
    private readonly imageService: ImageService,
  ) {}

  register(api: Koa) {
    api.use(this.meRouter.routes()).use(this.meRouter.allowedMethods());
    api.use(this.userRouter.routes()).use(this.userRouter.allowedMethods());
    api.use(this.imageRouter.routes()).use(this.imageRouter.allowedMethods());
  }

  /** `/Me` */
  private readonly meRouter = new Router()
    .prefix('/Me')
    .get('/', authenticate(), this.getMe.bind(this))
    .put(
      '/',
      this.bodyParser,
      inputValidator(SignInInput),
      this.putMe.bind(this),
    )
    .del('/', this.delMe.bind(this));

  private async getMe(ctx: ApiContext) {
    ctx.body = { user: ctx.state.user };
  }

  private async putMe(ctx: ApiContext<SignInInput, SignInOutput>) {
    const { input } = ctx.state;
    ctx.assert(input, 400);

    try {
      ctx.body = await this.userService.signIn(input, ctx);
    } catch (error) {
      if (!(error instanceof SignInError)) {
        throw error;
      }
      ctx.throw(401, error);
    }
  }

  private delMe(ctx: ApiContext) {
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
    const { input } = ctx.state;
    ctx.assert(input, 400);
    ctx.body = await this.userService.addUser(input);
    ctx.status = 201;
  }

  /** `/Image` */
  private readonly imageRouter = new Router()
    .prefix('/Image')
    .get('/', authenticate(), this.listImage.bind(this))
    .post(
      '/',
      authenticate(),
      this.bodyParser,
      inputValidator(AddImageInput),
      this.addImage.bind(this),
    )
    .get(
      '/:id',
      authenticate(),
      inputValidator(GetImageInput, 404),
      this.getImage.bind(this),
    )
    .patch(
      '/:id',
      authenticate(),
      this.bodyParser,
      inputValidator(UpdateImageInput),
      this.updateImage.bind(this),
    )
    .put(
      '/:id/blob',
      authenticate(),
      inputValidator(GetImageInput, 404),
      this.putImage.bind(this),
    );

  private async listImage(ctx: ApiContext<void, ListImageOutput>) {
    ctx.body = await this.imageService.listImage();
  }

  private async addImage(ctx: ApiContext<AddImageInput, AddImageOutput>) {
    const { user } = ctx.state;
    ctx.assert(user, 401);
    const { input } = ctx.state;
    ctx.assert(input, 400);
    ctx.body = await this.imageService.addImage(input, user);
    ctx.status = 201;
  }

  private async getImage(ctx: ApiContext<GetImageInput, GetImageOutput>) {
    const { input } = ctx.state;
    ctx.assert(input, 404);
    const image = await this.imageService.getImage(input);
    ctx.assert(image, 404);
    ctx.body = { image };
  }

  private async updateImage(
    ctx: ApiContext<UpdateImageInput, UpdateImageOutput>,
  ) {
    const { input } = ctx.state;
    ctx.assert(input, 400);
    const image = await this.imageService.getImage(input);
    ctx.assert(image, 404);
    ctx.body = await this.imageService.updateImage(input, image);
  }

  private async putImage(ctx: ApiContext<GetImageInput>) {
    const { user } = ctx.state;
    ctx.assert(user, 401);
    const { input } = ctx.state;
    ctx.assert(input, 404);
    const image = await this.imageService.getImage(input);
    ctx.assert(image, 404);
    ctx.assert(image.userId.equals(user._id), 403);
    const name = await this.imageService.putImageBlob(image, ctx);
    ctx.redirect([SERVE_UPLOAD_PATH, name].join('/'));
  }
}
