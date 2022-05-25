import { createWriteStream } from 'fs';
import { resolve } from 'path';

import Koa from 'koa';
import { Inject, Service } from 'typedi';

import { ImageDocument, UserDocument } from '../models';
import AddImageInput from '../types/AddImageInput';
import AddImageOutput from '../types/AddImageOutput';
import GetImageInput from '../types/GetImageInput';
import ListImageOutput from '../types/ListImageOutput';
import MongooseDatabase from './MongooseDatabase';

@Service()
export default class ImageService {
  static uploadPath = resolve(__dirname, '../../upload');

  constructor(
    @Inject(() => MongooseDatabase)
    private readonly db: MongooseDatabase,
  ) {}

  async listImage(): Promise<ListImageOutput> {
    const images = await this.db.ImageModel.find();
    return { images };
  }

  async addImage(
    { extension, x, y }: AddImageInput,
    user: UserDocument,
  ): Promise<AddImageOutput> {
    const image = await this.db.ImageModel.create({
      userId: user._id,
      extension,
      x,
      y,
    });
    return { image };
  }

  getImage({ id }: GetImageInput): Promise<ImageDocument | null> {
    return this.db.ImageModel.findById(id).exec();
  }

  putImageBlob({ id, extension }: ImageDocument, ctx: Koa.Context) {
    const name = `${id}.${extension}`;
    const target = createWriteStream(resolve(ImageService.uploadPath, name));
    return new Promise<string>((res, rej) =>
      ctx.req
        .pipe(target)
        .on('finish', () => res(name))
        .on('error', rej),
    );
  }
}
