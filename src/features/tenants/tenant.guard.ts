import {
  BadRequestException,
  CanActivate,
  ExecutionContext,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from '../../database/entities';

type RequestWithHeaders = {
  headers: Record<string, string | string[] | undefined>;
  tenant?: TenantEntity;
};

@Injectable()
export class TenantGuard implements CanActivate {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantsRepository: Repository<TenantEntity>,
  ) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<RequestWithHeaders>();
    const headerValue = request.headers['x-tenant'];
    const rawTenant = Array.isArray(headerValue) ? headerValue[0] : headerValue;
    const tenantSlug = rawTenant?.trim().toLowerCase();

    if (!tenantSlug) {
      throw new BadRequestException('Debes enviar el header x-tenant');
    }

    const tenant = await this.tenantsRepository.findOne({
      where: {
        slug: tenantSlug,
        isActive: true,
      },
    });

    if (!tenant) {
      throw new NotFoundException(
        `Tenant "${tenantSlug}" no existe o está inactivo`,
      );
    }

    request.tenant = tenant;
    return true;
  }
}
