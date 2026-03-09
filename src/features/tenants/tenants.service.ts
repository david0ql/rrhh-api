import {
  BadRequestException,
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TenantEntity } from '../../database/entities';
import { CreateTenantDto } from './dto/create-tenant.dto';

@Injectable()
export class TenantsService {
  constructor(
    @InjectRepository(TenantEntity)
    private readonly tenantsRepository: Repository<TenantEntity>,
  ) {}

  listAll() {
    return this.tenantsRepository.find({
      order: {
        name: 'ASC',
      },
    });
  }

  listPublic() {
    return this.tenantsRepository.find({
      where: {
        isActive: true,
      },
      order: {
        name: 'ASC',
      },
    });
  }

  async create(payload: CreateTenantDto) {
    const name = payload.name.trim();
    const slug = (
      payload.slug ? payload.slug.trim() : this.slugify(name)
    ).toLowerCase();

    if (!slug) {
      throw new BadRequestException(
        'No se pudo construir un slug válido para el tenant',
      );
    }

    const existing = await this.tenantsRepository
      .createQueryBuilder('t')
      .where('LOWER(t.name) = :name', { name: name.toLowerCase() })
      .orWhere('t.slug = :slug', { slug })
      .getOne();

    if (existing) {
      throw new ConflictException('Ya existe un tenant con ese nombre o slug');
    }

    const entity = this.tenantsRepository.create({
      name,
      slug,
      isActive: true,
    });

    return this.tenantsRepository.save(entity);
  }

  private slugify(value: string) {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}
