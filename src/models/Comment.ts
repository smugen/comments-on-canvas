import {
  DocumentType,
  ReturnModelType,
  defaultClasses,
  index,
  modelOptions,
  mongoose,
  post,
  prop,
} from '@typegoose/typegoose';
import Container from 'typedi';

import MongooseDatabase from '../services/MongooseDatabase';

export type CommentDocument = DocumentType<Comment>;
export type CommentModel = ReturnModelType<typeof Comment>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Comment extends defaultClasses.Base {}

@modelOptions({
  schemaOptions: {
    versionKey: false,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        delete ret._id;
        return ret;
      },
    },
    timestamps: {
      createdAt: true,
      updatedAt: true,
    },
  },
})
@index({ createdAt: 1 })
@index({ updatedAt: 1 })
@post<Comment>('remove', removeMarker, { document: true })
export class Comment extends defaultClasses.TimeStamps {
  /** commenter */
  @prop({
    required: true,
    index: true,
    validate: async function (
      this: CommentDocument,
      userId: typeof this.userId,
    ) {
      const db = Container.get(MongooseDatabase);
      return !!(await db.UserModel.exists({ _id: userId }));
    },
  })
  userId!: mongoose.Types.ObjectId;

  /** marker thread */
  @prop({
    required: true,
    index: true,
    validate: async function (
      this: CommentDocument,
      markerId: typeof this.markerId,
    ) {
      const db = Container.get(MongooseDatabase);
      return !!(await db.MarkerModel.exists({ _id: markerId }));
    },
  })
  markerId!: mongoose.Types.ObjectId;

  @prop({
    required: true,
    minlength: 1,
  })
  text!: string;
}

/** @this CommentDocument */
async function removeMarker(this: CommentDocument) {
  const db = Container.get(MongooseDatabase);
  const commentCount = await db.CommentModel.countDocuments({
    markerId: this.markerId,
  });
  if (commentCount === 0) {
    const marker = await db.MarkerModel.findById(this.markerId);
    if (marker) {
      await marker.remove();
    }
  }
}
