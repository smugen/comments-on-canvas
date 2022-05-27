import { Expose } from 'class-transformer';
import { IsMongoId } from 'class-validator';

import GetMarkerInput from './GetMarkerInput';

export default class GetCommentInput extends GetMarkerInput {
  @Expose()
  @IsMongoId()
  readonly commentId!: string;
}
