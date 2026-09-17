import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';
import { Database } from '@/types/database';

type PayrollSnapshot = Database['public']['Tables']['payroll_snapshots']['Row'];

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Helvetica',
    fontSize: 10,
    color: '#1f2937',
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
    paddingBottom: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#111827',
  },
  subtitle: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  companyInfo: {
    textAlign: 'right',
  },
  companyName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#111827',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    padding: 6,
    marginBottom: 10,
    color: '#374151',
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
  },
  col: {
    flex: 1,
  },
  label: {
    color: '#6b7280',
    width: '40%',
  },
  value: {
    fontWeight: 'bold',
    width: '60%',
  },
  flexRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  table: {
    width: 'auto',
    borderStyle: 'solid',
    borderWidth: 1,
    borderColor: '#e5e7eb',
    borderRightWidth: 0,
    borderBottomWidth: 0,
  },
  tableRow: {
    margin: 'auto',
    flexDirection: 'row',
  },
  tableColHeader: {
    width: '50%',
    borderStyle: 'solid',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e5e7eb',
    backgroundColor: '#f9fafb',
    padding: 5,
  },
  tableCol: {
    width: '50%',
    borderStyle: 'solid',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e5e7eb',
    padding: 5,
  },
  tableCellHeader: {
    fontSize: 10,
    fontWeight: 'bold',
  },
  tableCell: {
    fontSize: 10,
  },
  tableCellAmount: {
    fontSize: 10,
    textAlign: 'right',
  },
  tableColAmount: {
    width: '50%',
    borderStyle: 'solid',
    borderBottomWidth: 1,
    borderRightWidth: 1,
    borderColor: '#e5e7eb',
    padding: 5,
    backgroundColor: '#f9fafb',
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 8,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
    paddingTop: 10,
  }
});

interface SalarySlipPDFProps {
  snapshot: PayrollSnapshot;
  month: number;
  year: number;
  companyName?: string;
}

export const SalarySlipPDF = ({ snapshot, month, year, companyName = "ConstroTrait" }: SalarySlipPDFProps) => {
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const period = `${monthNames[month - 1]} ${year}`;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <View>
            <Text style={styles.title}>Salary Slip</Text>
            <Text style={styles.subtitle}>For the period of {period}</Text>
          </View>
          <View style={styles.companyInfo}>
            <Text style={styles.companyName}>{companyName}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee Details</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <View style={styles.flexRow}><Text style={styles.label}>Name:</Text><Text style={styles.value}>{snapshot.employee_name || 'N/A'}</Text></View>
              <View style={styles.flexRow}><Text style={styles.label}>Employee ID:</Text><Text style={styles.value}>{snapshot.employee_id_external || snapshot.employee_id.substring(0,8)}</Text></View>
            </View>
            <View style={styles.col}>
              <View style={styles.flexRow}><Text style={styles.label}>Department:</Text><Text style={styles.value}>{snapshot.department || 'N/A'}</Text></View>
              <View style={styles.flexRow}><Text style={styles.label}>Designation:</Text><Text style={styles.value}>{snapshot.designation || 'N/A'}</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Summary</Text>
          <View style={styles.row}>
            <View style={styles.col}>
              <View style={styles.flexRow}><Text style={styles.label}>Present Days:</Text><Text style={styles.value}>{snapshot.days_present || 0}</Text></View>
              <View style={styles.flexRow}><Text style={styles.label}>Paid Leaves:</Text><Text style={styles.value}>{snapshot.days_paid_leave || 0}</Text></View>
            </View>
            <View style={styles.col}>
              <View style={styles.flexRow}><Text style={styles.label}>Absent Days:</Text><Text style={styles.value}>{snapshot.days_absent || 0}</Text></View>
              <View style={styles.flexRow}><Text style={styles.label}>Unpaid Leaves:</Text><Text style={styles.value}>{snapshot.days_unpaid_leave || 0}</Text></View>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Salary Details</Text>
          <View style={styles.table}>
            <View style={styles.tableRow}>
              <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Earnings</Text></View>
              <View style={styles.tableColHeader}><Text style={styles.tableCellAmount}>Amount (₹)</Text></View>
              <View style={styles.tableColHeader}><Text style={styles.tableCellHeader}>Deductions</Text></View>
              <View style={styles.tableColHeader}><Text style={styles.tableCellAmount}>Amount (₹)</Text></View>
            </View>
            
            <View style={styles.tableRow}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>Basic Salary</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellAmount}>{(snapshot.basic_salary || 0).toLocaleString()}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>PF</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellAmount}>{(snapshot.pf || 0).toLocaleString()}</Text></View>
            </View>
            
            <View style={styles.tableRow}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>HRA</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellAmount}>{(snapshot.hra || 0).toLocaleString()}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>ESI</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellAmount}>{(snapshot.esi || 0).toLocaleString()}</Text></View>
            </View>
            
            <View style={styles.tableRow}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>Allowance</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellAmount}>{(snapshot.allowance || 0).toLocaleString()}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>Professional Tax</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellAmount}>{(snapshot.professional_tax || 0).toLocaleString()}</Text></View>
            </View>
            
            <View style={styles.tableRow}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>Bonus</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellAmount}>{(snapshot.bonus || 0).toLocaleString()}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>Income Tax</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellAmount}>{(snapshot.income_tax || 0).toLocaleString()}</Text></View>
            </View>
            
            <View style={styles.tableRow}>
              <View style={styles.tableCol}><Text style={styles.tableCell}>Overtime Pay</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellAmount}>{(snapshot.overtime_pay || 0).toLocaleString()}</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCell}>Other Deductions</Text></View>
              <View style={styles.tableCol}><Text style={styles.tableCellAmount}>{((snapshot.other_deductions || 0) + (snapshot.damage_recovery || 0) + (snapshot.salary_advance_recovery || 0)).toLocaleString()}</Text></View>
            </View>

            <View style={styles.tableRow}>
              <View style={styles.tableColAmount}><Text style={styles.tableCellHeader}>Gross Earnings</Text></View>
              <View style={styles.tableColAmount}><Text style={[styles.tableCellAmount, { fontWeight: 'bold' }]}>{(snapshot.gross_salary || 0).toLocaleString()}</Text></View>
              <View style={styles.tableColAmount}><Text style={styles.tableCellHeader}>Total Deductions</Text></View>
              <View style={styles.tableColAmount}><Text style={[styles.tableCellAmount, { fontWeight: 'bold' }]}>{(snapshot.total_deductions || 0).toLocaleString()}</Text></View>
            </View>
          </View>
        </View>

        <View style={{ marginTop: 20, padding: 15, backgroundColor: '#f3f4f6', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#374151' }}>Net Salary</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#111827' }}>₹{(snapshot.net_salary || 0).toLocaleString()}</Text>
        </View>

        <Text style={styles.footer}>
          This is a computer-generated document and does not require a physical signature. Generated on {new Date().toLocaleDateString('en-IN')}.
        </Text>
      </Page>
    </Document>
  );
};
