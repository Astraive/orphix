// Track linked mobile/web devices per desktop (desktopDeviceId → Set<mobileDeviceId>)
const linkedDevices = new Map<string, Set<string>>();

export function addLinkedDevice(desktopDeviceId: string, mobileDeviceId: string) {
  if (!linkedDevices.has(desktopDeviceId)) linkedDevices.set(desktopDeviceId, new Set());
  linkedDevices.get(desktopDeviceId)!.add(mobileDeviceId);
}

export function removeLinkedDevice(desktopDeviceId: string, mobileDeviceId: string) {
  linkedDevices.get(desktopDeviceId)?.delete(mobileDeviceId);
}

export function getLinkedDevices(desktopDeviceId: string): Set<string> {
  return linkedDevices.get(desktopDeviceId) ?? new Set();
}

export function clearLinkedDevices(desktopDeviceId: string) {
  linkedDevices.delete(desktopDeviceId);
}
