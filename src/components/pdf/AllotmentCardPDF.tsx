import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font } from '@react-pdf/renderer';

// Register font
Font.register({
  family: 'Open Sans',
  fonts: [
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-regular.ttf' },
    { src: 'https://cdn.jsdelivr.net/npm/open-sans-all@0.1.3/fonts/open-sans-600.ttf', fontWeight: 600 }
  ]
});

const styles = StyleSheet.create({
  page: {
    padding: 12,
    fontFamily: 'Open Sans',
    fontSize: 8,
    lineHeight: 1.1,
    color: '#000'
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 10,
    flexDirection: 'column'
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 16,
  },
  lastRow: {
    flexDirection: 'row',
    minHeight: 16,
  },
  cell: {
    padding: 4,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center'
  },
  lastCell: {
    padding: 4,
    justifyContent: 'center'
  },
  headerTitle: {
    fontSize: 12,
    fontWeight: 600,
    textAlign: 'center',
    padding: 5
  },
  bold: {
    fontWeight: 600
  },
  textCenter: {
    textAlign: 'center'
  }
});

interface AllotmentCardData {
  testGroup: string;
  uid: string;
  assignments: any[];
  currentUser?: any;
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB');
};

export const AllotmentCardPDF = ({ data }: { data: AllotmentCardData }) => {
  const { testGroup, uid, assignments, currentUser } = data;
  
  const primaryJob = assignments[0] || {};
  
  return (
    <Document>
      <Page size="A4" style={[styles.page, { display: 'flex', flexDirection: 'column' }]}>
        
        {/* HEADER SECTION */}
        <View style={styles.table}>
          <View style={[styles.row, { padding: 5, justifyContent: 'center' }]}>
            <Text style={styles.headerTitle}>CONSTROTRAIT MATERIAL TESTING AND SERVICES LLP WAI</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '70%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Doc Name: Sample Allotment Form</Text>
            </View>
            <View style={[styles.lastCell, { width: '30%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Doc. No. QR-74</Text>
            </View>
          </View>
          <View style={[styles.lastRow, { padding: 3 }]}>
            <Text style={[styles.bold, styles.textCenter, { width: '100%' }]}>Record As per ISO/IEC17025:2017</Text>
          </View>
        </View>

        {/* DETAILS SECTION */}
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '50%' }]}>
              <Text>Sample Received: {formatDate(primaryJob?.job_entry_tests?.job_entries?.date_of_receiving || new Date().toISOString())}</Text>
            </View>
            <View style={[styles.lastCell, { width: '50%' }]}>
              <Text>Date of Sample Allotted: {formatDate(new Date().toISOString())}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '50%' }]}>
              <Text>Due Date: {formatDate(primaryJob?.due_date)}</Text>
            </View>
            <View style={[styles.lastCell, { width: '50%' }]}>
              <Text>Issue To: Construction Dept.</Text>
            </View>
          </View>
          <View style={styles.lastRow}>
            <View style={[styles.cell, { width: '50%' }]}>
              <Text>Product Test Name: {testGroup}</Text>
            </View>
            <View style={[styles.lastCell, { width: '50%' }]}>
              <Text>UID: {uid}</Text>
            </View>
          </View>
        </View>

        {/* ITEMS TABLE */}
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '20%', alignItems: 'center' }]}><Text style={styles.bold}>Sample Code No.</Text></View>
            <View style={[styles.cell, { width: '20%', alignItems: 'center' }]}><Text style={styles.bold}>Sample Name</Text></View>
            <View style={[styles.cell, { width: '20%', alignItems: 'center' }]}><Text style={styles.bold}>Test Parameters</Text></View>
            <View style={[styles.cell, { width: '15%', alignItems: 'center' }]}><Text style={styles.bold}>Method</Text></View>
            <View style={[styles.cell, { width: '15%', alignItems: 'center' }]}><Text style={styles.bold}>Sample Details</Text></View>
            <View style={[styles.lastCell, { width: '10%', alignItems: 'center' }]}><Text style={styles.bold}>Remark</Text></View>
          </View>

          {assignments.map((assignment, idx) => {
            const t = assignment.job_entry_tests;
            const codeNo = assignment.additional_details_values?.sample_code_no || t?.job_entries?.material_details_location || '';
            const sampleName = t?.material_description || '';
            const testParams = t?.test_master?.component_parameter || '';
            const testMethod = t?.test_master?.test_method || '';
            const sampleDetails = t?.sample_quantity || 'ok';
            const remark = assignment.status === 'approved' ? 'ok' : 'pending';

            return (
              <View key={idx} style={[idx === assignments.length - 1 ? styles.lastRow : styles.row, { minHeight: 25 }]}>
                <View style={[styles.cell, { width: '20%' }]}><Text style={styles.textCenter}>{codeNo}</Text></View>
                <View style={[styles.cell, { width: '20%' }]}><Text style={styles.textCenter}>{sampleName}</Text></View>
                <View style={[styles.cell, { width: '20%' }]}><Text style={styles.textCenter}>{testParams}</Text></View>
                <View style={[styles.cell, { width: '15%' }]}><Text style={styles.textCenter}>{testMethod}</Text></View>
                <View style={[styles.cell, { width: '15%' }]}><Text style={styles.textCenter}>{sampleDetails}</Text></View>
                <View style={[styles.lastCell, { width: '10%' }]}><Text style={styles.textCenter}>{remark}</Text></View>
              </View>
            );
          })}
        </View>

        {/* FOOTER */}
        <View style={[styles.table, { marginBottom: 0 }]}>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '50%' }]}><Text>Sample Received By: {currentUser?.first_name || ''} {currentUser?.last_name || ''}</Text></View>
            <View style={[styles.cell, { width: '50%', flexDirection: 'row' }]}>
              <View style={{ flex: 1, borderRightWidth: 1, borderColor: '#000', padding: 4 }}><Text>Prepared by: _________</Text></View>
              <View style={{ flex: 1, padding: 4 }}><Text>Reviewed & Approved by: _________</Text></View>
            </View>
          </View>
          <View style={styles.lastRow}>
            <View style={[styles.cell, { width: '33.3%' }]}><Text>Amendment No & Date : 02 & 08.06.2026</Text></View>
            <View style={[styles.cell, { width: '33.3%' }]}><Text>Page No: 1-1</Text></View>
            <View style={[styles.lastCell, { width: '33.3%' }]}><Text>Issue No: 01, Issue Date: 02.09.2024</Text></View>
          </View>
        </View>

      </Page>
    </Document>
  );
};
