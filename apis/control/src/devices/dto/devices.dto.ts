import { IsString, IsOptional, MaxLength, IsIn } from "class-validator";

export class RegisterDeviceDto {
  @IsString()
  @MaxLength(256)
  deviceId!: string;

  @IsString()
  @IsIn(["desktop", "mobile", "web"])
  deviceType!: string;

  @IsString()
  @MaxLength(256)
  deviceName!: string;

  @IsString()
  @MaxLength(1024)
  publicKey!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  platform?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}

export class TrustDeviceDto {
  @IsString()
  @MaxLength(256)
  targetDeviceId!: string;

  @IsString()
  @IsIn(["view_only", "approve_only", "full_control"])
  trustLevel!: string;
}
