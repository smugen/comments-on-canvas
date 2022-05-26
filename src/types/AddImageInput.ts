import { Expose } from 'class-transformer';
import { IsString } from 'class-validator';

import ImageInput from './ImageInput';

export default class AddImageInput extends ImageInput {
  @Expose()
  @IsString()
  extension!: string;
}
