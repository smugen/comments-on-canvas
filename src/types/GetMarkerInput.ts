import { Expose } from 'class-transformer';
import { IsMongoId } from 'class-validator';

export default class GetMarkerInput {
  @Expose()
  @IsMongoId()
  readonly markerId!: string;
}
