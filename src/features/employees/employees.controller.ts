import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { TenantEntity } from '../../database/entities';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentTenant } from '../tenants/current-tenant.decorator';
import { TenantGuard } from '../tenants/tenant.guard';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import { ListEmployeesQueryDto } from './dto/list-employees-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';
import { EmployeesService } from './employees.service';

@Controller('employees')
@UseGuards(JwtAuthGuard, TenantGuard)
export class EmployeesController {
  constructor(private readonly employeesService: EmployeesService) {}

  @Get()
  list(
    @CurrentTenant() tenant: TenantEntity,
    @Query() query: ListEmployeesQueryDto,
  ) {
    return this.employeesService.list(query, tenant.id);
  }

  @Get(':id')
  getById(
    @CurrentTenant() tenant: TenantEntity,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.employeesService.getById(id, tenant.id);
  }

  @Post()
  create(
    @CurrentTenant() tenant: TenantEntity,
    @Body() body: CreateEmployeeDto,
  ) {
    return this.employeesService.create(body, tenant.id);
  }

  @Patch(':id')
  update(
    @CurrentTenant() tenant: TenantEntity,
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateEmployeeDto,
  ) {
    return this.employeesService.update(id, body, tenant.id);
  }
}
