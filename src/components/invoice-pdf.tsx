"use client";

import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from "@react-pdf/renderer";
import type { AnalysisResult } from "@/types";

Font.register({
  family: "Helvetica",
  fonts: [
    { src: "Helvetica" },
    { src: "Helvetica-Bold", fontWeight: "bold" },
  ],
});

const s = StyleSheet.create({
  page: {
    padding: 48,
    fontSize: 10,
    fontFamily: "Helvetica",
    color: "#18181b",
  },
  header: {
    textAlign: "center",
    marginBottom: 32,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 10,
    color: "#71717a",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  label: {
    fontSize: 8,
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 2,
  },
  value: {
    fontSize: 11,
    fontWeight: "bold",
  },
  table: {
    marginBottom: 24,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e4e4e7",
    paddingBottom: 6,
    marginBottom: 8,
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 6,
    borderBottomWidth: 0.5,
    borderBottomColor: "#f4f4f5",
  },
  colService: { width: "40%" },
  colHours: { width: "15%", textAlign: "right" },
  colRate: { width: "20%", textAlign: "right" },
  colAmount: { width: "25%", textAlign: "right" },
  thText: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  serviceDesc: {
    fontSize: 8,
    color: "#71717a",
    marginTop: 2,
  },
  emergencyBadge: {
    fontSize: 7,
    color: "#f59e0b",
    marginLeft: 4,
  },
  totalRow: {
    flexDirection: "row",
    borderTopWidth: 2,
    borderTopColor: "#18181b",
    paddingTop: 10,
    marginTop: 4,
  },
  totalLabel: {
    width: "40%",
    fontSize: 11,
    color: "#71717a",
  },
  totalHours: {
    width: "15%",
    textAlign: "right",
    fontSize: 11,
    fontWeight: "bold",
  },
  totalSpacer: {
    width: "20%",
  },
  totalAmount: {
    width: "25%",
    textAlign: "right",
    fontSize: 14,
    fontWeight: "bold",
  },
  section: {
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 0.5,
    borderTopColor: "#e4e4e7",
  },
  sectionTitle: {
    fontSize: 8,
    fontWeight: "bold",
    color: "#71717a",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 8,
  },
  bulletItem: {
    fontSize: 10,
    marginBottom: 3,
    paddingLeft: 8,
  },
  bodyText: {
    fontSize: 10,
    lineHeight: 1.5,
    color: "#27272a",
  },
  footer: {
    position: "absolute",
    bottom: 32,
    left: 48,
    right: 48,
    textAlign: "center",
    fontSize: 8,
    color: "#a1a1aa",
  },
});

interface InvoicePDFProps {
  result: AnalysisResult;
}

export function InvoicePDF({ result }: InvoicePDFProps) {
  const inv = result.invoice;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Consulting Services Invoice</Text>
          <Text style={s.subtitle}>{inv.invoice_number}</Text>
        </View>

        {/* Bill To / Date */}
        <View style={s.row}>
          <View>
            <Text style={s.label}>Bill To</Text>
            <Text style={s.value}>{inv.client_name}</Text>
          </View>
          <View style={{ textAlign: "right" }}>
            <Text style={s.label}>Date</Text>
            <Text style={s.value}>{inv.date}</Text>
          </View>
        </View>

        {/* Line Items Table */}
        <View style={s.table}>
          <View style={s.tableHeader}>
            <View style={s.colService}>
              <Text style={s.thText}>Service</Text>
            </View>
            <View style={s.colHours}>
              <Text style={s.thText}>Hours</Text>
            </View>
            <View style={s.colRate}>
              <Text style={s.thText}>Rate</Text>
            </View>
            <View style={s.colAmount}>
              <Text style={s.thText}>Amount</Text>
            </View>
          </View>

          {inv.line_items.map((item, i) => (
            <View key={i} style={s.tableRow}>
              <View style={s.colService}>
                <Text>
                  {item.service}
                  {item.is_emergency && (
                    <Text style={s.emergencyBadge}> [EMERGENCY]</Text>
                  )}
                </Text>
                <Text style={s.serviceDesc}>{item.description}</Text>
              </View>
              <View style={s.colHours}>
                <Text>{item.hours}</Text>
              </View>
              <View style={s.colRate}>
                <Text>${item.rate.toFixed(2)}</Text>
              </View>
              <View style={s.colAmount}>
                <Text>${item.amount.toFixed(2)}</Text>
              </View>
            </View>
          ))}

          {/* Total */}
          <View style={s.totalRow}>
            <Text style={s.totalLabel}>Total</Text>
            <Text style={s.totalHours}>{inv.total_hours}</Text>
            <Text style={s.totalSpacer}></Text>
            <Text style={s.totalAmount}>${inv.total_amount.toFixed(2)}</Text>
          </View>
        </View>

        {/* Deliverables */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Deliverables</Text>
          {result.deliverables.map((d, i) => (
            <Text key={i} style={s.bulletItem}>
              {"\u2022"} {d}
            </Text>
          ))}
        </View>

        {/* Business Impact */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>Business Impact</Text>
          <Text style={s.bodyText}>{inv.business_impact}</Text>
        </View>

        {/* Risks Avoided */}
        {result.risks_avoided.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionTitle}>Risks Mitigated</Text>
            {result.risks_avoided.map((r, i) => (
              <Text key={i} style={s.bulletItem}>
                {"\u2022"} {r}
              </Text>
            ))}
          </View>
        )}

        {/* Footer */}
        <Text style={s.footer}>
          {inv.invoice_number} — Generated {inv.date}
        </Text>
      </Page>
    </Document>
  );
}
