import { Expose } from 'class-transformer';
import { IsMongoId } from 'class-validator';

import GetImageInput from './GetImageInput';
import ImageInput from './ImageInput';

export default class UpdateImageInput
  extends ImageInput
  implements GetImageInput
{
  @Expose()
  @IsMongoId()
  readonly id!: string;
}
