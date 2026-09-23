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
    padding: 20,
    fontFamily: 'Open Sans',
    fontSize: 9,
    lineHeight: 1.2,
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
    minHeight: 20,
  },
  lastRow: {
    flexDirection: 'row',
    minHeight: 20,
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
  checkbox: {
    width: 10,
    height: 10,
    borderWidth: 1,
    borderColor: '#000',
    alignSelf: 'center',
    marginTop: 2
  },
  signatureSpace: {
    marginTop: 20,
    borderTopWidth: 1,
    borderColor: '#000',
    width: '60%',
    alignSelf: 'center'
  }
});

interface JobCardData {
  job: any;
  client: any;
}

const formatDate = (dateStr: string | null) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB');
};

export const JobCardPDF = ({ data }: { data: JobCardData }) => {
  const { job, client } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        
        {/* HEADER SECTION */}
        <View style={styles.table}>
          <View style={[styles.row, { padding: 5, justifyContent: 'center' }]}>
            <Text style={styles.headerTitle}>CONSTROTRAIT MATERIAL TESTING AND SERVICES LLP WAI</Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '70%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Doc Name .: Customer's Service Request Form</Text>
            </View>
            <View style={[styles.lastCell, { width: '30%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Doc. No. QR/16</Text>
            </View>
          </View>
          <View style={[styles.lastRow, { padding: 3 }]}>
            <Text style={[styles.bold, styles.textCenter, { width: '100%' }]}>Record As per ISO/IEC17025:2017</Text>
          </View>
        </View>

        {/* CUSTOMER DETAILS SECTION */}
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '50%', borderRightWidth: 1 }]}>
              <Text>1. Name of Customer / Agency:</Text>
              <Text style={styles.bold}>{client?.name || ''}</Text>
            </View>
            <View style={[styles.lastCell, { width: '50%' }]}>
              <Text>Date of Sample Received: {formatDate(job?.date_of_receiving)}</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '50%', borderRightWidth: 1 }]}>
              <Text>2. Address of Customer / Agency:</Text>
              <Text style={styles.bold}>{client?.address || ''}</Text>
            </View>
            <View style={{ width: '50%', flexDirection: 'column' }}>
              <View style={{ borderBottomWidth: 1, borderColor: '#000', flex: 1, justifyContent: 'center' }}>
                <Text style={{ padding: 4 }}>Date of Casting: {formatDate(job?.date_of_casting)}</Text>
              </View>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={{ padding: 4 }}>Date of Testing: {formatDate(job?.date_of_testing)}</Text>
              </View>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '50%', borderRightWidth: 1 }]}>
              <Text>3. Name of site:</Text>
              <Text style={styles.bold}>{client?.site_name || ''}</Text>
            </View>
            <View style={{ width: '50%', flexDirection: 'column' }}>
              <View style={{ borderBottomWidth: 1, borderColor: '#000', flex: 1, justifyContent: 'center' }}>
                <Text style={{ padding: 4 }}>CONTACT :-</Text>
              </View>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={{ padding: 4 }}>Person Name : {client?.contact_person || ''}</Text>
              </View>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '50%', borderRightWidth: 1 }]}>
              <Text>4. Name of Dispatching the Report:</Text>
              <Text style={styles.bold}>{client?.dispatch_name || ''}</Text>
            </View>
            <View style={{ width: '50%', flexDirection: 'column' }}>
              <View style={{ borderBottomWidth: 1, borderColor: '#000', flex: 1, justifyContent: 'center' }}>
                <Text style={{ padding: 4 }}>Phone/ Mobile : {client?.mobile || ''}</Text>
              </View>
              <View style={{ flex: 1, justifyContent: 'center' }}>
                <Text style={{ padding: 4 }}>E-mail : {client?.email || ''}</Text>
              </View>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '50%', borderRightWidth: 1, minHeight: 40 }]}>
              <Text>5. Address of Dispatching the Report:</Text>
              <Text style={styles.bold}>{client?.dispatch_address || ''}</Text>
            </View>
            <View style={[styles.lastCell, { width: '50%' }]}>
              <Text>Mode of Dispatch of Report :</Text>
            </View>
          </View>
          <View style={styles.row}>
            <View style={[styles.lastCell, { flex: 1 }]}>
              <Text>TESTING REQUIRED ON :</Text>
            </View>
          </View>
          <View style={styles.lastRow}>
            <View style={[styles.lastCell, { flex: 1 }]}>
              <Text>CUSTOMER REFERENCE NO :</Text>
            </View>
          </View>
        </View>

        {/* TESTING REQUIRED TABLE */}
        <View style={styles.table}>
          <View style={[styles.row, { padding: 4, justifyContent: 'center' }]}>
            <Text style={[styles.bold, styles.textCenter, { width: '100%' }]}>TESTING REQUIRED</Text>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.cell, { width: '10%', alignItems: 'center' }]}><Text>UID. No.</Text></View>
            <View style={[styles.cell, { width: '25%', alignItems: 'center' }]}><Text>Material Details</Text></View>
            <View style={[styles.cell, { width: '10%', alignItems: 'center' }]}><Text>Testing Day</Text></View>
            <View style={[styles.cell, { width: '15%', alignItems: 'center' }]}><Text>Sample Code No.</Text></View>
            <View style={[styles.cell, { width: '10%', alignItems: 'center' }]}><Text>No. of sample</Text></View>
            <View style={[styles.cell, { width: '15%', alignItems: 'center' }]}><Text>Test Parameters</Text></View>
            <View style={[styles.lastCell, { width: '15%', alignItems: 'center' }]}><Text>Test Method</Text></View>
          </View>

          {/* Data Row */}
          <View style={[styles.row, { minHeight: 40 }]}>
            <View style={[styles.cell, { width: '10%' }]}><Text>{job?.uid || ''}</Text></View>
            <View style={[styles.cell, { width: '25%' }]}><Text>{job?.material_description || ''}</Text></View>
            <View style={[styles.cell, { width: '10%', alignItems: 'center' }]}><Text>{job?.testing_day || ''}</Text></View>
            <View style={[styles.cell, { width: '15%', alignItems: 'center' }]}><Text>{job?.material_details_location || ''}</Text></View>
            <View style={[styles.cell, { width: '10%', alignItems: 'center' }]}><Text>{job?.sample_quantity || ''}</Text></View>
            <View style={[styles.cell, { width: '15%' }]}><Text>{job?.test_parameters || 'As per Method'}</Text></View>
            <View style={[styles.lastCell, { width: '15%' }]}><Text>{job?.test_method || ''}</Text></View>
          </View>

          {/* Checkboxes Area */}
          <View style={styles.lastRow}>
            <View style={[styles.cell, { width: '70%', borderRightWidth: 0 }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text>1. Method of testing capability and resources acceptable</Text>
                <View style={[styles.checkbox, { marginRight: 20 }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text>2. Terms and Condition of testing acceptable as per review remarks</Text>
                <View style={[styles.checkbox, { marginRight: 20 }]} />
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text>3. Customer request statement of conformity</Text>
                <View style={[styles.checkbox, { marginRight: 20 }]} />
              </View>
            </View>
            <View style={[styles.lastCell, { width: '30%', borderLeftWidth: 1, borderColor: '#000', justifyContent: 'flex-end', paddingBottom: 10, alignItems: 'center' }]}>
              <Text>Signature Of Customer</Text>
            </View>
          </View>
        </View>

        {/* FOR OFFICE USE ONLY */}
        <View style={styles.table}>
          <View style={[styles.row, { padding: 5, justifyContent: 'center' }]}>
            <Text style={[styles.bold, styles.textCenter, { width: '100%', fontSize: 11 }]}>FOR OFFICE USE ONLY</Text>
          </View>
          <View style={[styles.row, { minHeight: 25 }]}>
            <View style={[styles.lastCell, { flex: 1 }]}>
              <Text>Review Remarks:</Text>
            </View>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.cell, { width: '40%' }]}>
              <Text>1. Requirements defined and understood :</Text>
            </View>
            <View style={[styles.cell, { width: '25%' }]}></View>
            <View style={[styles.cell, { width: '20%' }]}><Text style={styles.textCenter}>UID No. :</Text></View>
            <View style={[styles.lastCell, { width: '15%' }]}></View>
          </View>
          
          <View style={styles.row}>
            <View style={[styles.cell, { width: '40%' }]}>
              <Text>2. Capability and Resource available :</Text>
            </View>
            <View style={[styles.cell, { width: '25%' }]}></View>
            <View style={[styles.cell, { width: '20%' }]}><Text style={styles.textCenter}>Date :</Text></View>
            <View style={[styles.lastCell, { width: '15%' }]}></View>
          </View>
          
          <View style={[styles.row, { minHeight: 20 }]}>
            <View style={[styles.cell, { width: '40%' }]}>
              <Text>3. Condition of Sample Received :</Text>
            </View>
            <View style={[styles.cell, { width: '25%' }]}></View>
            <View style={[styles.lastCell, { width: '35%', flexDirection: 'row', padding: 0 }]}></View>
          </View>
          <View style={[styles.row, { minHeight: 20 }]}>
            <View style={[styles.cell, { width: '40%' }]}>
              <Text>4. Quantity of Sample Received :</Text>
            </View>
            <View style={[styles.cell, { width: '25%' }]}></View>
            <View style={[styles.lastCell, { width: '35%', padding: 0 }]}></View>
          </View>
          <View style={[styles.row, { minHeight: 20 }]}>
            <View style={[styles.cell, { width: '40%' }]}>
              <Text>5. Discussion with Customer, if any :</Text>
            </View>
            <View style={[styles.cell, { width: '25%' }]}></View>
            <View style={[styles.lastCell, { width: '35%', padding: 0 }]}></View>
          </View>
          <View style={[styles.row, { minHeight: 25 }]}>
            <View style={[styles.cell, { width: '40%' }]}>
              <Text>Test Assigned To :</Text>
            </View>
            <View style={[styles.cell, { width: '25%' }]}></View>
            <View style={[styles.lastCell, { width: '35%', padding: 0 }]}></View>
          </View>
          <View style={[styles.lastRow, { minHeight: 35 }]}>
            <View style={[styles.cell, { width: '40%' }]}>
              <Text>Name and signatory :</Text>
            </View>
            <View style={[styles.cell, { width: '25%' }]}></View>
            <View style={[styles.lastCell, { width: '35%', justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 5 }]}>
              <Text style={styles.bold}>Signature</Text>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={styles.table}>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '25%' }]}><Text style={styles.textCenter}>Issue No. : 00</Text></View>
            <View style={[styles.cell, { width: '50%' }]}><Text style={styles.textCenter}>Amendment No & Date : 06 & 08.06.2026</Text></View>
            <View style={[styles.lastCell, { width: '25%' }]}><Text style={styles.textCenter}>Page No: 1-1</Text></View>
          </View>
          <View style={[styles.lastRow, { minHeight: 35 }]}>
            <View style={[styles.cell, { width: '25%', justifyContent: 'flex-end', paddingBottom: 5 }]}><Text style={styles.textCenter}>Issue Date: 20.01.2023</Text></View>
            <View style={[styles.cell, { width: '37.5%', justifyContent: 'flex-end', paddingBottom: 5 }]}><Text>Prepared by:</Text></View>
            <View style={[styles.lastCell, { width: '37.5%', justifyContent: 'flex-end', paddingBottom: 5 }]}><Text>Reviewed & Approved by:</Text></View>
          </View>
        </View>

      </Page>
    </Document>
  );
};
