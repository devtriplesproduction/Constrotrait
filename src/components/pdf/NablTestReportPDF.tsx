import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 13, textAlign: "center", fontFamily: "Helvetica-Bold" },
  acc: { textAlign: "center", fontSize: 8, marginTop: 2, marginBottom: 6 },
  heading: { textAlign: "center", fontFamily: "Helvetica-Bold", fontSize: 11, marginBottom: 8 },
  row: { flexDirection: "row", borderBottomWidth: 0.5, borderColor: "#000", paddingVertical: 2 },
  label: { width: "32%", fontFamily: "Helvetica-Bold" },
  value: { width: "68%" },
  tableHeader: { flexDirection: "row", backgroundColor: "#eee", borderWidth: 1, borderColor: "#000", padding: 3, fontFamily: "Helvetica-Bold", marginTop: 10 },
  tableRow: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000", padding: 3 },
  note: { marginTop: 8, fontSize: 8 },
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
function resultRows(tests: any[]) {
  const out: any[] = [];
  tests.forEach((t) => (t.test_result_rows || []).forEach((r: any) => out.push(r)));
  return out;
}

export function NablTestReportPDF({ report }: { report: any }) {
  const job = report.job_entries;
  const client = job?.clients || {};
  const tests = linesOf(report);
  const first = tests[0] || {};
  const results = resultRows(tests);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CONSTROTRAIT MATERIAL TESTING AND SERVICES LLP</Text>
        <Text style={styles.acc}>ISO/IEC 17025:2017 Accredited Testing Laboratory (NABL) Vide certificate number TC-16212</Text>
        <Text style={styles.heading}>TEST REPORT</Text>
        <View style={styles.row}><Text style={styles.label}>ULR No.</Text><Text style={styles.value}>{report.ulr_number || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Report No.</Text><Text style={styles.value}>{report.report_no || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>UID</Text><Text style={styles.value}>{uidOf(report)}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Name Of Customer</Text><Text style={styles.value}>{client.name || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Address Of Customer</Text><Text style={styles.value}>{client.address || client.site_name || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Name of Site</Text><Text style={styles.value}>{client.site_name || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Details of Material</Text><Text style={styles.value}>{first.material_description || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Date Of Receipt of Sample</Text><Text style={styles.value}>{first.date_of_receiving || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Date Of Casting</Text><Text style={styles.value}>{first.date_of_casting || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Date Of Start of Testing</Text><Text style={styles.value}>{first.date_of_testing || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Date Of Finish of Testing</Text><Text style={styles.value}>{first.date_of_testing || ""}</Text></View>
        <View style={styles.tableHeader}>
          <Text style={{ width: "8%" }}>Sr</Text>
          <Text style={{ width: "14%" }}>ID mark</Text>
          <Text style={{ width: "12%" }}>L mm</Text>
          <Text style={{ width: "12%" }}>W mm</Text>
          <Text style={{ width: "14%" }}>Area</Text>
          <Text style={{ width: "14%" }}>Load kN</Text>
          <Text style={{ width: "26%" }}>Strength N/mm2</Text>
        </View>
        {results.map((r: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <Text style={{ width: "8%" }}>{String(r.sr_no || i + 1)}</Text>
            <Text style={{ width: "14%" }}>{r.id_mark || ""}</Text>
            <Text style={{ width: "12%" }}>{r.length_mm ?? ""}</Text>
            <Text style={{ width: "12%" }}>{r.width_mm ?? ""}</Text>
            <Text style={{ width: "14%" }}>{r.area_mm2 ?? ""}</Text>
            <Text style={{ width: "14%" }}>{r.load_kn ?? ""}</Text>
            <Text style={{ width: "26%" }}>{r.strength_nmm2 ?? r.result_value ?? ""}</Text>
          </View>
        ))}
        <Text style={styles.note}>1) Results relate only to the items tested.</Text>
        <Text style={styles.note}>2) This result is valid at the time and under conditions specified herein.</Text>
        <View style={styles.foot}>
          <Text>Reviewed By</Text>
          <Text>Authorized Signatory</Text>
        </View>
        <Text style={styles.addr}>S.No.57/2B/3, Near Virat Nagar Bus Stop, Songirwadi, Wai-412803</Text>
      </Page>
    </Document>
  );
}
