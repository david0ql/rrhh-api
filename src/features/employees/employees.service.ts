import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmployeeEntity } from '../../database/entities';
import { getSkip, toPaginatedResponse } from '../../shared/pagination';
import { CreateEmployeeDto } from './dto/create-employee.dto';
import {
  EmployeeOrderBy,
  ListEmployeesQueryDto,
} from './dto/list-employees-query.dto';
import { UpdateEmployeeDto } from './dto/update-employee.dto';

@Injectable()
export class EmployeesService {
  constructor(
    @InjectRepository(EmployeeEntity)
    private readonly employeesRepository: Repository<EmployeeEntity>,
  ) {}

  async list(query: ListEmployeesQueryDto, tenantId: number) {
    const where = {
      tenantId,
      ...(typeof query.isActive === 'boolean'
        ? { isActive: query.isActive }
        : {}),
    };

    const [data, totalItems] = await this.employeesRepository.findAndCount({
      where,
      skip: getSkip(query.page, query.take),
      take: query.take,
      order: {
        [query.orderBy ?? EmployeeOrderBy.ID]: query.order,
      },
    });

    return toPaginatedResponse({
      data,
      page: query.page,
      take: query.take,
      totalItems,
      order: query.order,
      orderBy: query.orderBy,
    });
  }

  async getById(id: number, tenantId: number) {
    const employee = await this.employeesRepository.findOne({
      where: { id, tenantId },
    });
    if (!employee) {
      throw new NotFoundException('Empleado no encontrado');
    }
    return employee;
  }

  async create(payload: CreateEmployeeDto, tenantId: number) {
    const existing = await this.employeesRepository.findOne({
      where: {
        tenantId,
        documentType: payload.documentType,
        documentNumber: payload.documentNumber,
      },
    });

    if (existing) {
      throw new ConflictException('Ya existe un empleado con ese documento');
    }

    const entity = this.employeesRepository.create({
      ...payload,
      tenantId,
      isActive: payload.isActive ?? true,
    });

    return this.employeesRepository.save(entity);
  }

  async update(id: number, payload: UpdateEmployeeDto, tenantId: number) {
    const employee = await this.getById(id, tenantId);
    const nextDocumentType = payload.documentType ?? employee.documentType;
    const nextDocumentNumber =
      payload.documentNumber ?? employee.documentNumber;

    if (
      nextDocumentType !== employee.documentType ||
      nextDocumentNumber !== employee.documentNumber
    ) {
      const duplicated = await this.employeesRepository.findOne({
        where: {
          tenantId,
          documentType: nextDocumentType,
          documentNumber: nextDocumentNumber,
        },
      });

      if (duplicated && duplicated.id !== id) {
        throw new ConflictException('Ya existe un empleado con ese documento');
      }
    }

    Object.assign(employee, payload);
    return this.employeesRepository.save(employee);
  }
}
