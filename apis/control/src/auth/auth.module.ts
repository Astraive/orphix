import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { GithubService } from "./github.service";
import { PkceService } from "./pkce.service";
import { AuthGuard } from "./auth.guard";

@Module({
  controllers: [AuthController],
  providers: [AuthService, GithubService, PkceService, AuthGuard],
  exports: [AuthGuard, AuthService],
})
export class AuthModule {}
