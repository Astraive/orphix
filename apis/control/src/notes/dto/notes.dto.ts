import { IsString, IsOptional, IsBoolean, MaxLength } from "class-validator";

export class CreateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(256)
  workspaceId?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;
}

export class UpdateNoteDto {
  @IsOptional()
  @IsString()
  @MaxLength(512)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  content?: string;

  @IsOptional()
  @IsBoolean()
  syncEnabled?: boolean;
}
