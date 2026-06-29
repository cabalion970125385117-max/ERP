"""
ATCA-ERP Static Preview Server (Python 3)
Serves frontend files + stub API responses — no Node.js or SQL Server needed.
Usage: python preview_server.py
"""

import json
import os
from http.server import HTTPServer, ThreadingHTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "src", "frontend")
# Honor the harness-assigned port (preview tool sets $PORT); fall back to 3000 for manual runs.
PORT = int(os.environ.get("PORT", 3000))

# ── Stub API data ────────────────────────────────────────────
STUBS = {
    "GET /api/v1/auth/me": {
        "user_id": 1, "username": "admin", "role": "ADMIN",
        "full_name": "James Tan Wei Liang", "employee_id": "ATCA-001", "personnel_id": 1
    },
    "POST /api/v1/auth/session-extend": {"message": "Session extended."},
    "POST /api/v1/auth/logout": {"message": "Logged out."},
    "POST /api/v1/mod08/audit-plans": {"audit_plan_id": 4, "audit_number": "AP-2026-0004", "message": "Audit plan created."},
    "POST /api/v1/mod08/findings": {"finding_id": 4, "finding_number": "AF-2026-0004", "message": "Finding raised."},
    "GET /api/v1/interco/po": {"items": [
        {"id": "ICO-PO-2026-001", "from": "ATCA", "to": "ATCT", "desc": "NDT inspection services for Q3 2026", "amount": 28500, "po_date": "2026-06-01", "required_by": "2026-09-30", "status": "ISSUED"},
        {"id": "ICO-PO-2026-002", "from": "APF",  "to": "ATCA", "desc": "Penetrant materials supply — Type I Fluorescent", "amount": 4200, "po_date": "2026-06-10", "required_by": "2026-07-15", "status": "ACKNOWLEDGED"},
        {"id": "ICO-PO-2026-003", "from": "ATCT", "to": "APF",  "desc": "Chemical treatment bath maintenance services", "amount": 6750, "po_date": "2026-06-15", "required_by": "2026-08-01", "status": "DRAFT"},
    ]},
    "POST /api/v1/interco/po": {"id": "ICO-PO-2026-004", "message": "Interco PO created."},
    "GET /api/v1/interco/do": {"items": [
        {"id": "ICO-DO-2026-001", "linked_po": "ICO-PO-2026-001", "from": "ATCA", "to": "ATCT", "desc": "NDT report package — June batch", "dispatch_date": "2026-06-28", "status": "DISPATCHED"},
        {"id": "ICO-DO-2026-002", "linked_po": "ICO-PO-2026-002", "from": "APF",  "to": "ATCA", "desc": "Penetrant materials — 20L drums x5", "dispatch_date": "2026-06-20", "status": "RECEIVED"},
    ]},
    "POST /api/v1/interco/do": {"id": "ICO-DO-2026-003", "message": "Interco DO created."},
    "GET /api/v1/interco/shared-assets": {"items": [
        {"id": "SA-001", "desc": "Fluorescent Black Light UV Array (Spectroline)", "type": "Equipment",       "custodian": "ATCA", "scope": "ALL", "location": "NDT Bay 1",      "cal_due": "2026-12-15", "status": "ACTIVE"},
        {"id": "SA-002", "desc": "Calibration Reference Block Set (ASME V)",       "type": "Calibration Ref", "custodian": "ATCA", "scope": "ALL", "location": "QA Lab",         "cal_due": "2026-09-30", "status": "ACTIVE"},
        {"id": "SA-003", "desc": "ERP License — ATCA-ERP v1.0",                   "type": "Software",        "custodian": "ATCA", "scope": "ALL", "location": "Cloud/LAN",      "cal_due": "",           "status": "ACTIVE"},
        {"id": "SA-004", "desc": "Precision Torque Wrench Set",                   "type": "Tooling",         "custodian": "ATCT", "scope": "ALL", "location": "Maintenance Bay","cal_due": "2026-11-01", "status": "ACTIVE"},
    ]},
    "POST /api/v1/interco/shared-assets": {"id": "SA-005", "message": "Shared asset registered."},
    "GET /api/v1/alerts/summary": {"total": 3},
    "GET /api/v1/alerts/list": {"items": [
        {"severity":"CRITICAL","module":"MOD-04","module_name":"Personnel / NAS410","message":"1 NDT certification has expired","link":"/modules/mod04-ndt-personnel/"},
        {"severity":"WARNING","module":"MOD-05","module_name":"Equipment & Calibration","message":"1 instrument overdue for calibration","link":"/modules/mod05-equipment-calibration/"},
        {"severity":"WARNING","module":"MOD-06","module_name":"Chemical / Bath Control","message":"Bath ANO-BK-001 is out of spec","link":"/modules/mod06-bath-control/"},
    ]},
    "GET /api/v1/mod37/alerts/summary": {
        "total_files": 11, "files_this_month": 3, "modules_linked": 8, "total_size_mb": 1.7
    },
    "GET /api/v1/mod04/alerts/summary": {
        "certs_expiring_90d": 2, "expired_certs": 1,
        "eye_expiring_60d": 1,   "expired_eye_exams": 0, "total": 3
    },
    "GET /api/v1/mod09/alerts/summary": {
        "pending_reviews": 2, "pending_grn_inspection": 3, "ready_to_ship": 1, "expired_quotations": 4, "total": 10
    },
    "GET /api/v1/mod10/alerts/summary": {
        "due_soon": 3, "overdue_jobs": 1, "incomplete_checklists": 1, "failed_test_pieces": 0
    },
    "GET /api/v1/mod34/alerts/summary": {
        "sds_active": 12, "sds_expiring_30d": 2, "controlled_substances": 2,
        "replenishment_pending": 3, "escalation_rules_active": 10,
        "unacknowledged_alerts": 4, "low_stock_chemicals": 1, "total": 34
    },
    "GET /api/v1/mod05/alerts/summary": {
        "cal_overdue": 1, "cal_due_30d": 3, "never_calibrated": 0, "total": 4
    },
    "GET /api/v1/mod07/alerts/summary": {
        "open_ncr": 3, "overdue_capa": 1, "pending_verify": 1, "ncr_open_only": 3, "total": 5
    },
    "GET /api/v1/mod01/policy/current": {
        "policy_id": 1, "revision": "Rev 4", "status": "APPROVED",
        "effective_date": "2025-01-01", "title": "Quality Policy"
    },
    "GET /api/v1/mod01/objectives": {"items": [
        {"objective_id":1,"objective_ref":"QO-2025-01","title":"Achieve NADCAP accreditation renewal","status":"ON_TRACK","target_date":"2025-12-31"},
        {"objective_id":2,"objective_ref":"QO-2025-02","title":"Reduce NCR turnaround to <5 days","status":"AT_RISK","target_date":"2025-09-30"},
        {"objective_id":3,"objective_ref":"QO-2025-03","title":"100% personnel NAS410 recertification","status":"ON_TRACK","target_date":"2025-10-15"},
    ], "total": 3},
    "GET /api/v1/mod01/risks": {"items": [
        {"risk_id":1,"risk_ref":"RSK-001","description":"Chemical bath out-of-spec during NADCAP audit","risk_score_pre":15,"status":"OPEN"},
        {"risk_id":2,"risk_ref":"RSK-002","description":"Inspector certification lapse before renewal","risk_score_pre":12,"status":"OPEN"},
    ], "total": 2},
    "GET /api/v1/mod01/reviews": {"items": [
        {"review_id":1,"review_ref":"MR-2025-01","review_type":"QUARTERLY","review_date":"2025-07-15","chaired_by_name":"Gary Tan Beng Huat","status":"PLANNED","open_actions":0},
        {"review_id":2,"review_ref":"MR-2025-02","review_type":"ANNUAL","review_date":"2025-03-10","chaired_by_name":"Gary Tan Beng Huat","status":"CLOSED","open_actions":2},
    ], "total": 2},
    "GET /api/v1/mod02/alerts/summary": {
        "pending_approval": 0, "review_overdue": 1, "review_due_soon": 1,
    },
    "GET /api/v1/mod02/documents": {"items": [
        {"doc_id":1,"doc_number":"ATCA-QP-001","title":"Quality Manual","category":"Quality Procedure","process_area":"All","current_revision":"Rev 4","status":"APPROVED","effective_date":"2025-01-01","review_due_date":"2026-01-01","owner_name":"Gary Tan Beng Huat"},
        {"doc_id":2,"doc_number":"ATCA-WI-FPI-001","title":"FPI Process Instruction","category":"Work Instruction","process_area":"FPI","current_revision":"Rev 2","status":"APPROVED","effective_date":"2024-06-01","review_due_date":"2025-06-01","owner_name":"James Tan Wei Liang"},
    ], "total": 2},
    "GET /api/v1/mod02/categories": [
        {"category_id":1,"name":"Quality Procedure"},
        {"category_id":2,"name":"Work Instruction"},
        {"category_id":3,"name":"Form"},
    ],
    "GET /api/v1/mod04/personnel": {"items": [
        {"personnel_id":1,"employee_id":"ATCA-001","full_name":"James Tan Wei Liang","designation":"LEVEL_2","employment_type":"PERMANENT","active_certs":3,"latest_exam_date":"2024-11-01","latest_exam_expiry":"2025-11-01","exam_days_left":160},
        {"personnel_id":2,"employee_id":"ATCA-002","full_name":"Hendrich Lim Jun Wei","designation":"LEVEL_2","employment_type":"PERMANENT","active_certs":2,"latest_exam_date":"2024-09-15","latest_exam_expiry":"2025-09-15","exam_days_left":113},
        {"personnel_id":3,"employee_id":"ATCA-003","full_name":"Cabal Lo Wen Xin","designation":"LEVEL_2","employment_type":"CONTRACT","active_certs":2,"latest_exam_date":"2024-07-01","latest_exam_expiry":"2025-07-01","exam_days_left":37},
        {"personnel_id":5,"employee_id":"ATCA-005","full_name":"Azman Bin Ayub","designation":"LEVEL_2","employment_type":"PERMANENT","active_certs":1,"latest_exam_date":"2023-12-01","latest_exam_expiry":"2024-12-01","exam_days_left":-175},
    ], "total": 4},
    "GET /api/v1/mod04/certifications": {"items": [
        {"cert_id":1,"personnel_id":1,"full_name":"James Tan Wei Liang","employee_id":"ATCA-001","method":"PT","ndt_level":"II","cert_scheme":"NAS410","cert_number":"ATCA-PT-001","issuing_authority":"CAAS Singapore","issue_date":"2022-01-10","expiry_date":"2027-01-10","days_left":600,"status":"ACTIVE"},
        {"cert_id":2,"personnel_id":2,"full_name":"Hendrich Lim Jun Wei","employee_id":"ATCA-002","method":"MT","ndt_level":"II","cert_scheme":"NAS410","cert_number":"ATCA-MT-002","issuing_authority":"CAAS Singapore","issue_date":"2020-06-01","expiry_date":"2025-06-01","days_left":-10,"status":"EXPIRED"},
    ], "total": 2},
    "GET /api/v1/mod05/equipment": {"items": [
        {"equipment_id":1,"equip_code":"UV-001","description":"UV-A Lamp — Magnaflux ZB-100F","equip_type":"UV_LAMP","process_area":"FPI","make_model":"Magnaflux ZB-100F","serial_number":"MF-ZB-2021-0042","last_cal_date":"2025-02-14","cal_due_date":"2026-02-14","cal_days_left":265,"cal_rag_status":"CURRENT"},
        {"equipment_id":2,"equip_code":"TH-001","description":"Digital Thermometer — Fluke 52 II","equip_type":"THERMOMETER","process_area":"FPI","make_model":"Fluke 52 II","serial_number":"FL-52-2019-0118","last_cal_date":"2024-12-01","cal_due_date":"2025-06-01","cal_days_left":-10,"cal_rag_status":"OVERDUE"},
        {"equipment_id":3,"equip_code":"PG-001","description":"Pressure Gauge 0–60 psi","equip_type":"PRESSURE_GAUGE","process_area":"MPT","make_model":"Ashcroft 1009SW","serial_number":"AC-1009-2022-0007","last_cal_date":"2025-04-01","cal_due_date":"2025-10-01","cal_days_left":28,"cal_rag_status":"DUE_SOON"},
    ], "total": 3},
    "GET /api/v1/mod05/calibrations": {"items": [
        {"cal_id":1,"cal_ref":"CAL-2025-001","equipment_id":1,"equip_code":"UV-001","description":"UV-A Lamp","cal_date":"2025-02-14","cal_due_date":"2026-02-14","vendor":"SATS Engineering","cert_number":"SATS-CAL-2025-0042","measured_value":"≥1000 µW/cm²","out_of_tolerance":False,"result":"PASS","recorded_by_name":"James Tan Wei Liang"},
    ], "total": 1},
    "GET /api/v1/mod07/ncr": {"items": [
        {"ncr_id":1,"ncr_ref":"NCR-2025-001","ncr_type":"PROCESS","process_area":"FPI","description":"Bath concentration found out of spec during periodic check","detected_date":"2025-05-10","severity":"MJ","source":"INTERNAL_AUDIT","status":"OPEN","raised_by_name":"James Tan Wei Liang","detected_by_name":"James Tan Wei Liang","raised_date":"2025-05-10","target_close_date":"2025-06-10","work_order_ref":None,"immediate_action":"Bath FPI-EM-001 quarantined and processing halted pending re-titration and adjustment.","days_open":15,"disposition":None,"open_capa_count":0,"capa_required":True},
        {"ncr_id":2,"ncr_ref":"NCR-2025-002","ncr_type":"PROCESS","process_area":"FPI","description":"UV lamp intensity reading below 1000 µW/cm² minimum requirement","detected_date":"2025-04-20","severity":"MN","source":"PROCESS_CHECK","status":"CAPA_IN_PROGRESS","raised_by_name":"Hendrich Lim Jun Wei","detected_by_name":"Hendrich Lim Jun Wei","part_number":"TBN-4471-03","raised_date":"2025-04-20","target_close_date":"2025-05-20","immediate_action":"UV lamp ZB-100F removed from service; parts processed since last verification held for re-inspection.","disposition_rationale":"Affected lots re-inspected under a compliant UV source; rework to re-process non-conforming parts.","disposition_date":"2025-04-22","days_open":35,"disposition":"REWORK","open_capa_count":1,"capa_required":True},
        {"ncr_id":3,"ncr_ref":"NCR-2026-003","ncr_type":"PROCESS","process_area":"ANODIZE","description":"Black Anodize bath (ANO-BK-001) dye concentration below minimum 5% — measured at 3.5%. Job ROUTER-12681 (WO-2026-0005) placed on hold.","detected_date":"2026-06-11","severity":"MJ","source":"PROCESS_CHECK","status":"OPEN","raised_by_name":"James Tan Wei Liang","detected_by_name":"James Tan Wei Liang","work_order_ref":"WO-2026-0005","lot_number":"ROUTER-12681","raised_date":"2026-06-11","target_close_date":"2026-06-14","immediate_action":"Job ROUTER-12681 placed on hold; ANO-BK-001 flagged for dye replenishment before further processing.","days_open":3,"disposition":None,"open_capa_count":0,"capa_required":True},
    ], "total": 3},
    "GET /api/v1/mod07/capa": {"items": [
        {"capa_id":1,"capa_ref":"CAPA-2025-001","capa_type":"CORRECTIVE","ncr_id":2,"ncr_ref":"NCR-2025-002","root_cause_method":"5WHY","root_cause_description":"UV lamp bulb past service interval; no PM schedule in place","corrective_action":"Replace bulb; add PM schedule","preventive_action":"Add UV lamp to monthly PM checklist","status":"IN_PROGRESS","owner_name":"Hendrich Lim Jun Wei","assigned_to_name":"Hendrich Lim Jun Wei","target_completion_date":"2025-05-20","target_date":"2025-05-20","effectiveness_result":None,"verified_by_name":None,"closed_date":None,"days_overdue":5},
    ], "total": 1},
    "GET /api/v1/mod25/alerts/summary": {
        "total_users": 6, "active_users": 5, "inactive_users": 1, "elevated_roles": 2
    },
    "GET /api/v1/mod25/users": {"items": [
        {"user_id":1,"username":"james.tan","full_name":"James Tan Wei Liang","role":"QA_MANAGER","employee_id":"ATCA-001","personnel_id":1,"active":True,"created_date":"2025-01-01","last_login":"2025-05-26T08:30:00"},
        {"user_id":2,"username":"gary.tan","full_name":"Gary Tan Beng Huat","role":"ADMIN","employee_id":"ATCA-004","personnel_id":4,"active":True,"created_date":"2025-01-01","last_login":"2025-05-25T14:15:00"},
        {"user_id":3,"username":"hendrich.lim","full_name":"Hendrich Lim Jun Wei","role":"NDT_INSPECTOR","employee_id":"ATCA-002","personnel_id":2,"active":True,"created_date":"2025-01-15","last_login":"2025-05-25T07:45:00"},
        {"user_id":4,"username":"cabal.lo","full_name":"Cabal Lo Wen Xin","role":"NDT_INSPECTOR","employee_id":"ATCA-003","personnel_id":3,"active":True,"created_date":"2025-02-01","last_login":"2025-05-24T09:00:00"},
        {"user_id":5,"username":"azman.ayub","full_name":"Azman Bin Ayub","role":"SUPERVISOR","employee_id":"ATCA-005","personnel_id":5,"active":False,"created_date":"2025-02-10","last_login":"2025-04-10T16:00:00"},
        {"user_id":6,"username":"hariharan.raju","full_name":"Hariharan s/o Raju","role":"NDT_INSPECTOR","employee_id":"ATCA-006","personnel_id":6,"active":True,"created_date":"2025-03-01","last_login":"2025-05-23T08:00:00"},
    ], "total": 6},

    # ══ MOD-27 Value Flow Tracker ══
    "GET /api/v1/mod27/alerts/summary": {
        "active_jobs": 8, "grn_pending": 2, "coc_pending": 3, "shipped_today": 4, "total": 8
    },
    "GET /api/v1/mod27/active-grns": {"items": [
        {"grn_ref": "GRN-2026-0042", "customer_name": "Rolls-Royce Singapore", "received_date": "2026-06-10", "status": "ACCEPTED"},
        {"grn_ref": "GRN-2026-0041", "customer_name": "ST Engineering", "received_date": "2026-06-08", "status": "ACCEPTED"},
        {"grn_ref": "GRN-2026-0040", "customer_name": "SIA Engineering", "received_date": "2026-06-05", "status": "PENDING"},
    ]},

    # ══ MOD-26 System Maintenance Console (SUPERUSER / ADMIN only) ══
    "GET /api/v1/mod26/alerts/summary": {
        "db_used_pct": 24, "active_sessions": 3, "failed_logins_24h": 2, "days_since_backup": 0
    },
    "GET /api/v1/admin/maintenance-status": {
        "enabled": False, "message": "System is undergoing scheduled maintenance. Please try again shortly.",
        "since": None, "by": None
    },
    "GET /api/v1/admin/storage": {
        "db_name": "ATCA_ERP_DB", "db_used_mb": 2412.5, "db_alloc_mb": 4096, "db_max_mb": 10240,
        "log_used_mb": 318.7, "disk_free_gb": 214.6, "disk_total_gb": 512.0,
        "tables": [
            {"name": "AuditLog",            "rows": 184213, "size_mb": 612.4},
            {"name": "ChatMessage",         "rows": 8421,   "size_mb": 41.8},
            {"name": "FpiInspectionStep",   "rows": 12640,  "size_mb": 38.2},
            {"name": "BathSample",          "rows": 9877,   "size_mb": 27.1},
            {"name": "Document",            "rows": 1342,   "size_mb": 486.9},
            {"name": "MptInspectionStep",   "rows": 7110,   "size_mb": 19.4},
            {"name": "WorkOrder",           "rows": 3201,   "size_mb": 14.7},
            {"name": "CalibrationRecord",   "rows": 2056,   "size_mb": 9.2}
        ],
        "files": {"signatures_mb": 12.3, "documents_mb": 486.9, "backups_mb": 1840.0, "attachments_mb": 203.4}
    },
    "GET /api/v1/admin/activity": {"items": [
        {"log_id":184213,"ts":"2026-06-15T13:42:08","username":"admin","role":"ADMIN","action":"LOGIN","module":"AUTH","table_name":"Users","record_id":1,"lan_ip":"192.168.1.31","detail":"Successful login"},
        {"log_id":184212,"ts":"2026-06-15T13:38:51","username":"james.tan","role":"QA_MANAGER","action":"ISSUE","module":"MOD-24","table_name":"CertificateOfConformance","record_id":17,"lan_ip":"192.168.1.22","detail":"CoC COC-2026-0017 issued"},
        {"log_id":184211,"ts":"2026-06-15T13:21:04","username":"hendrich.lim","role":"NDT_INSPECTOR","action":"SIGNOFF","module":"MOD-03","table_name":"FpiInspectionStep","record_id":12640,"lan_ip":"192.168.1.18","detail":"FPI-2026-0002 step 7 signed off"},
        {"log_id":184210,"ts":"2026-06-15T12:55:32","username":"cabal.lo","role":"NDT_INSPECTOR","action":"CREATE","module":"MOD-06","table_name":"BathSample","record_id":9877,"lan_ip":"192.168.1.19","detail":"Bath ANO-BK-001 sample recorded — OUT_OF_SPEC"},
        {"log_id":184209,"ts":"2026-06-15T11:47:11","username":"UNKNOWN","role":"-","action":"LOGIN_FAIL","module":"AUTH","table_name":"Users","record_id":None,"lan_ip":"192.168.1.77","detail":"Failed login — bad password (attempt 2/5)"},
        {"log_id":184208,"ts":"2026-06-15T10:30:45","username":"admin","role":"ADMIN","action":"ROLE_CHANGE","module":"MOD-25","table_name":"Users","record_id":5,"lan_ip":"192.168.1.31","detail":"azman.ayub deactivated"},
        {"log_id":184207,"ts":"2026-06-15T09:12:20","username":"james.tan","role":"QA_MANAGER","action":"VERIFY","module":"MOD-07","table_name":"CAPA","record_id":42,"lan_ip":"192.168.1.22","detail":"CAPA-2026-0012 verified & closed"},
        {"log_id":184206,"ts":"2026-06-15T08:31:02","username":"hariharan.raju","role":"NDT_INSPECTOR","action":"LOGIN","module":"AUTH","table_name":"Users","record_id":6,"lan_ip":"192.168.1.20","detail":"Successful login"},
        {"log_id":184205,"ts":"2026-06-15T08:05:54","username":"admin","role":"ADMIN","action":"BACKUP","module":"MOD-26","table_name":"-","record_id":None,"lan_ip":"192.168.1.31","detail":"Nightly backup completed (1.74 GB)"},
        {"log_id":184204,"ts":"2026-06-14T17:48:39","username":"gary.tan","role":"ADMIN","action":"CONFIG","module":"MOD-26","table_name":"SystemConfig","record_id":3,"lan_ip":"192.168.1.31","detail":"Session timeout changed 8h → 8h (no-op)"}
    ], "total": 184213},
    "GET /api/v1/admin/users": {"items": [
        {"user_id":1,"username":"admin","full_name":"James Tan Wei Liang","role":"ADMIN","employee_id":"ATCA-001","active":True,"last_login":"2026-06-15T13:42:08","failed_attempts":0,"must_reset":False},
        {"user_id":2,"username":"gary.tan","full_name":"Gary Tan Beng Huat","role":"ADMIN","employee_id":"ATCA-004","active":True,"last_login":"2026-06-14T17:48:39","failed_attempts":0,"must_reset":False},
        {"user_id":3,"username":"hendrich.lim","full_name":"Hendrich Lim Jun Wei","role":"NDT_INSPECTOR","employee_id":"ATCA-002","active":True,"last_login":"2026-06-15T13:21:04","failed_attempts":0,"must_reset":False},
        {"user_id":4,"username":"cabal.lo","full_name":"Cabal Lo Wen Xin","role":"NDT_INSPECTOR","employee_id":"ATCA-003","active":True,"last_login":"2026-06-15T12:55:32","failed_attempts":0,"must_reset":True},
        {"user_id":5,"username":"azman.ayub","full_name":"Azman Bin Ayub","role":"SUPERVISOR","employee_id":"ATCA-005","active":False,"last_login":"2026-04-10T16:00:00","failed_attempts":0,"must_reset":False},
        {"user_id":6,"username":"hariharan.raju","full_name":"Hariharan s/o Raju","role":"NDT_INSPECTOR","employee_id":"ATCA-006","active":True,"last_login":"2026-06-15T08:31:02","failed_attempts":3,"must_reset":False}
    ], "total": 6},
    "GET /api/v1/admin/backups": {"items": [
        {"backup_id":7,"filename":"ATCA_ERP_DB_2026-06-15_0200.bak","created_at":"2026-06-15T02:00:11","size_mb":1843.2,"type":"FULL","status":"COMPLETE","retention":"30d"},
        {"backup_id":6,"filename":"ATCA_ERP_DB_2026-06-14_0200.bak","created_at":"2026-06-14T02:00:09","size_mb":1838.7,"type":"FULL","status":"COMPLETE","retention":"30d"},
        {"backup_id":5,"filename":"ATCA_ERP_DB_2026-06-13_0200.bak","created_at":"2026-06-13T02:00:14","size_mb":1835.1,"type":"FULL","status":"COMPLETE","retention":"30d"},
        {"backup_id":4,"filename":"ATCA_ERP_DB_2026-06-12_1430.bak","created_at":"2026-06-12T14:30:00","size_mb":1832.9,"type":"MANUAL","status":"COMPLETE","retention":"90d"},
        {"backup_id":3,"filename":"ATCA_ERP_DB_2026-06-12_0200.bak","created_at":"2026-06-12T02:00:08","size_mb":1830.4,"type":"FULL","status":"COMPLETE","retention":"30d"}
    ], "total": 5},

    "GET /api/v1/mod03/alerts/summary": {
        "in_progress": 4, "pending_signoff": 2, "rejected": 1, "total": 7
    },
    "GET /api/v1/mod03/jobs": {"items": [
        {"job_id":1,"job_ref":"FPI-2026-0001","customer":"SIA Engineering Company","part_number":"GE90-7B-FAN-BLADE","method":"FLUORESCENT","penetrant_type":"Zyglo ZL-2C","quantity":12,"status":"IN_PROGRESS","disposition":None,"inspector_name":"James Tan Wei Liang","created_at":"2026-06-12","completed_steps":4,"total_steps":8},
        {"job_id":2,"job_ref":"FPI-2026-0002","customer":"Parker Hannifin Aerospace","part_number":"PHN-INNER-BODY-HSG","method":"FLUORESCENT","penetrant_type":"Zyglo ZL-2C","quantity":4,"status":"PENDING_SIGNOFF","disposition":None,"inspector_name":"Hendrich Lim Jun Wei","created_at":"2026-06-13","completed_steps":7,"total_steps":8},
        {"job_id":3,"job_ref":"FPI-2026-0003","customer":"ST Engineering Aerospace","part_number":"STE-INNER-BRACKET-MK2","method":"FLUORESCENT","penetrant_type":"Zyglo ZL-2C","quantity":6,"status":"IN_PROGRESS","disposition":None,"inspector_name":"Cabal Lo Wen Xin","created_at":"2026-06-13","completed_steps":2,"total_steps":8},
        {"job_id":4,"job_ref":"FPI-2026-0004","customer":"Rolls-Royce Singapore","part_number":"RR-DISC-TRENT-1000","method":"FLUORESCENT","penetrant_type":"Zyglo ZL-2C","quantity":2,"status":"IN_PROGRESS","disposition":None,"inspector_name":"James Tan Wei Liang","created_at":"2026-06-14","completed_steps":1,"total_steps":8},
        {"job_id":5,"job_ref":"FPI-2026-0005","customer":"Parker Hannifin Aerospace","part_number":"PHN-KLIENT-LEVER","method":"VISIBLE","penetrant_type":"Zyglo ZL-60D","quantity":6,"status":"REJECTED","disposition":"REJECT","inspector_name":"Hendrich Lim Jun Wei","created_at":"2026-06-10","completed_steps":8,"total_steps":8},
    ], "total": 5},
    "GET /api/v1/mod03/jobs/1": {
        "job_id":1,"job_ref":"FPI-2026-0001","customer":"SIA Engineering Company",
        "part_number":"GE90-7B-FAN-BLADE","method":"FLUORESCENT","penetrant_type":"Zyglo ZL-2C","quantity":12,
        "status":"IN_PROGRESS","disposition":None,"inspector_name":"James Tan Wei Liang",
        "work_order_id":1,"wo_number":"WO-2026-0001",
        "steps":[
            {"seq":1,"step_code":"PRE_CLEAN","label":"Pre-Cleaning","status":"COMPLETE","signed_by_name":"Ahmad Bin Rashid","signed_at":"2026-06-12T08:30:00","cleaning_method":"Solvent wipe","solvent_used":"MEK"},
            {"seq":2,"step_code":"PENETRANT_APPLY","label":"Penetrant Application","status":"COMPLETE","signed_by_name":"James Tan Wei Liang","signed_at":"2026-06-12T09:00:00","penetrant_type":"Type 1","application_method":"Spray"},
            {"seq":3,"step_code":"PENETRANT_DWELL","label":"Penetrant Dwell","status":"COMPLETE","signed_by_name":"James Tan Wei Liang","signed_at":"2026-06-12T09:20:00","dwell_minutes":20,"temp_c":22},
            {"seq":4,"step_code":"RINSE","label":"Rinse / Excess Removal","status":"COMPLETE","signed_by_name":"James Tan Wei Liang","signed_at":"2026-06-12T09:35:00","wash_method":"Water wash","water_temp_c":30,"water_pressure_psi":25},
            {"seq":5,"step_code":"DEVELOPER_APPLY","label":"Developer Application","status":"PENDING","signed_by_name":None,"signed_at":None},
            {"seq":6,"step_code":"DEVELOPER_DWELL","label":"Development Dwell","status":"PENDING","signed_by_name":None,"signed_at":None},
            {"seq":7,"step_code":"INTERPRET","label":"Interpretation & Evaluation","status":"PENDING","signed_by_name":None,"signed_at":None},
            {"seq":8,"step_code":"POST_CLEAN","label":"Post-Cleaning","status":"PENDING","signed_by_name":None,"signed_at":None},
        ]
    },
    "GET /api/v1/mod03/baths": [
        {"bath_id":1,"bath_code":"FPI-PT-001","bath_name":"Penetrant Tank #1","status":"IN_SPEC"},
        {"bath_id":2,"bath_code":"FPI-EM-001","bath_name":"Emulsifier Tank #1","status":"OUT_OF_SPEC"},
        {"bath_id":3,"bath_code":"FPI-DV-001","bath_name":"Developer Tank #1","status":"IN_SPEC"},
    ],
    "GET /api/v1/mod06/alerts/summary": {
        "fpi":     {"out_of_spec": 1, "overdue_sample": 0, "due_soon": 1, "total_baths": 4},
        "plating": {"out_of_spec": 1, "overdue_sample": 1, "due_soon": 2, "total_baths": 8},
        "out_of_spec": 2, "overdue_sample": 1, "due_soon": 3, "total_baths": 12, "total": 3
    },
    "GET /api/v1/mod06/baths": {"items": [
        # ── FPI Process Tanks (NDT) ──
        {"bath_id":1,"bath_code":"FPI-PT-001","bath_name":"Penetrant Tank A — Type I FPI","bath_type":"PENETRANT","process_category":"NDT_FPI","process_area":"FPI Bay 1","bay":None,"spec_ref":"AMS 2644 / ASTM E1417","sample_frequency_days":7,"max_len_cm":None,"max_wid_cm":None,"max_dep_cm":None,"last_sampled_at":"2026-06-14T08:00:00","days_since_sample":3,"last_status":"PASS","last_sampled_by_name":"James Tan Wei Liang","rag_status":"GREEN"},
        {"bath_id":2,"bath_code":"FPI-EM-001","bath_name":"Hydrophilic Emulsifier — Method D","bath_type":"EMULSIFIER","process_category":"NDT_FPI","process_area":"FPI Bay 1","bay":None,"spec_ref":"AMS 2644 §5.3","sample_frequency_days":7,"max_len_cm":None,"max_wid_cm":None,"max_dep_cm":None,"last_sampled_at":"2026-06-10T08:00:00","days_since_sample":7,"last_status":"FAIL","last_sampled_by_name":"Hendrich Lim Jun Wei","rag_status":"RED"},
        {"bath_id":3,"bath_code":"FPI-DV-001","bath_name":"Wet Developer Tank","bath_type":"DEVELOPER","process_category":"NDT_FPI","process_area":"FPI Bay 1","bay":None,"spec_ref":"AMS 2644 / ASTM E1417 §6.4","sample_frequency_days":7,"max_len_cm":None,"max_wid_cm":None,"max_dep_cm":None,"last_sampled_at":"2026-06-11T08:00:00","days_since_sample":6,"last_status":"PASS","last_sampled_by_name":"James Tan Wei Liang","rag_status":"AMBER"},
        {"bath_id":4,"bath_code":"FPI-RN-001","bath_name":"Rinse Water Tank","bath_type":"RINSE","process_category":"NDT_FPI","process_area":"FPI Bay 1","bay":None,"spec_ref":"ASTM E1417 §6.3.4","sample_frequency_days":3,"max_len_cm":None,"max_wid_cm":None,"max_dep_cm":None,"last_sampled_at":"2026-06-16T08:00:00","days_since_sample":1,"last_status":"PASS","last_sampled_by_name":"Cabal Lo Wen Xin","rag_status":"GREEN"},
        # ── Electroplating / Chemical Processing ──
        {"bath_id":5,"bath_code":"EP-AN2-001","bath_name":"Type II Sulfuric Acid Anodize (Auto Line)","bath_type":"ANODIZE","process_category":"ELECTROPLATING","process_area":"Anodizing","bay":"Bay 5","spec_ref":"AMS2470 / MIL-PRF-8625F Type II","sample_frequency_days":1,"max_len_cm":160,"max_wid_cm":50,"max_dep_cm":128,"last_sampled_at":"2026-06-16T07:30:00","days_since_sample":1,"last_status":"PASS","last_sampled_by_name":"Ahmad Bin Rashid","rag_status":"GREEN"},
        {"bath_id":6,"bath_code":"EP-AN3-001","bath_name":"Type III Hard Anodize (Manual)","bath_type":"ANODIZE","process_category":"ELECTROPLATING","process_area":"Anodizing","bay":"Bay 5","spec_ref":"MIL-PRF-8625F Type III","sample_frequency_days":1,"max_len_cm":119,"max_wid_cm":60,"max_dep_cm":100,"last_sampled_at":"2026-06-16T07:30:00","days_since_sample":1,"last_status":"PASS","last_sampled_by_name":"Ahmad Bin Rashid","rag_status":"AMBER"},
        {"bath_id":7,"bath_code":"EP-EN-001","bath_name":"Electroless Nickel — High Phosphorus (HPEN P&W)","bath_type":"ELECTROLESS_NICKEL","process_category":"ELECTROPLATING","process_area":"Electroless Nickel","bay":"Bay 2","spec_ref":"ASTM B733 / SPOP-311","sample_frequency_days":1,"max_len_cm":95,"max_wid_cm":45,"max_dep_cm":90,"last_sampled_at":"2026-06-13T07:30:00","days_since_sample":4,"last_status":"PASS","last_sampled_by_name":"Ahmad Bin Rashid","rag_status":"RED"},
        {"bath_id":8,"bath_code":"EP-ZN-001","bath_name":"Zinc Plating — Yellow Chromate","bath_type":"ZINC_PLATE","process_category":"ELECTROPLATING","process_area":"Zinc Plating","bay":"Bay 3","spec_ref":"ASTM B633 Type II / SEP014","sample_frequency_days":1,"max_len_cm":84,"max_wid_cm":84,"max_dep_cm":110,"last_sampled_at":"2026-06-16T07:30:00","days_since_sample":1,"last_status":"PASS","last_sampled_by_name":"Kevin Raj Kumar","rag_status":"GREEN"},
        {"bath_id":9,"bath_code":"EP-CU-001","bath_name":"Copper Trim (SIA) — Acidic Copper","bath_type":"COPPER_PLATE","process_category":"ELECTROPLATING","process_area":"Copper Plating","bay":"Bay 2","spec_ref":"SIA 12DDR-25-8174","sample_frequency_days":1,"max_len_cm":100,"max_wid_cm":33,"max_dep_cm":45,"last_sampled_at":"2026-06-16T07:30:00","days_since_sample":1,"last_status":"PASS","last_sampled_by_name":"Kevin Raj Kumar","rag_status":"GREEN"},
        {"bath_id":10,"bath_code":"EP-PH-001","bath_name":"Phosphating — Zinc + Manganese","bath_type":"PHOSPHATING","process_category":"ELECTROPLATING","process_area":"Phosphating","bay":"Bay 2","spec_ref":"DOD-P-16232 / TT-C-490","sample_frequency_days":1,"max_len_cm":60,"max_wid_cm":50,"max_dep_cm":82,"last_sampled_at":"2026-06-16T07:30:00","days_since_sample":1,"last_status":"PASS","last_sampled_by_name":"Ahmad Bin Rashid","rag_status":"AMBER"},
        {"bath_id":11,"bath_code":"EP-PA-001","bath_name":"Passivation — Citric Acid","bath_type":"PASSIVATION","process_category":"ELECTROPLATING","process_area":"Passivation","bay":"Bay 4","spec_ref":"ASTM A967 / AMS2700","sample_frequency_days":7,"max_len_cm":80,"max_wid_cm":60,"max_dep_cm":82,"last_sampled_at":"2026-06-12T07:30:00","days_since_sample":5,"last_status":"PASS","last_sampled_by_name":"James Tan Wei Liang","rag_status":"GREEN"},
        {"bath_id":12,"bath_code":"EP-BO-001","bath_name":"Black Oxide — Alkaline","bath_type":"BLACK_OXIDE","process_category":"ELECTROPLATING","process_area":"Black Oxide","bay":"Bay 2","spec_ref":"MIL-DTL-13924 / AMS2485","sample_frequency_days":7,"max_len_cm":55,"max_wid_cm":33,"max_dep_cm":45,"last_sampled_at":"2026-06-10T07:30:00","days_since_sample":7,"last_status":"FAIL","last_sampled_by_name":"Ahmad Bin Rashid","rag_status":"RED"},
    ], "total": 12},
    "GET /api/v1/mod06/logs": {"items": [
        {"log_id":1,"bath_id":2,"bath_code":"FPI-EM-001","bath_name":"Emulsifier Tank #1","test_date":"2025-05-18","tested_by_name":"James Tan Wei Liang","temp_c":21,"concentration_pct":38,"fluorescent_brightness":None,"contamination_check":"PASS","result":"FAIL","notes":"Concentration 38% exceeds max 35% — bath flagged OUT_OF_SPEC","ncr_raised":True,"ncr_ref":"NCR-2025-001"},
        {"log_id":2,"bath_id":4,"bath_code":"MPT-WF-001","bath_name":"Wet Fluorescent Bath","test_date":"2025-05-19","tested_by_name":"Hendrich Lim Jun Wei","temp_c":19,"concentration_pct":0.22,"fluorescent_brightness":"ACCEPTABLE","contamination_check":"PASS","result":"PASS","notes":"All readings within spec","ncr_raised":False,"ncr_ref":None},
        {"log_id":3,"bath_id":1,"bath_code":"FPI-PT-001","bath_name":"Penetrant Tank #1","test_date":"2025-05-20","tested_by_name":"James Tan Wei Liang","temp_c":22,"concentration_pct":None,"fluorescent_brightness":"ACCEPTABLE","contamination_check":"PASS","result":"PASS","notes":"Daily check — all OK","ncr_raised":False,"ncr_ref":None},
        {"log_id":4,"bath_id":5,"bath_code":"ANO-SA-001","bath_name":"Sulfuric Acid Anodize Tank","test_date":"2026-06-13","tested_by_name":"Ahmad Bin Rashid","temp_c":20,"concentration_pct":185,"fluorescent_brightness":None,"contamination_check":"PASS","result":"PASS","notes":"H2SO4 titration: 185 g/L — within 165–210 g/L spec. Temperature stable at 20°C.","ncr_raised":False,"ncr_ref":None},
        {"log_id":5,"bath_id":6,"bath_code":"ANO-DG-001","bath_name":"Alkaline Degreaser Tank","test_date":"2026-06-13","tested_by_name":"Ahmad Bin Rashid","temp_c":68,"concentration_pct":45,"fluorescent_brightness":None,"contamination_check":"PASS","result":"PASS","notes":"Alkalinity titration: 45 g/L — within spec. Water break test PASS on coupon.","ncr_raised":False,"ncr_ref":None},
        {"log_id":6,"bath_id":9,"bath_code":"ANO-BK-001","bath_name":"Black Anodize Tank","test_date":"2026-06-11","tested_by_name":"James Tan Wei Liang","temp_c":21,"concentration_pct":3.5,"fluorescent_brightness":None,"contamination_check":"PASS","result":"FAIL","notes":"Dye concentration 3.5% below 5% minimum. Bath depleted — replenishment required. Job ROUTER-12681 on hold.","ncr_raised":True,"ncr_ref":"NCR-2026-003"},
        {"log_id":7,"bath_id":8,"bath_code":"ANO-SL-001","bath_name":"Hot Water Seal Tank","test_date":"2026-06-14","tested_by_name":"Ahmad Bin Rashid","temp_c":98,"concentration_pct":None,"fluorescent_brightness":None,"contamination_check":"PASS","result":"PASS","notes":"Temperature at 98°C, DI water conductivity <20 µS/cm. Ready for sealing.","ncr_raised":False,"ncr_ref":None},
    ], "total": 7},

    # ── MOD-08 Audit Management ──────────────────────────────────
    "GET /api/v1/mod08/alerts/summary": {
        "planned_audits": 2, "open_findings": 5, "overdue_findings": 2, "pending_verification": 3
    },
    "GET /api/v1/mod08/audit-plans": [
        {"audit_plan_id":1,"audit_number":"AP-2026-0001","audit_title":"Annual Internal FPI Process Audit","audit_type":"INTERNAL","audit_scope":"Review all FPI process steps against AC7114 requirements","standard_ref":"AS9100D §9.2, AC7114 Rev F","planned_date":"2026-06-20","actual_date":None,"lead_auditor_full_name":"James Tan Wei Liang","auditee_dept":"NDT Operations","status":"PLANNED","total_findings":0,"open_findings":0},
        {"audit_plan_id":2,"audit_number":"AP-2026-0002","audit_title":"NADCAP Pre-Audit Readiness Review","audit_type":"NADCAP","audit_scope":"Full NADCAP AC7114 checklist review prior to audit visit","standard_ref":"AC7114 Rev F Checklist","planned_date":"2026-07-10","actual_date":None,"lead_auditor_full_name":"Sarah Lim Mei Ling","auditee_dept":"Quality Assurance","status":"PLANNED","total_findings":3,"open_findings":3},
        {"audit_plan_id":3,"audit_number":"AP-2025-0004","audit_title":"Q4 2025 Internal Audit — Document Control","audit_type":"INTERNAL","audit_scope":"Review document control processes per AS9100D §7.5","standard_ref":"AS9100D §7.5","planned_date":"2025-11-15","actual_date":"2025-11-16","lead_auditor_full_name":"Ahmad Bin Rashid","auditee_dept":"Administration","status":"COMPLETE","overall_result":"MINOR_NC","total_findings":2,"open_findings":0},
    ],
    "GET /api/v1/mod08/audit-plans/1": {"audit_plan_id":1,"audit_number":"AP-2026-0001","audit_title":"Annual Internal FPI Process Audit","audit_type":"INTERNAL","audit_scope":"Review all FPI process steps against AC7114 requirements","standard_ref":"AS9100D §9.2, AC7114 Rev F","planned_date":"2026-06-20","status":"PLANNED","auditee_dept":"NDT Operations","lead_auditor_full_name":"James Tan Wei Liang","findings":[],"checklist":[]},
    "GET /api/v1/mod08/findings": [
        {"finding_id":1,"finding_number":"AF-2026-0001","audit_number":"AP-2026-0002","finding_type":"MINOR_NC","clause_reference":"AC7114 §4.3.2","description":"UV lamp intensity not recorded in calibration log for 3 consecutive weeks","objective_evidence":"Calibration log entries missing weeks 18–20 of 2026","assigned_full_name":"Ahmad Bin Rashid","due_date":"2026-07-01","status":"OPEN","root_cause":None,"corrective_action":None},
        {"finding_id":2,"finding_number":"AF-2026-0002","audit_number":"AP-2026-0002","finding_type":"OBSERVATION","clause_reference":"AS9100D §8.5.1","description":"Process traveler sign-off fields not consistently completed","objective_evidence":"Sample of 10 job travelers: 4 had blank sign-off fields","assigned_full_name":"Sarah Lim Mei Ling","due_date":"2026-06-30","status":"RESPONSE_SUBMITTED","root_cause":"Awareness gap in process","corrective_action":"Refresher training scheduled"},
        {"finding_id":3,"finding_number":"AF-2025-0009","audit_number":"AP-2025-0004","finding_type":"MINOR_NC","clause_reference":"AS9100D §7.5.3","description":"Document revision history not updated on 2 controlled documents","objective_evidence":"Docs ATCA-QP-003 Rev B and ATCA-WI-012 Rev A","assigned_full_name":"James Tan Wei Liang","due_date":"2025-12-15","status":"VERIFIED","root_cause":"Document control procedure not followed","corrective_action":"Procedure reviewed with all document owners"},
    ],

    # ── MOD-13 Work Order / Job Traveler ────────────────────────
    "GET /api/v1/mod13/alerts/summary": {
        "active_jobs": 7, "overdue_jobs": 2, "pending_qa": 3, "coc_pending": 2
    },
    "GET /api/v1/mod13/work-orders": [
        {"work_order_id":1,"wo_number":"WO-2026-0001","job_title":"FPI + MPT on Engine Fan Blades Batch #12","customer_name":"SIA Engineering Company","part_number":"GE90-7B-FAN-BLADE","priority":"HIGH","planned_end":"2026-06-15","status":"IN_PROGRESS","total_steps":4,"done_steps":2,"supervisor_name":"James Tan Wei Liang"},
        {"work_order_id":2,"wo_number":"WO-2026-0002","job_title":"Chemical Bath + Visual Inspection — Landing Gear Components","customer_name":"ST Engineering Aerospace","part_number":"LG-ACTUATOR-A320","priority":"NORMAL","planned_end":"2026-06-20","status":"PENDING_QA","total_steps":3,"done_steps":3,"supervisor_name":"Sarah Lim Mei Ling"},
        {"work_order_id":3,"wo_number":"WO-2026-0003","job_title":"MPT on Turbine Disc Slots","customer_name":"Rolls-Royce Singapore","part_number":"RR-DISC-TRENT-1000","priority":"URGENT","planned_end":"2026-06-14","status":"IN_PROGRESS","total_steps":2,"done_steps":0,"supervisor_name":"James Tan Wei Liang"},
        {"work_order_id":4,"wo_number":"WO-2026-0004","job_title":"Sulfuric Acid Anodize — Inner Body Housing [ROUTER-24913]","customer_name":"Parker Hannifin Aerospace","part_number":"PHN-INNER-BODY-HSG","priority":"NORMAL","planned_end":"2026-06-17","status":"IN_PROGRESS","total_steps":12,"done_steps":7,"supervisor_name":"Ahmad Bin Rashid"},
        {"work_order_id":5,"wo_number":"WO-2026-0005","job_title":"Black Anodize — Front Plate & Hub Frame [ROUTER-12681]","customer_name":"Parker Hannifin Aerospace","part_number":"PHN-FRONTPLATE-HUBFRAME","priority":"HIGH","planned_end":"2026-06-15","status":"ON_HOLD","total_steps":17,"done_steps":4,"supervisor_name":"Ahmad Bin Rashid"},
        {"work_order_id":6,"wo_number":"WO-2026-0006","job_title":"Sulfuric Acid Anodize Type II — Parker Klient Lever [ROUTER-35296]","customer_name":"Parker Hannifin Aerospace","part_number":"PHN-KLIENT-LEVER","priority":"NORMAL","planned_end":"2026-06-20","status":"PENDING_QA","total_steps":13,"done_steps":13,"supervisor_name":"Ahmad Bin Rashid"},
        {"work_order_id":7,"wo_number":"WO-2026-0007","job_title":"Sulfuric Acid Anodize — Couplerols Batch [ROUTER-12758]","customer_name":"SIA Engineering Company","part_number":"SIA-COUPLEROLS-ASSY","priority":"NORMAL","planned_end":"2026-06-19","status":"IN_PROGRESS","total_steps":10,"done_steps":3,"supervisor_name":"James Tan Wei Liang"},
        {"work_order_id":8,"wo_number":"WO-2026-0008","job_title":"Sulfuric Acid Anodize Type II — Inner Bracket [ROUTER-21837]","customer_name":"ST Engineering Aerospace","part_number":"STE-INNER-BRACKET-MK2","priority":"NORMAL","planned_end":"2026-06-18","status":"RECEIVED","total_steps":11,"done_steps":0,"supervisor_name":"James Tan Wei Liang"},
    ],
    "GET /api/v1/mod13/work-orders/1": {"work_order_id":1,"wo_number":"WO-2026-0001","job_title":"FPI + MPT on Engine Fan Blades Batch #12","customer_name":"SIA Engineering Company","part_number":"GE90-7B-FAN-BLADE","quantity":12,"priority":"HIGH","planned_end":"2026-06-15","status":"IN_PROGRESS","supervisor_name":"James Tan Wei Liang","steps":[{"step_id":1,"step_seq":1,"step_name":"Pre-Cleaning","process_type":"OTHER","standard_ref":"ATCA-WI-003","status":"COMPLETE","assigned_name":"Ahmad Bin Rashid","completed_name":"Ahmad Bin Rashid","completed_at":"2026-06-12"},{"step_id":2,"step_seq":2,"step_name":"FPI Inspection","process_type":"FPI","standard_ref":"AC7114 §4","status":"COMPLETE","assigned_name":"James Tan Wei Liang","completed_name":"James Tan Wei Liang","completed_at":"2026-06-13"},{"step_id":3,"step_seq":3,"step_name":"MPT Inspection","process_type":"MPT","standard_ref":"AC7114 §5","status":"PENDING","assigned_name":"Sarah Lim Mei Ling","completed_name":None,"completed_at":None},{"step_id":4,"step_seq":4,"step_name":"Final Visual + Dimensional","process_type":"VISUAL","standard_ref":"Customer Spec Rev C","status":"PENDING","assigned_name":None,"completed_name":None,"completed_at":None}],"documents":[],"notes":[{"note_type":"STATUS_CHANGE","note_text":"Status changed to IN_PROGRESS","created_at":"2026-06-11"}]},

    # ── MOD-17 MPT Process Control ───────────────────────────────
    "GET /api/v1/mod17/alerts/summary": {
        "active_jobs": 3, "pending_review": 1, "overdue": 1, "rejected_this_month": 0
    },
    "GET /api/v1/mod17/jobs": [
        {"mpt_job_id":1,"job_number":"MPT-2026-0001","customer_name":"SIA Engineering Company","part_number":"GE90-7B-FAN-BLADE","technique":"WET_FLUORESCENT","magnetisation_method":"CIRCULAR","inspector_name":"James Tan Wei Liang","planned_date":"2026-06-14","status":"IN_PROGRESS","steps_done":2},
        {"mpt_job_id":2,"job_number":"MPT-2026-0002","customer_name":"Rolls-Royce Singapore","part_number":"RR-DISC-TRENT-1000","technique":"WET_FLUORESCENT","magnetisation_method":"MULTIDIRECTIONAL","inspector_name":"Sarah Lim Mei Ling","planned_date":"2026-06-13","status":"RECEIVED","steps_done":0},
        {"mpt_job_id":3,"job_number":"MPT-2026-0003","customer_name":"ST Engineering Aerospace","part_number":"LG-ACTUATOR-A320","technique":"DRY","magnetisation_method":"LONGITUDINAL","inspector_name":"Ahmad Bin Rashid","planned_date":"2026-06-10","status":"ACCEPTED","steps_done":6},
    ],
    "GET /api/v1/mod17/jobs/1": {"mpt_job_id":1,"job_number":"MPT-2026-0001","customer_name":"SIA Engineering Company","part_number":"GE90-7B-FAN-BLADE","technique":"WET_FLUORESCENT","magnetisation_method":"CIRCULAR","material_spec":"AMS2641","quantity":12,"status":"IN_PROGRESS","inspector_name":"James Tan Wei Liang","steps":[{"step_id":1,"step_number":1,"step_name":"Pre-Cleaning","status":"COMPLETE","performed_name":"Ahmad Bin Rashid","cleaning_method":"Solvent wipe","solvent_used":"MEK"},{"step_id":2,"step_number":2,"step_name":"Equipment Setup & Verification","status":"COMPLETE","performed_name":"James Tan Wei Liang","uv_lamp_intensity_fc":1200,"uv_lamp_ok":True,"ambient_light_fc":1.5,"ambient_light_ok":True},{"step_id":3,"step_number":3,"step_name":"Magnetisation","status":"PENDING","performed_name":None},{"step_id":4,"step_number":4,"step_name":"Particle Application","status":"PENDING","performed_name":None},{"step_id":5,"step_number":5,"step_name":"Examination & Interpretation","status":"PENDING","performed_name":None},{"step_id":6,"step_number":6,"step_name":"Demagnetisation & Post-Cleaning","status":"PENDING","performed_name":None}],"result":None},

    # ── MOD-24 Certificate of Conformance ───────────────────────
    "GET /api/v1/mod24/alerts/summary": {
        "draft_cocs": 4, "issued_cocs": 17, "pending_coc": 3, "voided_cocs": 0
    },
    "GET /api/v1/mod24/cocs": [
        {"coc_id":1,"coc_number":"COC-2026-0001","customer_name":"SIA Engineering Company","customer_po":"PO-2026-0088","part_number":"GE90-7B-FAN-BLADE","quantity_certified":12,"process_fpi":True,"process_mpt":True,"process_chem_bath":False,"process_other":None,"issued_by_name":"James Tan Wei Liang","approved_by_name":"James Tan Wei Liang","issued_at":"2026-06-10","status":"ISSUED"},
        {"coc_id":2,"coc_number":"COC-2026-0002","customer_name":"Rolls-Royce Singapore","customer_po":"PO-2026-0101","part_number":"RR-DISC-TRENT-1000","quantity_certified":4,"process_fpi":False,"process_mpt":True,"process_chem_bath":False,"process_other":None,"issued_by_name":None,"approved_by_name":None,"issued_at":None,"status":"DRAFT"},
        {"coc_id":3,"coc_number":"COC-2026-0003","customer_name":"ST Engineering Aerospace","customer_po":"PO-2026-0077","part_number":"LG-ACTUATOR-A320","quantity_certified":8,"process_fpi":True,"process_mpt":False,"process_chem_bath":True,"process_other":None,"issued_by_name":"Sarah Lim Mei Ling","approved_by_name":"Sarah Lim Mei Ling","issued_at":"2026-06-08","status":"ISSUED"},
        {"coc_id":4,"coc_number":"COC-2026-0004","customer_name":"Parker Hannifin Aerospace","customer_po":"PO-2026-0120","part_number":"PHN-KLIENT-LEVER","quantity_certified":6,"process_fpi":False,"process_mpt":False,"process_chem_bath":True,"process_other":"Sulfuric Acid Anodize Type II per MIL-A-8625","issued_by_name":None,"approved_by_name":None,"issued_at":None,"status":"DRAFT"},
        {"coc_id":5,"coc_number":"COC-2026-0005","customer_name":"Parker Hannifin Aerospace","customer_po":"PO-2026-0118","part_number":"PHN-INNER-BODY-HSG","quantity_certified":4,"process_fpi":False,"process_mpt":False,"process_chem_bath":True,"process_other":"Sulfuric Acid Anodize Type II per MIL-A-8625","issued_by_name":None,"approved_by_name":None,"issued_at":None,"status":"DRAFT"},
    ],
    "GET /api/v1/mod24/cocs/2": {"coc_id":2,"coc_number":"COC-2026-0002","customer_name":"Rolls-Royce Singapore","customer_po":"PO-2026-0101","part_number":"RR-DISC-TRENT-1000","part_description":"HP Turbine Disc","part_serial_no":"SN-2026-0044","quantity_certified":4,"process_fpi":False,"process_mpt":True,"process_chem_bath":False,"process_other":None,"specification_refs":"AMS2641, AC7114 Rev F, Customer Spec RR-NDT-001","material_cert_ref":"CERT-2026-0089","inspection_report_ref":"IR-2026-0033","conformance_statement":"We hereby certify that the product described above was produced, inspected and tested in accordance with the referenced specifications and requirements, and meets all applicable requirements.","exceptions_noted":None,"status":"DRAFT","issued_at":None,"approved_by_name":None,"issued_by_name":None,"approved_at":None,"line_items":[{"line_seq":1,"process_module":"MOD17","reference_number":"MPT-2026-0003","process_description":"Magnetic Particle Testing","result":"ACCEPT","notes":"No relevant indications found"}]},

    # ── MOD-11 Maintenance ──────────────────────────────────────
    "GET /api/v1/mod11/alerts/summary": {"due_this_week": 3, "overdue_pm": 1, "open_permits": 2, "active_breakdowns": 0},
    "GET /api/v1/mod11/assets": [
        {"asset_id":1,"asset_code":"MA-2026-0001","name":"FPI Tank A","category":"EQUIPMENT","location":"Bay 1","manufacturer":"Magnaflux","model_number":"ZB-100","status":"ACTIVE","next_pm_due":"2026-06-20"},
        {"asset_id":2,"asset_code":"MA-2026-0002","name":"UV Light Station 1","category":"EQUIPMENT","location":"Bay 1","manufacturer":"Spectroline","model_number":"ENF-260C","status":"ACTIVE","next_pm_due":"2026-06-15"},
        {"asset_id":3,"asset_code":"MA-2026-0003","name":"Air Compressor Unit","category":"UTILITY","location":"Utility Room","manufacturer":"Atlas Copco","model_number":"GA18","status":"ACTIVE","next_pm_due":"2026-07-01"},
    ],
    "GET /api/v1/mod11/assets/1": {"asset_id":1,"asset_code":"MA-2026-0001","asset_name":"FPI Tank A","asset_type":"EQUIPMENT","location":"Bay 1","manufacturer":"Magnaflux","model_number":"ZB-100","serial_number":"MF-2020-0088","purchase_date":"2020-03-15","status":"ACTIVE","schedules":[],"records":[]},
    "GET /api/v1/mod11/schedules": [
        {"schedule_id":1,"asset_name":"FPI Tank A","task_description":"Check penetrant concentration & pH","frequency_days":7,"last_done_date":"2026-06-06","next_due_date":"2026-06-13","rag_status":"DUE_SOON"},
        {"schedule_id":2,"asset_name":"UV Light Station 1","task_description":"UV intensity check — min 1000 μW/cm²","frequency_days":30,"last_done_date":"2026-05-14","next_due_date":"2026-06-13","rag_status":"DUE_SOON"},
        {"schedule_id":3,"asset_name":"Air Compressor Unit","task_description":"Filter replacement & oil level check","frequency_days":90,"last_done_date":"2026-04-01","next_due_date":"2026-07-01","rag_status":"OK"},
    ],
    "GET /api/v1/mod11/permits": [
        {"permit_id":1,"permit_number":"WP-2026-0001","work_description":"Replace UV lamp in Station 1","location":"Bay 1","risk_level":"MEDIUM","status":"ACTIVE","authorised_by_name":"James Tan Wei Liang","valid_from":"2026-06-13","valid_until":"2026-06-14"},
        {"permit_id":2,"permit_number":"WP-2026-0002","work_description":"Drain and clean FPI Tank B","location":"Bay 2","risk_level":"HIGH","status":"PENDING","authorised_by_name":None,"valid_from":"2026-06-14","valid_until":"2026-06-14"},
    ],

    # ── MOD-12 Purchasing ───────────────────────────────────────
    "GET /api/v1/mod12/alerts/summary": {"approved_suppliers": 12, "pending_pr": 3, "open_po": 5, "expiring_accreditations": 1},
    "GET /api/v1/mod12/suppliers": [
        {"supplier_id":1,"supplier_code":"SUP-2026-0001","name":"Magnaflux Asia Pacific","category":"CHEMICAL","avl_scope":"FPI Consumables","contact_name":"David Ng","contact_email":"d.ng@magnaflux.sg","accreditation_body":"SAC","accreditation_ref":"AS9100-MF-2024","accreditation_expiry":"2027-03-31","approval_status":"APPROVED"},
        {"supplier_id":2,"supplier_code":"SUP-2026-0002","name":"Spectronics SEA","category":"EQUIPMENT","avl_scope":"UV Equipment","contact_name":"Rachel Teo","contact_email":"r.teo@spectronics.sg","accreditation_body":"ISO","accreditation_ref":"ISO9001-SP-2025","accreditation_expiry":"2026-06-30","approval_status":"APPROVED"},
        {"supplier_id":3,"supplier_code":"SUP-2026-0003","name":"3M Singapore Pte Ltd","category":"CONSUMABLE","avl_scope":"General Consumables","contact_name":"Kelvin Chan","contact_email":"k.chan@3m.com.sg","accreditation_body":None,"accreditation_ref":None,"accreditation_expiry":None,"approval_status":"PENDING"},
    ],
    "GET /api/v1/mod12/suppliers/1": {"supplier_id":1,"supplier_code":"SUP-2026-0001","name":"Magnaflux Asia Pacific","category":"CHEMICAL","status":"APPROVED"},
    "GET /api/v1/mod12/requisitions": [
        {"requisition_id":1,"pr_number":"PR-2026-0001","title":"FPI penetrant replenishment","supplier_id":1,"supplier_name":"Magnaflux Asia Pacific","estimated_value":2400.00,"required_by":"2026-06-20","status":"APPROVED","raised_by_name":"Sarah Lim Mei Ling","approved_by_name":"James Tan Wei Liang"},
        {"requisition_id":2,"pr_number":"PR-2026-0002","title":"UV intensity meter replacement","supplier_id":2,"supplier_name":"Spectronics SEA","estimated_value":850.00,"required_by":"2026-06-25","status":"PENDING","raised_by_name":"James Tan Wei Liang","approved_by_name":None},
        {"requisition_id":3,"pr_number":"PR-2026-0003","title":"PPE stock replenishment","supplier_id":3,"supplier_name":"3M Singapore Pte Ltd","estimated_value":620.00,"required_by":"2026-06-30","status":"DRAFT","raised_by_name":"Rachel Yap","approved_by_name":None},
    ],
    "GET /api/v1/mod12/purchase-orders": [
        {"po_id":1,"po_number":"PO-2026-0001","pr_number":"PR-2026-0001","supplier_name":"Magnaflux Asia Pacific","po_date":"2026-06-10","delivery_date":"2026-06-20","total_value":2400.00,"status":"ISSUED"},
        {"po_id":2,"po_number":"PO-2026-0002","pr_number":"PR-2025-0099","supplier_name":"Spectronics SEA","po_date":"2026-05-28","delivery_date":"2026-06-05","total_value":850.00,"status":"RECEIVED"},
    ],

    # ── MOD-14 Inventory ────────────────────────────────────────
    "GET /api/v1/mod14/alerts/summary": {"low_stock": 4, "out_of_stock": 2, "expiring_chemicals": 3, "total_items": 35},
    "GET /api/v1/mod14/items": [
        {"item_id":1,"item_code":"INV-2026-0001","name":"Zyglo ZL-2C Penetrant","category":"CHEMICAL","unit":"litre","location":"Chemical Store","current_stock":5,"reorder_level":10,"hazardous_flag":True,"rag_status":"AMBER"},
        {"item_id":2,"item_code":"INV-2026-0002","name":"ZR-10B Remover","category":"CHEMICAL","unit":"litre","location":"Chemical Store","current_stock":0,"reorder_level":5,"hazardous_flag":True,"rag_status":"RED"},
        {"item_id":3,"item_code":"INV-2026-0003","name":"Disposable Nitrile Gloves (L)","category":"PPE","unit":"box","location":"PPE Cabinet","current_stock":24,"reorder_level":5,"hazardous_flag":False,"rag_status":"GREEN"},
        {"item_id":4,"item_code":"INV-2026-0004","name":"Lint-Free Wipes","category":"CONSUMABLE","unit":"roll","location":"Bay 1 Shelf","current_stock":8,"reorder_level":6,"hazardous_flag":False,"rag_status":"AMBER"},
        {"item_id":5,"item_code":"INV-2026-0005","name":"Sulfuric Acid 98% (H2SO4)","category":"CHEMICAL","unit":"litre","location":"Acid Store (Locked)","current_stock":40,"reorder_level":20,"hazardous_flag":True,"rag_status":"GREEN"},
        {"item_id":6,"item_code":"INV-2026-0006","name":"Turco 4215-S Alkaline Cleaner","category":"CHEMICAL","unit":"kg","location":"Chemical Store","current_stock":12,"reorder_level":10,"hazardous_flag":True,"rag_status":"AMBER"},
        {"item_id":7,"item_code":"INV-2026-0007","name":"Nitric Acid 70% (HNO3)","category":"CHEMICAL","unit":"litre","location":"Acid Store (Locked)","current_stock":18,"reorder_level":10,"hazardous_flag":True,"rag_status":"GREEN"},
        {"item_id":8,"item_code":"INV-2026-0008","name":"Sanodal Deep Black MLW Dye","category":"CHEMICAL","unit":"kg","location":"Chemical Store","current_stock":2,"reorder_level":5,"hazardous_flag":True,"rag_status":"RED"},
        {"item_id":9,"item_code":"INV-2026-0009","name":"DI Water (Drum)","category":"CONSUMABLE","unit":"drum","location":"Utility Room","current_stock":6,"reorder_level":2,"hazardous_flag":False,"rag_status":"GREEN"},
        {"item_id":10,"item_code":"INV-2026-0010","name":"Titanium Anodizing Rack (Small)","category":"TOOLING","unit":"pcs","location":"Anodize Bay","current_stock":8,"reorder_level":4,"hazardous_flag":False,"rag_status":"GREEN"},
    ],
    "GET /api/v1/mod14/movements": [
        {"movement_id":1,"item_code":"INV-2026-0001","item_name":"Zyglo ZL-2C Penetrant","movement_type":"ISSUE","qty":2,"lot_number":"LOT-MF-2025-88","moved_by_name":"James Tan Wei Liang","moved_at":"2026-06-12T10:30:00","notes":"Replenish FPI Tank A"},
        {"movement_id":2,"item_code":"INV-2026-0003","item_name":"Disposable Nitrile Gloves (L)","movement_type":"RECEIPT","qty":50,"lot_number":None,"moved_by_name":"Sarah Lim Mei Ling","moved_at":"2026-06-11T14:00:00","notes":"PO-2026-0002"},
    ],

    # ── MOD-18 HR Management ────────────────────────────────────
    "GET /api/v1/mod18/alerts/summary": {"total_staff": 18, "new_this_month": 1, "pending_onboarding": 2, "conflict_declarations_due": 3},
    "GET /api/v1/mod18/staff": [
        {"staff_id":1,"employee_id":"EMP-0001","full_name":"James Tan Wei Liang","job_title":"Quality Manager","department":"Quality Assurance","employment_type":"PERMANENT","employment_date":"2018-04-01","onboarding_complete":True,"conflict_of_interest_declared":True,"status":"ACTIVE"},
        {"staff_id":2,"employee_id":"EMP-0002","full_name":"Sarah Lim Mei Ling","job_title":"NDT Level II Inspector","department":"NDT Operations","employment_type":"PERMANENT","employment_date":"2020-07-15","onboarding_complete":True,"conflict_of_interest_declared":True,"status":"ACTIVE"},
        {"staff_id":3,"employee_id":"EMP-0003","full_name":"Kevin Raj Kumar","job_title":"Production Technician","department":"Production","employment_type":"CONTRACT","employment_date":"2026-06-01","onboarding_complete":False,"conflict_of_interest_declared":False,"status":"ACTIVE"},
    ],
    "GET /api/v1/mod18/staff/1": {"staff_id":1,"employee_id":"EMP-0001","full_name":"James Tan Wei Liang","job_title":"Quality Manager","status":"ACTIVE"},
    "GET /api/v1/mod18/org-entities": [
        {"entity_id":1,"entity_name":"ATC Aviation Pte Ltd","division":"Corporate","department":None,"team":None},
        {"entity_id":2,"entity_name":"Quality Assurance","division":"Operations","department":"QA","team":None},
        {"entity_id":3,"entity_name":"NDT Operations","division":"Operations","department":"NDT","team":None},
        {"entity_id":4,"entity_name":"Production","division":"Operations","department":"Production","team":None},
    ],

    # ── MOD-19 Extended Laboratory ───────────────────────────────
    "GET /api/v1/mod19/alerts/summary": {"overdue_analyses": 1, "due_soon": 2, "low_stock": 2, "validation_overdue": 1, "lab_accred_expiring": 0, "total": 4},
    "GET /api/v1/mod19/analysis-schedules": {"items":[
        {"schedule_id":1,"schedule_ref":"LAB-SCH-001","analysis_name":"Anodize bath H2SO4 titration","analysis_type":"CHEMICAL","process_area":"Anodize Bay","frequency_type":"DAILY","next_due_date":"2026-06-15","last_done_date":"2026-06-14","days_to_due":0,"status":"DUE","responsible_name":"Ahmad Bin Rashid","external_lab":False},
        {"schedule_id":2,"schedule_ref":"LAB-SCH-002","analysis_name":"Penetrant sensitivity (TAM panel)","analysis_type":"NDT","process_area":"FPI Bay","frequency_type":"WEEKLY","next_due_date":"2026-06-18","last_done_date":"2026-06-11","days_to_due":3,"status":"OK","responsible_name":"James Tan Wei Liang","external_lab":False},
    ],"total":2},

    # ── MOD-20 Customer Complaint & 8D ──────────────────────────
    "GET /api/v1/mod20/alerts/summary": {"open_complaints": 4, "critical_open": 1, "overdue_complaints": 1, "open_8d": 2},
    "GET /api/v1/mod20/complaints": {"items":[
        {"complaint_id":1,"complaint_ref":"CMP-2026-0001","customer_name":"Rolls-Royce Singapore","complaint_type":"QUALITY","subject":"Surface finish out of spec on disc batch","severity":"CRITICAL","received_date":"2026-06-05","target_close_date":"2026-06-26","status":"OPEN","owned_by_name":"James Tan Wei Liang","has_8d":False},
        {"complaint_id":2,"complaint_ref":"CMP-2026-0002","customer_name":"SIA Engineering Company","complaint_type":"DELIVERY","subject":"Late delivery of CoC documentation","severity":"MEDIUM","received_date":"2026-06-09","target_close_date":"2026-06-30","status":"IN_PROGRESS","owned_by_name":"Sarah Lim Mei Ling","has_8d":False},
    ],"total":2},

    # ── MOD-15 KPI Dashboard (own badge; aggregates others client-side) ──
    "GET /api/v1/mod15/alerts/summary": {"critical_items": 19, "warnings": 56, "modules_attention": 16, "health_score": 22},

    # ── MOD-21 Communications ───────────────────────────────────
    "GET /api/v1/mod21/alerts/summary": {"active_announcements": 3, "unacknowledged": 2, "urgent_count": 1, "expired_this_week": 0},
    "GET /api/v1/mod21/announcements": [
        {"announcement_id":1,"title":"NADCAP Surveillance Audit — 2026-07-10","body":"NADCAP surveillance audit scheduled for 10 July 2026. All personnel must ensure their certifications are current. Review your procedure checklist by 30 June.","priority":"URGENT","published_by_name":"James Tan Wei Liang","published_at":"2026-06-10T09:00:00","expires_at":"2026-07-10T23:59:59","target_roles":None,"acknowledged":False},
        {"announcement_id":2,"title":"Updated PPE Policy — Effective 2026-07-01","body":"Revised PPE requirements for chemical processing areas. Double-glove policy now mandatory when handling Class 1 chemicals. See QP-PPE-003 Rev 5.","priority":"IMPORTANT","published_by_name":"James Tan Wei Liang","published_at":"2026-06-08T14:30:00","expires_at":None,"target_roles":"NDT_INSPECTOR,SUPERVISOR","acknowledged":True},
        {"announcement_id":3,"title":"Canteen Renovation — Level 2 Closed 14–16 Jun","body":"Level 2 canteen will be closed from 14 to 16 June for renovation. Alternative dining available at Level 1 lobby.","priority":"NORMAL","published_by_name":"Sarah Lim Mei Ling","published_at":"2026-06-12T11:00:00","expires_at":"2026-06-16T23:59:59","target_roles":None,"acknowledged":False},
    ],

    # ── MOD-22 Leave & Attendance ───────────────────────────────
    "GET /api/v1/mod22/alerts/summary": {"pending_requests": 4, "on_leave_today": 2, "absent_today": 1, "low_balance_staff": 3},
    "GET /api/v1/mod22/leave-requests": [
        {"request_id":1,"staff_name":"Kevin Raj Kumar","leave_type_name":"Annual Leave","start_date":"2026-06-16","end_date":"2026-06-17","days_taken":2,"status":"PENDING","approved_by_name":None},
        {"request_id":2,"staff_name":"Sarah Lim Mei Ling","leave_type_name":"Medical Leave","start_date":"2026-06-13","end_date":"2026-06-13","days_taken":1,"status":"APPROVED","approved_by_name":"James Tan Wei Liang"},
        {"request_id":3,"staff_name":"Rachel Yap","leave_type_name":"Annual Leave","start_date":"2026-06-20","end_date":"2026-06-24","days_taken":5,"status":"PENDING","approved_by_name":None},
    ],
    "GET /api/v1/mod22/leave-types": [
        {"type_id":1,"name":"Annual Leave","days_per_year":14,"carry_forward_max":5},
        {"type_id":2,"name":"Medical Leave","days_per_year":14,"carry_forward_max":0},
        {"type_id":3,"name":"Hospitalisation Leave","days_per_year":60,"carry_forward_max":0},
        {"type_id":4,"name":"Childcare Leave","days_per_year":6,"carry_forward_max":0},
        {"type_id":5,"name":"Compassionate Leave","days_per_year":3,"carry_forward_max":0},
    ],

    # ── MOD-23 Payroll ──────────────────────────────────────────
    "GET /api/v1/mod23/alerts/summary": {"pending_runs": 1, "current_month_gross": 98450.00, "staff_paid": 17, "runs_disbursed_ytd": 5},
    "GET /api/v1/mod23/runs": [
        {"run_id":1,"pay_period_start":"2026-05-01","pay_period_end":"2026-05-31","run_by_name":"James Tan Wei Liang","line_count":17,"total_gross":98450.00,"total_net":78760.00,"status":"DISBURSED","approved_by_name":"James Tan Wei Liang"},
        {"run_id":2,"pay_period_start":"2026-06-01","pay_period_end":"2026-06-30","run_by_name":"James Tan Wei Liang","line_count":18,"total_gross":99200.00,"total_net":79360.00,"status":"DRAFT","approved_by_name":None},
    ],
    "GET /api/v1/mod23/runs/1": {"run_id":1,"pay_period_start":"2026-05-01","pay_period_end":"2026-05-31","status":"DISBURSED","lines":[
        {"employee_id":"EMP-0001","full_name":"James Tan Wei Liang","department":"Quality Assurance","basic_pay":7500.00,"allowances":500.00,"overtime_pay":0.00,"gross_pay":8000.00,"cpf_employee":1600.00,"cpf_employer":1360.00,"net_pay":6400.00},
        {"employee_id":"EMP-0002","full_name":"Sarah Lim Mei Ling","department":"NDT Operations","basic_pay":5200.00,"allowances":300.00,"overtime_pay":240.00,"gross_pay":5740.00,"cpf_employee":1148.00,"cpf_employer":975.80,"net_pay":4592.00},
    ]},
    "GET /api/v1/mod23/runs/2": {"run_id":2,"pay_period_start":"2026-06-01","pay_period_end":"2026-06-30","status":"DRAFT","lines":[]},

    # ── MOD-16 Finance ──────────────────────────────────────────
    "GET /api/v1/mod16/alerts/summary": {"ar_outstanding": 125600.00, "overdue_invoices": 2, "ap_outstanding": 38450.00, "pending_payroll_runs": 1},
    "GET /api/v1/mod16/accounts": [
        {"account_id":1,"account_code":"1001","account_name":"Cash at Bank — OCBC","account_type":"ASSET","category":"Current Asset","currency":"SGD"},
        {"account_id":2,"account_code":"1100","account_name":"Accounts Receivable","account_type":"ASSET","category":"Current Asset","currency":"SGD"},
        {"account_id":3,"account_code":"1200","account_name":"Inventory","account_type":"ASSET","category":"Current Asset","currency":"SGD"},
        {"account_id":4,"account_code":"1500","account_name":"Fixed Assets","account_type":"ASSET","category":"Non-Current Asset","currency":"SGD"},
        {"account_id":5,"account_code":"2001","account_name":"Accounts Payable","account_type":"LIABILITY","category":"Current Liability","currency":"SGD"},
        {"account_id":6,"account_code":"2100","account_name":"CPF Payable","account_type":"LIABILITY","category":"Current Liability","currency":"SGD"},
        {"account_id":7,"account_code":"2200","account_name":"Accrued Expenses","account_type":"LIABILITY","category":"Current Liability","currency":"SGD"},
        {"account_id":8,"account_code":"3001","account_name":"Retained Earnings","account_type":"EQUITY","category":"Equity","currency":"SGD"},
        {"account_id":9,"account_code":"4001","account_name":"NDT Services Revenue","account_type":"REVENUE","category":"Operating Revenue","currency":"SGD"},
        {"account_id":10,"account_code":"4002","account_name":"Calibration Services Revenue","account_type":"REVENUE","category":"Operating Revenue","currency":"SGD"},
        {"account_id":11,"account_code":"5001","account_name":"Staff Salaries & CPF","account_type":"EXPENSE","category":"Staff Costs","currency":"SGD"},
        {"account_id":12,"account_code":"5100","account_name":"Chemical & Consumables","account_type":"EXPENSE","category":"Direct Costs","currency":"SGD"},
        {"account_id":13,"account_code":"5200","account_name":"Equipment Maintenance","account_type":"EXPENSE","category":"Overhead","currency":"SGD"},
    ],
    "GET /api/v1/mod16/ar-invoices": [
        {"invoice_id":1,"invoice_number":"INV-2026-0001","customer_name":"SIA Engineering Company","issue_date":"2026-05-15","due_date":"2026-06-14","amount":48000.00,"status":"OVERDUE"},
        {"invoice_id":2,"invoice_number":"INV-2026-0002","customer_name":"Rolls-Royce Singapore","issue_date":"2026-06-01","due_date":"2026-07-01","amount":32600.00,"status":"SENT"},
        {"invoice_id":3,"invoice_number":"INV-2026-0003","customer_name":"ST Engineering Aerospace","issue_date":"2026-06-05","due_date":"2026-07-05","amount":45000.00,"status":"SENT"},
    ],
    "GET /api/v1/mod16/ap-invoices": [
        {"invoice_id":1,"supplier_name":"Magnaflux Asia Pacific","supplier_invoice_number":"MF-INV-2026-0441","received_date":"2026-06-10","due_date":"2026-07-10","amount":2400.00,"status":"PENDING"},
        {"invoice_id":2,"supplier_name":"Spectronics SEA","supplier_invoice_number":"SPEC-2026-088","received_date":"2026-06-05","due_date":"2026-07-05","amount":850.00,"status":"APPROVED"},
    ],
    "GET /api/v1/mod16/journal-entries": [
        {"entry_id":1,"entry_number":"JE-2026-0001","description":"May 2026 payroll disbursement","entry_date":"2026-05-31","total_debit":98450.00,"total_credit":98450.00,"status":"POSTED"},
        {"entry_id":2,"entry_number":"JE-2026-0002","description":"Chemical inventory write-off — expired batch","entry_date":"2026-06-01","total_debit":450.00,"total_credit":450.00,"status":"DRAFT"},
    ],

    # ── Change Log ──────────────────────────────────────────────
    "GET /api/v1/changelog/alerts/summary": {"total_entries": 11, "entries_this_month": 4, "feature_count": 8, "bugfix_count": 3},
    "GET /api/v1/changelog/entries": [
        {"entry_id":8,"version":"1.7.0","category":"FEATURE","description":"Phase 8: System Change Log and Bug Report modules added","affected_modules":"MOD-CHANGELOG,MOD-BUGREPORT","notes":None,"created_by_name":"James Tan Wei Liang","created_at":"2026-06-14T01:00:00"},
        {"entry_id":7,"version":"1.6.0","category":"FEATURE","description":"Phase 7: Finance module — AR/AP invoices, journal entries, chart of accounts (13 seeded accounts)","affected_modules":"MOD-16","notes":None,"created_by_name":"James Tan Wei Liang","created_at":"2026-06-13T22:00:00"},
        {"entry_id":6,"version":"1.5.0","category":"FEATURE","description":"Phase 6: HR Management, Communications, Leave & Attendance, Payroll Processing","affected_modules":"MOD-18,MOD-21,MOD-22,MOD-23","notes":None,"created_by_name":"James Tan Wei Liang","created_at":"2026-06-13T20:00:00"},
        {"entry_id":5,"version":"1.4.0","category":"FEATURE","description":"Phase 5: Maintenance, Purchasing & AVL, Inventory Management with RAG stock status","affected_modules":"MOD-11,MOD-12,MOD-14","notes":None,"created_by_name":"James Tan Wei Liang","created_at":"2026-06-13T18:00:00"},
        {"entry_id":4,"version":"1.3.0","category":"FEATURE","description":"Phase 4: Production Management with AC7108 Appendix D condition recording; Extended Laboratory","affected_modules":"MOD-10,MOD-19","notes":None,"created_by_name":"James Tan Wei Liang","created_at":"2026-06-13T14:00:00"},
        {"entry_id":3,"version":"1.0.3","category":"BUGFIX","description":"Fixed atca-core.js duplicate init — replaced auto-init with singleton ATCA.initPage() to eliminate double clock timers","affected_modules":"ALL","notes":"Eliminates duplicate alert polling and double session listeners","created_by_name":"James Tan Wei Liang","created_at":"2026-06-12T10:00:00"},
        {"entry_id":2,"version":"1.0.2","category":"BUGFIX","description":"Fixed route ordering in MOD-01 reviews — /actions/:id matched before /:id causing action updates to be unreachable","affected_modules":"MOD-01","notes":"Moved action route above generic ID route","created_by_name":"James Tan Wei Liang","created_at":"2026-06-12T09:30:00"},
        {"entry_id":1,"version":"1.0.1","category":"BUGFIX","description":"Fixed KPI field name mismatch in MOD-04 — expired_certs vs certs_expired causing KPI cards to always show em-dash","affected_modules":"MOD-04","notes":None,"created_by_name":"James Tan Wei Liang","created_at":"2026-06-12T09:00:00"},
    ],

    # ── Bug Report ──────────────────────────────────────────────
    "GET /api/v1/bugreport/alerts/summary": {"open_bugs": 3, "critical_bugs": 1, "resolved_this_month": 5, "avg_resolution_days": 1.8},
    "GET /api/v1/bugreport/bugs": [
        {"bug_id":1,"title":"Calibration due-date shows wrong year after midnight rollover","description":"On 2026-01-01 00:05, all calibration due dates displayed as 2025 due to timezone offset in date formatting.","severity":"CRITICAL","module_affected":"MOD-05","steps_to_reproduce":"1. Open MOD-05 at midnight. 2. Check due dates. 3. Observe year shown as previous year.","status":"OPEN","resolution_notes":None,"reported_by_name":"Sarah Lim Mei Ling","resolved_by_name":None,"reported_at":"2026-06-10T08:30:00","resolved_at":None},
        {"bug_id":2,"title":"Work Order step sign-off allows same user twice","description":"A user can sign off both the inspector and supervisor fields on the same WO step without restriction.","severity":"HIGH","module_affected":"MOD-13","steps_to_reproduce":"1. Open any WO traveler. 2. Sign off inspector field. 3. Sign off supervisor field as same user. 4. No validation error shown.","status":"IN_PROGRESS","resolution_notes":"Investigating RBAC check on step sign-off endpoint","reported_by_name":"James Tan Wei Liang","resolved_by_name":None,"reported_at":"2026-06-11T10:15:00","resolved_at":None},
        {"bug_id":3,"title":"NCR list does not refresh after closing CAPA modal","description":"After closing the Add CAPA modal, the NCR table does not reload — requires manual page refresh to see new CAPA.","severity":"MEDIUM","module_affected":"MOD-07","steps_to_reproduce":"1. Open NCR list. 2. Click Add CAPA. 3. Fill and save. 4. Close modal. 5. NCR table shows stale data.","status":"OPEN","resolution_notes":None,"reported_by_name":"Kevin Raj Kumar","resolved_by_name":None,"reported_at":"2026-06-12T14:00:00","resolved_at":None},
        {"bug_id":4,"title":"Leave type select blank on first modal open","description":"On first page load, the Apply Leave modal's leave type dropdown is empty until the Leave Types tab is visited first.","severity":"LOW","module_affected":"MOD-22","steps_to_reproduce":"1. Open MOD-22. 2. Click Apply Leave without visiting Leave Types tab. 3. Dropdown is empty.","status":"RESOLVED","resolution_notes":"Fixed: loadLeaveTypes() now called in init() rather than on tab shown event.","reported_by_name":"Rachel Yap","resolved_by_name":"James Tan Wei Liang","reported_at":"2026-06-13T09:00:00","resolved_at":"2026-06-13T11:30:00"},
    ],

    # ── Chat ──────────────────────────────────────────────────────
    "GET /api/v1/chat/alerts/summary": {"unread_messages": 3, "active_rooms": 2},
    "GET /api/v1/chat/users": [
        {"user_id":1,"full_name":"James Tan Wei Liang","username":"james.tan","role":"ADMIN"},
        {"user_id":2,"full_name":"Sarah Lim Mei Ling","username":"sarah.lim","role":"QA_MANAGER"},
        {"user_id":3,"full_name":"Kevin Raj Kumar","username":"kevin.raj","role":"ENGINEER"},
        {"user_id":4,"full_name":"Rachel Yap","username":"rachel.yap","role":"SUPERVISOR"},
        {"user_id":5,"full_name":"Ahmad Fauzi","username":"ahmad.fauzi","role":"NDT_INSPECTOR"},
    ],
    "GET /api/v1/chat/rooms": [
        {"room_id":1,"name":None,"room_type":"DIRECT","created_at":"2026-06-13T08:00:00",
         "last_message":"Ready for the bath test this morning?","last_sent_at":"2026-06-14T07:45:00",
         "participant_count":2,"other_names":"Sarah Lim Mei Ling"},
        {"room_id":2,"name":"QA Team","room_type":"GROUP","created_at":"2026-06-10T10:00:00",
         "last_message":"All NCRs for June reviewed.","last_sent_at":"2026-06-13T17:30:00",
         "participant_count":3,"other_names":"Sarah Lim Mei Ling, Kevin Raj Kumar"},
    ],
    "GET /api/v1/chat/rooms/1/messages": [
        {"message_id":1,"room_id":1,"sender_id":2,"sender_name":"Sarah Lim Mei Ling","body":"Morning James, did you review the CoC for WO-2026-0042?","sent_at":"2026-06-14T07:30:00","is_deleted":0},
        {"message_id":2,"room_id":1,"sender_id":1,"sender_name":"James Tan Wei Liang","body":"Yes, looks good. Approved and issued.","sent_at":"2026-06-14T07:35:00","is_deleted":0},
        {"message_id":3,"room_id":1,"sender_id":2,"sender_name":"Sarah Lim Mei Ling","body":"Ready for the bath test this morning?","sent_at":"2026-06-14T07:45:00","is_deleted":0},
    ],
    "GET /api/v1/chat/rooms/2/messages": [
        {"message_id":4,"room_id":2,"sender_id":3,"sender_name":"Kevin Raj Kumar","body":"NCR-2026-0018 CAPA verified and closed.","sent_at":"2026-06-13T16:00:00","is_deleted":0},
        {"message_id":5,"room_id":2,"sender_id":2,"sender_name":"Sarah Lim Mei Ling","body":"Good work team. All NCRs for June reviewed.","sent_at":"2026-06-13T17:30:00","is_deleted":0},
    ],

    # ── Signature ─────────────────────────────────────────────────
    "GET /api/v1/auth/signature": {"signature_data": None, "signature_updated_at": None},
}

# ── MOD-28 PCM + MOD-29 Qualification demo data (external JSON, kept in sync
#    with atca-demo.js). pcm_demo.json is generated by tools/import_pcm.py. ──
try:
    import json as _json, os as _os
    import glob as _glob
    _tools = _os.path.join(_os.path.dirname(_os.path.abspath(__file__)), 'tools')
    for _fp in sorted(_glob.glob(_os.path.join(_tools, '*_demo.json'))):
        for _ep, _val in _json.load(open(_fp, encoding='utf-8')).items():
            STUBS['GET /api/v1' + _ep] = _val
except Exception as _e:
    print('[preview] PCM/qualification demo load skipped:', _e)


class ATCAHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=FRONTEND_DIR, **kwargs)

    def log_message(self, format, *args):
        pass  # Suppress request logs

    def send_json(self, code, data):
        body = json.dumps(data, default=str).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", len(body))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def do_PATCH(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip("?").split("?")[0]
        key = f"PATCH {path}"
        if key in STUBS:
            return self.send_json(200, STUBS[key])
        self.send_json(200, {"message": "ok", "updated": True})

    def do_PUT(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip("?").split("?")[0]
        key = f"PUT {path}"
        if key in STUBS:
            return self.send_json(200, STUBS[key])
        self.send_json(200, {"message": "ok", "updated": True})

    def do_DELETE(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip("?").split("?")[0]
        self.send_json(200, {"message": "deleted"})

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()

    def do_POST(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip("?").split("?")[0]

        # Login stub
        if path == "/api/v1/auth/login":
            length = int(self.headers.get("Content-Length", 0))
            body   = json.loads(self.rfile.read(length) or b"{}")
            if body.get("username") == "admin" and body.get("password") == "preview123":
                return self.send_json(200, {
                    "message": "Login successful.", "user_id": 1,
                    "username": "admin", "role": "ADMIN",
                    "full_name": "James Tan Wei Liang"
                })
            if body.get("username") == "cabal" and body.get("password") == "cabal":
                return self.send_json(200, {
                    "message": "Login successful.", "user_id": 7,
                    "username": "cabal", "role": "ADMIN",
                    "full_name": "Cabal"
                })
            return self.send_json(401, {"message": "Preview mode — use: admin / preview123 or cabal / cabal"})

        key = f"POST {path}"
        if key in STUBS:
            return self.send_json(200, STUBS[key])
        self.send_json(200, {"message": "ok"})

    def do_GET(self):
        parsed = urlparse(self.path)
        path   = parsed.path.rstrip("?").split("?")[0]

        # Page routes
        if path in ("/", ""):
            return self.serve_file("index.html")
        if path == "/login":
            return self.serve_file("login.html")
        if path == "/logout":
            self.send_response(302)
            self.send_header("Location", "/login")
            self.end_headers()
            return

        # API stubs — strip query string for lookup
        key = f"GET {path}"
        if key in STUBS:
            return self.send_json(200, STUBS[key])

        # MOD-27 dynamic value-flow lookup: /api/v1/mod27/flow/<grn_ref>
        if path.startswith("/api/v1/mod27/flow/"):
            grn_ref = path.rsplit("/", 1)[-1] or "GRN-2026-0042"
            return self.send_json(200, {
                "grn_ref": grn_ref,
                "customer_name": "Rolls-Royce Singapore",
                "stages": {
                    "contract_review": {"ref": "CR-2026-0031", "status": "APPROVED", "review_date": "2026-06-05"},
                    "grn":             {"ref": grn_ref, "status": "ACCEPTED", "received_date": "2026-06-06", "inspection_done": True, "inspect_result": "ACCEPT"},
                    "work_order":      {"ref": "WO-2026-0019", "work_order_id": 19, "status": "IN_PROGRESS", "planned_end": "2026-06-20", "steps_done": 3, "steps_total": 6},
                    "production":      {"total": 2, "done": 2, "complete": True},
                    "fpi":             {"required": True, "ref": "FPI-2026-0007", "status": "COMPLETE", "disposition": "ACCEPT"},
                    "mpt":             {"required": False},
                    "qa_signoff":      {"status": "PENDING_QA"},
                    "coc":             {"ref": None, "status": "NOT_ISSUED"},
                    "delivery":        {"ref": None, "status": "NOT_READY"},
                },
                "current_stage": 6,
                "blocked": False,
                "ncr_open": 0,
            })

        # 404 for unknown API routes
        if path.startswith("/api/"):
            return self.send_json(404, {"message": "Not found."})

        # Static assets — serve with no-cache headers so JS/CSS edits are visible immediately
        return self._serve_static(os.path.join(FRONTEND_DIR, path.lstrip("/")))

    def _serve_static(self, filepath):
        MIME = {
            ".html": "text/html; charset=utf-8",
            ".js":   "application/javascript",
            ".css":  "text/css",
            ".png":  "image/png",
            ".jpg":  "image/jpeg",
            ".svg":  "image/svg+xml",
            ".woff2":"font/woff2",
            ".woff": "font/woff",
            ".ttf":  "font/ttf",
            ".ico":  "image/x-icon",
        }
        # Directory → try index.html
        if os.path.isdir(filepath):
            filepath = os.path.join(filepath, "index.html")
        if not os.path.isfile(filepath):
            return self.send_json(404, {"message": "File not found."})
        ext  = os.path.splitext(filepath)[1].lower()
        with open(filepath, "rb") as f:
            body = f.read()
        self.send_response(200)
        self.send_header("Content-Type", MIME.get(ext, "application/octet-stream"))
        self.send_header("Content-Length", len(body))
        self.send_header("Cache-Control", "no-cache, no-store, must-revalidate")
        self.send_header("Pragma", "no-cache")
        self.send_header("Expires", "0")
        self.end_headers()
        self.wfile.write(body)

    def serve_file(self, filename):
        self._serve_static(os.path.join(FRONTEND_DIR, filename))


if __name__ == "__main__":
    # ThreadingHTTPServer: each request gets its own thread so one slow/half-open
    # connection can't deadlock the whole preview (SimpleHTTPRequestHandler is
    # single-threaded and stalls all pages if any request blocks).
    server = ThreadingHTTPServer(("0.0.0.0", PORT), ATCAHandler)
    server.daemon_threads = True
    print(f"[ATCA-ERP Preview]  http://localhost:{PORT}/login")
    print(f"  Credentials: admin / preview123")
    print(f"  Ctrl+C to stop")
    server.serve_forever()
