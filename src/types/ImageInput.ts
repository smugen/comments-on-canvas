import { Expose } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';

export default class ImageInput {
  @Expose()
  @IsOptional()
  @IsInt()
  x?: number;

  @Expose()
  @IsOptional()
  @IsInt()
  y?: number;
}
