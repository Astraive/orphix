import { Controller, Get, Post, Body, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { UsersService } from "./users.service";

@Controller("me")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @UseGuards(AuthGuard)
  async getMe(@Req() req: any) {
    return this.usersService.findById(req.user.id);
  }

  @Get("devices")
  @UseGuards(AuthGuard)
  async getMyDevices(@Req() req: any) {
    return this.usersService.getUserDevices(req.user.id);
  }

  @Get("link-settings")
  @UseGuards(AuthGuard)
  async getLinkSettings(@Req() req: any) {
    return this.usersService.getLinkSettings(req.user.id);
  }

  @Post("link-settings")
  @UseGuards(AuthGuard)
  async updateLinkSettings(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.usersService.updateLinkSettings(req.user.id, body);
  }
}
