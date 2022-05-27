import {
  DocumentType,
  ReturnModelType,
  defaultClasses,
  index,
  modelOptions,
  mongoose,
  pre,
  prop,
} from '@typegoose/typegoose';
import Container from 'typedi';

import MongooseDatabase from '../services/MongooseDatabase';

export type MarkerDocument = DocumentType<Marker>;
export type MarkerModel = ReturnModelType<typeof Marker>;

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Marker extends defaultClasses.Base {}

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
@pre<Marker>('remove', removeComments, { document: true })
export class Marker extends defaultClasses.TimeStamps {
  /** placed on */
  @prop({
    required: false,
    index: true,
    sparse: true,
    validate: async function (
      this: MarkerDocument,
      imageId: typeof this.imageId,
    ) {
      const db = Container.get(MongooseDatabase);
      return !!(await db.ImageModel.exists({ _id: imageId }));
    },
  })
  imageId?: mongoose.Types.ObjectId;

  @prop({
    required: true,
    default: 0,
    min: 0,
    validate: Number.isInteger,
  })
  x!: number;

  @prop({
    required: true,
    default: 0,
    min: 0,
    validate: Number.isInteger,
  })
  y!: number;
}

/** @this MarkerDocument */
async function removeComments(this: MarkerDocument) {
  const db = Container.get(MongooseDatabase);
  const comments = await db.CommentModel.find({ markerId: this._id });
  await Promise.all(comments.map(c => c.remove()));
}
