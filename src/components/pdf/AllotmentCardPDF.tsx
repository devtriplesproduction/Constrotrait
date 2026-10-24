import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: {
    paddingTop: 32,
    paddingBottom: 28,
    paddingHorizontal: 40,
    fontFamily: 'Times-Roman',
    fontSize: 9,
    lineHeight: 1.15,
    color: '#000',
    backgroundColor: '#fff',
  },
  bold: {
    fontFamily: 'Times-Bold',
    fontWeight: 'bold',
  },
  regular: {
    fontFamily: 'Times-Roman',
    fontWeight: 'normal',
  },
  textCenter: {
    textAlign: 'center',
  },

  // Box 1: Company Header
  headerBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerLogo: {
    width: 36,
    height: 36,
    objectFit: 'contain',
    marginRight: 10,
  },
  headerTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 13.5,
    fontWeight: 'bold',
  },

  // Box 2: Document identification bar
  docInfoBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    flexDirection: 'row',
    marginBottom: 6,
    minHeight: 20,
    alignItems: 'center',
  },
  docInfoCell: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  docInfoCellLast: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },

  // Box 3: Sample & allocation metadata
  metadataBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 6,
    flexDirection: 'column',
  },
  metadataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 19,
    alignItems: 'center',
  },
  metadataRowLast: {
    flexDirection: 'row',
    minHeight: 19,
    alignItems: 'center',
  },
  metadataCellLeft: {
    width: '50%',
    borderRightWidth: 1,
    borderColor: '#000',
    paddingVertical: 3,
    paddingHorizontal: 6,
    justifyContent: 'center',
    height: '100%',
  },
  metadataCellRight: {
    width: '50%',
    paddingVertical: 3,
    paddingHorizontal: 6,
    justifyContent: 'center',
    height: '100%',
  },

  // Box 4: Product Test Name & UID
  productBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    minHeight: 19,
  },
  productCellLeft: {
    width: '50%',
    borderRightWidth: 1,
    borderColor: '#000',
    paddingVertical: 3,
    paddingHorizontal: 6,
    justifyContent: 'center',
    height: '100%',
  },
  productCellRight: {
    width: '50%',
    paddingVertical: 3,
    paddingHorizontal: 6,
    justifyContent: 'center',
    height: '100%',
  },

  // Box 5: Items Table
  tableBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 14,
    flexDirection: 'column',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 22,
    alignItems: 'center',
  },
  tableDataRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 18,
    alignItems: 'center',
  },
  tableDataRowLast: {
    flexDirection: 'row',
    minHeight: 18,
    alignItems: 'center',
  },
  tableHeaderCell: {
    borderRightWidth: 1,
    borderColor: '#000',
    paddingVertical: 3,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  tableHeaderCellLast: {
    paddingVertical: 3,
    paddingHorizontal: 4,
    justifyContent: 'center',
    alignItems: 'center',
    height: '100%',
  },
  tableCell: {
    borderRightWidth: 1,
    borderColor: '#000',
    paddingVertical: 2,
    paddingHorizontal: 4,
    justifyContent: 'center',
    height: '100%',
  },
  tableCellLast: {
    paddingVertical: 2,
    paddingHorizontal: 4,
    justifyContent: 'center',
    height: '100%',
  },

  // Between table and footer
  sampleReceivedByText: {
    fontFamily: 'Times-Bold',
    fontSize: 9.5,
    fontWeight: 'bold',
    marginBottom: 8,
  },

  // Box 6: Footer
  footerBox: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    flexDirection: 'column',
  },
  footerRow1: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 19,
    alignItems: 'center',
  },
  footerRow2: {
    flexDirection: 'row',
    minHeight: 28,
    alignItems: 'center',
  },
  footerCol1: {
    width: '38%',
    borderRightWidth: 1,
    borderColor: '#000',
    paddingVertical: 2,
    paddingHorizontal: 6,
    justifyContent: 'center',
    height: '100%',
  },
  footerCol2: {
    width: '35%',
    borderRightWidth: 1,
    borderColor: '#000',
    paddingVertical: 2,
    paddingHorizontal: 6,
    justifyContent: 'center',
    height: '100%',
  },
  footerCol3: {
    width: '27%',
    paddingVertical: 2,
    paddingHorizontal: 6,
    justifyContent: 'center',
    height: '100%',
  },
  footerSignContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    width: '100%',
  },
  signatureImage: {
    height: 24,
    width: 65,
    objectFit: 'contain',
    marginLeft: 6,
  },
});

interface AllotmentCardData {
  testGroup?: string;
  uid?: string;
  assignments?: any[];
  currentUser?: any;
  logoUrl?: string;
  preparedBySignUrl?: string;
  approvedBySignUrl?: string;
  docNo?: string;
  amendmentNo?: string;
  issueDate?: string;
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}.${month}.${year}`;
};

export const AllotmentCardPDF = ({ data }: { data: AllotmentCardData }) => {
  const { testGroup, uid, assignments = [], currentUser, logoUrl, preparedBySignUrl, approvedBySignUrl, docNo, amendmentNo, issueDate } = data;

  const targetAssignments = assignments && assignments.length > 0 ? assignments : [];
  const primaryJob = targetAssignments[0] || {};
  const jobEntryTest = primaryJob?.job_entry_tests || primaryJob;
  const jobEntry = jobEntryTest?.job_entries || {};
  const testMaster = jobEntryTest?.test_master || {};

  // Dynamic Form Values
  const foundDatasheetQr = targetAssignments
    .map((a: any) => (a.job_entry_tests || a)?.test_master?.datasheet_qr)
    .find(Boolean);

  const displayDocNo = docNo || testMaster?.datasheet_qr || foundDatasheetQr || primaryJob?.doc_no || '-';
  const receivingDate = jobEntry?.date_of_receiving || jobEntry?.inward_on || primaryJob?.date_of_receiving || jobEntry?.created_at;
  const allottedDate = primaryJob?.created_at || primaryJob?.date_of_allotment;
  const dueDate = primaryJob?.due_date || jobEntryTest?.due_date || jobEntryTest?.date_of_testing;

  const profile = Array.isArray(primaryJob?.assigned_to_profile)
    ? primaryJob.assigned_to_profile[0]
    : primaryJob?.assigned_to_profile;
  const profileName = profile ? `${profile.first_name || ''} ${profile.last_name || ''}`.trim() : '';

  const issueTo = primaryJob?.teams?.name ||
    profileName ||
    (primaryJob?.assigned_to && !primaryJob.assigned_to.includes('-') ? primaryJob.assigned_to : (currentUser?.first_name ? `${currentUser.first_name} ${currentUser.last_name || ''}`.trim() : 'Construction Dept.'));

  const productTestName = testGroup || testMaster?.material_product || testMaster?.specific_test || jobEntryTest?.material_description || '';
  const uidLabel = uid || jobEntryTest?.uid_label || '';

  // Prepare table data rows from real assignment data
  const rows: {
    sampleCode: string;
    sampleName: string;
    testParams: string;
    method: string;
    sampleDetails: string;
    remark: string;
  }[] = [];

  targetAssignments.forEach((assignment: any) => {
    const t = assignment.job_entry_tests || assignment;
    const tm = t?.test_master || {};

    const codeNo = t?.additional_details_values?.sample_code_no || t?.sample_code_no || '';
    let codes: string[] = [];
    if (codeNo) {
      codes = codeNo.split(',').map((c: string) => c.trim()).filter(Boolean);
    }
    if (codes.length === 0) {
      codes = [''];
    }

    const sampleName = tm?.material_product || t?.material_description || '';
    const testParams = tm?.specific_test || tm?.component_parameter || t?.test_parameters || '';
    const method = tm?.test_method || t?.test_method || '';

    const rawDetails = { ...(t?.additional_details_values || {}) };
    delete rawDetails.sample_quantity;
    delete rawDetails.sample_code_no;
    const sampleDetails = Object.values(rawDetails).filter(Boolean).join(', ') || t?.sample_quantity || '';
    const remark = assignment.status === 'approved' ? 'ok' : (assignment.status || '');

    codes.forEach((code) => {
      rows.push({
        sampleCode: code,
        sampleName,
        testParams,
        method,
        sampleDetails,
        remark,
      });
    });
  });

  // Maintain at least 5 rows for standard form appearance without adding fake data
  while (rows.length < 5) {
    rows.push({
      sampleCode: '',
      sampleName: '',
      testParams: '',
      method: '',
      sampleDetails: '',
      remark: '',
    });
  }

  const effectiveIssueDate = issueDate || primaryJob?.job_entry_tests?.job_entries?.created_at || new Date().toISOString();

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>

        {/* BOX 1: COMPANY HEADER */}
        <View style={styles.headerBox}>
          <View style={styles.headerContent}>
            <Image src={logoUrl || "/CMTS LOGO.png"} style={styles.headerLogo} />
            <Text style={styles.headerTitle}>CONSTROTRAIT MATERIAL TESTING AND SERVICES LLP WAI</Text>
          </View>
        </View>

        {/* BOX 2: DOCUMENT IDENTIFICATION BAR */}
        <View style={styles.docInfoBox}>
          <View style={[styles.docInfoCell, { width: '22%' }]}>
            <Text style={[styles.bold, styles.textCenter, { fontSize: 9.5 }]}>
              Doc No. : {displayDocNo}
            </Text>
          </View>
          <View style={[styles.docInfoCell, { width: '38%' }]}>
            <Text style={[styles.bold, styles.textCenter, { fontSize: 9.5 }]}>
              Record As per ISO/IEC17025:2017
            </Text>
          </View>
          <View style={[styles.docInfoCellLast, { width: '40%' }]}>
            <Text style={[styles.bold, styles.textCenter, { fontSize: 9.5 }]}>
              Doc Name: Sample Allotment Form
            </Text>
          </View>
        </View>

        {/* BOX 3: SAMPLE & ALLOCATION METADATA */}
        <View style={styles.metadataBox}>
          <View style={styles.metadataRow}>
            <View style={styles.metadataCellLeft}>
              <Text style={styles.bold}>
                Sample Received: <Text style={styles.regular}>{formatDate(receivingDate)}</Text>
              </Text>
            </View>
            <View style={styles.metadataCellRight}>
              <Text style={styles.bold}>
                Date of Sample Allotted: <Text style={styles.regular}>{formatDate(allottedDate)}</Text>
              </Text>
            </View>
          </View>
          <View style={styles.metadataRowLast}>
            <View style={styles.metadataCellLeft}>
              <Text style={styles.bold}>
                Due Date: <Text style={styles.regular}>{formatDate(dueDate)}</Text>
              </Text>
            </View>
            <View style={styles.metadataCellRight}>
              <Text style={styles.bold}>
                Issue To: <Text style={styles.regular}>{issueTo}</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* BOX 4: PRODUCT TEST NAME & UID */}
        <View style={styles.productBox}>
          <View style={styles.productCellLeft}>
            <Text style={styles.bold}>
              Product Test Name - <Text style={styles.regular}>{productTestName}</Text>
            </Text>
          </View>
          <View style={styles.productCellRight}>
            <Text style={styles.bold}>
              UID - <Text style={styles.regular}>{uidLabel}</Text>
            </Text>
          </View>
        </View>

        {/* BOX 5: ITEMS TABLE */}
        <View style={styles.tableBox}>
          {/* Header Row */}
          <View style={styles.tableHeaderRow}>
            <View style={[styles.tableHeaderCell, { width: '22%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Sample Code No.</Text>
            </View>
            <View style={[styles.tableHeaderCell, { width: '18%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Sample Name</Text>
            </View>
            <View style={[styles.tableHeaderCell, { width: '16%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Test Parameters</Text>
            </View>
            <View style={[styles.tableHeaderCell, { width: '20%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Method</Text>
            </View>
            <View style={[styles.tableHeaderCell, { width: '14%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Sample Details</Text>
            </View>
            <View style={[styles.tableHeaderCellLast, { width: '10%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Remark</Text>
            </View>
          </View>

          {/* Data Rows */}
          {rows.map((row, index) => {
            const isLast = index === rows.length - 1;
            return (
              <View key={index} style={isLast ? styles.tableDataRowLast : styles.tableDataRow}>
                <View style={[styles.tableCell, { width: '22%' }]}>
                  <Text style={[styles.regular, styles.textCenter]}>{row.sampleCode}</Text>
                </View>
                <View style={[styles.tableCell, { width: '18%' }]}>
                  <Text style={[styles.regular, styles.textCenter]}>{row.sampleName}</Text>
                </View>
                <View style={[styles.tableCell, { width: '16%' }]}>
                  <Text style={[styles.regular, styles.textCenter]}>{row.testParams}</Text>
                </View>
                <View style={[styles.tableCell, { width: '20%' }]}>
                  <Text style={[styles.regular, styles.textCenter]}>{row.method}</Text>
                </View>
                <View style={[styles.tableCell, { width: '14%' }]}>
                  <Text style={[styles.regular, styles.textCenter]}>{row.sampleDetails}</Text>
                </View>
                <View style={[styles.tableCellLast, { width: '10%' }]}>
                  <Text style={[styles.regular, styles.textCenter]}>{row.remark}</Text>
                </View>
              </View>
            );
          })}
        </View>

        {/* SAMPLE RECEIVED BY (Outside boxes) */}
        <Text style={styles.sampleReceivedByText}>
          Sample Received By-{currentUser?.first_name ? ` ${currentUser.first_name} ${currentUser.last_name || ''}`.trim() : ''}
        </Text>

        {/* BOX 6: FOOTER */}
        <View style={styles.footerBox}>
          {/* Row 1 */}
          <View style={styles.footerRow1}>
            <View style={styles.footerCol1}>
              <Text style={styles.bold}>Issue No. : 01</Text>
            </View>
            <View style={styles.footerCol2}>
              <Text style={styles.bold}>Amendment No & Date : {amendmentNo || ''}</Text>
            </View>
            <View style={styles.footerCol3}>
              <Text style={styles.bold}>Page No: 1-1</Text>
            </View>
          </View>

          {/* Row 2 */}
          <View style={styles.footerRow2}>
            <View style={styles.footerCol1}>
              <Text style={styles.bold}>Issue Date: {formatDate(effectiveIssueDate)}</Text>
            </View>
            <View style={styles.footerCol2}>
              <View style={styles.footerSignContainer}>
                <Text style={styles.bold}>Prepared by :</Text>
                <Image src={preparedBySignUrl || "/Sanket_sir-removebg-preview.png"} style={styles.signatureImage} />
              </View>
            </View>
            <View style={styles.footerCol3}>
              <View style={styles.footerSignContainer}>
                <Text style={styles.bold}>Reviewed & Approved by:</Text>
                <Image src={approvedBySignUrl || "/MUKUND_GAIKWAD_SIGN-removebg-preview.png"} style={styles.signatureImage} />
              </View>
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
};
