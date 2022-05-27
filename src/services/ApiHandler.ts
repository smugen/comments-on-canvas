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
import AddCommentInput from '../types/AddCommentInput';
import AddCommentOutput from '../types/AddCommentOutput';
import AddImageInput from '../types/AddImageInput';
import AddImageOutput from '../types/AddImageOutput';
import AddMarkerInput from '../types/AddMarkerInput';
import AddMarkerOutput from '../types/AddMarkerOutput';
import AddUserInput from '../types/AddUserInput';
import AddUserOutput from '../types/AddUserOutput';
import GetCommentInput from '../types/GetCommentInput';
import GetImageInput from '../types/GetImageInput';
import GetImageOutput from '../types/GetImageOutput';
import GetMarkerInput from '../types/GetMarkerInput';
import GetMarkerOutput from '../types/GetMarkerOutput';
import ListCommentOutput from '../types/ListCommentOutput';
import ListImageOutput from '../types/ListImageOutput';
import ListMarkerOutput from '../types/ListMarkerOutput';
import SignInError from '../types/SignInError';
import SignInInput from '../types/SignInInput';
import SignInOutput from '../types/SignInOutput';
import UpdateImageInput from '../types/UpdateImageInput';
import UpdateImageOutput from '../types/UpdateImageOutput';
import UpdateMarkerInput from '../types/UpdateMarkerInput';
import UpdateMarkerOutput from '../types/UpdateMarkerOutput';
import { SERVE_UPLOAD_PATH } from './HttpApp';
import ImageService from './ImageService';
import MarkerCommentService from './MarkerCommentService';
import UserService from './UserService';

@Service()
export default class ApiHandler {
  private readonly bodyParser = koaBody();

  constructor(
    @Inject(() => UserService)
    private readonly userService: UserService,
    @Inject(() => ImageService)
    private readonly imageService: ImageService,
    @Inject(() => MarkerCommentService)
    private readonly markerCommentService: MarkerCommentService,
  ) {}

  register(api: Koa) {
    api.use(this.meRouter.routes()).use(this.meRouter.allowedMethods());
    api.use(this.userRouter.routes()).use(this.userRouter.allowedMethods());
    api.use(this.imageRouter.routes()).use(this.imageRouter.allowedMethods());
    api.use(this.markerRouter.routes()).use(this.markerRouter.allowedMethods());
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

  /** `/Marker` */
  private readonly markerRouter = new Router()
    .prefix('/Marker')
    .get('/', authenticate(), this.listMarker.bind(this))
    .post(
      '/',
      authenticate(),
      this.bodyParser,
      inputValidator(AddMarkerInput),
      this.addMarker.bind(this),
    )
    .get(
      '/:markerId',
      authenticate(),
      inputValidator(GetMarkerInput, 404),
      this.getMarker.bind(this),
    )
    .patch(
      '/:markerId',
      authenticate(),
      this.bodyParser,
      inputValidator(UpdateMarkerInput),
      this.updateMarker.bind(this),
    )
    .del(
      '/:markerId',
      authenticate(),
      inputValidator(GetMarkerInput, 404),
      this.delMarker.bind(this),
    )
    /** Comment */
    .get(
      '/:markerId/Comment',
      authenticate(),
      inputValidator(GetMarkerInput, 404),
      this.listComment.bind(this),
    )
    .post(
      '/:markerId/Comment',
      authenticate(),
      this.bodyParser,
      inputValidator(AddCommentInput),
      this.addComment.bind(this),
    )
    .del(
      '/:markerId/Comment/:commentId',
      authenticate(),
      inputValidator(GetCommentInput, 404),
      this.delComment.bind(this),
    );

  private async listMarker(ctx: ApiContext<void, ListMarkerOutput>) {
    ctx.body = await this.markerCommentService.listMarker();
  }

  private async addMarker(ctx: ApiContext<AddMarkerInput, AddMarkerOutput>) {
    const { user } = ctx.state;
    ctx.assert(user, 401);
    const { input } = ctx.state;
    ctx.assert(input, 400);
    ctx.body = await this.markerCommentService.addMarker(input, user);
    ctx.status = 201;
  }

  private async getMarker(ctx: ApiContext<GetMarkerInput, GetMarkerOutput>) {
    const { input } = ctx.state;
    ctx.assert(input, 404);
    const marker = await this.markerCommentService.getMarker(input);
    ctx.assert(marker, 404);
    ctx.body = { marker };
  }

  private async updateMarker(
    ctx: ApiContext<UpdateMarkerInput, UpdateMarkerOutput>,
  ) {
    const { input } = ctx.state;
    ctx.assert(input, 400);
    const marker = await this.markerCommentService.getMarker(input);
    ctx.assert(marker, 404);
    ctx.body = await this.markerCommentService.updateMarker(input, marker);
  }

  private async delMarker(ctx: ApiContext<GetMarkerInput, void>) {
    const { input } = ctx.state;
    ctx.assert(input, 404);
    const marker = await this.markerCommentService.getMarker(input);
    ctx.assert(marker, 404);
    await this.markerCommentService.deleteMarker(marker);
    ctx.status = 204;
  }

  private async listComment(
    ctx: ApiContext<GetMarkerInput, ListCommentOutput>,
  ) {
    const { input } = ctx.state;
    ctx.assert(input, 404);
    const marker = await this.markerCommentService.getMarker(input);
    ctx.assert(marker, 404);
    ctx.body = await this.markerCommentService.listComment(marker);
  }

  private async addComment(ctx: ApiContext<AddCommentInput, AddCommentOutput>) {
    const { user } = ctx.state;
    ctx.assert(user, 401);
    const { input } = ctx.state;
    ctx.assert(input, 400);
    const marker = await this.markerCommentService.getMarker(input);
    ctx.assert(marker, 404);
    ctx.body = await this.markerCommentService.addComment(input, user, marker);
    ctx.status = 201;
  }

  private async delComment(ctx: ApiContext<GetCommentInput, void>) {
    const { input } = ctx.state;
    ctx.assert(input, 404);
    const marker = await this.markerCommentService.getMarker(input);
    ctx.assert(marker, 404);
    const comment = await this.markerCommentService.getComment(input, marker);
    ctx.assert(comment, 404);
    await this.markerCommentService.deleteComment(comment);
    ctx.status = 204;
  }
}
