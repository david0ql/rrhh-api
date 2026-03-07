import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  check() {
    return {
      ok: true,
      service: 'dally-rh-api',
      timestamp: new Date().toISOString(),
    };
  }
}
