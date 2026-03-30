# rrhh-api

API de RRHH multi-tenant.

## 1. Stack

- NestJS
- TypeORM
- MariaDB/MySQL (`mysql2`)
- JWT + Passport
- PDFKit (comprobantes PDF)

## 2. Requisitos

- Node.js 20+
- Yarn 1.x
- Base de datos MariaDB accesible

## 3. Variables de entorno

Archivo: `.env`

```env
PORT=30045
CORS_ORIGIN=http://localhost:5173

DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=secret
DB_NAME=dbamovil_rrhh
DB_LOGGING=false

JWT_SECRET=change-me
JWT_EXPIRES_IN=8h

ADMIN_USERNAME=admin
ADMIN_EMAIL=admin@local
ADMIN_PASSWORD=admin123
```

### 3.1 Descripción rápida

- `PORT`: puerto del backend
- `CORS_ORIGIN`: origen(s) permitidos (puede ser lista separada por comas)
- `DB_*`: conexión a base de datos
- `JWT_*`: configuración del token
- `ADMIN_*`: usuario admin inicial/seed

## 4. Instalación y ejecución

```bash
yarn install
yarn start
```

Scripts disponibles:

```bash
yarn start:dev
yarn build
yarn lint
yarn test
```

## 5. Prefijo y salud

- Prefijo global: `/api`
- Health check:
  - `GET /api/health`

## 6. Modelo multi-tenant

## 6.1 Tabla `tenants`

Columnas principales:

- `id`
- `name`
- `legal_name`
- `tax_id`
- `slug`
- `is_active`

## 6.2 Tablas aisladas por tenant

- `employees`
- `payroll`
- `loans`
- `loan_payments`

Cada una incluye `tenant_id` (FK a `tenants.id`).

## 6.3 Header requerido

La mayoría de endpoints de negocio requieren:

```http
x-tenant: <slug>
```

Sin ese header:

- código `400`
- mensaje: `Debes enviar el header x-tenant`

## 7. PDF de nómina por tenant

El PDF usa datos del tenant activo:

- logo: `assets/<slug>.jpeg|jpg|png`
- fallback logo: `assets/logo.jpeg|jpg|png`
- razón social: `tenants.legal_name`
- NIT: `tenants.tax_id`

Valores actuales:

- `amaya` -> `AMAYA SOLUCIONES SAS` / `901423712-1`
- `amovil` -> `ASISTENCIA MOVIL SAS` / `900464969-7`

## 8. Endpoints clave

## 8.1 Auth

- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/change-password`

## 8.2 Tenants

Público:

- `GET /api/tenants/public`

Autenticado:

- `GET /api/tenants`
- `POST /api/tenants`

Payload de creación:

```json
{
  "name": "Nuevo Tenant",
  "legalName": "NUEVO TENANT SAS",
  "taxId": "900000000-1",
  "slug": "nuevo-tenant"
}
```

## 8.3 Módulos de negocio (requieren JWT + x-tenant)

- `/api/dashboard/*`
- `/api/employees/*`
- `/api/payroll/*`
- `/api/loans/*`

## 9. Flujo de prueba cURL

## 9.1 Login

```bash
curl -X POST http://127.0.0.1:30045/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin123"}'
```

## 9.2 Listar empleados por tenant

```bash
curl "http://127.0.0.1:30045/api/employees?page=1&take=10" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant: amaya"
```

## 9.3 Descargar PDF de nómina por tenant

```bash
curl "http://127.0.0.1:30045/api/payroll/1/pdf" \
  -H "Authorization: Bearer <TOKEN>" \
  -H "x-tenant: amaya" \
  -o nomina-amaya.pdf
```

## 10. Datos y limpieza

En limpiezas de datos, mantener intactas:

- `mandatory_earnings`
- `mandatory_deductions`

## 11. Troubleshooting

- `400 Debes enviar el header x-tenant`
  - Verifica que frontend/cliente envíe `x-tenant`.

- `Tenant "..." no existe o está inactivo`
  - Verifica slug en tabla `tenants`.

- PDF con logo genérico
  - Revisa archivo `assets/<slug>.(jpeg|jpg|png)`.

- CORS bloqueado en navegador
  - Ajusta `CORS_ORIGIN` en `.env`.
