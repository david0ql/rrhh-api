import PDFDocument from 'pdfkit';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { PayrollEntity } from '../../database/entities/payroll.entity';

type ConceptKind = 'DEVENGADO' | 'DEDUCCION';

type ConceptRow = {
  concept: string;
  kind: ConceptKind;
  value: number;
};

type TenantPdfData = {
  slug?: string;
  name?: string;
  legalName?: string;
  taxId?: string;
};

const PAGE_WIDTH = 595;
const MARGIN = 40;
const HEADER_H = 92;
const HEADER_GAP = 12;

const TENANT_HEADER_FALLBACKS: Record<
  string,
  { legalName: string; taxId: string }
> = {
  amaya: { legalName: 'AMAYA SOLUCIONES SAS', taxId: '901423712-1' },
  amovil: { legalName: 'ASISTENCIA MOVIL SAS', taxId: '900464969-7' },
};

function resolveLogoPath(tenantSlug?: string): string | null {
  const normalizedTenant = tenantSlug?.trim().toLowerCase();
  const candidates = normalizedTenant
    ? [
        join(process.cwd(), 'assets', `${normalizedTenant}.jpeg`),
        join(process.cwd(), 'assets', `${normalizedTenant}.jpg`),
        join(process.cwd(), 'assets', `${normalizedTenant}.png`),
      ]
    : [];

  candidates.push(
    join(process.cwd(), 'assets', 'logo.jpeg'),
    join(process.cwd(), 'assets', 'logo.jpg'),
    join(process.cwd(), 'assets', 'logo.png'),
  );

  for (const candidate of candidates) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }

  return null;
}

function resolveTenantHeader(tenant?: TenantPdfData): {
  legalName: string;
  taxId: string;
} {
  const slug = tenant?.slug?.trim().toLowerCase();
  const fallback = slug ? TENANT_HEADER_FALLBACKS[slug] : undefined;

  const legalName =
    tenant?.legalName?.trim() ||
    fallback?.legalName ||
    tenant?.name?.trim() ||
    'EMPRESA';
  const taxId = tenant?.taxId?.trim() || fallback?.taxId || 'SIN NIT';

  return {
    legalName,
    taxId,
  };
}

function estimatePageHeight(hasNotes: boolean, rowsCount: number): number {
  const contentHeight =
    HEADER_H +
    HEADER_GAP + // header + gap
    90 + // summary + gap
    22 + // concept header
    rowsCount * 20 +
    10 + // gap after rows
    46 + // totals + gap
    48 + // net pay + gap
    (hasNotes ? 52 : 0) + // notes + gap
    62; // signature block

  // same margin on top and bottom
  return MARGIN + contentHeight + MARGIN;
}

const C = {
  ink: '#111111',
  muted: '#4b5563',
  border: '#d1d5db',
  light: '#f3f4f6',
  lighter: '#f9fafb',
  white: '#ffffff',
};

function cop(v: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    maximumFractionDigits: 0,
  }).format(v);
}

function number0(v: number): string {
  return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(v);
}

function fmtDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString('es-CO', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function fmtPeriod(year: number, month: number): string {
  return new Date(year, month - 1, 1)
    .toLocaleDateString('es-CO', { month: 'long', year: 'numeric' })
    .toUpperCase();
}

function buildConcepts(payroll: PayrollEntity): ConceptRow[] {
  const healthRate = Number(payroll.healthEmployeeRate ?? 4);
  const pensionRate = Number(payroll.pensionEmployeeRate ?? 4);
  const rows: ConceptRow[] = [
    {
      concept: 'Salario devengado',
      kind: 'DEVENGADO',
      value: Number(payroll.earnedSalary),
    },
  ];

  if (Number(payroll.earnedTransportAllowance) > 0) {
    const workedDays = Number(payroll.daysWorked);
    const transportDaily = Number(payroll.transportAllowanceDaily);
    rows.push({
      concept: `Auxilio transporte (${number0(workedDays)} * ${number0(transportDaily)})`,
      kind: 'DEVENGADO',
      value: Number(payroll.earnedTransportAllowance),
    });
  }

  if (Number(payroll.earnedExtras) > 0) {
    rows.push({
      concept: 'Extras / bonificaciones',
      kind: 'DEVENGADO',
      value: Number(payroll.earnedExtras),
    });
  }
  if (Number(payroll.deductionHealth) > 0) {
    rows.push({
      concept: `Deduccion salud (${healthRate.toFixed(2)}%)`,
      kind: 'DEDUCCION',
      value: Number(payroll.deductionHealth),
    });
  }
  if (Number(payroll.deductionPension) > 0) {
    rows.push({
      concept: `Deduccion pension (${pensionRate.toFixed(2)}%)`,
      kind: 'DEDUCCION',
      value: Number(payroll.deductionPension),
    });
  }
  if (Number(payroll.deductionLoan) > 0) {
    rows.push({
      concept: 'Deduccion prestamo',
      kind: 'DEDUCCION',
      value: Number(payroll.deductionLoan),
    });
  }
  if (Number(payroll.deductionOther) > 0) {
    rows.push({
      concept: 'Otras deducciones',
      kind: 'DEDUCCION',
      value: Number(payroll.deductionOther),
    });
  }

  if (rows.every((r) => r.kind !== 'DEDUCCION')) {
    rows.push({ concept: 'Sin deducciones', kind: 'DEDUCCION', value: 0 });
  }

  return rows;
}

export function buildPayrollPdfBuffer(
  payroll: PayrollEntity,
  tenant?: TenantPdfData,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const logoPath = resolveLogoPath(tenant?.slug);
    const hasLogo = Boolean(logoPath);
    const tenantHeader = resolveTenantHeader(tenant);
    const rows = buildConcepts(payroll);
    const pageHeight = estimatePageHeight(Boolean(payroll.notes), rows.length);

    const doc = new PDFDocument({
      size: [PAGE_WIDTH, pageHeight],
      margin: 0,
      info: { Title: `Nomina #${payroll.id}`, Author: tenantHeader.legalName },
    });

    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const pageW = PAGE_WIDTH;
    const margin = MARGIN;
    const contentW = pageW - margin * 2;

    let y = margin;

    // Header compacto
    doc
      .rect(margin, y, contentW, HEADER_H)
      .fill(C.white)
      .strokeColor(C.border)
      .lineWidth(1)
      .stroke();
    const textTopY = y + 19;
    const textBottomY = y + 68;
    const textCenterY = (textTopY + textBottomY) / 2;
    const logoX = margin + 10;
    const logoBoxW = 96;
    const logoBoxH = 70;
    const logoY = textCenterY - logoBoxH / 2;
    const textX = hasLogo ? logoX + logoBoxW + 10 : margin + 14;
    if (hasLogo) {
      doc.image(logoPath!, logoX, logoY, {
        fit: [logoBoxW, logoBoxH],
        align: 'center',
        valign: 'center',
      });
    }
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(C.ink)
      .text(tenantHeader.legalName, textX, y + 19, { lineBreak: false });
    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(C.muted)
      .text(`NIT ${tenantHeader.taxId}`, textX, y + 34, { lineBreak: false })
      .text('RECIBO DE NOMINA', textX, y + 48, { lineBreak: false })
      .text('Comprobante de pago mensual', textX, y + 60, { lineBreak: false });

    doc
      .font('Helvetica')
      .fontSize(8)
      .fillColor(C.muted)
      .text('No. RECIBO', margin, y + 13, {
        width: contentW - 14,
        align: 'right',
        lineBreak: false,
      })
      .text('PERIODO', margin, y + 35, {
        width: contentW - 14,
        align: 'right',
        lineBreak: false,
      });
    doc
      .font('Helvetica-Bold')
      .fontSize(9)
      .fillColor(C.ink)
      .text(String(payroll.id), margin, y + 23, {
        width: contentW - 14,
        align: 'right',
        lineBreak: false,
      })
      .text(fmtPeriod(payroll.year, payroll.month), margin, y + 45, {
        width: contentW - 14,
        align: 'right',
        lineBreak: false,
      });

    y += HEADER_H + HEADER_GAP;

    // Resumen empleado + liquidacion (compacto)
    doc
      .rect(margin, y, contentW, 78)
      .fill(C.lighter)
      .strokeColor(C.border)
      .lineWidth(1)
      .stroke();
    const splitX = margin + Math.floor(contentW * 0.54);
    doc
      .moveTo(splitX, y)
      .lineTo(splitX, y + 78)
      .strokeColor(C.border)
      .lineWidth(1)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(C.muted)
      .text('EMPLEADO', margin + 12, y + 8, { lineBreak: false });
    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(C.ink)
      .text(payroll.employee.fullName, margin + 12, y + 20, {
        width: splitX - margin - 24,
      });
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(C.muted)
      .text(`${payroll.employee.jobTitle}`, margin + 12, y + 36, {
        width: splitX - margin - 24,
      })
      .text(
        `${payroll.employee.documentType} ${payroll.employee.documentNumber}`,
        margin + 12,
        y + 49,
        { width: splitX - margin - 24 },
      )
      .text(
        `Ingreso: ${fmtDate(payroll.employee.hiredAt)}`,
        margin + 12,
        y + 62,
        { width: splitX - margin - 24 },
      );

    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(C.muted)
      .text('LIQUIDACION', splitX + 12, y + 8, { lineBreak: false });
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(C.muted)
      .text(`Dias laborados: ${payroll.daysWorked}`, splitX + 12, y + 24, {
        width: margin + contentW - splitX - 20,
      })
      .text(
        `Fecha de pago: ${payroll.paymentDate ? fmtDate(payroll.paymentDate) : 'Pendiente'}`,
        splitX + 12,
        y + 39,
        { width: margin + contentW - splitX - 20 },
      )
      .text(`Neto: ${cop(Number(payroll.netPay))}`, splitX + 12, y + 54, {
        width: margin + contentW - splitX - 20,
      });

    y += 90;

    // Tabla de conceptos
    const conceptW = 275;
    const typeW = 100;
    const amountW = 100;
    const rowH = 20;
    doc
      .rect(margin, y, contentW, 22)
      .fill(C.light)
      .strokeColor(C.border)
      .lineWidth(1)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(8.5)
      .fillColor(C.ink)
      .text('CONCEPTO', margin + 10, y + 7, {
        width: conceptW,
        lineBreak: false,
      })
      .text('TIPO', margin + contentW - amountW - typeW, y + 7, {
        width: typeW - 10,
        align: 'center',
        lineBreak: false,
      })
      .text('VALOR', margin + contentW - amountW, y + 7, {
        width: amountW - 10,
        align: 'right',
        lineBreak: false,
      });

    y += 22;

    for (let i = 0; i < rows.length; i++) {
      const rowY = y + i * rowH;
      const row = rows[i];

      doc
        .rect(margin, rowY, contentW, rowH)
        .fill(i % 2 === 0 ? C.white : C.lighter)
        .strokeColor(C.border)
        .lineWidth(0.6)
        .stroke();

      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(C.muted)
        .text(row.concept, margin + 10, rowY + 6.5, {
          width: conceptW,
          lineBreak: false,
        });
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(C.muted)
        .text(row.kind, margin + contentW - amountW - typeW, rowY + 6.5, {
          width: typeW - 10,
          align: 'center',
          lineBreak: false,
        });
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(C.ink)
        .text(
          row.value > 0
            ? `${row.kind === 'DEDUCCION' ? '-' : ''}${cop(row.value)}`
            : '-',
          margin + contentW - amountW,
          rowY + 6.5,
          { width: amountW - 10, align: 'right', lineBreak: false },
        );
    }

    y += rows.length * rowH + 10;

    // Totales + neto (compacto y balanceado)
    const totalsH = 38;
    const halfW = Math.floor(contentW / 2);
    const leftW = halfW;
    const rightW = contentW - halfW;
    const midX = margin + leftW;

    doc
      .rect(margin, y, contentW, totalsH)
      .fill(C.light)
      .strokeColor(C.border)
      .lineWidth(1)
      .stroke();
    doc
      .moveTo(midX, y)
      .lineTo(midX, y + totalsH)
      .strokeColor(C.border)
      .lineWidth(1)
      .stroke();

    doc
      .font('Helvetica-Bold')
      .fontSize(7.5)
      .fillColor(C.muted)
      .text('TOTAL DEVENGADO', margin + 10, y + 8, {
        width: leftW - 20,
        lineBreak: false,
      })
      .text('TOTAL DEDUCCIONES', midX + 10, y + 8, {
        width: rightW - 20,
        lineBreak: false,
      });

    doc
      .font('Helvetica-Bold')
      .fontSize(11)
      .fillColor(C.ink)
      .text(cop(Number(payroll.totalEarnings)), margin + 10, y + 20, {
        width: leftW - 20,
        align: 'right',
        lineBreak: false,
      })
      .text(cop(Number(payroll.totalDeductions)), midX + 10, y + 20, {
        width: rightW - 20,
        align: 'right',
        lineBreak: false,
      });

    y += totalsH + 8;

    doc
      .rect(margin, y, contentW, 38)
      .fill(C.white)
      .strokeColor(C.ink)
      .lineWidth(1.1)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(C.ink)
      .text('NETO A PAGAR', margin + 12, y + 14, { lineBreak: false });
    doc
      .font('Helvetica-Bold')
      .fontSize(15)
      .fillColor(C.ink)
      .text(cop(Number(payroll.netPay)), margin, y + 10, {
        width: contentW - 12,
        align: 'right',
        lineBreak: false,
      });

    y += 48;

    if (payroll.notes) {
      const notesHeight = 42;
      doc
        .rect(margin, y, contentW, notesHeight)
        .fill(C.lighter)
        .strokeColor(C.border)
        .lineWidth(1)
        .stroke();
      doc
        .font('Helvetica-Bold')
        .fontSize(8)
        .fillColor(C.muted)
        .text('OBSERVACIONES', margin + 10, y + 7, { lineBreak: false });
      doc
        .font('Helvetica')
        .fontSize(8.5)
        .fillColor(C.muted)
        .text(payroll.notes, margin + 10, y + 18, {
          width: contentW - 20,
          height: notesHeight - 24,
          ellipsis: true,
        });
      y += notesHeight + 10;
    }

    // Firma empleado (pegada al contenido)
    const signBlockH = 62;
    const signLineY = y + 34;
    doc
      .rect(margin, y, contentW, signBlockH)
      .fill(C.white)
      .strokeColor(C.border)
      .lineWidth(1)
      .stroke();
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(C.muted)
      .text('FIRMA DE RECIBIDO DEL EMPLEADO', margin + 12, y + 8, {
        lineBreak: false,
      });
    doc
      .moveTo(margin + 12, signLineY)
      .lineTo(margin + contentW - 12, signLineY)
      .strokeColor(C.muted)
      .lineWidth(0.8)
      .stroke();
    doc
      .font('Helvetica')
      .fontSize(8.5)
      .fillColor(C.ink)
      .text(payroll.employee.fullName, margin + 12, signLineY + 6, {
        lineBreak: false,
      })
      .text(
        `${payroll.employee.documentType} ${payroll.employee.documentNumber}`,
        margin + 12,
        signLineY + 18,
        { lineBreak: false },
      );

    doc.end();
  });
}
