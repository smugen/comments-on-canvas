import { Expose } from 'class-transformer';
import { IsMongoId } from 'class-validator';

import GetMarkerInput from './GetMarkerInput';
import ImageInput from './ImageInput';

export default class UpdateMarkerInput
  extends ImageInput
  implements GetMarkerInput
{
  @Expose()
  @IsMongoId()
  readonly markerId!: string;
}
