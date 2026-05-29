import { ipcMain, BrowserWindow } from "electron";
import { CHANNELS } from "../../shared/ipc/channels";
import type { DockerManager } from "../docker/DockerManager";

export function registerDockerIpc(docker: DockerManager): void {
  // Forward log stream events to all renderer windows
  docker.on("log-stream", (data) => {
    for (const win of BrowserWindow.getAllWindows()) {
      win.webContents.send(CHANNELS.DOCKER_LOG_STREAM, data);
    }
  });

  ipcMain.handle(CHANNELS.DOCKER_PS, async () => {
    return docker.ps(false);
  });

  ipcMain.handle(CHANNELS.DOCKER_PS_ALL, async () => {
    return docker.ps(true);
  });

  ipcMain.handle(CHANNELS.DOCKER_START, async (_event, args: { id: string }) => {
    await docker.start(args.id);
    return { ok: true };
  });

  ipcMain.handle(CHANNELS.DOCKER_STOP, async (_event, args: { id: string }) => {
    await docker.stop(args.id);
    return { ok: true };
  });

  ipcMain.handle(CHANNELS.DOCKER_RESTART, async (_event, args: { id: string }) => {
    await docker.restart(args.id);
    return { ok: true };
  });

  ipcMain.handle(CHANNELS.DOCKER_REMOVE, async (_event, args: { id: string; force?: boolean }) => {
    await docker.remove(args.id, args.force);
    return { ok: true };
  });

  ipcMain.handle(CHANNELS.DOCKER_LOGS, async (_event, args: { id: string; tail?: number }) => {
    return docker.logs(args.id, args.tail);
  });

  ipcMain.handle(CHANNELS.DOCKER_LOGS_FOLLOW, async (_event, args: { id: string }) => {
    await docker.startLogStream(args.id);
    return { ok: true };
  });

  ipcMain.handle(CHANNELS.DOCKER_LOGS_STOP, async (_event, args: { id: string }) => {
    docker.stopLogStream(args.id);
    return { ok: true };
  });

  ipcMain.handle(CHANNELS.DOCKER_INSPECT, async (_event, args: { id: string }) => {
    return docker.inspect(args.id);
  });

  ipcMain.handle(CHANNELS.DOCKER_EXEC, async (_event, args: { id: string; cmd?: string }) => {
    return docker.exec(args.id, args.cmd);
  });

  ipcMain.handle(CHANNELS.DOCKER_IMAGES, async () => {
    return docker.images();
  });

  ipcMain.handle(CHANNELS.DOCKER_WORKSPACE_DISCOVER, async (_event, args: { cwd: string }) => {
    return docker.discoverWorkspace(args.cwd);
  });

  ipcMain.handle(CHANNELS.DOCKER_IMAGE_REMOVE, async (_event, args: { id: string; force?: boolean }) => {
    await docker.removeImage(args.id, args.force);
    return { ok: true };
  });

  ipcMain.handle(CHANNELS.DOCKER_BUILD, async (_event, args: { context: string; tag?: string; dockerfile?: string }) => {
    return docker.build(args.context, args.tag, args.dockerfile);
  });

  ipcMain.handle(CHANNELS.DOCKER_PULL, async (_event, args: { image: string }) => {
    return docker.pull(args.image);
  });

  ipcMain.handle(CHANNELS.DOCKER_COMPOSE_PS, async (_event, args: { cwd?: string }) => {
    return docker.composePs(args.cwd);
  });

  ipcMain.handle(CHANNELS.DOCKER_COMPOSE_UP, async (_event, args: { cwd?: string; detach?: boolean }) => {
    return docker.composeUp(args.cwd, args.detach);
  });

  ipcMain.handle(CHANNELS.DOCKER_COMPOSE_DOWN, async (_event, args: { cwd?: string }) => {
    return docker.composeDown(args.cwd);
  });

  ipcMain.handle(CHANNELS.DOCKER_COMPOSE_LOGS, async (_event, args: { cwd?: string; tail?: number }) => {
    return docker.composeLogs(args.cwd, args.tail);
  });

  ipcMain.handle(CHANNELS.DOCKER_STATS, async () => {
    return docker.stats();
  });
}
