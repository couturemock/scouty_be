import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEmail,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
  MinLength,
} from 'class-validator';

export class ReserveWaitlistDto {
  @IsString()
  @MinLength(2)
  name!: string;

  @IsEmail()
  email!: string;

  @IsOptional()
  @IsString()
  source?: string;
}

export class UpdateSettingsDto {
  @IsOptional()
  @IsBoolean()
  registrationOpen?: boolean;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(168)
  accessWindowHours?: number;
}

export class ReleaseSeatsDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  count!: number;
}
