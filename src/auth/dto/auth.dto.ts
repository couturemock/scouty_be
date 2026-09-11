import { IsEmail, IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import { AMAZON_MARKETS } from '../../common/amazon-markets';

const MARKET_CODES = AMAZON_MARKETS.map((m) => m.code);

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @MinLength(2)
  name!: string;

  @IsOptional()
  @IsIn(['basic', 'pro'])
  plan?: 'basic' | 'pro';

  @IsOptional()
  @IsIn(MARKET_CODES)
  targetMarket?: string;

  /** Invite token from waitlist access email. */
  @IsOptional()
  @IsString()
  invite?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class VerifyEmailDto {
  @IsString()
  token!: string;
}
