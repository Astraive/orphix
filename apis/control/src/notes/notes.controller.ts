import { Controller, Get, Post, Patch, Delete, Body, Param, Query, UseGuards, Req } from "@nestjs/common";
import { AuthGuard } from "../auth/auth.guard";
import { NotesService } from "./notes.service";
import { CreateNoteDto, UpdateNoteDto } from "./dto/notes.dto";

@Controller("notes")
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  @UseGuards(AuthGuard)
  async list(@Req() req: any, @Query("workspaceId") workspaceId?: string) {
    return this.notesService.listByUser(req.user.id, workspaceId);
  }

  @Get(":id")
  @UseGuards(AuthGuard)
  async get(@Req() req: any, @Param("id") id: string) {
    return this.notesService.findById(req.user.id, id);
  }

  @Post()
  @UseGuards(AuthGuard)
  async create(@Req() req: any, @Body() dto: CreateNoteDto) {
    return this.notesService.create(req.user.id, dto);
  }

  @Patch(":id")
  @UseGuards(AuthGuard)
  async update(@Req() req: any, @Param("id") id: string, @Body() dto: UpdateNoteDto) {
    return this.notesService.update(req.user.id, id, dto);
  }

  @Delete(":id")
  @UseGuards(AuthGuard)
  async delete(@Req() req: any, @Param("id") id: string) {
    return this.notesService.delete(req.user.id, id);
  }
}
