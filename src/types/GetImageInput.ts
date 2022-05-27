import { Expose } from 'class-transformer';
import { IsMongoId } from 'class-validator';

export default class GetImageInput {
  @Expose()
  @IsMongoId()
  readonly id!: string;
}
