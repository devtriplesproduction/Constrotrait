import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

const styles = StyleSheet.create({
  page: { padding: 28, fontSize: 9, fontFamily: "Helvetica" },
  title: { fontSize: 13, textAlign: "center", fontFamily: "Helvetica-Bold", marginBottom: 4 },
  banner: { textAlign: "center", marginBottom: 10, fontSize: 10, fontFamily: "Helvetica-Bold" },
  sub: { textAlign: "center", marginBottom: 8, fontSize: 9 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderColor: "#000", paddingVertical: 3 },
  label: { width: "28%", fontFamily: "Helvetica-Bold" },
  value: { width: "72%" },
  tableHeader: { flexDirection: "row", backgroundColor: "#eee", borderWidth: 1, borderColor: "#000", padding: 4, fontFamily: "Helvetica-Bold" },
  tableRow: { flexDirection: "row", borderLeftWidth: 1, borderRightWidth: 1, borderBottomWidth: 1, borderColor: "#000", padding: 4 },
  footer: { marginTop: 24, fontSize: 8 },
});

function linesOf(report: any) {
  return (report.lab_report_lines || []).map((l: any) => l.job_entry_tests).filter(Boolean);
}

export function QcTestReportPDF({ report }: { report: any }) {
  const job = report.job_entries;
  const client = job?.clients;
  const tests = linesOf(report);

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>CONSTROTRAIT MATERIAL TESTING AND SERVICES LLP, WAI</Text>
        <Text style={styles.banner}>TEST REPORT — NOT UNDER NABL ACCREDITATION</Text>
        <Text style={styles.sub}>Report No: {report.report_no}    QC No: {report.qc_number || "—"}</Text>

        <View style={styles.row}><Text style={styles.label}>Customer</Text><Text style={styles.value}>{client?.name || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Site</Text><Text style={styles.value}>{client?.site_name || ""}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Job UID</Text><Text style={styles.value}>{String(job?.uid ?? "")}</Text></View>

        <View style={[styles.tableHeader, { marginTop: 12 }]}>
          <Text style={{ width: "35%" }}>Test</Text>
          <Text style={{ width: "25%" }}>Method</Text>
          <Text style={{ width: "25%" }}>Material</Text>
          <Text style={{ width: "15%" }}>Test date</Text>
        </View>
        {tests.map((t: any, i: number) => (
          <View key={i} style={styles.tableRow}>
            <Text style={{ width: "35%" }}>{t.test_master?.specific_test || t.test_master?.component_parameter || ""}</Text>
            <Text style={{ width: "25%" }}>{t.test_master?.test_method || t.test_method || ""}</Text>
            <Text style={{ width: "25%" }}>{t.material_description || ""}</Text>
            <Text style={{ width: "15%" }}>{t.date_of_testing || ""}</Text>
          </View>
        ))}

        <Text style={styles.footer}>
          This document does not carry the NABL symbol or a ULR. It must not be presented as an accredited certificate.
        </Text>
      </Page>
    </Document>
  );
}
