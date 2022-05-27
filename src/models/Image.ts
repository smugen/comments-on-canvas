import {
  DocumentType,
  ReturnModelType,
  defaultClasses,
  index,
  modelOptions,
  prop,
} from '@typegoose/typegoose';
import mongoose from 'mongoose';
import Container from 'typedi';

import MongooseDatabase from '../services/MongooseDatabase';

export type ImageDocument = DocumentType<Image>;
export type ImageModel = ReturnModelType<typeof Image>;

const EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif'];

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface Image extends defaultClasses.Base {}

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
export class Image extends defaultClasses.TimeStamps {
  /** uploader */
  @prop({
    required: true,
    index: true,
    validate: async function (this: ImageDocument, userId: typeof this.userId) {
      const db = Container.get(MongooseDatabase);
      return !!(await db.UserModel.exists({ _id: userId }));
    },
  })
  userId!: mongoose.Types.ObjectId;

  /** file extension */
  @prop({
    required: true,
    index: true,
    enum: EXTENSIONS,
  })
  extension!: string;

  @prop({
    required: true,
    default: 0,
    validate: Number.isInteger,
  })
  x!: number;

  @prop({
    required: true,
    default: 0,
    validate: Number.isInteger,
  })
  y!: number;
}
