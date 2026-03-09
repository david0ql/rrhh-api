import {
  createParamDecorator,
  ExecutionContext,
  InternalServerErrorException,
} from '@nestjs/common';
import { TenantEntity } from '../../database/entities';

type RequestWithTenant = {
  tenant?: TenantEntity;
};

export const CurrentTenant = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest<RequestWithTenant>();
    if (!request.tenant) {
      throw new InternalServerErrorException(
        'Tenant no resuelto en la solicitud',
      );
    }

    return request.tenant;
  },
);
