import { Inject, Service } from 'typedi';

import { CommentDocument, MarkerDocument, UserDocument } from '../models';
import AddCommentInput from '../types/AddCommentInput';
import AddCommentOutput from '../types/AddCommentOutput';
import AddMarkerInput from '../types/AddMarkerInput';
import AddMarkerOutput from '../types/AddMarkerOutput';
import GetCommentInput from '../types/GetCommentInput';
import GetMarkerInput from '../types/GetMarkerInput';
import ListCommentOutput from '../types/ListCommentOutput';
import ListMarkerOutput from '../types/ListMarkerOutput';
import UpdateMarkerInput from '../types/UpdateMarkerInput';
import UpdateMarkerOutput from '../types/UpdateMarkerOutput';
import MongooseDatabase from './MongooseDatabase';

@Service()
export default class MarkerCommentService {
  constructor(
    @Inject(() => MongooseDatabase)
    private readonly db: MongooseDatabase,
  ) {}

  async listMarker(): Promise<ListMarkerOutput> {
    const markers = await this.db.MarkerModel.find();
    return { markers };
  }

  async addMarker(
    { imageId, x, y, text }: AddMarkerInput,
    user: UserDocument,
  ): Promise<AddMarkerOutput> {
    const marker = await this.db.MarkerModel.create({ imageId, x, y });
    const comment = await this.db.CommentModel.create({
      userId: user._id,
      markerId: marker._id,
      text,
    });
    return { marker, comment };
  }

  getMarker({ markerId }: GetMarkerInput): Promise<MarkerDocument | null> {
    return this.db.MarkerModel.findById(markerId).exec();
  }

  async updateMarker(
    { x, y }: UpdateMarkerInput,
    marker: MarkerDocument,
  ): Promise<UpdateMarkerOutput> {
    if (typeof x === 'number') {
      marker.x = x;
    }
    if (typeof y === 'number') {
      marker.y = y;
    }

    await marker.save();
    return { marker };
  }

  async deleteMarker(marker: MarkerDocument): Promise<void> {
    await marker.remove();
  }

  async listComment(marker: MarkerDocument): Promise<ListCommentOutput> {
    const comments = await this.db.CommentModel.find({
      markerId: marker._id,
    }).sort({ createdAt: 1 });
    return { comments };
  }

  async addComment(
    { text }: AddCommentInput,
    user: UserDocument,
    marker: MarkerDocument,
  ): Promise<AddCommentOutput> {
    const comment = await this.db.CommentModel.create({
      userId: user._id,
      markerId: marker._id,
      text,
    });
    return { comment };
  }

  getComment(
    { commentId }: GetCommentInput,
    marker: MarkerDocument,
  ): Promise<CommentDocument | null> {
    return this.db.CommentModel.findOne({
      _id: commentId,
      markerId: marker._id,
    }).exec();
  }

  async deleteComment(comment: CommentDocument): Promise<void> {
    await comment.remove();
  }
}
