import { Expose } from 'class-transformer';
import { IsString, MinLength } from 'class-validator';

import GetMarkerInput from './GetMarkerInput';

export default class AddCommentInput extends GetMarkerInput {
  @Expose()
  @IsString()
  @MinLength(1)
  readonly text!: string;
}
