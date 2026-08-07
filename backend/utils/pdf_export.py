import os
import io
import tempfile
from datetime import datetime

import matplotlib
matplotlib.use("Agg")  # Non-interactive backend for headless PDF generation
import matplotlib.pyplot as plt

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

# =========================================================
# NUMBERED CANVAS FOR "Page X of Y" & RUNNING FOOTERS
# =========================================================
class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, report_title="Executive Analytics Report", **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []
        self.report_title = report_title

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            super().showPage()
        super().save()

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))

        # Running Header on Pages 2+
        if self._pageNumber > 1:
            self.drawString(54, 750, "Crescent Steel & Allied Products Ltd.  |  AI PPE Monitoring System")
            self.drawRightString(612 - 54, 750, self.report_title)
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 742, 612 - 54, 742)

        # Running Footer on All Pages
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 45, 612 - 54, 45)

        self.drawString(54, 32, f"Confidential  |  {self.report_title}  |  Generated Automatically")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(612 - 54, 32, page_str)
        self.restoreState()


# =========================================================
# STYLES HELPER
# =========================================================
def _get_pdf_styles():
    styles = getSampleStyleSheet()
    return {
        "company": ParagraphStyle("CoName", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=11, leading=13, textColor=colors.HexColor("#1E3A8A")),
        "title": ParagraphStyle("TitleText", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=16, leading=20, textColor=colors.HexColor("#0F172A")),
        "subtitle": ParagraphStyle("SubText", parent=styles["Normal"], fontName="Helvetica", fontSize=8.5, leading=11, textColor=colors.HexColor("#64748B")),
        "h2": ParagraphStyle("H2Heading", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=colors.HexColor("#1E293B"), spaceBefore=10, spaceAfter=6),
        "body": ParagraphStyle("BodyTextCustom", parent=styles["Normal"], fontName="Helvetica", fontSize=9, leading=13, textColor=colors.HexColor("#334155")),
        "kpi_lbl": ParagraphStyle("KPILbl", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=7.5, leading=9, textColor=colors.HexColor("#64748B"), alignment=1),
        "kpi_val": ParagraphStyle("KPIVal", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=13, leading=15, textColor=colors.HexColor("#1E3A8A"), alignment=1),
        "tbl_hdr": ParagraphStyle("TblHdr", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=8.5, leading=10, textColor=colors.white, alignment=1),
        "tbl_cell": ParagraphStyle("TblCell", parent=styles["Normal"], fontName="Helvetica", fontSize=8, leading=10, textColor=colors.HexColor("#0F172A"), alignment=1),
    }


def _make_header_table(title, subtitle):
    styles = _get_pdf_styles()
    h_data = [
        [Paragraph("CRESCENT STEEL & ALLIED PRODUCTS LTD.", styles["company"]), Paragraph("AI PPE Monitoring Platform", styles["subtitle"])],
        [Paragraph(title, styles["title"]), Paragraph(subtitle, styles["subtitle"])]
    ]
    t = Table(h_data, colWidths=[340, 164])
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("ALIGN", (1, 0), (1, -1), "RIGHT"),
    ]))
    return t


# =========================================================
# 1. REPORT 1 — DAILY HSE SUMMARY PDF
# =========================================================
def generate_daily_summary_pdf(report_data, generated_by="HSE Officer"):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54)
    styles = _get_pdf_styles()
    story = []

    target_date = report_data.get("date", datetime.now().strftime("%Y-%m-%d"))
    gen_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Header
    story.append(_make_header_table("Daily HSE Summary Report", f"Report Date: {target_date}\nGen By: {generated_by}\n{gen_time}"))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1E3A8A"), spaceBefore=2, spaceAfter=10))

    # Executive Summary Paragraph
    story.append(Paragraph("1. Operational Daily Executive Summary", styles["h2"]))
    summary_text = report_data.get("executive_summary") or (
        f"Today ({target_date}), a total of {report_data.get('todays_incidents', 0)} PPE safety violations were recorded. "
        f"The facility maintained a helmet compliance rate of {report_data.get('compliance_rate', 0)}% across {report_data.get('total_workers', 0)} tracked workers. "
        f"Primary violation density occurred in '{report_data.get('highest_risk_zone', 'None')}' with an average response time of {report_data.get('avg_duration', 0)}s."
    )
    story.append(Paragraph(summary_text, styles["body"]))
    story.append(Spacer(1, 10))

    # KPI Section (6 Operational Cards)
    story.append(Paragraph("2. Today's Operational KPIs", styles["h2"]))
    kpis = [
        ("Today's Incidents", str(report_data.get("todays_incidents", 0))),
        ("Active Violations", str(report_data.get("active_incidents", 0))),
        ("Resolved Incidents", str(report_data.get("completed_incidents", 0))),
        ("Helmet Compliance", f"{report_data.get('compliance_rate', 0)}%"),
        ("Workers Monitored", str(report_data.get("total_workers", 0))),
        ("Avg Resolution Time", f"{report_data.get('avg_duration', 0)}s"),
    ]

    kpi_cells = []
    for lbl, val in kpis:
        kpi_cells.append([Paragraph(lbl, styles["kpi_lbl"]), Spacer(1, 3), Paragraph(val, styles["kpi_val"])])

    kpi_table_data = [kpi_cells[:3], kpi_cells[3:]]
    kpi_table = Table(kpi_table_data, colWidths=[168, 168, 168])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor("#1E3A8A")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(kpi_table)
    story.append(Spacer(1, 12))

    # Operational Charts (ONLY 2 Charts: Hourly Violations & Zone Breakdown)
    story.append(Paragraph("3. Today's Violation Breakdown", styles["h2"]))
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    temp_files = []

    # Chart 1: Hourly Violations (00-23)
    fig1, ax1 = plt.subplots(figsize=(6.5, 2.4), dpi=180)
    hourly_list = report_data.get("hourly_violations") or report_data.get("hourly_breakdown") or []
    if hourly_list:
        hrs = [h.get("hour", "") for h in hourly_list]
        cnts = [h.get("count", 0) for h in hourly_list]
        ax1.bar(hrs, cnts, color="#EF4444", width=0.6, edgecolor="#DC2626")
    else:
        ax1.text(0.5, 0.5, "No Hourly Violations Logged Today", ha="center", va="center", color="#64748B")
    ax1.set_title("Hourly Violations (00:00 - 23:00)", fontsize=10, fontweight="bold", color="#0F172A")
    ax1.tick_params(axis="x", rotation=45, labelsize=6)
    ax1.tick_params(axis="y", labelsize=7)
    plt.tight_layout()

    t1 = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    fig1.savefig(t1.name, format="png")
    plt.close(fig1)
    temp_files.append(t1.name)
    story.append(Image(t1.name, width=6.5*inch, height=2.4*inch))
    story.append(Spacer(1, 8))

    # Chart 2: Zone Breakdown
    fig2, ax2 = plt.subplots(figsize=(6.5, 2.4), dpi=180)
    zone_dist = report_data.get("zone_distribution") or report_data.get("zone_matrix") or []
    if zone_dist:
        zn = [z.get("zone", "Unknown") for z in zone_dist]
        zc = [z.get("count", z.get("violations", 0)) for z in zone_dist]
        ax2.bar(zn, zc, color="#3B82F6", width=0.5, edgecolor="#1D4ED8")
    else:
        ax2.text(0.5, 0.5, "No Zone Violations Logged Today", ha="center", va="center", color="#64748B")
    ax2.set_title("Today's Zone Violation Breakdown", fontsize=10, fontweight="bold", color="#0F172A")
    ax2.tick_params(axis="x", labelsize=8)
    ax2.tick_params(axis="y", labelsize=7)
    plt.tight_layout()

    t2 = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    fig2.savefig(t2.name, format="png")
    plt.close(fig2)
    temp_files.append(t2.name)
    story.append(Image(t2.name, width=6.5*inch, height=2.4*inch))
    story.append(Spacer(1, 10))

    # Top Incidents Table (Max 15 rows)
    story.append(Paragraph("4. Today's Top Incidents Log", styles["h2"]))
    tbl_headers = ["ID", "Track ID", "Timestamp", "Zone", "Violation", "Duration", "Status"]
    tbl_data = [[Paragraph(h, styles["tbl_hdr"]) for h in tbl_headers]]

    top_inc = report_data.get("top_incidents", [])[:15]
    for inc in top_inc:
        is_res = inc.get("resolved") == 1 or inc.get("status") in ["Completed", "Resolved"]
        row = [
            Paragraph(str(inc.get("id")), styles["tbl_cell"]),
            Paragraph(f"#{inc.get('track_id', 'N/A')}", styles["tbl_cell"]),
            Paragraph(str(inc.get("timestamp"))[11:19], styles["tbl_cell"]),
            Paragraph(str(inc.get("zone", "Unknown")), styles["tbl_cell"]),
            Paragraph(str(inc.get("event_type", "Helmet Missing")), styles["tbl_cell"]),
            Paragraph(f"{max(1, inc.get('duration', 0))}s", styles["tbl_cell"]),
            Paragraph("Resolved" if is_res else "Active", styles["tbl_cell"])
        ]
        tbl_data.append(row)

    inc_table = Table(tbl_data, colWidths=[40, 60, 65, 75, 120, 50, 94])
    inc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(inc_table)

    def _on_page(c, d):
        pass

    canvas_class = lambda *args, **kwargs: NumberedCanvas(*args, report_title="Daily HSE Summary Report", **kwargs)
    doc.build(story, canvasmaker=canvas_class)

    for p in temp_files:
        try:
            if os.path.exists(p): os.remove(p)
        except Exception: pass

    buffer.seek(0)
    return buffer.getvalue()


# =========================================================
# 2. REPORT 2 — INCIDENT INVESTIGATION PDF
# =========================================================
def generate_investigation_pdf(report_data, filters=None, generated_by="HSE Officer"):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54)
    styles = _get_pdf_styles()
    story = []

    filters = filters or {}
    s_d = filters.get("start_date") or "Beginning"
    e_d = filters.get("end_date") or "Today"
    z_f = filters.get("zone") or "All Zones"
    t_f = filters.get("event_type") or "All Types"
    st_f = filters.get("status") or "All Statuses"

    gen_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Header
    story.append(_make_header_table("Incident Investigation Audit Report", f"Scope: {s_d} to {e_d}\nGen By: {generated_by}\n{gen_time}"))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1E3A8A"), spaceBefore=2, spaceAfter=10))

    # Audit Scope & Parameters
    story.append(Paragraph("1. Audit Criteria & Scope Parameters", styles["h2"]))
    scope_data = [
        [
            Paragraph(f"<b>Date Range</b>: {s_d} to {e_d}", styles["body"]),
            Paragraph(f"<b>Zone Filter</b>: {z_f}", styles["body"])
        ],
        [
            Paragraph(f"<b>Violation Category</b>: {t_f}", styles["body"]),
            Paragraph(f"<b>Resolution Scope</b>: {st_f}", styles["body"])
        ]
    ]
    sc_table = Table(scope_data, colWidths=[252, 252])
    sc_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F8FAFC")),
        ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    story.append(sc_table)
    story.append(Spacer(1, 10))

    # Investigation Statistics KPIs
    story.append(Paragraph("2. Investigation KPI Summary", styles["h2"]))
    incidents = report_data.get("incidents", [])
    total_matching = report_data.get("total_matching", len(incidents))
    act_count = report_data.get("active_incidents", 0)
    res_count = report_data.get("completed_incidents", 0)
    avg_dur = report_data.get("avg_duration", 0)
    uniq_persons = report_data.get("unique_tracked_persons", len(set(i.get("track_id") for i in incidents if i.get("track_id"))))

    inv_kpis = [
        ("Matched Incidents", str(total_matching)),
        ("Resolved Incidents", str(res_count)),
        ("Active Incidents", str(act_count)),
        ("Avg Resolution", f"{avg_dur}s"),
        ("Tracked Persons", str(uniq_persons)),
    ]
    ik_cells = [[Paragraph(l, styles["kpi_lbl"]), Spacer(1, 3), Paragraph(v, styles["kpi_val"])] for l, v in inv_kpis]
    ik_table = Table([ik_cells], colWidths=[100, 100, 100, 104, 100])
    ik_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor("#1E3A8A")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(ik_table)
    story.append(Spacer(1, 12))

    # Detailed Incident Timeline Table
    story.append(Paragraph("3. Detailed Incident Audit Timeline", styles["h2"]))
    dt_headers = ["ID", "Track", "Zone", "Violation", "Start Time", "End Time", "Dur", "Status", "Snap", "Vid"]
    dt_table_data = [[Paragraph(h, styles["tbl_hdr"]) for h in dt_headers]]

    for inc in incidents[:25]:  # Detailed timeline up to 25 rows per page
        is_res = inc.get("resolved") == 1 or inc.get("status") in ["Completed", "Resolved"]
        dur_val = max(1, inc.get("duration", 0)) if is_res else inc.get("duration", 0)

        snap_icon = "Yes" if inc.get("snapshot_path") else "No"
        vid_icon = "Yes" if inc.get("video_path") else "No"

        row = [
            Paragraph(str(inc.get("id")), styles["tbl_cell"]),
            Paragraph(f"#{inc.get('track_id', 'N/A')}", styles["tbl_cell"]),
            Paragraph(str(inc.get("zone", "Unknown")), styles["tbl_cell"]),
            Paragraph(str(inc.get("event_type", "Helmet Missing")), styles["tbl_cell"]),
            Paragraph(str(inc.get("start_time") or inc.get("timestamp"))[11:19], styles["tbl_cell"]),
            Paragraph(str(inc.get("end_time") if is_res else "Ongoing")[11:19], styles["tbl_cell"]),
            Paragraph(f"{dur_val}s", styles["tbl_cell"]),
            Paragraph("Resolved" if is_res else "Active", styles["tbl_cell"]),
            Paragraph(snap_icon, styles["tbl_cell"]),
            Paragraph(vid_icon, styles["tbl_cell"]),
        ]
        dt_table_data.append(row)

    dt_table = Table(dt_table_data, colWidths=[30, 45, 55, 95, 60, 60, 35, 55, 34, 35])
    dt_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(dt_table)
    story.append(Spacer(1, 14))

    # Evidence Appendix Table
    story.append(Paragraph("4. Evidence Media Storage Appendix", styles["h2"]))
    ev_headers = ["Incident ID", "Track ID", "Snapshot Filename", "Video Filename", "Media Status"]
    ev_table_data = [[Paragraph(h, styles["tbl_hdr"]) for h in ev_headers]]

    for inc in incidents[:10]:
        s_file = os.path.basename(inc.get("snapshot_path", "")) if inc.get("snapshot_path") else "None"
        v_file = os.path.basename(inc.get("video_path", "")) if inc.get("video_path") else "None"
        m_status = "Full Evidence" if (s_file != "None" and v_file != "None") else ("Snapshot Only" if s_file != "None" else "No Media")

        ev_table_data.append([
            Paragraph(str(inc.get("id")), styles["tbl_cell"]),
            Paragraph(f"#{inc.get('track_id', 'N/A')}", styles["tbl_cell"]),
            Paragraph(s_file, styles["tbl_cell"]),
            Paragraph(v_file, styles["tbl_cell"]),
            Paragraph(m_status, styles["tbl_cell"])
        ])

    ev_table = Table(ev_table_data, colWidths=[65, 60, 150, 145, 84])
    ev_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E293B")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(ev_table)
    story.append(Spacer(1, 10))

    # Investigation Notes
    story.append(Paragraph("5. Investigation Summary & Auditor Notes", styles["h2"]))
    note_1 = f"• Total evaluated dataset contains {total_matching} matched incidents for the selected scope."
    note_2 = f"• Unique tracked worker entities involved in recorded violations: {uniq_persons}."
    note_3 = f"• Mean resolution duration across confirmed incidents is logged at {avg_dur} seconds."

    story.append(Paragraph(note_1, styles["body"]))
    story.append(Paragraph(note_2, styles["body"]))
    story.append(Paragraph(note_3, styles["body"]))

    canvas_class = lambda *args, **kwargs: NumberedCanvas(*args, report_title="Incident Investigation Audit Report", **kwargs)
    doc.build(story, canvasmaker=canvas_class)

    buffer.seek(0)
    return buffer.getvalue()


# =========================================================
# 3. REPORT 3 — EXECUTIVE ANALYTICS PDF
# =========================================================
def generate_executive_pdf(report_data, generated_by="Executive Management"):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, leftMargin=54, rightMargin=54, topMargin=54, bottomMargin=54)
    styles = _get_pdf_styles()
    story = []

    s_d = report_data.get("start_date") or "Beginning"
    e_d = report_data.get("end_date") or "Today"
    gen_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    # Header
    story.append(_make_header_table("Executive Analytics Report", f"Scope: {s_d} to {e_d}\nGen By: {generated_by}\n{gen_time}"))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=2, color=colors.HexColor("#1E3A8A"), spaceBefore=2, spaceAfter=10))

    # Executive Summary Paragraph
    story.append(Paragraph("1. Strategic Executive Summary", styles["h2"]))
    exec_summary_text = report_data.get("executive_summary") or (
        f"Executive HSE Analysis ({s_d} to {e_d}): A total of {report_data.get('total_incidents', 0)} safety incidents were recorded. "
        f"The facility achieved an overall helmet compliance index of {report_data.get('compliance_rate', 0)}%. "
        f"Primary risk intervention area is '{report_data.get('highest_risk_zone', 'None')}' with average resolution duration of {report_data.get('avg_duration', 0)}s."
    )
    story.append(Paragraph(exec_summary_text, styles["body"]))
    story.append(Spacer(1, 10))

    # Executive KPIs Grid (7 Cards in 4-column Table)
    story.append(Paragraph("2. Strategic Key Performance Indicators", styles["h2"]))
    ex_kpis = [
        ("Total Incidents", str(report_data.get("total_incidents", 0))),
        ("Compliance Rate", f"{report_data.get('compliance_rate', 0)}%"),
        ("Monitored Workers", str(report_data.get("total_workers", 0))),
        ("Avg Resolution", f"{report_data.get('avg_duration', 0)}s"),
        ("Highest Risk Zone", str(report_data.get("highest_risk_zone", "None"))),
        ("Lowest Risk Zone", str(report_data.get("lowest_risk_zone", "Green"))),
        ("Largest Incident Day", str(report_data.get("largest_incident_day", "N/A"))),
        ("Active Violations", str(report_data.get("active_incidents", 0))),
    ]
    ek_cells = [[Paragraph(l, styles["kpi_lbl"]), Spacer(1, 3), Paragraph(v, styles["kpi_val"])] for l, v in ex_kpis]
    ek_table_data = [ek_cells[:4], ek_cells[4:]]
    ek_table = Table(ek_table_data, colWidths=[126, 126, 126, 126])
    ek_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("GRID", (0, 0), (-1, -1), 1, colors.HexColor("#CBD5E1")),
        ("BOX", (0, 0), (-1, -1), 1.5, colors.HexColor("#1E3A8A")),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    story.append(ek_table)
    story.append(Spacer(1, 12))

    # Matplotlib Charts Section (ALL Strategic Analytics Charts)
    story.append(Paragraph("3. Strategic Analytics Charts", styles["h2"]))
    plt.style.use("seaborn-v0_8-whitegrid" if "seaborn-v0_8-whitegrid" in plt.style.available else "default")
    temp_files = []

    daily_data = report_data.get("daily_trend", [])

    # Chart 1: Daily Incident Volume Trend
    fig1, ax1 = plt.subplots(figsize=(6.5, 2.4), dpi=180)
    if daily_data:
        dates = [d.get("date") or d.get("day") or "" for d in daily_data]
        counts = [d.get("count", 0) for d in daily_data]
        ax1.plot(dates, counts, color="#2563EB", marker="o", linewidth=2, markersize=4, label="Volume")
        ax1.fill_between(dates, counts, color="#2563EB", alpha=0.15)
    else:
        ax1.text(0.5, 0.5, "No Daily Trend Data Available", ha="center", va="center", color="#64748B")
    ax1.set_title("Daily Incident Volume Trend", fontsize=10, fontweight="bold", color="#0F172A")
    ax1.tick_params(axis="x", rotation=30, labelsize=7)
    ax1.tick_params(axis="y", labelsize=7)
    plt.tight_layout()
    t1 = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    fig1.savefig(t1.name, format="png")
    plt.close(fig1)
    temp_files.append(t1.name)
    story.append(Image(t1.name, width=6.5*inch, height=2.4*inch))
    story.append(Spacer(1, 8))

    # Chart 2: Compliance Rate Trend
    fig2, ax2 = plt.subplots(figsize=(6.5, 2.4), dpi=180)
    if daily_data:
        dates = [d.get("date") or d.get("day") or "" for d in daily_data]
        comp = [report_data.get("compliance_rate", 100.0) for _ in daily_data]
        ax2.plot(dates, comp, color="#10B981", linewidth=2, marker="s", markersize=4)
        ax2.fill_between(dates, comp, color="#10B981", alpha=0.15)
        ax2.set_ylim(0, 105)
    else:
        ax2.text(0.5, 0.5, "No Compliance Trend Data Available", ha="center", va="center", color="#64748B")
    ax2.set_title("Helmet Compliance Rate Trend (%)", fontsize=10, fontweight="bold", color="#0F172A")
    ax2.tick_params(axis="x", rotation=30, labelsize=7)
    ax2.tick_params(axis="y", labelsize=7)
    plt.tight_layout()
    t2 = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    fig2.savefig(t2.name, format="png")
    plt.close(fig2)
    temp_files.append(t2.name)
    story.append(Image(t2.name, width=6.5*inch, height=2.4*inch))

    story.append(PageBreak())

    # Page 2: Charts Cont. & Zone Risk Matrix
    story.append(Paragraph("3. Strategic Analytics Charts (Cont.)", styles["h2"]))

    # Chart 3: Zone Monitored Workers vs Violations
    fig3, ax3 = plt.subplots(figsize=(6.5, 2.3), dpi=180)
    zone_matrix = report_data.get("zone_matrix") or report_data.get("zone_breakdown") or []
    if zone_matrix:
        import numpy as np
        zones = [z.get("zone", "Unknown") for z in zone_matrix]
        workers = [z.get("total_workers", z.get("workers", 0)) for z in zone_matrix]
        violations = [z.get("violations", z.get("count", 0)) for z in zone_matrix]
        x = np.arange(len(zones))
        w_bar = 0.35
        ax3.bar(x - w_bar/2, workers, w_bar, label="Monitored Workers", color="#64748B")
        ax3.bar(x + w_bar/2, violations, w_bar, label="Violations Logged", color="#EF4444")
        ax3.set_xticks(x)
        ax3.set_xticklabels(zones, fontsize=8)
        ax3.legend(fontsize=7, loc="upper right")
    else:
        ax3.text(0.5, 0.5, "No Zone Analytics Data Available", ha="center", va="center", color="#64748B")
    ax3.set_title("Zone Monitored Workers vs Violations Logged", fontsize=10, fontweight="bold", color="#0F172A")
    plt.tight_layout()
    t3 = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    fig3.savefig(t3.name, format="png")
    plt.close(fig3)
    temp_files.append(t3.name)
    story.append(Image(t3.name, width=6.5*inch, height=2.3*inch))
    story.append(Spacer(1, 8))

    # Chart 4: Violation Categories Pie Chart
    fig4, ax4 = plt.subplots(figsize=(6.5, 2.3), dpi=180)
    v_cats = report_data.get("violation_types") or report_data.get("violation_categories") or []
    if not v_cats and report_data.get("total_incidents", 0) > 0:
        v_cats = [{"type": "Helmet Missing", "count": report_data.get("total_incidents", 0)}]
    if v_cats:
        v_lbls = [vc.get("type") or vc.get("name") or "Helmet Missing" for vc in v_cats]
        v_szs = [vc.get("count") or vc.get("value") or 0 for vc in v_cats]
        v_cols = ["#EF4444", "#F59E0B", "#3B82F6", "#10B981", "#8B5CF6"][:len(v_szs)]
        valid = [(l, s, c) for l, s, c in zip(v_lbls, v_szs, v_cols) if s > 0]
        if valid:
            l_v, s_v, c_v = zip(*valid)
            ax4.pie(s_v, labels=l_v, autopct="%1.1f%%", colors=c_v, startangle=140, textprops={"fontsize": 7.5})
        else:
            ax4.text(0.5, 0.5, "No Violation Category Data", ha="center", va="center", color="#64748B")
    else:
        ax4.text(0.5, 0.5, "No Violation Category Data", ha="center", va="center", color="#64748B")
    ax4.set_title("Violation Category Breakdown", fontsize=10, fontweight="bold", color="#0F172A")
    plt.tight_layout()
    t4 = tempfile.NamedTemporaryFile(suffix=".png", delete=False)
    fig4.savefig(t4.name, format="png")
    plt.close(fig4)
    temp_files.append(t4.name)
    story.append(Image(t4.name, width=6.5*inch, height=2.3*inch))
    story.append(Spacer(1, 10))

    # Zone Risk Matrix Table
    story.append(Paragraph("4. Zone Risk Matrix Analysis", styles["h2"]))
    zm_headers = ["Zone Name", "Monitored Workers", "Violations Logged", "Violation Rate (%)", "Risk Level"]
    zm_table_data = [[Paragraph(h, styles["tbl_hdr"]) for h in zm_headers]]

    for zm in zone_matrix:
        zm_table_data.append([
            Paragraph(str(zm.get("zone", "Unknown")), styles["tbl_cell"]),
            Paragraph(str(zm.get("total_workers", 0)), styles["tbl_cell"]),
            Paragraph(str(zm.get("violations", 0)), styles["tbl_cell"]),
            Paragraph(f"{zm.get('violation_pct', 0.0)}%", styles["tbl_cell"]),
            Paragraph(str(zm.get("risk_status", "Low Risk")), styles["tbl_cell"])
        ])

    zm_table = Table(zm_table_data, colWidths=[110, 100, 95, 95, 104])
    zm_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1E3A8A")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#FFFFFF"), colors.HexColor("#F8FAFC")]),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(zm_table)
    story.append(Spacer(1, 12))

    # Strategic Recommendations Section
    story.append(Paragraph("5. Management Strategic Recommendations", styles["h2"]))
    hrz_val = report_data.get("highest_risk_zone", "None")
    str_rec1 = f"• <b>Zone Targeted Intervention</b>: Prioritize PPE inspection audits in <b>{hrz_val}</b> due to highest recorded violation density."
    str_rec2 = f"• <b>Compliance Benchmark</b>: Maintain target helmet compliance above 95% threshold (Current: <b>{report_data.get('compliance_rate', 0)}%</b>)."
    str_rec3 = f"• <b>Incident Response Efficiency</b>: Ensure safety officer response times do not exceed average benchmark of <b>{report_data.get('avg_duration', 0)}s</b>."

    story.append(Paragraph(str_rec1, styles["body"]))
    story.append(Paragraph(str_rec2, styles["body"]))
    story.append(Paragraph(str_rec3, styles["body"]))

    canvas_class = lambda *args, **kwargs: NumberedCanvas(*args, report_title="Executive Analytics Strategic Report", **kwargs)
    doc.build(story, canvasmaker=canvas_class)

    for p in temp_files:
        try:
            if os.path.exists(p): os.remove(p)
        except Exception: pass

    buffer.seek(0)
    return buffer.getvalue()


# Alias for backwards compatibility
def generate_executive_analytics_pdf(report_data, generated_by="Executive Management"):
    return generate_executive_pdf(report_data, generated_by=generated_by)
