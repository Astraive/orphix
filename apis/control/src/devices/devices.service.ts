import { Injectable, NotFoundException, BadRequestException } from "@nestjs/common";
import { eq, and, or } from "drizzle-orm";
import { DatabaseService } from "../database/database.service";
import { devices, trustedDevices } from "@orphix/database";

@Injectable()
export class DevicesService {
  constructor(private readonly db: DatabaseService) {}

  async register(userId: string, data: { deviceId: string; deviceType: string; deviceName: string; publicKey: string; platform?: string; appVersion?: string }) {
    const [device] = await (this.db.db as any)
      .insert(devices)
      .values({
        userId,
        deviceId: data.deviceId,
        deviceType: data.deviceType,
        deviceName: data.deviceName,
        publicKey: data.publicKey,
        platform: data.platform ?? null,
        appVersion: data.appVersion ?? null,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: devices.deviceId,
        set: {
          deviceName: data.deviceName,
          publicKey: data.publicKey,
          platform: data.platform ?? null,
          appVersion: data.appVersion ?? null,
          lastSeenAt: new Date(),
        },
      })
      .returning();

    return device;
  }

  async listByUser(userId: string) {
    return (this.db.db as any).select().from(devices).where(eq(devices.userId, userId));
  }

  async trustDevice(userId: string, desktopDeviceId: string, mobileDeviceId: string, trustLevel: string) {
    // Verify both devices belong to user
    const desktop = await this.findByDeviceId(userId, desktopDeviceId);
    const mobile = await this.findByDeviceId(userId, mobileDeviceId);

    if (desktop.deviceType !== "desktop") throw new BadRequestException("First device must be desktop");
    if (mobile.deviceType !== "mobile") throw new BadRequestException("Second device must be mobile");

    const [trust] = await (this.db.db as any)
      .insert(trustedDevices)
      .values({ userId, desktopDeviceId, mobileDeviceId, trustLevel })
      .onConflictDoUpdate({
        target: [trustedDevices.desktopDeviceId, trustedDevices.mobileDeviceId],
        set: { trustLevel, revokedAt: null },
      })
      .returning();

    // Update device statuses
    await (this.db.db as any).update(devices).set({ status: "trusted" }).where(eq(devices.deviceId, mobileDeviceId));

    return trust;
  }

  async revokeDevice(userId: string, deviceId: string) {
    await this.findByDeviceId(userId, deviceId);
    await (this.db.db as any).update(devices).set({ status: "revoked" }).where(eq(devices.deviceId, deviceId));
    await (this.db.db as any)
      .update(trustedDevices)
      .set({ revokedAt: new Date() })
      .where(
        and(
          eq(trustedDevices.userId, userId),
          // Revoke where this device is either the desktop or mobile side of the trust
          or(
            eq(trustedDevices.desktopDeviceId, deviceId),
            eq(trustedDevices.mobileDeviceId, deviceId),
          ),
        ),
      );
    return { success: true };
  }

  private async findByDeviceId(userId: string, deviceId: string) {
    const [device] = await (this.db.db as any)
      .select()
      .from(devices)
      .where(and(eq(devices.userId, userId), eq(devices.deviceId, deviceId)))
      .limit(1);
    if (!device) throw new NotFoundException(`Device ${deviceId} not found`);
    return device;
  }
}
