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
    paddingTop: 24,
    paddingBottom: 24,
    paddingHorizontal: 28,
    fontFamily: 'Open Sans',
    fontSize: 8,
    lineHeight: 1.15,
    color: '#000'
  },
  table: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#000',
    marginBottom: 20,
    flexDirection: 'column'
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderColor: '#000',
    minHeight: 18,
  },
  lastRow: {
    flexDirection: 'row',
    minHeight: 18,
  },
  cell: {
    paddingHorizontal: 4,
    paddingVertical: 2.5,
    borderRightWidth: 1,
    borderColor: '#000',
    justifyContent: 'center'
  },
  lastCell: {
    paddingHorizontal: 4,
    paddingVertical: 2.5,
    justifyContent: 'center'
  },
  subCell: {
    paddingHorizontal: 4,
    paddingVertical: 2.5,
    minHeight: 19,
    flex: 1,
    justifyContent: 'center'
  },
  headerTitle: {
    fontFamily: 'Times-Bold',
    fontSize: 13,
    fontWeight: 'bold',
    textAlign: 'center',
    padding: 4
  },
  bold: {
    fontWeight: 600
  },
  textCenter: {
    textAlign: 'center'
  },
  checkbox: {
    width: 9,
    height: 9,
    borderWidth: 1,
    borderColor: '#000',
    alignSelf: 'center',
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
  jobs?: any[];
  originalJob?: any;
  job?: any;
  client: any;
  jobEntry?: any;
  logoUrl?: string;
  preparedBySignUrl?: string;
  approvedBySignUrl?: string;
}

const formatDate = (dateStr: string | null | undefined) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB');
};

const formatSampleCode = (code: string) => {
  if (!code) return '';
  return code.replace(/([/,])/g, '$1\u200B');
};

export const JobCardPDF = ({ data }: { data: JobCardData }) => {
  const { jobs, originalJob, job: fallbackJob, client, logoUrl, preparedBySignUrl, approvedBySignUrl } = data;

  const targetJobs = jobs && jobs.length > 0 ? jobs : (originalJob ? [originalJob] : (fallbackJob ? [fallbackJob] : []));
  const primaryJob = targetJobs[0] || {};

  // Extract real Sample Code No if available, fallback to material_details_location
  let sampleCodeNo = primaryJob?.additional_details_values?.sample_code_no || '';
  if (!sampleCodeNo && primaryJob?.additional_details_values) {
    const codeKey = Object.keys(primaryJob.additional_details_values).find(k => {
      const lower = k.toLowerCase().replace(/[^a-z0-9]/g, '');
      return lower.includes('samplecode') || lower === 'code';
    });
    if (codeKey) sampleCodeNo = primaryJob.additional_details_values[codeKey];
  }
  sampleCodeNo = sampleCodeNo || primaryJob?.material_details_location || '';

  const castingDate = primaryJob?.date_of_casting ||
    primaryJob?.additional_details_values?.['Casting date'] ||
    primaryJob?.additional_details_values?.['Date of Casting'] ||
    primaryJob?.additional_details_values?.['Casting Date'] ||
    primaryJob?.additional_details_values?.casting_date;

  const receivingDate = primaryJob?.date_of_receiving || data.jobEntry?.inward_on;

  // Aggregate Test Parameters and Methods (deduplicated)
  const aggregatedParameters = Array.from(
    new Set(
      targetJobs
        .map(j => j?.test_master?.specific_test || j?.test_master?.component_parameter || j?.test_parameters || '')
        .filter(Boolean)
    )
  ).join(', ');

  const aggregatedMethods = Array.from(
    new Set(
      targetJobs
        .map(j => j?.test_master?.test_method || j?.test_method || '')
        .filter(Boolean)
    )
  ).join(', ');

  const aggregatedTestingDays = Array.from(
    new Set(
      targetJobs
        .map(j => j?.testing_day || j?.testing_age)
        .filter(Boolean)
    )
  ).join(', ');

  return (
    <Document>
      <Page size="A4" style={[styles.page, { display: 'flex', flexDirection: 'column' }]}>

        {/* HEADER SECTION */}
        <View style={styles.table}>
          <View style={[styles.row, { minHeight: 40, paddingVertical: 3, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', position: 'relative' }]}>
            <Image src={logoUrl || "/CMTS LOGO.png"} style={{ width: 32, height: 32, objectFit: 'contain', position: 'absolute', left: 10 }} />
            <Text style={{ fontFamily: 'Times-Bold', fontSize: 13, fontWeight: 'bold', width: '100%', textAlign: 'center' }}>
              CONSTROTRAIT MATERIAL TESTING AND SERVICES LLP WAI
            </Text>
          </View>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '68%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Doc Name .: Customer&#39;s Service Request Form</Text>
            </View>
            <View style={[styles.lastCell, { width: '32%' }]}>
              <Text style={[styles.bold, styles.textCenter]}>Doc. No. QR/16</Text>
            </View>
          </View>
          <View style={[styles.lastRow, { padding: 3 }]}>
            <Text style={[styles.bold, styles.textCenter, { width: '100%' }]}>Record As per ISO/IEC17025:2017</Text>
          </View>
        </View>

        {/* CUSTOMER DETAILS SECTION */}
        <View style={styles.table}>
          {/* Row 1 */}
          <View style={[styles.row, { minHeight: 24 }]}>
            <View style={[styles.cell, { width: '57%' }]}>
              <Text>1. Name of Customer / Agency:</Text>
              {client?.name ? (
                <Text style={styles.bold}>
                  {client?.name || ''}
                  {client?.company_name ? ` - ${client.company_name}` : ''}
                  {client?.agency_name ? ` (${client.agency_name})` : ''}
                </Text>
              ) : null}
            </View>
            <View style={[styles.lastCell, { width: '43%' }]}>
              <Text>Date of Sample Received: {receivingDate ? formatDate(receivingDate) : ''}</Text>
            </View>
          </View>

          {/* Row 2 */}
          <View style={[styles.row, { minHeight: 38 }]}>
            <View style={[styles.cell, { width: '57%' }]}>
              <Text>2. Address of Customer / Agency:</Text>
              {client?.address ? <Text style={styles.bold}>{client?.address}</Text> : null}
            </View>
            <View style={{ width: '43%', flexDirection: 'column' }}>
              <View style={[styles.subCell, { borderBottomWidth: 1, borderColor: '#000', minHeight: 19 }]}>
                <Text>Date of Casting: {castingDate ? formatDate(castingDate) : ''}</Text>
              </View>
              <View style={[styles.subCell, { minHeight: 19 }]}>
                <Text>Date of Testing: {primaryJob?.date_of_testing ? formatDate(primaryJob?.date_of_testing) : ''}</Text>
              </View>
            </View>
          </View>

          {/* Row 3, 4 & 5 */}
          <View style={[styles.row, { minHeight: 110 }]}>
            <View style={{ width: '57%', flexDirection: 'column', borderRightWidth: 1, borderColor: '#000' }}>
              <View style={{ flex: 1, paddingHorizontal: 4, paddingVertical: 2, borderBottomWidth: 1, borderColor: '#000', justifyContent: 'center', minHeight: 32 }}>
                <Text>3. Name of site</Text>
                {(client?.site_name || client?.project_name || client?.division) ? (
                  <Text style={styles.bold}>
                    {client?.site_name || ''}
                    {client?.project_name ? ` / ${client.project_name}` : ''}
                    {client?.division ? ` / ${client.division}` : ''}
                  </Text>
                ) : null}
              </View>
              <View style={{ flex: 1, paddingHorizontal: 4, paddingVertical: 2, borderBottomWidth: 1, borderColor: '#000', justifyContent: 'center', minHeight: 32 }}>
                <Text>4. Name of Dispatching the Report:</Text>
                {(client?.dispatch_name || data.jobEntry?.dispatch_name) ? (
                  <Text style={styles.bold}>{client?.dispatch_name || data.jobEntry?.dispatch_name}</Text>
                ) : null}
              </View>
              <View style={{ flex: 1.4, paddingHorizontal: 4, paddingVertical: 2, justifyContent: 'flex-start', minHeight: 46 }}>
                <Text>5. Address of Dispatching the Report:</Text>
                {(client?.dispatch_address || data.jobEntry?.dispatch_address) ? (
                  <Text style={styles.bold}>{client?.dispatch_address || data.jobEntry?.dispatch_address}</Text>
                ) : null}
              </View>
            </View>
            <View style={{ width: '43%', flexDirection: 'column' }}>
              <View style={{ paddingHorizontal: 4, paddingVertical: 3, borderBottomWidth: 1, borderColor: '#000', minHeight: 64, justifyContent: 'center' }}>
                <Text style={{ marginBottom: 3 }}>CONTACT :-</Text>
                <Text style={{ marginBottom: 5 }}>Person Name : {client?.contact_person || ''}</Text>
                <Text style={{ marginBottom: 5 }}>Phone/ Mobile : {client?.mobile || ''}</Text>
                <Text>E-mail : {client?.email || ''}</Text>
              </View>
              <View style={{ flex: 1, paddingHorizontal: 4, paddingVertical: 3, justifyContent: 'flex-start', minHeight: 46 }}>
                <Text>Mode of Dispatch of Report : {client?.dispatch_mode || client?.dispatch_method || client?.collected_by || data.jobEntry?.collected_by || ''}</Text>
              </View>
            </View>
          </View>

          {/* Row 6: Full Width */}
          <View style={[styles.row, { minHeight: 18, paddingHorizontal: 4, paddingVertical: 2, justifyContent: 'flex-start', alignItems: 'center' }]}>
            <Text>TESTING REQURIED ON : {primaryJob?.material_description ? <Text style={styles.bold}>{primaryJob.material_description}</Text> : ''}</Text>
          </View>

          {/* Row 7: Full Width */}
          <View style={[styles.lastRow, { minHeight: 18, paddingHorizontal: 4, paddingVertical: 2, justifyContent: 'flex-start', alignItems: 'center' }]}>
            <Text>CUSTOMER REFERENCE NO : {data.jobEntry?.letter_reference ? <Text style={styles.bold}>{data.jobEntry.letter_reference}</Text> : ''}</Text>
          </View>
        </View>

        {/* TESTING REQUIRED TABLE */}
        <View style={styles.table}>
          <View style={[styles.row, { padding: 4, justifyContent: 'center' }]}>
            <Text style={[styles.bold, styles.textCenter, { width: '100%' }]}>TESTING REQUIRED</Text>
          </View>

          <View style={styles.row}>
            <View style={[styles.cell, { width: '8%', alignItems: 'center' }]}><Text style={styles.textCenter}>UID . No.</Text></View>
            <View style={[styles.cell, { width: '21%', alignItems: 'center' }]}><Text style={styles.textCenter}>Material Details</Text></View>
            <View style={[styles.cell, { width: '8%', alignItems: 'center' }]}><Text style={styles.textCenter}>Testing Day</Text></View>
            <View style={[styles.cell, { width: '18%', alignItems: 'center' }]}><Text style={styles.textCenter}>Sample Code No.</Text></View>
            <View style={[styles.cell, { width: '8%', alignItems: 'center' }]}><Text style={styles.textCenter}>No. of sample</Text></View>
            <View style={[styles.cell, { width: '18%', alignItems: 'center' }]}><Text style={styles.textCenter}>Test Parameters</Text></View>
            <View style={[styles.lastCell, { width: '19%', alignItems: 'center' }]}><Text style={styles.textCenter}>Test Method</Text></View>
          </View>

          {/* Data Row */}
          <View style={[styles.row, { minHeight: 38 }]}>
            <View style={[styles.cell, { width: '8%', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={styles.textCenter}>{primaryJob?.uid_label || ''}</Text>
            </View>
            <View style={[styles.cell, { width: '21%', justifyContent: 'center' }]}>
              <Text>{primaryJob?.material_description || ''}</Text>
            </View>
            <View style={[styles.cell, { width: '8%', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={styles.textCenter}>{aggregatedTestingDays || primaryJob?.testing_day || ''}</Text>
            </View>
            <View style={[styles.cell, { width: '18%', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={[styles.textCenter, { fontSize: 7, lineHeight: 1.2 }]}>
                {formatSampleCode(sampleCodeNo)}
              </Text>
            </View>
            <View style={[styles.cell, { width: '8%', alignItems: 'center', justifyContent: 'center' }]}>
              <Text style={styles.textCenter}>{primaryJob?.sample_quantity || ''}</Text>
            </View>
            <View style={[styles.cell, { width: '18%', justifyContent: 'center' }]}>
              <Text>{aggregatedParameters}</Text>
            </View>
            <View style={[styles.lastCell, { width: '19%', justifyContent: 'center' }]}>
              <Text>{aggregatedMethods}</Text>
            </View>
          </View>

          {/* Checkboxes Area */}
          <View style={styles.lastRow}>
            {/* Checklist text (spanning Cols 1 to 5: 63%) */}
            <View style={{ width: '63%', borderRightWidth: 1, borderColor: '#000', flexDirection: 'column' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: '#000', minHeight: 18 }}>
                <Text>1. Method of testing capability and resources acceptable</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 4, borderBottomWidth: 1, borderColor: '#000', minHeight: 18 }}>
                <Text>2. Terms and Condition of testing acceptable as per review remarks</Text>
              </View>
              <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 3, paddingHorizontal: 4, minHeight: 18 }}>
                <Text>3. Customer request statement of conformity</Text>
              </View>
            </View>

            {/* Checkboxes column (under Test Parameters: 18%) */}
            <View style={{ width: '18%', borderRightWidth: 1, borderColor: '#000', flexDirection: 'column' }}>
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 3, borderBottomWidth: 1, borderColor: '#000', minHeight: 18 }}>
                <View style={styles.checkbox} />
              </View>
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 3, borderBottomWidth: 1, borderColor: '#000', minHeight: 18 }}>
                <View style={styles.checkbox} />
              </View>
              <View style={{ alignItems: 'center', justifyContent: 'center', paddingVertical: 3, minHeight: 18 }}>
                <View style={styles.checkbox} />
              </View>
            </View>

            {/* Signature Of Customer (under Test Method: 19%) */}
            <View style={[styles.lastCell, { width: '19%', justifyContent: 'flex-end', paddingBottom: 6, alignItems: 'center' }]}>
              <Text style={styles.textCenter}>Signature Of Customer</Text>
            </View>
          </View>
        </View>

        {/* FOR OFFICE USE ONLY */}
        <View style={styles.table}>
          <View style={[styles.row, { padding: 4, justifyContent: 'center' }]}>
            <Text style={[styles.bold, styles.textCenter, { width: '100%', fontSize: 10.5 }]}>FOR OFFICE USE ONLY</Text>
          </View>
          <View style={[styles.row, { minHeight: 22 }]}>
            <View style={[styles.lastCell, { flex: 1 }]}>
              <Text>Review Remarks:</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row' }}>
            {/* Left Column (57% width): 7 equal-height checklist rows */}
            <View style={{ width: '57%', borderRightWidth: 1, borderColor: '#000', flexDirection: 'column' }}>
              <View style={[styles.row, { minHeight: 18 }]}>
                <View style={[styles.cell, { width: '65%' }]}>
                  <Text>1. Requirements defined and understood :</Text>
                </View>
                <View style={[styles.lastCell, { width: '35%' }]}></View>
              </View>

              <View style={[styles.row, { minHeight: 18 }]}>
                <View style={[styles.cell, { width: '65%' }]}>
                  <Text>2. Capability and Resource available :</Text>
                </View>
                <View style={[styles.lastCell, { width: '35%' }]}></View>
              </View>

              <View style={[styles.row, { minHeight: 18 }]}>
                <View style={[styles.cell, { width: '65%' }]}>
                  <Text>3. Condition of Sample Received :</Text>
                </View>
                <View style={[styles.lastCell, { width: '35%' }]}></View>
              </View>

              <View style={[styles.row, { minHeight: 18 }]}>
                <View style={[styles.cell, { width: '65%' }]}>
                  <Text>4. Quantity of Sample Received :</Text>
                </View>
                <View style={[styles.lastCell, { width: '35%' }]}></View>
              </View>

              <View style={[styles.row, { minHeight: 18 }]}>
                <View style={[styles.cell, { width: '65%' }]}>
                  <Text>5. Discussion with Customer, if any :</Text>
                </View>
                <View style={[styles.lastCell, { width: '35%' }]}></View>
              </View>

              <View style={[styles.row, { minHeight: 18 }]}>
                <View style={[styles.cell, { width: '65%' }]}>
                  <Text>Test Assigned To :</Text>
                </View>
                <View style={[styles.lastCell, { width: '35%' }]}></View>
              </View>

              <View style={[styles.lastRow, { minHeight: 18 }]}>
                <View style={[styles.cell, { width: '65%' }]}>
                  <Text>Name and signatory :</Text>
                </View>
                <View style={[styles.lastCell, { width: '35%' }]}></View>
              </View>
            </View>

            {/* Right Column (43% width): UID No, Date, and contiguous Signature box */}
            <View style={{ width: '43%', flexDirection: 'column' }}>
              <View style={[styles.row, { minHeight: 18 }]}>
                <View style={[styles.cell, { width: '58%', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.textCenter}>UID No. :</Text>
                </View>
                <View style={[styles.lastCell, { width: '42%' }]}></View>
              </View>

              <View style={[styles.row, { minHeight: 18 }]}>
                <View style={[styles.cell, { width: '58%', alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={styles.textCenter}>Date :</Text>
                </View>
                <View style={[styles.lastCell, { width: '42%' }]}></View>
              </View>

              <View style={[styles.lastRow, { minHeight: 90, flexDirection: 'column', justifyContent: 'flex-end' }]}>
                <View style={{ flexDirection: 'row', width: '100%', paddingBottom: 6 }}>
                  <View style={{ width: '58%' }} />
                  <View style={{ width: '42%', alignItems: 'center', justifyContent: 'center' }}>
                    <Text style={styles.bold}>Signature</Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* FOOTER */}
        <View style={[styles.table, { marginBottom: 0 }]}>
          <View style={styles.row}>
            <View style={[styles.cell, { width: '25%' }]}><Text style={styles.textCenter}>Issue No. : 00</Text></View>
            <View style={[styles.cell, { width: '50%' }]}><Text style={styles.textCenter}>Amendment No & Date : 06 & 08.06.2026</Text></View>
            <View style={[styles.lastCell, { width: '25%' }]}><Text style={styles.textCenter}>Page No: 1-1</Text></View>
          </View>
          <View style={[styles.lastRow, { minHeight: 38 }]}>
            <View style={[styles.cell, { width: '25%', justifyContent: 'center', alignItems: 'center' }]}>
              <Text style={styles.textCenter}>Issue Date: 20.01.2023</Text>
            </View>
            <View style={[styles.cell, { width: '37.5%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 6 }]}>
              <Text>Prepared by: </Text>
              <Image src={preparedBySignUrl || "/Sanket_sir-removebg-preview.png"} style={{ width: 55, height: 26, objectFit: 'contain' }} />
            </View>
            <View style={[styles.lastCell, { width: '37.5%', flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-start', paddingHorizontal: 6 }]}>
              <Text>Reviewed & Approved by: </Text>
              <Image src={approvedBySignUrl || "/MUKUND_GAIKWAD_SIGN-removebg-preview.png"} style={{ width: 55, height: 26, objectFit: 'contain' }} />
            </View>
          </View>
        </View>

      </Page>
    </Document>
  );
};
