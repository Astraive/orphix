import { Controller, Get, Post, Body, Param, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { DevicesService } from "./devices.service";
import { RegisterDeviceDto, TrustDeviceDto } from "./dto/devices.dto";

@Controller("devices")
export class DevicesController {
  constructor(private readonly devicesService: DevicesService) {}

  @Post("register")
  @UseGuards(AuthGuard)
  async register(@Req() req: any, @Body() dto: RegisterDeviceDto) {
    return this.devicesService.register(req.user.id, dto);
  }

  @Get()
  @UseGuards(AuthGuard)
  async list(@Req() req: any) {
    return this.devicesService.listByUser(req.user.id);
  }

  @Post(":id/trust")
  @UseGuards(AuthGuard)
  async trust(@Req() req: any, @Param("id") deviceId: string, @Body() dto: TrustDeviceDto) {
    return this.devicesService.trustDevice(req.user.id, deviceId, dto.targetDeviceId, dto.trustLevel);
  }

  @Post(":id/revoke")
  @UseGuards(AuthGuard)
  async revoke(@Req() req: any, @Param("id") deviceId: string) {
    return this.devicesService.revokeDevice(req.user.id, deviceId);
  }
}
