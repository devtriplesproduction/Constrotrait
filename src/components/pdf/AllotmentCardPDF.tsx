import React from 'react';
import { Document, Page, Text, View, StyleSheet, Font, Image } from '@react-pdf/renderer';

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
  },
  signatureImage: {
    height: 30,
    width: 80,
    objectFit: 'contain',
    marginTop: 2
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
      <Page size="A4" orientation="landscape" style={[styles.page, { display: 'flex', flexDirection: 'column' }]}>
        
        {/* HEADER SECTION */}
        <View style={styles.table}>
          <View style={[styles.row, { padding: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }]}>
            <Image src="/Constrotriat Logo PNG 1.png" style={{ width: 40, height: 40, objectFit: 'contain', position: 'absolute', left: 10 }} />
            <Text style={[styles.headerTitle, { fontSize: 13, flex: 1, textAlign: 'center' }]}>CONSTROTRAIT MATERIAL TESTING AND SERVICES LLP WAI</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '70%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Doc Name: Sample Allotment Form</Text>
            </View>
            <View style={[styles.lastCell, { width: '30%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Doc. No.: QR-74</Text>
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
              <Text>Sample Received : {formatDate(primaryJob?.job_entry_tests?.job_entries?.date_of_receiving || new Date().toISOString())}</Text>
            </View>
            <View style={[styles.lastCell, { width: '50%' }]}>
              <Text>Date of Sample Allotted : {formatDate(new Date().toISOString())}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '50%' }]}>
              <Text>Due Date : {formatDate(primaryJob?.due_date)}</Text>
            </View>
            <View style={[styles.lastCell, { width: '50%' }]}>
              <Text>Issue To : Construction Dept.</Text>
            </View>
          </View>
          <View style={styles.lastRow}>
            <View style={[styles.cell, { width: '50%' }]}>
              <Text>Product Test Name - {testGroup}</Text>
            </View>
            <View style={[styles.lastCell, { width: '50%' }]}>
              <Text>UID-{uid}</Text>
            </View>
          </View>
        </View>

        {/* ITEMS TABLE */}
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '15%', alignItems: 'center' }]}><Text style={styles.bold}>Sample ID</Text></View>
            <View style={[styles.cell, { width: '25%', alignItems: 'center' }]}><Text style={styles.bold}>Material Name</Text></View>
            <View style={[styles.cell, { width: '25%', alignItems: 'center' }]}><Text style={styles.bold}>Test Parameters</Text></View>
            <View style={[styles.cell, { width: '15%', alignItems: 'center' }]}><Text style={styles.bold}>Method</Text></View>
            <View style={[styles.cell, { width: '10%', alignItems: 'center' }]}><Text style={styles.bold}>Sample Details</Text></View>
            <View style={[styles.lastCell, { width: '10%', alignItems: 'center' }]}><Text style={styles.bold}>Remark</Text></View>
          </View>

          {assignments.flatMap((assignment, idx) => {
            const t = assignment.job_entry_tests;
            let codeNo = t?.additional_details_values?.sample_code_no || t?.sample_code_no || '';
            let codes: string[] = [];

            if (codeNo) {
              codes = codeNo.split(',').map((c: string) => c.trim()).filter(Boolean);
            }
            if (codes.length === 0) {
              codes = [''];
            }

            const materialName = t?.test_master?.material_product || t?.material_description || '';
            const testParams = t?.test_master?.component_parameter || '';
            const testMethod = t?.test_master?.test_method || '';
            const sampleDetails = t?.sample_quantity || 'ok';
            const remark = assignment.status === 'approved' ? 'ok' : 'pending';

            return codes.map((code, codeIdx) => {
              const isLastRow = idx === assignments.length - 1 && codeIdx === codes.length - 1;

              return (
                <View key={`${idx}-${codeIdx}`} style={[isLastRow ? styles.lastRow : styles.row, { minHeight: 25 }]}>
                  <View style={[styles.cell, { width: '15%' }]}><Text style={styles.textCenter}>{code}</Text></View>
                  <View style={[styles.cell, { width: '25%' }]}><Text style={styles.textCenter}>{materialName}</Text></View>
                  <View style={[styles.cell, { width: '25%' }]}><Text style={styles.textCenter}>{testParams}</Text></View>
                  <View style={[styles.cell, { width: '15%' }]}><Text style={styles.textCenter}>{testMethod}</Text></View>
                  <View style={[styles.cell, { width: '10%' }]}><Text style={styles.textCenter}>{sampleDetails}</Text></View>
                  <View style={[styles.lastCell, { width: '10%' }]}><Text style={styles.textCenter}>{remark}</Text></View>
                </View>
              );
            });
          })}
        </View>

        {/* FOOTER */}
        <View style={[styles.table, { marginBottom: 0, flexDirection: 'row' }]}>
          {/* Column 1 */}
          <View style={{ width: '30%', borderRightWidth: 1, borderColor: '#000', display: 'flex', flexDirection: 'column' }}>
            <View style={{ padding: 4, borderBottomWidth: 1, borderColor: '#000' }}>
              <Text>Issue No : 01</Text>
            </View>
            <View style={{ padding: 4, borderBottomWidth: 1, borderColor: '#000' }}>
              <Text>Issue Date: {formatDate(new Date().toISOString())}</Text>
            </View>
            <View style={{ padding: 4 }}>
              <Text>Sample Received By - {currentUser?.first_name || ''} {currentUser?.last_name || ''}</Text>
            </View>
          </View>
          
          {/* Column 2 */}
          <View style={{ width: '40%', borderRightWidth: 1, borderColor: '#000', display: 'flex', flexDirection: 'column' }}>
            <View style={{ padding: 4, borderBottomWidth: 1, borderColor: '#000' }}>
              <Text>Amendment No & Date : </Text>
            </View>
            <View style={{ padding: 4, flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ alignSelf: 'flex-start' }}>Prepared by :</Text>
              <Image src="/Sanket_sir-removebg-preview.png" style={styles.signatureImage} />
            </View>
          </View>

          {/* Column 3 */}
          <View style={{ width: '30%', display: 'flex', flexDirection: 'column' }}>
            <View style={{ padding: 4, borderBottomWidth: 1, borderColor: '#000' }}>
              <Text>Page No: 1-1</Text>
            </View>
            <View style={{ padding: 4, flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
              <Text style={{ alignSelf: 'flex-start' }}>Reviewed & Approved by:</Text>
              <Image src="/MUKUND_GAIKWAD_SIGN-removebg-preview.png" style={styles.signatureImage} />
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
};
