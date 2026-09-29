import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 13, textAlign: "center", fontFamily: "Helvetica-Bold" },
  iso: { textAlign: "center", fontSize: 8, marginTop: 2, marginBottom: 4 },
  heading: { textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#000", paddingVertical: 2 },
  label: { width: "32%", fontFamily: "Helvetica-Bold" },
  value: { width: "68%" },
  tableHeader: { flexDirection: "row", backgroundColor: "#eee", borderWidth: 1, borderColor: "#000", padding: 3, fontFamily: "Helvetica-Bold", marginTop: 10 },
  tableRow: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000", padding: 3 },
  note: { marginTop: 10, fontSize: 8 },
  foot: { marginTop: 20, flexDirection: "row", justifyContent: "space-between" },
  addr: { marginTop: 16, fontSize: 8, textAlign: "center" },
});

function linesOf(report: any) {
  return (report.lab_report_lines || []).map((l: any) => l.job_entry_tests).filter(Boolean);
}
function uidOf(report: any) {
  const j = report.job_entries;
  return String(j?.uid_label || j?.uid || "");
}

export function QcTestReportPDF({ report }: { report: any }) {
  const job = report.job_entries;
  const client = job?.clients || {};
  const tests = linesOf(report);
  const first = tests[0] || {};

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CONSTROTRAIT MATERIAL TESTING AND SERVICES LLP</Text>
        <Text style={styles.iso}>ISO 9001:2015  ISO 14001:2015  ISO 45001:2018</Text>
        <Text style={styles.heading}>TEST REPORT</Text>
        <View style={styles.row}><Text style={styles.label}>Report No.</Text><Text style={styles.value}>{report.report_no || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>UID</Text><Text style={styles.value}>{uidOf(report)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Name Of Work</Text><Text style={styles.value}>{first.test_master?.specific_test || first.test_master?.component_parameter || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Name Of Customer</Text><Text style={styles.value}>{client.name || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Address Of Customer</Text><Text style={styles.value}>{client.address || client.site_name || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Name of Site</Text><Text style={styles.value}>{client.site_name || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Details Of Material</Text><Text style={styles.value}>{first.material_description || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Date Of Receipt Of Sample</Text><Text style={styles.value}>{first.date_of_receiving || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Date Of Start Of Testing</Text><Text style={styles.value}>{first.date_of_testing || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Date Of Finish Of Testing</Text><Text style={styles.value}>{first.date_of_testing || ""}</Text></View>

        <View style={styles.tableHeader}>
          <Text style={{ width: "8%" }}>Sr.</Text>
          <Text style={{ width: "32%" }}>Particulars</Text>
          <Text style={{ width: "30%" }}>Method</Text>
          <Text style={{ width: "30%" }}>Material / Date</Text>
        </View>
        {tests.map((t: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <Text style={{ width: "8%" }}>{i + 1}</Text>
            <Text style={{ width: "32%" }}>{t.test_master?.specific_test || t.test_master?.component_parameter || ""}</Text>
            <Text style={{ width: "30%" }}>{t.test_master?.test_method || t.test_method || ""}</Text>
            <Text style={{ width: "30%" }}>{t.material_description || t.date_of_testing || ""}</Text>
          </View>
        ))}

        <Text style={styles.note}>1) Results relate only to the items tested.</Text>
        <Text style={styles.note}>This report is not under NABL accreditation. The NABL symbol shall not be used on this sheet.</Text>
        <View style={styles.foot}>
          <Text>Reviewed By</Text>
          <Text>Authorized Signatory</Text>
        </View>
        <Text style={styles.addr}>S.No.57/2B/3, Near Virat Nagar Bus Stop, Songirwadi, Wai-412803</Text>
      </Page>
    </Document>
  );
}
