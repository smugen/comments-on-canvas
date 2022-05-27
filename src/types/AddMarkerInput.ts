import { Expose } from 'class-transformer';
import { IsMongoId, IsOptional, IsString, MinLength } from 'class-validator';

import ImageInput from './ImageInput';

export default class AddMarkerInput extends ImageInput {
  @Expose()
  @IsOptional()
  @IsMongoId()
  readonly imageId?: string;

  @Expose()
  @IsString()
  @MinLength(1)
  readonly text!: string;
}
