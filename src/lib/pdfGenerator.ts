import React from 'react';
import { renderToStream } from '@react-pdf/renderer';
import { SalarySlipPDF } from '@/components/pdf/SalarySlipPDF';
import { Database } from '@/types/database';

type PayrollSnapshot = Database['public']['Tables']['payroll_snapshots']['Row'];

/**
 * Generates a PDF buffer for a salary slip from a payroll snapshot.
 */
export async function generateSalarySlipPdfBuffer(snapshot: PayrollSnapshot, month: number, year: number, companyName?: string): Promise<Buffer> {
  const pdfElement = React.createElement(SalarySlipPDF, {
    snapshot,
    month,
    year,
    companyName
  });

  const stream = await renderToStream(pdfElement as unknown as React.ReactElement<import('@react-pdf/renderer').DocumentProps>);
  
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    
    stream.on('data', (chunk) => {
      chunks.push(Buffer.from(chunk));
    });
    
    stream.on('error', (err) => {
      reject(err);
    });
    
    stream.on('end', () => {
      resolve(Buffer.concat(chunks));
    });
  });
}
