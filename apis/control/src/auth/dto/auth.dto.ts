import { IsString, IsOptional, IsUrl, MaxLength } from "class-validator";

export class GithubAuthDto {
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  redirectUri?: string;
}

export class GithubExchangeDto {
  @IsString()
  @MaxLength(512)
  code!: string;

  @IsString()
  @MaxLength(256)
  state!: string;
}

export class RefreshTokenDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  refresh_token?: string;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  refreshToken?: string;
}
