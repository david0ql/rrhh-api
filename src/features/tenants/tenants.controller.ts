import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateTenantDto } from './dto/create-tenant.dto';
import { TenantsService } from './tenants.service';

@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenantsService: TenantsService) {}

  @Get('public')
  listPublic() {
    return this.tenantsService.listPublic();
  }

  @UseGuards(JwtAuthGuard)
  @Get()
  listAll() {
    return this.tenantsService.listAll();
  }

  @UseGuards(JwtAuthGuard)
  @Post()
  create(@Body() payload: CreateTenantDto) {
    return this.tenantsService.create(payload);
  }
}
