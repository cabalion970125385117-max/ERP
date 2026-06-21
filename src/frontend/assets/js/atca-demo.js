/* ATCA-ERP v1.0 - Demo / offline sample data
   Used by atca-core.js as a fallback when the LAN backend is unreachable
   (e.g. the static Vercel deployment). Keys are API endpoints (no /api/v1
   prefix, query string stripped). Generated from preview_server.py STUBS. */
window.ATCA_DEMO = {
  "/auth/me": {
    "user_id": 1,
    "username": "admin",
    "role": "ADMIN",
    "full_name": "James Tan Wei Liang",
    "employee_id": "ATCA-001",
    "personnel_id": 1
  },
  "/alerts/summary": {
    "total": 3
  },
  "/mod04/alerts/summary": {
    "certs_expiring_90d": 2,
    "expired_certs": 1,
    "eye_expiring_60d": 1,
    "expired_eye_exams": 0
  },
  "/mod05/alerts/summary": {
    "cal_overdue": 1,
    "cal_due_30d": 3,
    "never_calibrated": 0,
    "total": 4
  },
  "/mod07/alerts/summary": {
    "open_ncr": 3,
    "overdue_capa": 1,
    "pending_verify": 1,
    "ncr_open_only": 3,
    "total": 5
  },
  "/mod01/policy/current": {
    "policy_id": 1,
    "revision": "Rev 4",
    "status": "APPROVED",
    "effective_date": "2025-01-01",
    "title": "Quality Policy"
  },
  "/mod01/objectives": {
    "items": [
      {
        "objective_id": 1,
        "objective_ref": "QO-2025-01",
        "title": "Achieve NADCAP accreditation renewal",
        "status": "ON_TRACK",
        "target_date": "2025-12-31"
      },
      {
        "objective_id": 2,
        "objective_ref": "QO-2025-02",
        "title": "Reduce NCR turnaround to <5 days",
        "status": "AT_RISK",
        "target_date": "2025-09-30"
      },
      {
        "objective_id": 3,
        "objective_ref": "QO-2025-03",
        "title": "100% personnel NAS410 recertification",
        "status": "ON_TRACK",
        "target_date": "2025-10-15"
      }
    ],
    "total": 3
  },
  "/mod01/risks": {
    "items": [
      {
        "risk_id": 1,
        "risk_ref": "RSK-001",
        "description": "Chemical bath out-of-spec during NADCAP audit",
        "risk_score_pre": 15,
        "status": "OPEN"
      },
      {
        "risk_id": 2,
        "risk_ref": "RSK-002",
        "description": "Inspector certification lapse before renewal",
        "risk_score_pre": 12,
        "status": "OPEN"
      }
    ],
    "total": 2
  },
  "/mod01/reviews": {
    "items": [
      {
        "review_id": 1,
        "review_ref": "MR-2025-01",
        "review_type": "QUARTERLY",
        "review_date": "2025-07-15",
        "chaired_by_name": "Gary Tan Beng Huat",
        "status": "PLANNED",
        "open_actions": 0
      },
      {
        "review_id": 2,
        "review_ref": "MR-2025-02",
        "review_type": "ANNUAL",
        "review_date": "2025-03-10",
        "chaired_by_name": "Gary Tan Beng Huat",
        "status": "CLOSED",
        "open_actions": 2
      }
    ],
    "total": 2
  },
  "/mod02/alerts/summary": {
    "pending_approval": 0,
    "review_overdue": 1,
    "review_due_soon": 1
  },
  "/mod02/documents": {
    "items": [
      {
        "doc_id": 1,
        "doc_number": "ATCA-QP-001",
        "title": "Quality Manual",
        "category": "Quality Procedure",
        "process_area": "All",
        "current_revision": "Rev 4",
        "status": "APPROVED",
        "effective_date": "2025-01-01",
        "review_due_date": "2026-01-01",
        "owner_name": "Gary Tan Beng Huat"
      },
      {
        "doc_id": 2,
        "doc_number": "ATCA-WI-FPI-001",
        "title": "FPI Process Instruction",
        "category": "Work Instruction",
        "process_area": "FPI",
        "current_revision": "Rev 2",
        "status": "APPROVED",
        "effective_date": "2024-06-01",
        "review_due_date": "2025-06-01",
        "owner_name": "James Tan Wei Liang"
      }
    ],
    "total": 2
  },
  "/mod02/categories": [
    {
      "category_id": 1,
      "name": "Quality Procedure"
    },
    {
      "category_id": 2,
      "name": "Work Instruction"
    },
    {
      "category_id": 3,
      "name": "Form"
    }
  ],
  "/mod04/personnel": {
    "items": [
      {
        "personnel_id": 1,
        "employee_id": "ATCA-001",
        "full_name": "James Tan Wei Liang",
        "designation": "LEVEL_2",
        "employment_type": "PERMANENT",
        "active_certs": 3,
        "latest_exam_date": "2024-11-01",
        "latest_exam_expiry": "2025-11-01",
        "exam_days_left": 160
      },
      {
        "personnel_id": 2,
        "employee_id": "ATCA-002",
        "full_name": "Hendrich Lim Jun Wei",
        "designation": "LEVEL_2",
        "employment_type": "PERMANENT",
        "active_certs": 2,
        "latest_exam_date": "2024-09-15",
        "latest_exam_expiry": "2025-09-15",
        "exam_days_left": 113
      },
      {
        "personnel_id": 3,
        "employee_id": "ATCA-003",
        "full_name": "Cabal Lo Wen Xin",
        "designation": "LEVEL_2",
        "employment_type": "CONTRACT",
        "active_certs": 2,
        "latest_exam_date": "2024-07-01",
        "latest_exam_expiry": "2025-07-01",
        "exam_days_left": 37
      },
      {
        "personnel_id": 5,
        "employee_id": "ATCA-005",
        "full_name": "Azman Bin Ayub",
        "designation": "LEVEL_2",
        "employment_type": "PERMANENT",
        "active_certs": 1,
        "latest_exam_date": "2023-12-01",
        "latest_exam_expiry": "2024-12-01",
        "exam_days_left": -175
      }
    ],
    "total": 4
  },
  "/mod04/certifications": {
    "items": [
      {
        "cert_id": 1,
        "personnel_id": 1,
        "full_name": "James Tan Wei Liang",
        "employee_id": "ATCA-001",
        "method": "PT",
        "ndt_level": "II",
        "cert_scheme": "NAS410",
        "cert_number": "ATCA-PT-001",
        "issuing_authority": "CAAS Singapore",
        "issue_date": "2022-01-10",
        "expiry_date": "2027-01-10",
        "days_left": 600,
        "status": "ACTIVE"
      },
      {
        "cert_id": 2,
        "personnel_id": 2,
        "full_name": "Hendrich Lim Jun Wei",
        "employee_id": "ATCA-002",
        "method": "MT",
        "ndt_level": "II",
        "cert_scheme": "NAS410",
        "cert_number": "ATCA-MT-002",
        "issuing_authority": "CAAS Singapore",
        "issue_date": "2020-06-01",
        "expiry_date": "2025-06-01",
        "days_left": -10,
        "status": "EXPIRED"
      }
    ],
    "total": 2
  },
  "/mod05/equipment": {
    "items": [
      {
        "equipment_id": 1,
        "equip_code": "UV-001",
        "description": "UV-A Lamp — Magnaflux ZB-100F",
        "equip_type": "UV_LAMP",
        "process_area": "FPI",
        "make_model": "Magnaflux ZB-100F",
        "serial_number": "MF-ZB-2021-0042",
        "last_cal_date": "2025-02-14",
        "cal_due_date": "2026-02-14",
        "cal_days_left": 265,
        "cal_rag_status": "CURRENT"
      },
      {
        "equipment_id": 2,
        "equip_code": "TH-001",
        "description": "Digital Thermometer — Fluke 52 II",
        "equip_type": "THERMOMETER",
        "process_area": "FPI",
        "make_model": "Fluke 52 II",
        "serial_number": "FL-52-2019-0118",
        "last_cal_date": "2024-12-01",
        "cal_due_date": "2025-06-01",
        "cal_days_left": -10,
        "cal_rag_status": "OVERDUE"
      },
      {
        "equipment_id": 3,
        "equip_code": "PG-001",
        "description": "Pressure Gauge 0–60 psi",
        "equip_type": "PRESSURE_GAUGE",
        "process_area": "MPT",
        "make_model": "Ashcroft 1009SW",
        "serial_number": "AC-1009-2022-0007",
        "last_cal_date": "2025-04-01",
        "cal_due_date": "2025-10-01",
        "cal_days_left": 28,
        "cal_rag_status": "DUE_SOON"
      }
    ],
    "total": 3
  },
  "/mod05/calibrations": {
    "items": [
      {
        "cal_id": 1,
        "cal_ref": "CAL-2025-001",
        "equipment_id": 1,
        "equip_code": "UV-001",
        "description": "UV-A Lamp",
        "cal_date": "2025-02-14",
        "cal_due_date": "2026-02-14",
        "vendor": "SATS Engineering",
        "cert_number": "SATS-CAL-2025-0042",
        "measured_value": "≥1000 µW/cm²",
        "out_of_tolerance": false,
        "result": "PASS",
        "recorded_by_name": "James Tan Wei Liang"
      }
    ],
    "total": 1
  },
  "/mod07/ncr": {
    "items": [
      {
        "ncr_id": 1,
        "ncr_ref": "NCR-2025-001",
        "ncr_type": "PROCESS",
        "process_area": "FPI",
        "description": "Bath concentration found out of spec during periodic check",
        "detected_date": "2025-05-10",
        "severity": "MJ",
        "source": "INTERNAL_AUDIT",
        "status": "OPEN",
        "raised_by_name": "James Tan Wei Liang",
        "raised_date": "2025-05-10",
        "target_close_date": "2025-06-10",
        "days_open": 15,
        "disposition": null,
        "open_capa_count": 0,
        "capa_required": true
      },
      {
        "ncr_id": 2,
        "ncr_ref": "NCR-2025-002",
        "ncr_type": "PROCESS",
        "process_area": "FPI",
        "description": "UV lamp intensity reading below 1000 µW/cm² minimum requirement",
        "detected_date": "2025-04-20",
        "severity": "MN",
        "source": "PROCESS_CHECK",
        "status": "CAPA_IN_PROGRESS",
        "raised_by_name": "Hendrich Lim Jun Wei",
        "raised_date": "2025-04-20",
        "target_close_date": "2025-05-20",
        "days_open": 35,
        "disposition": "REWORK",
        "open_capa_count": 1,
        "capa_required": true
      },
      {
        "ncr_id": 3,
        "ncr_ref": "NCR-2026-003",
        "ncr_type": "PROCESS",
        "process_area": "ANODIZE",
        "description": "Black Anodize bath (ANO-BK-001) dye concentration below minimum 5% — measured at 3.5%. Job ROUTER-12681 (WO-2026-0005) placed on hold.",
        "detected_date": "2026-06-11",
        "severity": "MJ",
        "source": "PROCESS_CHECK",
        "status": "OPEN",
        "raised_by_name": "James Tan Wei Liang",
        "raised_date": "2026-06-11",
        "target_close_date": "2026-06-14",
        "days_open": 3,
        "disposition": null,
        "open_capa_count": 0,
        "capa_required": true
      }
    ],
    "total": 3
  },
  "/mod07/capa": {
    "items": [
      {
        "capa_id": 1,
        "capa_ref": "CAPA-2025-001",
        "capa_type": "CORRECTIVE",
        "ncr_id": 2,
        "ncr_ref": "NCR-2025-002",
        "root_cause_method": "5WHY",
        "root_cause_description": "UV lamp bulb past service interval; no PM schedule in place",
        "corrective_action": "Replace bulb; add PM schedule",
        "preventive_action": "Add UV lamp to monthly PM checklist",
        "status": "IN_PROGRESS",
        "owner_name": "Hendrich Lim Jun Wei",
        "assigned_to_name": "Hendrich Lim Jun Wei",
        "target_completion_date": "2025-05-20",
        "target_date": "2025-05-20",
        "effectiveness_result": null,
        "verified_by_name": null,
        "closed_date": null,
        "days_overdue": 5
      }
    ],
    "total": 1
  },
  "/mod25/alerts/summary": {
    "total_users": 6,
    "active_users": 5,
    "inactive_users": 1,
    "elevated_roles": 2
  },
  "/mod25/users": {
    "items": [
      {
        "user_id": 1,
        "username": "james.tan",
        "full_name": "James Tan Wei Liang",
        "role": "QA_MANAGER",
        "employee_id": "ATCA-001",
        "personnel_id": 1,
        "active": true,
        "created_date": "2025-01-01",
        "last_login": "2025-05-26T08:30:00"
      },
      {
        "user_id": 2,
        "username": "gary.tan",
        "full_name": "Gary Tan Beng Huat",
        "role": "ADMIN",
        "employee_id": "ATCA-004",
        "personnel_id": 4,
        "active": true,
        "created_date": "2025-01-01",
        "last_login": "2025-05-25T14:15:00"
      },
      {
        "user_id": 3,
        "username": "hendrich.lim",
        "full_name": "Hendrich Lim Jun Wei",
        "role": "NDT_INSPECTOR",
        "employee_id": "ATCA-002",
        "personnel_id": 2,
        "active": true,
        "created_date": "2025-01-15",
        "last_login": "2025-05-25T07:45:00"
      },
      {
        "user_id": 4,
        "username": "cabal.lo",
        "full_name": "Cabal Lo Wen Xin",
        "role": "NDT_INSPECTOR",
        "employee_id": "ATCA-003",
        "personnel_id": 3,
        "active": true,
        "created_date": "2025-02-01",
        "last_login": "2025-05-24T09:00:00"
      },
      {
        "user_id": 5,
        "username": "azman.ayub",
        "full_name": "Azman Bin Ayub",
        "role": "SUPERVISOR",
        "employee_id": "ATCA-005",
        "personnel_id": 5,
        "active": false,
        "created_date": "2025-02-10",
        "last_login": "2025-04-10T16:00:00"
      },
      {
        "user_id": 6,
        "username": "hariharan.raju",
        "full_name": "Hariharan s/o Raju",
        "role": "NDT_INSPECTOR",
        "employee_id": "ATCA-006",
        "personnel_id": 6,
        "active": true,
        "created_date": "2025-03-01",
        "last_login": "2025-05-23T08:00:00"
      }
    ],
    "total": 6
  },
  "/mod27/alerts/summary": {
    "active_jobs": 8,
    "grn_pending": 2,
    "coc_pending": 3,
    "shipped_today": 4,
    "total": 8
  },
  "/mod27/active-grns": {
    "items": [
      {
        "grn_ref": "GRN-2026-0042",
        "customer_name": "Rolls-Royce Singapore",
        "received_date": "2026-06-10",
        "status": "ACCEPTED"
      },
      {
        "grn_ref": "GRN-2026-0041",
        "customer_name": "ST Engineering",
        "received_date": "2026-06-08",
        "status": "ACCEPTED"
      },
      {
        "grn_ref": "GRN-2026-0040",
        "customer_name": "SIA Engineering",
        "received_date": "2026-06-05",
        "status": "PENDING"
      }
    ]
  },
  "/mod26/alerts/summary": {
    "db_used_pct": 24,
    "active_sessions": 3,
    "failed_logins_24h": 2,
    "days_since_backup": 0
  },
  "/admin/maintenance-status": {
    "enabled": false,
    "message": "System is undergoing scheduled maintenance. Please try again shortly.",
    "since": null,
    "by": null
  },
  "/admin/storage": {
    "db_name": "ATCA_ERP_DB",
    "db_used_mb": 2412.5,
    "db_alloc_mb": 4096,
    "db_max_mb": 10240,
    "log_used_mb": 318.7,
    "disk_free_gb": 214.6,
    "disk_total_gb": 512.0,
    "tables": [
      {
        "name": "AuditLog",
        "rows": 184213,
        "size_mb": 612.4
      },
      {
        "name": "ChatMessage",
        "rows": 8421,
        "size_mb": 41.8
      },
      {
        "name": "FpiInspectionStep",
        "rows": 12640,
        "size_mb": 38.2
      },
      {
        "name": "BathSample",
        "rows": 9877,
        "size_mb": 27.1
      },
      {
        "name": "Document",
        "rows": 1342,
        "size_mb": 486.9
      },
      {
        "name": "MptInspectionStep",
        "rows": 7110,
        "size_mb": 19.4
      },
      {
        "name": "WorkOrder",
        "rows": 3201,
        "size_mb": 14.7
      },
      {
        "name": "CalibrationRecord",
        "rows": 2056,
        "size_mb": 9.2
      }
    ],
    "files": {
      "signatures_mb": 12.3,
      "documents_mb": 486.9,
      "backups_mb": 1840.0,
      "attachments_mb": 203.4
    }
  },
  "/admin/activity": {
    "items": [
      {
        "log_id": 184213,
        "ts": "2026-06-15T13:42:08",
        "username": "admin",
        "role": "ADMIN",
        "action": "LOGIN",
        "module": "AUTH",
        "table_name": "Users",
        "record_id": 1,
        "lan_ip": "192.168.1.31",
        "detail": "Successful login"
      },
      {
        "log_id": 184212,
        "ts": "2026-06-15T13:38:51",
        "username": "james.tan",
        "role": "QA_MANAGER",
        "action": "ISSUE",
        "module": "MOD-24",
        "table_name": "CertificateOfConformance",
        "record_id": 17,
        "lan_ip": "192.168.1.22",
        "detail": "CoC COC-2026-0017 issued"
      },
      {
        "log_id": 184211,
        "ts": "2026-06-15T13:21:04",
        "username": "hendrich.lim",
        "role": "NDT_INSPECTOR",
        "action": "SIGNOFF",
        "module": "MOD-03",
        "table_name": "FpiInspectionStep",
        "record_id": 12640,
        "lan_ip": "192.168.1.18",
        "detail": "FPI-2026-0002 step 7 signed off"
      },
      {
        "log_id": 184210,
        "ts": "2026-06-15T12:55:32",
        "username": "cabal.lo",
        "role": "NDT_INSPECTOR",
        "action": "CREATE",
        "module": "MOD-06",
        "table_name": "BathSample",
        "record_id": 9877,
        "lan_ip": "192.168.1.19",
        "detail": "Bath ANO-BK-001 sample recorded — OUT_OF_SPEC"
      },
      {
        "log_id": 184209,
        "ts": "2026-06-15T11:47:11",
        "username": "UNKNOWN",
        "role": "-",
        "action": "LOGIN_FAIL",
        "module": "AUTH",
        "table_name": "Users",
        "record_id": null,
        "lan_ip": "192.168.1.77",
        "detail": "Failed login — bad password (attempt 2/5)"
      },
      {
        "log_id": 184208,
        "ts": "2026-06-15T10:30:45",
        "username": "admin",
        "role": "ADMIN",
        "action": "ROLE_CHANGE",
        "module": "MOD-25",
        "table_name": "Users",
        "record_id": 5,
        "lan_ip": "192.168.1.31",
        "detail": "azman.ayub deactivated"
      },
      {
        "log_id": 184207,
        "ts": "2026-06-15T09:12:20",
        "username": "james.tan",
        "role": "QA_MANAGER",
        "action": "VERIFY",
        "module": "MOD-07",
        "table_name": "CAPA",
        "record_id": 42,
        "lan_ip": "192.168.1.22",
        "detail": "CAPA-2026-0012 verified & closed"
      },
      {
        "log_id": 184206,
        "ts": "2026-06-15T08:31:02",
        "username": "hariharan.raju",
        "role": "NDT_INSPECTOR",
        "action": "LOGIN",
        "module": "AUTH",
        "table_name": "Users",
        "record_id": 6,
        "lan_ip": "192.168.1.20",
        "detail": "Successful login"
      },
      {
        "log_id": 184205,
        "ts": "2026-06-15T08:05:54",
        "username": "admin",
        "role": "ADMIN",
        "action": "BACKUP",
        "module": "MOD-26",
        "table_name": "-",
        "record_id": null,
        "lan_ip": "192.168.1.31",
        "detail": "Nightly backup completed (1.74 GB)"
      },
      {
        "log_id": 184204,
        "ts": "2026-06-14T17:48:39",
        "username": "gary.tan",
        "role": "ADMIN",
        "action": "CONFIG",
        "module": "MOD-26",
        "table_name": "SystemConfig",
        "record_id": 3,
        "lan_ip": "192.168.1.31",
        "detail": "Session timeout changed 8h → 8h (no-op)"
      }
    ],
    "total": 184213
  },
  "/admin/users": {
    "items": [
      {
        "user_id": 1,
        "username": "admin",
        "full_name": "James Tan Wei Liang",
        "role": "ADMIN",
        "employee_id": "ATCA-001",
        "active": true,
        "last_login": "2026-06-15T13:42:08",
        "failed_attempts": 0,
        "must_reset": false
      },
      {
        "user_id": 2,
        "username": "gary.tan",
        "full_name": "Gary Tan Beng Huat",
        "role": "ADMIN",
        "employee_id": "ATCA-004",
        "active": true,
        "last_login": "2026-06-14T17:48:39",
        "failed_attempts": 0,
        "must_reset": false
      },
      {
        "user_id": 3,
        "username": "hendrich.lim",
        "full_name": "Hendrich Lim Jun Wei",
        "role": "NDT_INSPECTOR",
        "employee_id": "ATCA-002",
        "active": true,
        "last_login": "2026-06-15T13:21:04",
        "failed_attempts": 0,
        "must_reset": false
      },
      {
        "user_id": 4,
        "username": "cabal.lo",
        "full_name": "Cabal Lo Wen Xin",
        "role": "NDT_INSPECTOR",
        "employee_id": "ATCA-003",
        "active": true,
        "last_login": "2026-06-15T12:55:32",
        "failed_attempts": 0,
        "must_reset": true
      },
      {
        "user_id": 5,
        "username": "azman.ayub",
        "full_name": "Azman Bin Ayub",
        "role": "SUPERVISOR",
        "employee_id": "ATCA-005",
        "active": false,
        "last_login": "2026-04-10T16:00:00",
        "failed_attempts": 0,
        "must_reset": false
      },
      {
        "user_id": 6,
        "username": "hariharan.raju",
        "full_name": "Hariharan s/o Raju",
        "role": "NDT_INSPECTOR",
        "employee_id": "ATCA-006",
        "active": true,
        "last_login": "2026-06-15T08:31:02",
        "failed_attempts": 3,
        "must_reset": false
      }
    ],
    "total": 6
  },
  "/admin/backups": {
    "items": [
      {
        "backup_id": 7,
        "filename": "ATCA_ERP_DB_2026-06-15_0200.bak",
        "created_at": "2026-06-15T02:00:11",
        "size_mb": 1843.2,
        "type": "FULL",
        "status": "COMPLETE",
        "retention": "30d"
      },
      {
        "backup_id": 6,
        "filename": "ATCA_ERP_DB_2026-06-14_0200.bak",
        "created_at": "2026-06-14T02:00:09",
        "size_mb": 1838.7,
        "type": "FULL",
        "status": "COMPLETE",
        "retention": "30d"
      },
      {
        "backup_id": 5,
        "filename": "ATCA_ERP_DB_2026-06-13_0200.bak",
        "created_at": "2026-06-13T02:00:14",
        "size_mb": 1835.1,
        "type": "FULL",
        "status": "COMPLETE",
        "retention": "30d"
      },
      {
        "backup_id": 4,
        "filename": "ATCA_ERP_DB_2026-06-12_1430.bak",
        "created_at": "2026-06-12T14:30:00",
        "size_mb": 1832.9,
        "type": "MANUAL",
        "status": "COMPLETE",
        "retention": "90d"
      },
      {
        "backup_id": 3,
        "filename": "ATCA_ERP_DB_2026-06-12_0200.bak",
        "created_at": "2026-06-12T02:00:08",
        "size_mb": 1830.4,
        "type": "FULL",
        "status": "COMPLETE",
        "retention": "30d"
      }
    ],
    "total": 5
  },
  "/mod03/alerts/summary": {
    "in_progress": 4,
    "pending_signoff": 2,
    "rejected": 1,
    "total": 7
  },
  "/mod03/jobs": {
    "items": [
      {
        "job_id": 1,
        "job_ref": "FPI-2026-0001",
        "customer": "SIA Engineering Company",
        "part_number": "GE90-7B-FAN-BLADE",
        "method": "FLUORESCENT",
        "penetrant_type": "Zyglo ZL-2C",
        "quantity": 12,
        "status": "IN_PROGRESS",
        "disposition": null,
        "inspector_name": "James Tan Wei Liang",
        "created_at": "2026-06-12",
        "completed_steps": 4,
        "total_steps": 8
      },
      {
        "job_id": 2,
        "job_ref": "FPI-2026-0002",
        "customer": "Parker Hannifin Aerospace",
        "part_number": "PHN-INNER-BODY-HSG",
        "method": "FLUORESCENT",
        "penetrant_type": "Zyglo ZL-2C",
        "quantity": 4,
        "status": "PENDING_SIGNOFF",
        "disposition": null,
        "inspector_name": "Hendrich Lim Jun Wei",
        "created_at": "2026-06-13",
        "completed_steps": 7,
        "total_steps": 8
      },
      {
        "job_id": 3,
        "job_ref": "FPI-2026-0003",
        "customer": "ST Engineering Aerospace",
        "part_number": "STE-INNER-BRACKET-MK2",
        "method": "FLUORESCENT",
        "penetrant_type": "Zyglo ZL-2C",
        "quantity": 6,
        "status": "IN_PROGRESS",
        "disposition": null,
        "inspector_name": "Cabal Lo Wen Xin",
        "created_at": "2026-06-13",
        "completed_steps": 2,
        "total_steps": 8
      },
      {
        "job_id": 4,
        "job_ref": "FPI-2026-0004",
        "customer": "Rolls-Royce Singapore",
        "part_number": "RR-DISC-TRENT-1000",
        "method": "FLUORESCENT",
        "penetrant_type": "Zyglo ZL-2C",
        "quantity": 2,
        "status": "IN_PROGRESS",
        "disposition": null,
        "inspector_name": "James Tan Wei Liang",
        "created_at": "2026-06-14",
        "completed_steps": 1,
        "total_steps": 8
      },
      {
        "job_id": 5,
        "job_ref": "FPI-2026-0005",
        "customer": "Parker Hannifin Aerospace",
        "part_number": "PHN-KLIENT-LEVER",
        "method": "VISIBLE",
        "penetrant_type": "Zyglo ZL-60D",
        "quantity": 6,
        "status": "REJECTED",
        "disposition": "REJECT",
        "inspector_name": "Hendrich Lim Jun Wei",
        "created_at": "2026-06-10",
        "completed_steps": 8,
        "total_steps": 8
      }
    ],
    "total": 5
  },
  "/mod03/jobs/1": {
    "job_id": 1,
    "job_ref": "FPI-2026-0001",
    "customer": "SIA Engineering Company",
    "part_number": "GE90-7B-FAN-BLADE",
    "method": "FLUORESCENT",
    "penetrant_type": "Zyglo ZL-2C",
    "quantity": 12,
    "status": "IN_PROGRESS",
    "disposition": null,
    "inspector_name": "James Tan Wei Liang",
    "work_order_id": 1,
    "wo_number": "WO-2026-0001",
    "steps": [
      {
        "seq": 1,
        "step_code": "PRE_CLEAN",
        "label": "Pre-Cleaning",
        "status": "COMPLETE",
        "signed_by_name": "Ahmad Bin Rashid",
        "signed_at": "2026-06-12T08:30:00",
        "cleaning_method": "Solvent wipe",
        "solvent_used": "MEK"
      },
      {
        "seq": 2,
        "step_code": "PENETRANT_APPLY",
        "label": "Penetrant Application",
        "status": "COMPLETE",
        "signed_by_name": "James Tan Wei Liang",
        "signed_at": "2026-06-12T09:00:00",
        "penetrant_type": "Type 1",
        "application_method": "Spray"
      },
      {
        "seq": 3,
        "step_code": "PENETRANT_DWELL",
        "label": "Penetrant Dwell",
        "status": "COMPLETE",
        "signed_by_name": "James Tan Wei Liang",
        "signed_at": "2026-06-12T09:20:00",
        "dwell_minutes": 20,
        "temp_c": 22
      },
      {
        "seq": 4,
        "step_code": "RINSE",
        "label": "Rinse / Excess Removal",
        "status": "COMPLETE",
        "signed_by_name": "James Tan Wei Liang",
        "signed_at": "2026-06-12T09:35:00",
        "wash_method": "Water wash",
        "water_temp_c": 30,
        "water_pressure_psi": 25
      },
      {
        "seq": 5,
        "step_code": "DEVELOPER_APPLY",
        "label": "Developer Application",
        "status": "PENDING",
        "signed_by_name": null,
        "signed_at": null
      },
      {
        "seq": 6,
        "step_code": "DEVELOPER_DWELL",
        "label": "Development Dwell",
        "status": "PENDING",
        "signed_by_name": null,
        "signed_at": null
      },
      {
        "seq": 7,
        "step_code": "INTERPRET",
        "label": "Interpretation & Evaluation",
        "status": "PENDING",
        "signed_by_name": null,
        "signed_at": null
      },
      {
        "seq": 8,
        "step_code": "POST_CLEAN",
        "label": "Post-Cleaning",
        "status": "PENDING",
        "signed_by_name": null,
        "signed_at": null
      }
    ]
  },
  "/mod03/baths": [
    {
      "bath_id": 1,
      "bath_code": "FPI-PT-001",
      "bath_name": "Penetrant Tank #1",
      "status": "IN_SPEC"
    },
    {
      "bath_id": 2,
      "bath_code": "FPI-EM-001",
      "bath_name": "Emulsifier Tank #1",
      "status": "OUT_OF_SPEC"
    },
    {
      "bath_id": 3,
      "bath_code": "FPI-DV-001",
      "bath_name": "Developer Tank #1",
      "status": "IN_SPEC"
    }
  ],
  "/mod06/alerts/summary": {
    "fpi": {
      "out_of_spec": 1,
      "overdue_sample": 0,
      "due_soon": 1,
      "total_baths": 4
    },
    "plating": {
      "out_of_spec": 1,
      "overdue_sample": 1,
      "due_soon": 2,
      "total_baths": 8
    },
    "out_of_spec": 2,
    "overdue_sample": 1,
    "due_soon": 3,
    "total_baths": 12,
    "total": 3
  },
  "/mod06/baths": {
    "items": [
      {
        "bath_id": 1,
        "bath_code": "FPI-PT-001",
        "bath_name": "Penetrant Tank A — Type I FPI",
        "bath_type": "PENETRANT",
        "process_category": "NDT_FPI",
        "process_area": "FPI Bay 1",
        "bay": null,
        "spec_ref": "AMS 2644 / ASTM E1417",
        "sample_frequency_days": 7,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "last_sampled_at": "2026-06-14T08:00:00",
        "days_since_sample": 3,
        "last_status": "PASS",
        "last_sampled_by_name": "James Tan Wei Liang",
        "rag_status": "GREEN"
      },
      {
        "bath_id": 2,
        "bath_code": "FPI-EM-001",
        "bath_name": "Hydrophilic Emulsifier — Method D",
        "bath_type": "EMULSIFIER",
        "process_category": "NDT_FPI",
        "process_area": "FPI Bay 1",
        "bay": null,
        "spec_ref": "AMS 2644 §5.3",
        "sample_frequency_days": 7,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "last_sampled_at": "2026-06-10T08:00:00",
        "days_since_sample": 7,
        "last_status": "FAIL",
        "last_sampled_by_name": "Hendrich Lim Jun Wei",
        "rag_status": "RED"
      },
      {
        "bath_id": 3,
        "bath_code": "FPI-DV-001",
        "bath_name": "Wet Developer Tank",
        "bath_type": "DEVELOPER",
        "process_category": "NDT_FPI",
        "process_area": "FPI Bay 1",
        "bay": null,
        "spec_ref": "AMS 2644 / ASTM E1417 §6.4",
        "sample_frequency_days": 7,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "last_sampled_at": "2026-06-11T08:00:00",
        "days_since_sample": 6,
        "last_status": "PASS",
        "last_sampled_by_name": "James Tan Wei Liang",
        "rag_status": "AMBER"
      },
      {
        "bath_id": 4,
        "bath_code": "FPI-RN-001",
        "bath_name": "Rinse Water Tank",
        "bath_type": "RINSE",
        "process_category": "NDT_FPI",
        "process_area": "FPI Bay 1",
        "bay": null,
        "spec_ref": "ASTM E1417 §6.3.4",
        "sample_frequency_days": 3,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "last_sampled_at": "2026-06-16T08:00:00",
        "days_since_sample": 1,
        "last_status": "PASS",
        "last_sampled_by_name": "Cabal Lo Wen Xin",
        "rag_status": "GREEN"
      },
      {
        "bath_id": 5,
        "bath_code": "EP-AN2-001",
        "bath_name": "Type II Sulfuric Acid Anodize (Auto Line)",
        "bath_type": "ANODIZE",
        "process_category": "ELECTROPLATING",
        "process_area": "Anodizing",
        "bay": "Bay 5",
        "spec_ref": "AMS2470 / MIL-PRF-8625F Type II",
        "sample_frequency_days": 1,
        "max_len_cm": 160,
        "max_wid_cm": 50,
        "max_dep_cm": 128,
        "last_sampled_at": "2026-06-16T07:30:00",
        "days_since_sample": 1,
        "last_status": "PASS",
        "last_sampled_by_name": "Ahmad Bin Rashid",
        "rag_status": "GREEN"
      },
      {
        "bath_id": 6,
        "bath_code": "EP-AN3-001",
        "bath_name": "Type III Hard Anodize (Manual)",
        "bath_type": "ANODIZE",
        "process_category": "ELECTROPLATING",
        "process_area": "Anodizing",
        "bay": "Bay 5",
        "spec_ref": "MIL-PRF-8625F Type III",
        "sample_frequency_days": 1,
        "max_len_cm": 119,
        "max_wid_cm": 60,
        "max_dep_cm": 100,
        "last_sampled_at": "2026-06-16T07:30:00",
        "days_since_sample": 1,
        "last_status": "PASS",
        "last_sampled_by_name": "Ahmad Bin Rashid",
        "rag_status": "AMBER"
      },
      {
        "bath_id": 7,
        "bath_code": "EP-EN-001",
        "bath_name": "Electroless Nickel — High Phosphorus (HPEN P&W)",
        "bath_type": "ELECTROLESS_NICKEL",
        "process_category": "ELECTROPLATING",
        "process_area": "Electroless Nickel",
        "bay": "Bay 2",
        "spec_ref": "ASTM B733 / SPOP-311",
        "sample_frequency_days": 1,
        "max_len_cm": 95,
        "max_wid_cm": 45,
        "max_dep_cm": 90,
        "last_sampled_at": "2026-06-13T07:30:00",
        "days_since_sample": 4,
        "last_status": "PASS",
        "last_sampled_by_name": "Ahmad Bin Rashid",
        "rag_status": "RED"
      },
      {
        "bath_id": 8,
        "bath_code": "EP-ZN-001",
        "bath_name": "Zinc Plating — Yellow Chromate",
        "bath_type": "ZINC_PLATE",
        "process_category": "ELECTROPLATING",
        "process_area": "Zinc Plating",
        "bay": "Bay 3",
        "spec_ref": "ASTM B633 Type II / SEP014",
        "sample_frequency_days": 1,
        "max_len_cm": 84,
        "max_wid_cm": 84,
        "max_dep_cm": 110,
        "last_sampled_at": "2026-06-16T07:30:00",
        "days_since_sample": 1,
        "last_status": "PASS",
        "last_sampled_by_name": "Kevin Raj Kumar",
        "rag_status": "GREEN"
      },
      {
        "bath_id": 9,
        "bath_code": "EP-CU-001",
        "bath_name": "Copper Trim (SIA) — Acidic Copper",
        "bath_type": "COPPER_PLATE",
        "process_category": "ELECTROPLATING",
        "process_area": "Copper Plating",
        "bay": "Bay 2",
        "spec_ref": "SIA 12DDR-25-8174",
        "sample_frequency_days": 1,
        "max_len_cm": 100,
        "max_wid_cm": 33,
        "max_dep_cm": 45,
        "last_sampled_at": "2026-06-16T07:30:00",
        "days_since_sample": 1,
        "last_status": "PASS",
        "last_sampled_by_name": "Kevin Raj Kumar",
        "rag_status": "GREEN"
      },
      {
        "bath_id": 10,
        "bath_code": "EP-PH-001",
        "bath_name": "Phosphating — Zinc + Manganese",
        "bath_type": "PHOSPHATING",
        "process_category": "ELECTROPLATING",
        "process_area": "Phosphating",
        "bay": "Bay 2",
        "spec_ref": "DOD-P-16232 / TT-C-490",
        "sample_frequency_days": 1,
        "max_len_cm": 60,
        "max_wid_cm": 50,
        "max_dep_cm": 82,
        "last_sampled_at": "2026-06-16T07:30:00",
        "days_since_sample": 1,
        "last_status": "PASS",
        "last_sampled_by_name": "Ahmad Bin Rashid",
        "rag_status": "AMBER"
      },
      {
        "bath_id": 11,
        "bath_code": "EP-PA-001",
        "bath_name": "Passivation — Citric Acid",
        "bath_type": "PASSIVATION",
        "process_category": "ELECTROPLATING",
        "process_area": "Passivation",
        "bay": "Bay 4",
        "spec_ref": "ASTM A967 / AMS2700",
        "sample_frequency_days": 7,
        "max_len_cm": 80,
        "max_wid_cm": 60,
        "max_dep_cm": 82,
        "last_sampled_at": "2026-06-12T07:30:00",
        "days_since_sample": 5,
        "last_status": "PASS",
        "last_sampled_by_name": "James Tan Wei Liang",
        "rag_status": "GREEN"
      },
      {
        "bath_id": 12,
        "bath_code": "EP-BO-001",
        "bath_name": "Black Oxide — Alkaline",
        "bath_type": "BLACK_OXIDE",
        "process_category": "ELECTROPLATING",
        "process_area": "Black Oxide",
        "bay": "Bay 2",
        "spec_ref": "MIL-DTL-13924 / AMS2485",
        "sample_frequency_days": 7,
        "max_len_cm": 55,
        "max_wid_cm": 33,
        "max_dep_cm": 45,
        "last_sampled_at": "2026-06-10T07:30:00",
        "days_since_sample": 7,
        "last_status": "FAIL",
        "last_sampled_by_name": "Ahmad Bin Rashid",
        "rag_status": "RED"
      }
    ],
    "total": 12
  },
  "/mod06/logs": {
    "items": [
      {
        "log_id": 1,
        "bath_id": 2,
        "bath_code": "FPI-EM-001",
        "bath_name": "Emulsifier Tank #1",
        "test_date": "2025-05-18",
        "tested_by_name": "James Tan Wei Liang",
        "temp_c": 21,
        "concentration_pct": 38,
        "fluorescent_brightness": null,
        "contamination_check": "PASS",
        "result": "FAIL",
        "notes": "Concentration 38% exceeds max 35% — bath flagged OUT_OF_SPEC",
        "ncr_raised": true,
        "ncr_ref": "NCR-2025-001"
      },
      {
        "log_id": 2,
        "bath_id": 4,
        "bath_code": "MPT-WF-001",
        "bath_name": "Wet Fluorescent Bath",
        "test_date": "2025-05-19",
        "tested_by_name": "Hendrich Lim Jun Wei",
        "temp_c": 19,
        "concentration_pct": 0.22,
        "fluorescent_brightness": "ACCEPTABLE",
        "contamination_check": "PASS",
        "result": "PASS",
        "notes": "All readings within spec",
        "ncr_raised": false,
        "ncr_ref": null
      },
      {
        "log_id": 3,
        "bath_id": 1,
        "bath_code": "FPI-PT-001",
        "bath_name": "Penetrant Tank #1",
        "test_date": "2025-05-20",
        "tested_by_name": "James Tan Wei Liang",
        "temp_c": 22,
        "concentration_pct": null,
        "fluorescent_brightness": "ACCEPTABLE",
        "contamination_check": "PASS",
        "result": "PASS",
        "notes": "Daily check — all OK",
        "ncr_raised": false,
        "ncr_ref": null
      },
      {
        "log_id": 4,
        "bath_id": 5,
        "bath_code": "ANO-SA-001",
        "bath_name": "Sulfuric Acid Anodize Tank",
        "test_date": "2026-06-13",
        "tested_by_name": "Ahmad Bin Rashid",
        "temp_c": 20,
        "concentration_pct": 185,
        "fluorescent_brightness": null,
        "contamination_check": "PASS",
        "result": "PASS",
        "notes": "H2SO4 titration: 185 g/L — within 165–210 g/L spec. Temperature stable at 20°C.",
        "ncr_raised": false,
        "ncr_ref": null
      },
      {
        "log_id": 5,
        "bath_id": 6,
        "bath_code": "ANO-DG-001",
        "bath_name": "Alkaline Degreaser Tank",
        "test_date": "2026-06-13",
        "tested_by_name": "Ahmad Bin Rashid",
        "temp_c": 68,
        "concentration_pct": 45,
        "fluorescent_brightness": null,
        "contamination_check": "PASS",
        "result": "PASS",
        "notes": "Alkalinity titration: 45 g/L — within spec. Water break test PASS on coupon.",
        "ncr_raised": false,
        "ncr_ref": null
      },
      {
        "log_id": 6,
        "bath_id": 9,
        "bath_code": "ANO-BK-001",
        "bath_name": "Black Anodize Tank",
        "test_date": "2026-06-11",
        "tested_by_name": "James Tan Wei Liang",
        "temp_c": 21,
        "concentration_pct": 3.5,
        "fluorescent_brightness": null,
        "contamination_check": "PASS",
        "result": "FAIL",
        "notes": "Dye concentration 3.5% below 5% minimum. Bath depleted — replenishment required. Job ROUTER-12681 on hold.",
        "ncr_raised": true,
        "ncr_ref": "NCR-2026-003"
      },
      {
        "log_id": 7,
        "bath_id": 8,
        "bath_code": "ANO-SL-001",
        "bath_name": "Hot Water Seal Tank",
        "test_date": "2026-06-14",
        "tested_by_name": "Ahmad Bin Rashid",
        "temp_c": 98,
        "concentration_pct": null,
        "fluorescent_brightness": null,
        "contamination_check": "PASS",
        "result": "PASS",
        "notes": "Temperature at 98°C, DI water conductivity <20 µS/cm. Ready for sealing.",
        "ncr_raised": false,
        "ncr_ref": null
      }
    ],
    "total": 7
  },
  "/mod08/alerts/summary": {
    "planned_audits": 2,
    "open_findings": 5,
    "overdue_findings": 2,
    "pending_verification": 3
  },
  "/mod08/audit-plans": [
    {
      "audit_plan_id": 1,
      "audit_number": "AP-2026-0001",
      "audit_title": "Annual Internal FPI Process Audit",
      "audit_type": "INTERNAL",
      "audit_scope": "Review all FPI process steps against AC7114 requirements",
      "standard_ref": "AS9100D §9.2, AC7114 Rev F",
      "planned_date": "2026-06-20",
      "actual_date": null,
      "lead_auditor_full_name": "James Tan Wei Liang",
      "auditee_dept": "NDT Operations",
      "status": "PLANNED",
      "total_findings": 0,
      "open_findings": 0
    },
    {
      "audit_plan_id": 2,
      "audit_number": "AP-2026-0002",
      "audit_title": "NADCAP Pre-Audit Readiness Review",
      "audit_type": "NADCAP",
      "audit_scope": "Full NADCAP AC7114 checklist review prior to audit visit",
      "standard_ref": "AC7114 Rev F Checklist",
      "planned_date": "2026-07-10",
      "actual_date": null,
      "lead_auditor_full_name": "Sarah Lim Mei Ling",
      "auditee_dept": "Quality Assurance",
      "status": "PLANNED",
      "total_findings": 3,
      "open_findings": 3
    },
    {
      "audit_plan_id": 3,
      "audit_number": "AP-2025-0004",
      "audit_title": "Q4 2025 Internal Audit — Document Control",
      "audit_type": "INTERNAL",
      "audit_scope": "Review document control processes per AS9100D §7.5",
      "standard_ref": "AS9100D §7.5",
      "planned_date": "2025-11-15",
      "actual_date": "2025-11-16",
      "lead_auditor_full_name": "Ahmad Bin Rashid",
      "auditee_dept": "Administration",
      "status": "COMPLETE",
      "overall_result": "MINOR_NC",
      "total_findings": 2,
      "open_findings": 0
    }
  ],
  "/mod08/audit-plans/1": {
    "audit_plan_id": 1,
    "audit_number": "AP-2026-0001",
    "audit_title": "Annual Internal FPI Process Audit",
    "audit_type": "INTERNAL",
    "audit_scope": "Review all FPI process steps against AC7114 requirements",
    "standard_ref": "AS9100D §9.2, AC7114 Rev F",
    "planned_date": "2026-06-20",
    "status": "PLANNED",
    "auditee_dept": "NDT Operations",
    "lead_auditor_full_name": "James Tan Wei Liang",
    "findings": [],
    "checklist": []
  },
  "/mod08/findings": [
    {
      "finding_id": 1,
      "finding_number": "AF-2026-0001",
      "audit_number": "AP-2026-0002",
      "finding_type": "MINOR_NC",
      "clause_reference": "AC7114 §4.3.2",
      "description": "UV lamp intensity not recorded in calibration log for 3 consecutive weeks",
      "objective_evidence": "Calibration log entries missing weeks 18–20 of 2026",
      "assigned_full_name": "Ahmad Bin Rashid",
      "due_date": "2026-07-01",
      "status": "OPEN",
      "root_cause": null,
      "corrective_action": null
    },
    {
      "finding_id": 2,
      "finding_number": "AF-2026-0002",
      "audit_number": "AP-2026-0002",
      "finding_type": "OBSERVATION",
      "clause_reference": "AS9100D §8.5.1",
      "description": "Process traveler sign-off fields not consistently completed",
      "objective_evidence": "Sample of 10 job travelers: 4 had blank sign-off fields",
      "assigned_full_name": "Sarah Lim Mei Ling",
      "due_date": "2026-06-30",
      "status": "RESPONSE_SUBMITTED",
      "root_cause": "Awareness gap in process",
      "corrective_action": "Refresher training scheduled"
    },
    {
      "finding_id": 3,
      "finding_number": "AF-2025-0009",
      "audit_number": "AP-2025-0004",
      "finding_type": "MINOR_NC",
      "clause_reference": "AS9100D §7.5.3",
      "description": "Document revision history not updated on 2 controlled documents",
      "objective_evidence": "Docs ATCA-QP-003 Rev B and ATCA-WI-012 Rev A",
      "assigned_full_name": "James Tan Wei Liang",
      "due_date": "2025-12-15",
      "status": "VERIFIED",
      "root_cause": "Document control procedure not followed",
      "corrective_action": "Procedure reviewed with all document owners"
    }
  ],
  "/mod13/alerts/summary": {
    "active_jobs": 7,
    "overdue_jobs": 2,
    "pending_qa": 3,
    "coc_pending": 2
  },
  "/mod13/work-orders": [
    {
      "work_order_id": 1,
      "wo_number": "WO-2026-0001",
      "job_title": "FPI + MPT on Engine Fan Blades Batch #12",
      "customer_name": "SIA Engineering Company",
      "part_number": "GE90-7B-FAN-BLADE",
      "priority": "HIGH",
      "planned_end": "2026-06-15",
      "status": "IN_PROGRESS",
      "total_steps": 4,
      "done_steps": 2,
      "supervisor_name": "James Tan Wei Liang"
    },
    {
      "work_order_id": 2,
      "wo_number": "WO-2026-0002",
      "job_title": "Chemical Bath + Visual Inspection — Landing Gear Components",
      "customer_name": "ST Engineering Aerospace",
      "part_number": "LG-ACTUATOR-A320",
      "priority": "NORMAL",
      "planned_end": "2026-06-20",
      "status": "PENDING_QA",
      "total_steps": 3,
      "done_steps": 3,
      "supervisor_name": "Sarah Lim Mei Ling"
    },
    {
      "work_order_id": 3,
      "wo_number": "WO-2026-0003",
      "job_title": "MPT on Turbine Disc Slots",
      "customer_name": "Rolls-Royce Singapore",
      "part_number": "RR-DISC-TRENT-1000",
      "priority": "URGENT",
      "planned_end": "2026-06-14",
      "status": "IN_PROGRESS",
      "total_steps": 2,
      "done_steps": 0,
      "supervisor_name": "James Tan Wei Liang"
    },
    {
      "work_order_id": 4,
      "wo_number": "WO-2026-0004",
      "job_title": "Sulfuric Acid Anodize — Inner Body Housing [ROUTER-24913]",
      "customer_name": "Parker Hannifin Aerospace",
      "part_number": "PHN-INNER-BODY-HSG",
      "priority": "NORMAL",
      "planned_end": "2026-06-17",
      "status": "IN_PROGRESS",
      "total_steps": 12,
      "done_steps": 7,
      "supervisor_name": "Ahmad Bin Rashid"
    },
    {
      "work_order_id": 5,
      "wo_number": "WO-2026-0005",
      "job_title": "Black Anodize — Front Plate & Hub Frame [ROUTER-12681]",
      "customer_name": "Parker Hannifin Aerospace",
      "part_number": "PHN-FRONTPLATE-HUBFRAME",
      "priority": "HIGH",
      "planned_end": "2026-06-15",
      "status": "ON_HOLD",
      "total_steps": 17,
      "done_steps": 4,
      "supervisor_name": "Ahmad Bin Rashid"
    },
    {
      "work_order_id": 6,
      "wo_number": "WO-2026-0006",
      "job_title": "Sulfuric Acid Anodize Type II — Parker Klient Lever [ROUTER-35296]",
      "customer_name": "Parker Hannifin Aerospace",
      "part_number": "PHN-KLIENT-LEVER",
      "priority": "NORMAL",
      "planned_end": "2026-06-20",
      "status": "PENDING_QA",
      "total_steps": 13,
      "done_steps": 13,
      "supervisor_name": "Ahmad Bin Rashid"
    },
    {
      "work_order_id": 7,
      "wo_number": "WO-2026-0007",
      "job_title": "Sulfuric Acid Anodize — Couplerols Batch [ROUTER-12758]",
      "customer_name": "SIA Engineering Company",
      "part_number": "SIA-COUPLEROLS-ASSY",
      "priority": "NORMAL",
      "planned_end": "2026-06-19",
      "status": "IN_PROGRESS",
      "total_steps": 10,
      "done_steps": 3,
      "supervisor_name": "James Tan Wei Liang"
    },
    {
      "work_order_id": 8,
      "wo_number": "WO-2026-0008",
      "job_title": "Sulfuric Acid Anodize Type II — Inner Bracket [ROUTER-21837]",
      "customer_name": "ST Engineering Aerospace",
      "part_number": "STE-INNER-BRACKET-MK2",
      "priority": "NORMAL",
      "planned_end": "2026-06-18",
      "status": "RECEIVED",
      "total_steps": 11,
      "done_steps": 0,
      "supervisor_name": "James Tan Wei Liang"
    }
  ],
  "/mod13/work-orders/1": {
    "work_order_id": 1,
    "wo_number": "WO-2026-0001",
    "job_title": "FPI + MPT on Engine Fan Blades Batch #12",
    "customer_name": "SIA Engineering Company",
    "part_number": "GE90-7B-FAN-BLADE",
    "quantity": 12,
    "priority": "HIGH",
    "planned_end": "2026-06-15",
    "status": "IN_PROGRESS",
    "supervisor_name": "James Tan Wei Liang",
    "steps": [
      {
        "step_id": 1,
        "step_seq": 1,
        "step_name": "Pre-Cleaning",
        "process_type": "OTHER",
        "standard_ref": "ATCA-WI-003",
        "status": "COMPLETE",
        "assigned_name": "Ahmad Bin Rashid",
        "completed_name": "Ahmad Bin Rashid",
        "completed_at": "2026-06-12"
      },
      {
        "step_id": 2,
        "step_seq": 2,
        "step_name": "FPI Inspection",
        "process_type": "FPI",
        "standard_ref": "AC7114 §4",
        "status": "COMPLETE",
        "assigned_name": "James Tan Wei Liang",
        "completed_name": "James Tan Wei Liang",
        "completed_at": "2026-06-13"
      },
      {
        "step_id": 3,
        "step_seq": 3,
        "step_name": "MPT Inspection",
        "process_type": "MPT",
        "standard_ref": "AC7114 §5",
        "status": "PENDING",
        "assigned_name": "Sarah Lim Mei Ling",
        "completed_name": null,
        "completed_at": null
      },
      {
        "step_id": 4,
        "step_seq": 4,
        "step_name": "Final Visual + Dimensional",
        "process_type": "VISUAL",
        "standard_ref": "Customer Spec Rev C",
        "status": "PENDING",
        "assigned_name": null,
        "completed_name": null,
        "completed_at": null
      }
    ],
    "documents": [],
    "notes": [
      {
        "note_type": "STATUS_CHANGE",
        "note_text": "Status changed to IN_PROGRESS",
        "created_at": "2026-06-11"
      }
    ]
  },
  "/mod17/alerts/summary": {
    "active_jobs": 3,
    "pending_review": 1,
    "overdue": 1,
    "rejected_this_month": 0
  },
  "/mod17/jobs": [
    {
      "mpt_job_id": 1,
      "job_number": "MPT-2026-0001",
      "customer_name": "SIA Engineering Company",
      "part_number": "GE90-7B-FAN-BLADE",
      "technique": "WET_FLUORESCENT",
      "magnetisation_method": "CIRCULAR",
      "inspector_name": "James Tan Wei Liang",
      "planned_date": "2026-06-14",
      "status": "IN_PROGRESS",
      "steps_done": 2
    },
    {
      "mpt_job_id": 2,
      "job_number": "MPT-2026-0002",
      "customer_name": "Rolls-Royce Singapore",
      "part_number": "RR-DISC-TRENT-1000",
      "technique": "WET_FLUORESCENT",
      "magnetisation_method": "MULTIDIRECTIONAL",
      "inspector_name": "Sarah Lim Mei Ling",
      "planned_date": "2026-06-13",
      "status": "RECEIVED",
      "steps_done": 0
    },
    {
      "mpt_job_id": 3,
      "job_number": "MPT-2026-0003",
      "customer_name": "ST Engineering Aerospace",
      "part_number": "LG-ACTUATOR-A320",
      "technique": "DRY",
      "magnetisation_method": "LONGITUDINAL",
      "inspector_name": "Ahmad Bin Rashid",
      "planned_date": "2026-06-10",
      "status": "ACCEPTED",
      "steps_done": 6
    }
  ],
  "/mod17/jobs/1": {
    "mpt_job_id": 1,
    "job_number": "MPT-2026-0001",
    "customer_name": "SIA Engineering Company",
    "part_number": "GE90-7B-FAN-BLADE",
    "technique": "WET_FLUORESCENT",
    "magnetisation_method": "CIRCULAR",
    "material_spec": "AMS2641",
    "quantity": 12,
    "status": "IN_PROGRESS",
    "inspector_name": "James Tan Wei Liang",
    "steps": [
      {
        "step_id": 1,
        "step_number": 1,
        "step_name": "Pre-Cleaning",
        "status": "COMPLETE",
        "performed_name": "Ahmad Bin Rashid",
        "cleaning_method": "Solvent wipe",
        "solvent_used": "MEK"
      },
      {
        "step_id": 2,
        "step_number": 2,
        "step_name": "Equipment Setup & Verification",
        "status": "COMPLETE",
        "performed_name": "James Tan Wei Liang",
        "uv_lamp_intensity_fc": 1200,
        "uv_lamp_ok": true,
        "ambient_light_fc": 1.5,
        "ambient_light_ok": true
      },
      {
        "step_id": 3,
        "step_number": 3,
        "step_name": "Magnetisation",
        "status": "PENDING",
        "performed_name": null
      },
      {
        "step_id": 4,
        "step_number": 4,
        "step_name": "Particle Application",
        "status": "PENDING",
        "performed_name": null
      },
      {
        "step_id": 5,
        "step_number": 5,
        "step_name": "Examination & Interpretation",
        "status": "PENDING",
        "performed_name": null
      },
      {
        "step_id": 6,
        "step_number": 6,
        "step_name": "Demagnetisation & Post-Cleaning",
        "status": "PENDING",
        "performed_name": null
      }
    ],
    "result": null
  },
  "/mod24/alerts/summary": {
    "draft_cocs": 4,
    "issued_cocs": 17,
    "pending_coc": 3,
    "voided_cocs": 0
  },
  "/mod24/cocs": [
    {
      "coc_id": 1,
      "coc_number": "COC-2026-0001",
      "customer_name": "SIA Engineering Company",
      "customer_po": "PO-2026-0088",
      "part_number": "GE90-7B-FAN-BLADE",
      "quantity_certified": 12,
      "process_fpi": true,
      "process_mpt": true,
      "process_chem_bath": false,
      "process_other": null,
      "issued_by_name": "James Tan Wei Liang",
      "approved_by_name": "James Tan Wei Liang",
      "issued_at": "2026-06-10",
      "status": "ISSUED"
    },
    {
      "coc_id": 2,
      "coc_number": "COC-2026-0002",
      "customer_name": "Rolls-Royce Singapore",
      "customer_po": "PO-2026-0101",
      "part_number": "RR-DISC-TRENT-1000",
      "quantity_certified": 4,
      "process_fpi": false,
      "process_mpt": true,
      "process_chem_bath": false,
      "process_other": null,
      "issued_by_name": null,
      "approved_by_name": null,
      "issued_at": null,
      "status": "DRAFT"
    },
    {
      "coc_id": 3,
      "coc_number": "COC-2026-0003",
      "customer_name": "ST Engineering Aerospace",
      "customer_po": "PO-2026-0077",
      "part_number": "LG-ACTUATOR-A320",
      "quantity_certified": 8,
      "process_fpi": true,
      "process_mpt": false,
      "process_chem_bath": true,
      "process_other": null,
      "issued_by_name": "Sarah Lim Mei Ling",
      "approved_by_name": "Sarah Lim Mei Ling",
      "issued_at": "2026-06-08",
      "status": "ISSUED"
    },
    {
      "coc_id": 4,
      "coc_number": "COC-2026-0004",
      "customer_name": "Parker Hannifin Aerospace",
      "customer_po": "PO-2026-0120",
      "part_number": "PHN-KLIENT-LEVER",
      "quantity_certified": 6,
      "process_fpi": false,
      "process_mpt": false,
      "process_chem_bath": true,
      "process_other": "Sulfuric Acid Anodize Type II per MIL-A-8625",
      "issued_by_name": null,
      "approved_by_name": null,
      "issued_at": null,
      "status": "DRAFT"
    },
    {
      "coc_id": 5,
      "coc_number": "COC-2026-0005",
      "customer_name": "Parker Hannifin Aerospace",
      "customer_po": "PO-2026-0118",
      "part_number": "PHN-INNER-BODY-HSG",
      "quantity_certified": 4,
      "process_fpi": false,
      "process_mpt": false,
      "process_chem_bath": true,
      "process_other": "Sulfuric Acid Anodize Type II per MIL-A-8625",
      "issued_by_name": null,
      "approved_by_name": null,
      "issued_at": null,
      "status": "DRAFT"
    }
  ],
  "/mod24/cocs/2": {
    "coc_id": 2,
    "coc_number": "COC-2026-0002",
    "customer_name": "Rolls-Royce Singapore",
    "customer_po": "PO-2026-0101",
    "part_number": "RR-DISC-TRENT-1000",
    "part_description": "HP Turbine Disc",
    "part_serial_no": "SN-2026-0044",
    "quantity_certified": 4,
    "process_fpi": false,
    "process_mpt": true,
    "process_chem_bath": false,
    "process_other": null,
    "specification_refs": "AMS2641, AC7114 Rev F, Customer Spec RR-NDT-001",
    "material_cert_ref": "CERT-2026-0089",
    "inspection_report_ref": "IR-2026-0033",
    "conformance_statement": "We hereby certify that the product described above was produced, inspected and tested in accordance with the referenced specifications and requirements, and meets all applicable requirements.",
    "exceptions_noted": null,
    "status": "DRAFT",
    "issued_at": null,
    "approved_by_name": null,
    "issued_by_name": null,
    "approved_at": null,
    "line_items": [
      {
        "line_seq": 1,
        "process_module": "MOD17",
        "reference_number": "MPT-2026-0003",
        "process_description": "Magnetic Particle Testing",
        "result": "ACCEPT",
        "notes": "No relevant indications found"
      }
    ]
  },
  "/mod11/alerts/summary": {
    "due_this_week": 3,
    "overdue_pm": 1,
    "open_permits": 2,
    "active_breakdowns": 0
  },
  "/mod11/assets": [
    {
      "asset_id": 1,
      "asset_code": "MA-2026-0001",
      "name": "FPI Tank A",
      "category": "EQUIPMENT",
      "location": "Bay 1",
      "manufacturer": "Magnaflux",
      "model_number": "ZB-100",
      "status": "ACTIVE",
      "next_pm_due": "2026-06-20"
    },
    {
      "asset_id": 2,
      "asset_code": "MA-2026-0002",
      "name": "UV Light Station 1",
      "category": "EQUIPMENT",
      "location": "Bay 1",
      "manufacturer": "Spectroline",
      "model_number": "ENF-260C",
      "status": "ACTIVE",
      "next_pm_due": "2026-06-15"
    },
    {
      "asset_id": 3,
      "asset_code": "MA-2026-0003",
      "name": "Air Compressor Unit",
      "category": "UTILITY",
      "location": "Utility Room",
      "manufacturer": "Atlas Copco",
      "model_number": "GA18",
      "status": "ACTIVE",
      "next_pm_due": "2026-07-01"
    }
  ],
  "/mod11/assets/1": {
    "asset_id": 1,
    "asset_code": "MA-2026-0001",
    "asset_name": "FPI Tank A",
    "asset_type": "EQUIPMENT",
    "location": "Bay 1",
    "manufacturer": "Magnaflux",
    "model_number": "ZB-100",
    "serial_number": "MF-2020-0088",
    "purchase_date": "2020-03-15",
    "status": "ACTIVE",
    "schedules": [],
    "records": []
  },
  "/mod11/schedules": [
    {
      "schedule_id": 1,
      "asset_name": "FPI Tank A",
      "task_description": "Check penetrant concentration & pH",
      "frequency_days": 7,
      "last_done_date": "2026-06-06",
      "next_due_date": "2026-06-13",
      "rag_status": "DUE_SOON"
    },
    {
      "schedule_id": 2,
      "asset_name": "UV Light Station 1",
      "task_description": "UV intensity check — min 1000 μW/cm²",
      "frequency_days": 30,
      "last_done_date": "2026-05-14",
      "next_due_date": "2026-06-13",
      "rag_status": "DUE_SOON"
    },
    {
      "schedule_id": 3,
      "asset_name": "Air Compressor Unit",
      "task_description": "Filter replacement & oil level check",
      "frequency_days": 90,
      "last_done_date": "2026-04-01",
      "next_due_date": "2026-07-01",
      "rag_status": "OK"
    }
  ],
  "/mod11/permits": [
    {
      "permit_id": 1,
      "permit_number": "WP-2026-0001",
      "work_description": "Replace UV lamp in Station 1",
      "location": "Bay 1",
      "risk_level": "MEDIUM",
      "status": "ACTIVE",
      "authorised_by_name": "James Tan Wei Liang",
      "valid_from": "2026-06-13",
      "valid_until": "2026-06-14"
    },
    {
      "permit_id": 2,
      "permit_number": "WP-2026-0002",
      "work_description": "Drain and clean FPI Tank B",
      "location": "Bay 2",
      "risk_level": "HIGH",
      "status": "PENDING",
      "authorised_by_name": null,
      "valid_from": "2026-06-14",
      "valid_until": "2026-06-14"
    }
  ],
  "/mod12/alerts/summary": {
    "approved_suppliers": 12,
    "pending_pr": 3,
    "open_po": 5,
    "expiring_accreditations": 1
  },
  "/mod12/suppliers": [
    {
      "supplier_id": 1,
      "supplier_code": "SUP-2026-0001",
      "name": "Magnaflux Asia Pacific",
      "category": "CHEMICAL",
      "avl_scope": "FPI Consumables",
      "contact_name": "David Ng",
      "contact_email": "d.ng@magnaflux.sg",
      "accreditation_body": "SAC",
      "accreditation_ref": "AS9100-MF-2024",
      "accreditation_expiry": "2027-03-31",
      "approval_status": "APPROVED"
    },
    {
      "supplier_id": 2,
      "supplier_code": "SUP-2026-0002",
      "name": "Spectronics SEA",
      "category": "EQUIPMENT",
      "avl_scope": "UV Equipment",
      "contact_name": "Rachel Teo",
      "contact_email": "r.teo@spectronics.sg",
      "accreditation_body": "ISO",
      "accreditation_ref": "ISO9001-SP-2025",
      "accreditation_expiry": "2026-06-30",
      "approval_status": "APPROVED"
    },
    {
      "supplier_id": 3,
      "supplier_code": "SUP-2026-0003",
      "name": "3M Singapore Pte Ltd",
      "category": "CONSUMABLE",
      "avl_scope": "General Consumables",
      "contact_name": "Kelvin Chan",
      "contact_email": "k.chan@3m.com.sg",
      "accreditation_body": null,
      "accreditation_ref": null,
      "accreditation_expiry": null,
      "approval_status": "PENDING"
    }
  ],
  "/mod12/suppliers/1": {
    "supplier_id": 1,
    "supplier_code": "SUP-2026-0001",
    "name": "Magnaflux Asia Pacific",
    "category": "CHEMICAL",
    "status": "APPROVED"
  },
  "/mod12/requisitions": [
    {
      "requisition_id": 1,
      "pr_number": "PR-2026-0001",
      "title": "FPI penetrant replenishment",
      "supplier_id": 1,
      "supplier_name": "Magnaflux Asia Pacific",
      "estimated_value": 2400.0,
      "required_by": "2026-06-20",
      "status": "APPROVED",
      "raised_by_name": "Sarah Lim Mei Ling",
      "approved_by_name": "James Tan Wei Liang"
    },
    {
      "requisition_id": 2,
      "pr_number": "PR-2026-0002",
      "title": "UV intensity meter replacement",
      "supplier_id": 2,
      "supplier_name": "Spectronics SEA",
      "estimated_value": 850.0,
      "required_by": "2026-06-25",
      "status": "PENDING",
      "raised_by_name": "James Tan Wei Liang",
      "approved_by_name": null
    },
    {
      "requisition_id": 3,
      "pr_number": "PR-2026-0003",
      "title": "PPE stock replenishment",
      "supplier_id": 3,
      "supplier_name": "3M Singapore Pte Ltd",
      "estimated_value": 620.0,
      "required_by": "2026-06-30",
      "status": "DRAFT",
      "raised_by_name": "Rachel Yap",
      "approved_by_name": null
    }
  ],
  "/mod12/purchase-orders": [
    {
      "po_id": 1,
      "po_number": "PO-2026-0001",
      "pr_number": "PR-2026-0001",
      "supplier_name": "Magnaflux Asia Pacific",
      "po_date": "2026-06-10",
      "delivery_date": "2026-06-20",
      "total_value": 2400.0,
      "status": "ISSUED"
    },
    {
      "po_id": 2,
      "po_number": "PO-2026-0002",
      "pr_number": "PR-2025-0099",
      "supplier_name": "Spectronics SEA",
      "po_date": "2026-05-28",
      "delivery_date": "2026-06-05",
      "total_value": 850.0,
      "status": "RECEIVED"
    }
  ],
  "/mod14/alerts/summary": {
    "low_stock": 4,
    "out_of_stock": 2,
    "expiring_chemicals": 3,
    "total_items": 35
  },
  "/mod14/items": [
    {
      "item_id": 1,
      "item_code": "INV-2026-0001",
      "name": "Zyglo ZL-2C Penetrant",
      "category": "CHEMICAL",
      "unit": "litre",
      "location": "Chemical Store",
      "current_stock": 5,
      "reorder_level": 10,
      "hazardous_flag": true,
      "rag_status": "AMBER"
    },
    {
      "item_id": 2,
      "item_code": "INV-2026-0002",
      "name": "ZR-10B Remover",
      "category": "CHEMICAL",
      "unit": "litre",
      "location": "Chemical Store",
      "current_stock": 0,
      "reorder_level": 5,
      "hazardous_flag": true,
      "rag_status": "RED"
    },
    {
      "item_id": 3,
      "item_code": "INV-2026-0003",
      "name": "Disposable Nitrile Gloves (L)",
      "category": "PPE",
      "unit": "box",
      "location": "PPE Cabinet",
      "current_stock": 24,
      "reorder_level": 5,
      "hazardous_flag": false,
      "rag_status": "GREEN"
    },
    {
      "item_id": 4,
      "item_code": "INV-2026-0004",
      "name": "Lint-Free Wipes",
      "category": "CONSUMABLE",
      "unit": "roll",
      "location": "Bay 1 Shelf",
      "current_stock": 8,
      "reorder_level": 6,
      "hazardous_flag": false,
      "rag_status": "AMBER"
    },
    {
      "item_id": 5,
      "item_code": "INV-2026-0005",
      "name": "Sulfuric Acid 98% (H2SO4)",
      "category": "CHEMICAL",
      "unit": "litre",
      "location": "Acid Store (Locked)",
      "current_stock": 40,
      "reorder_level": 20,
      "hazardous_flag": true,
      "rag_status": "GREEN"
    },
    {
      "item_id": 6,
      "item_code": "INV-2026-0006",
      "name": "Turco 4215-S Alkaline Cleaner",
      "category": "CHEMICAL",
      "unit": "kg",
      "location": "Chemical Store",
      "current_stock": 12,
      "reorder_level": 10,
      "hazardous_flag": true,
      "rag_status": "AMBER"
    },
    {
      "item_id": 7,
      "item_code": "INV-2026-0007",
      "name": "Nitric Acid 70% (HNO3)",
      "category": "CHEMICAL",
      "unit": "litre",
      "location": "Acid Store (Locked)",
      "current_stock": 18,
      "reorder_level": 10,
      "hazardous_flag": true,
      "rag_status": "GREEN"
    },
    {
      "item_id": 8,
      "item_code": "INV-2026-0008",
      "name": "Sanodal Deep Black MLW Dye",
      "category": "CHEMICAL",
      "unit": "kg",
      "location": "Chemical Store",
      "current_stock": 2,
      "reorder_level": 5,
      "hazardous_flag": true,
      "rag_status": "RED"
    },
    {
      "item_id": 9,
      "item_code": "INV-2026-0009",
      "name": "DI Water (Drum)",
      "category": "CONSUMABLE",
      "unit": "drum",
      "location": "Utility Room",
      "current_stock": 6,
      "reorder_level": 2,
      "hazardous_flag": false,
      "rag_status": "GREEN"
    },
    {
      "item_id": 10,
      "item_code": "INV-2026-0010",
      "name": "Titanium Anodizing Rack (Small)",
      "category": "TOOLING",
      "unit": "pcs",
      "location": "Anodize Bay",
      "current_stock": 8,
      "reorder_level": 4,
      "hazardous_flag": false,
      "rag_status": "GREEN"
    }
  ],
  "/mod14/movements": [
    {
      "movement_id": 1,
      "item_code": "INV-2026-0001",
      "item_name": "Zyglo ZL-2C Penetrant",
      "movement_type": "ISSUE",
      "qty": 2,
      "lot_number": "LOT-MF-2025-88",
      "moved_by_name": "James Tan Wei Liang",
      "moved_at": "2026-06-12T10:30:00",
      "notes": "Replenish FPI Tank A"
    },
    {
      "movement_id": 2,
      "item_code": "INV-2026-0003",
      "item_name": "Disposable Nitrile Gloves (L)",
      "movement_type": "RECEIPT",
      "qty": 50,
      "lot_number": null,
      "moved_by_name": "Sarah Lim Mei Ling",
      "moved_at": "2026-06-11T14:00:00",
      "notes": "PO-2026-0002"
    }
  ],
  "/mod18/alerts/summary": {
    "total_staff": 18,
    "new_this_month": 1,
    "pending_onboarding": 2,
    "conflict_declarations_due": 3
  },
  "/mod18/staff": [
    {
      "staff_id": 1,
      "employee_id": "EMP-0001",
      "full_name": "James Tan Wei Liang",
      "job_title": "Quality Manager",
      "department": "Quality Assurance",
      "employment_type": "PERMANENT",
      "employment_date": "2018-04-01",
      "onboarding_complete": true,
      "conflict_of_interest_declared": true,
      "status": "ACTIVE"
    },
    {
      "staff_id": 2,
      "employee_id": "EMP-0002",
      "full_name": "Sarah Lim Mei Ling",
      "job_title": "NDT Level II Inspector",
      "department": "NDT Operations",
      "employment_type": "PERMANENT",
      "employment_date": "2020-07-15",
      "onboarding_complete": true,
      "conflict_of_interest_declared": true,
      "status": "ACTIVE"
    },
    {
      "staff_id": 3,
      "employee_id": "EMP-0003",
      "full_name": "Kevin Raj Kumar",
      "job_title": "Production Technician",
      "department": "Production",
      "employment_type": "CONTRACT",
      "employment_date": "2026-06-01",
      "onboarding_complete": false,
      "conflict_of_interest_declared": false,
      "status": "ACTIVE"
    }
  ],
  "/mod18/staff/1": {
    "staff_id": 1,
    "employee_id": "EMP-0001",
    "full_name": "James Tan Wei Liang",
    "job_title": "Quality Manager",
    "status": "ACTIVE"
  },
  "/mod18/org-entities": [
    {
      "entity_id": 1,
      "entity_name": "ATC Aviation Pte Ltd",
      "division": "Corporate",
      "department": null,
      "team": null
    },
    {
      "entity_id": 2,
      "entity_name": "Quality Assurance",
      "division": "Operations",
      "department": "QA",
      "team": null
    },
    {
      "entity_id": 3,
      "entity_name": "NDT Operations",
      "division": "Operations",
      "department": "NDT",
      "team": null
    },
    {
      "entity_id": 4,
      "entity_name": "Production",
      "division": "Operations",
      "department": "Production",
      "team": null
    }
  ],
  "/mod20/alerts/summary": {
    "open_complaints": 4,
    "critical_open": 1,
    "overdue_complaints": 1,
    "open_8d": 2
  },
  "/mod15/alerts/summary": {
    "critical_items": 19,
    "warnings": 56,
    "modules_attention": 16,
    "health_score": 22
  },
  "/mod21/alerts/summary": {
    "active_announcements": 3,
    "unacknowledged": 2,
    "urgent_count": 1,
    "expired_this_week": 0
  },
  "/mod21/announcements": [
    {
      "announcement_id": 1,
      "title": "NADCAP Surveillance Audit — 2026-07-10",
      "body": "NADCAP surveillance audit scheduled for 10 July 2026. All personnel must ensure their certifications are current. Review your procedure checklist by 30 June.",
      "priority": "URGENT",
      "published_by_name": "James Tan Wei Liang",
      "published_at": "2026-06-10T09:00:00",
      "expires_at": "2026-07-10T23:59:59",
      "target_roles": null,
      "acknowledged": false
    },
    {
      "announcement_id": 2,
      "title": "Updated PPE Policy — Effective 2026-07-01",
      "body": "Revised PPE requirements for chemical processing areas. Double-glove policy now mandatory when handling Class 1 chemicals. See QP-PPE-003 Rev 5.",
      "priority": "IMPORTANT",
      "published_by_name": "James Tan Wei Liang",
      "published_at": "2026-06-08T14:30:00",
      "expires_at": null,
      "target_roles": "NDT_INSPECTOR,SUPERVISOR",
      "acknowledged": true
    },
    {
      "announcement_id": 3,
      "title": "Canteen Renovation — Level 2 Closed 14–16 Jun",
      "body": "Level 2 canteen will be closed from 14 to 16 June for renovation. Alternative dining available at Level 1 lobby.",
      "priority": "NORMAL",
      "published_by_name": "Sarah Lim Mei Ling",
      "published_at": "2026-06-12T11:00:00",
      "expires_at": "2026-06-16T23:59:59",
      "target_roles": null,
      "acknowledged": false
    }
  ],
  "/mod22/alerts/summary": {
    "pending_requests": 4,
    "on_leave_today": 2,
    "absent_today": 1,
    "low_balance_staff": 3
  },
  "/mod22/leave-requests": [
    {
      "request_id": 1,
      "staff_name": "Kevin Raj Kumar",
      "leave_type_name": "Annual Leave",
      "start_date": "2026-06-16",
      "end_date": "2026-06-17",
      "days_taken": 2,
      "status": "PENDING",
      "approved_by_name": null
    },
    {
      "request_id": 2,
      "staff_name": "Sarah Lim Mei Ling",
      "leave_type_name": "Medical Leave",
      "start_date": "2026-06-13",
      "end_date": "2026-06-13",
      "days_taken": 1,
      "status": "APPROVED",
      "approved_by_name": "James Tan Wei Liang"
    },
    {
      "request_id": 3,
      "staff_name": "Rachel Yap",
      "leave_type_name": "Annual Leave",
      "start_date": "2026-06-20",
      "end_date": "2026-06-24",
      "days_taken": 5,
      "status": "PENDING",
      "approved_by_name": null
    }
  ],
  "/mod22/leave-types": [
    {
      "type_id": 1,
      "name": "Annual Leave",
      "days_per_year": 14,
      "carry_forward_max": 5
    },
    {
      "type_id": 2,
      "name": "Medical Leave",
      "days_per_year": 14,
      "carry_forward_max": 0
    },
    {
      "type_id": 3,
      "name": "Hospitalisation Leave",
      "days_per_year": 60,
      "carry_forward_max": 0
    },
    {
      "type_id": 4,
      "name": "Childcare Leave",
      "days_per_year": 6,
      "carry_forward_max": 0
    },
    {
      "type_id": 5,
      "name": "Compassionate Leave",
      "days_per_year": 3,
      "carry_forward_max": 0
    }
  ],
  "/mod23/alerts/summary": {
    "pending_runs": 1,
    "current_month_gross": 98450.0,
    "staff_paid": 17,
    "runs_disbursed_ytd": 5
  },
  "/mod23/runs": [
    {
      "run_id": 1,
      "pay_period_start": "2026-05-01",
      "pay_period_end": "2026-05-31",
      "run_by_name": "James Tan Wei Liang",
      "line_count": 17,
      "total_gross": 98450.0,
      "total_net": 78760.0,
      "status": "DISBURSED",
      "approved_by_name": "James Tan Wei Liang"
    },
    {
      "run_id": 2,
      "pay_period_start": "2026-06-01",
      "pay_period_end": "2026-06-30",
      "run_by_name": "James Tan Wei Liang",
      "line_count": 18,
      "total_gross": 99200.0,
      "total_net": 79360.0,
      "status": "DRAFT",
      "approved_by_name": null
    }
  ],
  "/mod23/runs/1": {
    "run_id": 1,
    "pay_period_start": "2026-05-01",
    "pay_period_end": "2026-05-31",
    "status": "DISBURSED",
    "lines": [
      {
        "employee_id": "EMP-0001",
        "full_name": "James Tan Wei Liang",
        "department": "Quality Assurance",
        "basic_pay": 7500.0,
        "allowances": 500.0,
        "overtime_pay": 0.0,
        "gross_pay": 8000.0,
        "cpf_employee": 1600.0,
        "cpf_employer": 1360.0,
        "net_pay": 6400.0
      },
      {
        "employee_id": "EMP-0002",
        "full_name": "Sarah Lim Mei Ling",
        "department": "NDT Operations",
        "basic_pay": 5200.0,
        "allowances": 300.0,
        "overtime_pay": 240.0,
        "gross_pay": 5740.0,
        "cpf_employee": 1148.0,
        "cpf_employer": 975.8,
        "net_pay": 4592.0
      }
    ]
  },
  "/mod23/runs/2": {
    "run_id": 2,
    "pay_period_start": "2026-06-01",
    "pay_period_end": "2026-06-30",
    "status": "DRAFT",
    "lines": []
  },
  "/mod16/alerts/summary": {
    "ar_outstanding": 125600.0,
    "overdue_invoices": 2,
    "ap_outstanding": 38450.0,
    "pending_payroll_runs": 1
  },
  "/mod16/accounts": [
    {
      "account_id": 1,
      "account_code": "1001",
      "account_name": "Cash at Bank — OCBC",
      "account_type": "ASSET",
      "category": "Current Asset",
      "currency": "SGD"
    },
    {
      "account_id": 2,
      "account_code": "1100",
      "account_name": "Accounts Receivable",
      "account_type": "ASSET",
      "category": "Current Asset",
      "currency": "SGD"
    },
    {
      "account_id": 3,
      "account_code": "1200",
      "account_name": "Inventory",
      "account_type": "ASSET",
      "category": "Current Asset",
      "currency": "SGD"
    },
    {
      "account_id": 4,
      "account_code": "1500",
      "account_name": "Fixed Assets",
      "account_type": "ASSET",
      "category": "Non-Current Asset",
      "currency": "SGD"
    },
    {
      "account_id": 5,
      "account_code": "2001",
      "account_name": "Accounts Payable",
      "account_type": "LIABILITY",
      "category": "Current Liability",
      "currency": "SGD"
    },
    {
      "account_id": 6,
      "account_code": "2100",
      "account_name": "CPF Payable",
      "account_type": "LIABILITY",
      "category": "Current Liability",
      "currency": "SGD"
    },
    {
      "account_id": 7,
      "account_code": "2200",
      "account_name": "Accrued Expenses",
      "account_type": "LIABILITY",
      "category": "Current Liability",
      "currency": "SGD"
    },
    {
      "account_id": 8,
      "account_code": "3001",
      "account_name": "Retained Earnings",
      "account_type": "EQUITY",
      "category": "Equity",
      "currency": "SGD"
    },
    {
      "account_id": 9,
      "account_code": "4001",
      "account_name": "NDT Services Revenue",
      "account_type": "REVENUE",
      "category": "Operating Revenue",
      "currency": "SGD"
    },
    {
      "account_id": 10,
      "account_code": "4002",
      "account_name": "Calibration Services Revenue",
      "account_type": "REVENUE",
      "category": "Operating Revenue",
      "currency": "SGD"
    },
    {
      "account_id": 11,
      "account_code": "5001",
      "account_name": "Staff Salaries & CPF",
      "account_type": "EXPENSE",
      "category": "Staff Costs",
      "currency": "SGD"
    },
    {
      "account_id": 12,
      "account_code": "5100",
      "account_name": "Chemical & Consumables",
      "account_type": "EXPENSE",
      "category": "Direct Costs",
      "currency": "SGD"
    },
    {
      "account_id": 13,
      "account_code": "5200",
      "account_name": "Equipment Maintenance",
      "account_type": "EXPENSE",
      "category": "Overhead",
      "currency": "SGD"
    }
  ],
  "/mod16/ar-invoices": [
    {
      "invoice_id": 1,
      "invoice_number": "INV-2026-0001",
      "customer_name": "SIA Engineering Company",
      "issue_date": "2026-05-15",
      "due_date": "2026-06-14",
      "amount": 48000.0,
      "status": "OVERDUE"
    },
    {
      "invoice_id": 2,
      "invoice_number": "INV-2026-0002",
      "customer_name": "Rolls-Royce Singapore",
      "issue_date": "2026-06-01",
      "due_date": "2026-07-01",
      "amount": 32600.0,
      "status": "SENT"
    },
    {
      "invoice_id": 3,
      "invoice_number": "INV-2026-0003",
      "customer_name": "ST Engineering Aerospace",
      "issue_date": "2026-06-05",
      "due_date": "2026-07-05",
      "amount": 45000.0,
      "status": "SENT"
    }
  ],
  "/mod16/ap-invoices": [
    {
      "invoice_id": 1,
      "supplier_name": "Magnaflux Asia Pacific",
      "supplier_invoice_number": "MF-INV-2026-0441",
      "received_date": "2026-06-10",
      "due_date": "2026-07-10",
      "amount": 2400.0,
      "status": "PENDING"
    },
    {
      "invoice_id": 2,
      "supplier_name": "Spectronics SEA",
      "supplier_invoice_number": "SPEC-2026-088",
      "received_date": "2026-06-05",
      "due_date": "2026-07-05",
      "amount": 850.0,
      "status": "APPROVED"
    }
  ],
  "/mod16/journal-entries": [
    {
      "entry_id": 1,
      "entry_number": "JE-2026-0001",
      "description": "May 2026 payroll disbursement",
      "entry_date": "2026-05-31",
      "total_debit": 98450.0,
      "total_credit": 98450.0,
      "status": "POSTED"
    },
    {
      "entry_id": 2,
      "entry_number": "JE-2026-0002",
      "description": "Chemical inventory write-off — expired batch",
      "entry_date": "2026-06-01",
      "total_debit": 450.0,
      "total_credit": 450.0,
      "status": "DRAFT"
    }
  ],
  "/changelog/alerts/summary": {
    "total_entries": 11,
    "entries_this_month": 4,
    "feature_count": 8,
    "bugfix_count": 3
  },
  "/changelog/entries": [
    {
      "entry_id": 8,
      "version": "1.7.0",
      "category": "FEATURE",
      "description": "Phase 8: System Change Log and Bug Report modules added",
      "affected_modules": "MOD-CHANGELOG,MOD-BUGREPORT",
      "notes": null,
      "created_by_name": "James Tan Wei Liang",
      "created_at": "2026-06-14T01:00:00"
    },
    {
      "entry_id": 7,
      "version": "1.6.0",
      "category": "FEATURE",
      "description": "Phase 7: Finance module — AR/AP invoices, journal entries, chart of accounts (13 seeded accounts)",
      "affected_modules": "MOD-16",
      "notes": null,
      "created_by_name": "James Tan Wei Liang",
      "created_at": "2026-06-13T22:00:00"
    },
    {
      "entry_id": 6,
      "version": "1.5.0",
      "category": "FEATURE",
      "description": "Phase 6: HR Management, Communications, Leave & Attendance, Payroll Processing",
      "affected_modules": "MOD-18,MOD-21,MOD-22,MOD-23",
      "notes": null,
      "created_by_name": "James Tan Wei Liang",
      "created_at": "2026-06-13T20:00:00"
    },
    {
      "entry_id": 5,
      "version": "1.4.0",
      "category": "FEATURE",
      "description": "Phase 5: Maintenance, Purchasing & AVL, Inventory Management with RAG stock status",
      "affected_modules": "MOD-11,MOD-12,MOD-14",
      "notes": null,
      "created_by_name": "James Tan Wei Liang",
      "created_at": "2026-06-13T18:00:00"
    },
    {
      "entry_id": 4,
      "version": "1.3.0",
      "category": "FEATURE",
      "description": "Phase 4: Production Management with AC7108 Appendix D condition recording; Extended Laboratory",
      "affected_modules": "MOD-10,MOD-19",
      "notes": null,
      "created_by_name": "James Tan Wei Liang",
      "created_at": "2026-06-13T14:00:00"
    },
    {
      "entry_id": 3,
      "version": "1.0.3",
      "category": "BUGFIX",
      "description": "Fixed atca-core.js duplicate init — replaced auto-init with singleton ATCA.initPage() to eliminate double clock timers",
      "affected_modules": "ALL",
      "notes": "Eliminates duplicate alert polling and double session listeners",
      "created_by_name": "James Tan Wei Liang",
      "created_at": "2026-06-12T10:00:00"
    },
    {
      "entry_id": 2,
      "version": "1.0.2",
      "category": "BUGFIX",
      "description": "Fixed route ordering in MOD-01 reviews — /actions/:id matched before /:id causing action updates to be unreachable",
      "affected_modules": "MOD-01",
      "notes": "Moved action route above generic ID route",
      "created_by_name": "James Tan Wei Liang",
      "created_at": "2026-06-12T09:30:00"
    },
    {
      "entry_id": 1,
      "version": "1.0.1",
      "category": "BUGFIX",
      "description": "Fixed KPI field name mismatch in MOD-04 — expired_certs vs certs_expired causing KPI cards to always show em-dash",
      "affected_modules": "MOD-04",
      "notes": null,
      "created_by_name": "James Tan Wei Liang",
      "created_at": "2026-06-12T09:00:00"
    }
  ],
  "/bugreport/alerts/summary": {
    "open_bugs": 3,
    "critical_bugs": 1,
    "resolved_this_month": 5,
    "avg_resolution_days": 1.8
  },
  "/bugreport/bugs": [
    {
      "bug_id": 1,
      "title": "Calibration due-date shows wrong year after midnight rollover",
      "description": "On 2026-01-01 00:05, all calibration due dates displayed as 2025 due to timezone offset in date formatting.",
      "severity": "CRITICAL",
      "module_affected": "MOD-05",
      "steps_to_reproduce": "1. Open MOD-05 at midnight. 2. Check due dates. 3. Observe year shown as previous year.",
      "status": "OPEN",
      "resolution_notes": null,
      "reported_by_name": "Sarah Lim Mei Ling",
      "resolved_by_name": null,
      "reported_at": "2026-06-10T08:30:00",
      "resolved_at": null
    },
    {
      "bug_id": 2,
      "title": "Work Order step sign-off allows same user twice",
      "description": "A user can sign off both the inspector and supervisor fields on the same WO step without restriction.",
      "severity": "HIGH",
      "module_affected": "MOD-13",
      "steps_to_reproduce": "1. Open any WO traveler. 2. Sign off inspector field. 3. Sign off supervisor field as same user. 4. No validation error shown.",
      "status": "IN_PROGRESS",
      "resolution_notes": "Investigating RBAC check on step sign-off endpoint",
      "reported_by_name": "James Tan Wei Liang",
      "resolved_by_name": null,
      "reported_at": "2026-06-11T10:15:00",
      "resolved_at": null
    },
    {
      "bug_id": 3,
      "title": "NCR list does not refresh after closing CAPA modal",
      "description": "After closing the Add CAPA modal, the NCR table does not reload — requires manual page refresh to see new CAPA.",
      "severity": "MEDIUM",
      "module_affected": "MOD-07",
      "steps_to_reproduce": "1. Open NCR list. 2. Click Add CAPA. 3. Fill and save. 4. Close modal. 5. NCR table shows stale data.",
      "status": "OPEN",
      "resolution_notes": null,
      "reported_by_name": "Kevin Raj Kumar",
      "resolved_by_name": null,
      "reported_at": "2026-06-12T14:00:00",
      "resolved_at": null
    },
    {
      "bug_id": 4,
      "title": "Leave type select blank on first modal open",
      "description": "On first page load, the Apply Leave modal's leave type dropdown is empty until the Leave Types tab is visited first.",
      "severity": "LOW",
      "module_affected": "MOD-22",
      "steps_to_reproduce": "1. Open MOD-22. 2. Click Apply Leave without visiting Leave Types tab. 3. Dropdown is empty.",
      "status": "RESOLVED",
      "resolution_notes": "Fixed: loadLeaveTypes() now called in init() rather than on tab shown event.",
      "reported_by_name": "Rachel Yap",
      "resolved_by_name": "James Tan Wei Liang",
      "reported_at": "2026-06-13T09:00:00",
      "resolved_at": "2026-06-13T11:30:00"
    }
  ],
  "/chat/alerts/summary": {
    "unread_messages": 3,
    "active_rooms": 2
  },
  "/chat/users": [
    {
      "user_id": 1,
      "full_name": "James Tan Wei Liang",
      "username": "james.tan",
      "role": "ADMIN"
    },
    {
      "user_id": 2,
      "full_name": "Sarah Lim Mei Ling",
      "username": "sarah.lim",
      "role": "QA_MANAGER"
    },
    {
      "user_id": 3,
      "full_name": "Kevin Raj Kumar",
      "username": "kevin.raj",
      "role": "ENGINEER"
    },
    {
      "user_id": 4,
      "full_name": "Rachel Yap",
      "username": "rachel.yap",
      "role": "SUPERVISOR"
    },
    {
      "user_id": 5,
      "full_name": "Ahmad Fauzi",
      "username": "ahmad.fauzi",
      "role": "NDT_INSPECTOR"
    }
  ],
  "/chat/rooms": [
    {
      "room_id": 1,
      "name": null,
      "room_type": "DIRECT",
      "created_at": "2026-06-13T08:00:00",
      "last_message": "Ready for the bath test this morning?",
      "last_sent_at": "2026-06-14T07:45:00",
      "participant_count": 2,
      "other_names": "Sarah Lim Mei Ling"
    },
    {
      "room_id": 2,
      "name": "QA Team",
      "room_type": "GROUP",
      "created_at": "2026-06-10T10:00:00",
      "last_message": "All NCRs for June reviewed.",
      "last_sent_at": "2026-06-13T17:30:00",
      "participant_count": 3,
      "other_names": "Sarah Lim Mei Ling, Kevin Raj Kumar"
    }
  ],
  "/chat/rooms/1/messages": [
    {
      "message_id": 1,
      "room_id": 1,
      "sender_id": 2,
      "sender_name": "Sarah Lim Mei Ling",
      "body": "Morning James, did you review the CoC for WO-2026-0042?",
      "sent_at": "2026-06-14T07:30:00",
      "is_deleted": 0
    },
    {
      "message_id": 2,
      "room_id": 1,
      "sender_id": 1,
      "sender_name": "James Tan Wei Liang",
      "body": "Yes, looks good. Approved and issued.",
      "sent_at": "2026-06-14T07:35:00",
      "is_deleted": 0
    },
    {
      "message_id": 3,
      "room_id": 1,
      "sender_id": 2,
      "sender_name": "Sarah Lim Mei Ling",
      "body": "Ready for the bath test this morning?",
      "sent_at": "2026-06-14T07:45:00",
      "is_deleted": 0
    }
  ],
  "/chat/rooms/2/messages": [
    {
      "message_id": 4,
      "room_id": 2,
      "sender_id": 3,
      "sender_name": "Kevin Raj Kumar",
      "body": "NCR-2026-0018 CAPA verified and closed.",
      "sent_at": "2026-06-13T16:00:00",
      "is_deleted": 0
    },
    {
      "message_id": 5,
      "room_id": 2,
      "sender_id": 2,
      "sender_name": "Sarah Lim Mei Ling",
      "body": "Good work team. All NCRs for June reviewed.",
      "sent_at": "2026-06-13T17:30:00",
      "is_deleted": 0
    }
  ],
  "/auth/signature": {
    "signature_data": null,
    "signature_updated_at": null
  },
  "/mod09/alerts/summary": {
    "pending_reviews": 2,
    "pending_grn_inspection": 1,
    "ready_to_ship": 3,
    "expired_quotations": 1,
    "total": 3
  },
  "/mod09/customers": {
    "items": [
      {
        "customer_id": 1,
        "customer_code": "CUST-0001",
        "company_name": "SIA Engineering Company",
        "customer_type": "TIER1",
        "contact_person": "Jonathan Goh",
        "approved_vendor": true,
        "quotation_count": 4
      },
      {
        "customer_id": 2,
        "customer_code": "CUST-0002",
        "company_name": "Rolls-Royce Singapore",
        "customer_type": "OEM",
        "contact_person": "Emily Watson",
        "approved_vendor": true,
        "quotation_count": 3
      },
      {
        "customer_id": 3,
        "customer_code": "CUST-0003",
        "company_name": "ST Engineering Aerospace",
        "customer_type": "TIER1",
        "contact_person": "Marcus Tan",
        "approved_vendor": true,
        "quotation_count": 2
      },
      {
        "customer_id": 4,
        "customer_code": "CUST-0004",
        "company_name": "Parker Hannifin Aerospace",
        "customer_type": "OEM",
        "contact_person": "Rebecca Lim",
        "approved_vendor": false,
        "quotation_count": 1
      }
    ],
    "total": 4
  },
  "/mod09/parts": {
    "items": [
      {
        "part_id": 1,
        "part_number": "GE90-7B-FAN-BLADE",
        "part_description": "GE90 Stage-7B Fan Blade",
        "part_type": "COMPONENT",
        "process_area": "FPI",
        "unit_of_measure": "EA",
        "standard_price": 1250.0
      },
      {
        "part_id": 2,
        "part_number": "RR-DISC-TRENT-1000",
        "part_description": "Trent 1000 HP Turbine Disc",
        "part_type": "COMPONENT",
        "process_area": "MPT",
        "unit_of_measure": "EA",
        "standard_price": 4800.0
      },
      {
        "part_id": 3,
        "part_number": "LG-ACTUATOR-A320",
        "part_description": "A320 Landing Gear Actuator",
        "part_type": "ASSEMBLY",
        "process_area": "CHEM_PROC",
        "unit_of_measure": "EA",
        "standard_price": 2100.0
      }
    ],
    "total": 3
  },
  "/mod09/quotations": {
    "items": [
      {
        "quotation_id": 1,
        "quotation_ref": "QT-2026-0001",
        "customer_name": "SIA Engineering Company",
        "quotation_date": "2026-05-20",
        "valid_until": "2026-06-20",
        "total_amount": 48000.0,
        "status": "ACCEPTED",
        "prepared_by_name": "James Tan Wei Liang"
      },
      {
        "quotation_id": 2,
        "quotation_ref": "QT-2026-0002",
        "customer_name": "Rolls-Royce Singapore",
        "quotation_date": "2026-06-01",
        "valid_until": "2026-07-01",
        "total_amount": 32600.0,
        "status": "SENT",
        "prepared_by_name": "Sarah Lim Mei Ling"
      },
      {
        "quotation_id": 3,
        "quotation_ref": "QT-2026-0003",
        "customer_name": "Parker Hannifin Aerospace",
        "quotation_date": "2026-04-10",
        "valid_until": "2026-05-10",
        "total_amount": 15400.0,
        "status": "EXPIRED",
        "prepared_by_name": "James Tan Wei Liang"
      }
    ],
    "total": 3
  },
  "/mod09/contract-reviews": {
    "items": [
      {
        "review_id": 1,
        "review_ref": "CR-2026-0001",
        "customer_name": "SIA Engineering Company",
        "review_date": "2026-05-22",
        "reviewer_name": "James Tan Wei Liang",
        "spec_reviewed": true,
        "capability_ok": true,
        "delivery_ok": true,
        "status": "APPROVED"
      },
      {
        "review_id": 2,
        "review_ref": "CR-2026-0002",
        "customer_name": "Rolls-Royce Singapore",
        "review_date": "2026-06-03",
        "reviewer_name": "Sarah Lim Mei Ling",
        "spec_reviewed": true,
        "capability_ok": true,
        "delivery_ok": false,
        "status": "PENDING"
      }
    ],
    "total": 2
  },
  "/mod09/grn": {
    "items": [
      {
        "grn_id": 1,
        "grn_ref": "GRN-2026-0042",
        "supplier_name": "Rolls-Royce Singapore",
        "customer_name": "Rolls-Royce Singapore",
        "delivery_note_no": "DN-88231",
        "received_date": "2026-06-10",
        "inspection_reqd": true,
        "inspection_done": true,
        "inspect_result": "ACCEPT",
        "status": "ACCEPTED",
        "received_by_name": "James Tan Wei Liang"
      },
      {
        "grn_id": 2,
        "grn_ref": "GRN-2026-0041",
        "supplier_name": "ST Engineering Aerospace",
        "customer_name": "ST Engineering Aerospace",
        "delivery_note_no": "DN-88102",
        "received_date": "2026-06-08",
        "inspection_reqd": true,
        "inspection_done": false,
        "inspect_result": null,
        "status": "PENDING",
        "received_by_name": "Sarah Lim Mei Ling"
      }
    ],
    "total": 2
  },
  "/mod09/delivery-orders": {
    "items": [
      {
        "do_id": 1,
        "do_ref": "DO-2026-0015",
        "customer_name": "SIA Engineering Company",
        "delivery_date": "2026-06-12",
        "shipped_date": "2026-06-12T14:30:00",
        "tracking_number": "SGX-552180",
        "status": "SHIPPED",
        "prepared_by_name": "James Tan Wei Liang"
      },
      {
        "do_id": 2,
        "do_ref": "DO-2026-0016",
        "customer_name": "ST Engineering Aerospace",
        "delivery_date": "2026-06-18",
        "shipped_date": null,
        "tracking_number": null,
        "status": "READY",
        "prepared_by_name": "Sarah Lim Mei Ling"
      }
    ],
    "total": 2
  },
  "/mod10/alerts/summary": {
    "due_soon": 3,
    "overdue_jobs": 1,
    "incomplete_checklists": 1,
    "failed_test_pieces": 0,
    "total": 4
  },
  "/mod10/route-cards": {
    "items": [
      {
        "route_id": 1,
        "route_ref": "RC-2026-0001",
        "part_number": "PHN-INNER-BODY-HSG",
        "customer_name": "Parker Hannifin Aerospace",
        "job_type": "ANODIZE",
        "quantity": 12,
        "required_by_date": "2026-06-25",
        "priority": "NORMAL",
        "status": "IN_PROGRESS",
        "done_ops": 7,
        "total_ops": 12
      },
      {
        "route_id": 2,
        "route_ref": "RC-2026-0002",
        "part_number": "GE90-7B-FAN-BLADE",
        "customer_name": "SIA Engineering Company",
        "job_type": "FPI",
        "quantity": 4,
        "required_by_date": "2026-06-22",
        "priority": "HIGH",
        "status": "IN_PROGRESS",
        "done_ops": 2,
        "total_ops": 8
      }
    ],
    "total": 2
  },
  "/mod19/alerts/summary": {
    "overdue_analyses": 1,
    "due_soon": 2,
    "low_stock": 2,
    "validation_overdue": 1,
    "lab_accred_expiring": 0,
    "total": 4
  },
  "/mod19/analysis-schedules": {
    "items": [
      {
        "schedule_id": 1,
        "schedule_ref": "LAB-SCH-001",
        "analysis_name": "Anodize bath H2SO4 titration",
        "analysis_type": "CHEMICAL",
        "process_area": "Anodize Bay",
        "frequency_type": "DAILY",
        "next_due_date": "2026-06-15",
        "last_done_date": "2026-06-14",
        "days_to_due": 0,
        "status": "DUE",
        "responsible_name": "Ahmad Bin Rashid",
        "external_lab": false
      },
      {
        "schedule_id": 2,
        "schedule_ref": "LAB-SCH-002",
        "analysis_name": "Penetrant sensitivity (TAM panel)",
        "analysis_type": "NDT",
        "process_area": "FPI Bay",
        "frequency_type": "WEEKLY",
        "next_due_date": "2026-06-18",
        "last_done_date": "2026-06-11",
        "days_to_due": 3,
        "status": "OK",
        "responsible_name": "James Tan Wei Liang",
        "external_lab": false
      }
    ],
    "total": 2
  },
  "/mod20/complaints": {
    "items": [
      {
        "complaint_id": 1,
        "complaint_ref": "CMP-2026-0001",
        "customer_name": "Rolls-Royce Singapore",
        "complaint_type": "QUALITY",
        "subject": "Surface finish out of spec on disc batch",
        "severity": "CRITICAL",
        "received_date": "2026-06-05",
        "target_close_date": "2026-06-26",
        "status": "OPEN",
        "owned_by_name": "James Tan Wei Liang",
        "has_8d": false
      },
      {
        "complaint_id": 2,
        "complaint_ref": "CMP-2026-0002",
        "customer_name": "SIA Engineering Company",
        "complaint_type": "DELIVERY",
        "subject": "Late delivery of CoC documentation",
        "severity": "MEDIUM",
        "received_date": "2026-06-09",
        "target_close_date": "2026-06-30",
        "status": "IN_PROGRESS",
        "owned_by_name": "Sarah Lim Mei Ling",
        "has_8d": false
      }
    ],
    "total": 2
  },
  "/mod20/8d-reports": {
    "items": [
      {
        "report_id": 1,
        "report_ref": "8D-2026-0001",
        "complaint_ref": "CMP-2026-0001",
        "team_lead_name": "James Tan Wei Liang",
        "current_step": "D4",
        "status": "OPEN",
        "opened_date": "2026-06-06"
      }
    ],
    "total": 1
  },
  "/mod28/alerts/summary": {
    "total_capabilities": 101,
    "processes": 22,
    "customers": 31,
    "upcoming_services": 0,
    "total": 101
  },
  "/mod28/processes": {
    "items": [
      {
        "process_name": "Anodizing",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 119.0,
        "max_wid_cm": 60.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "process_name": "Black Oxide",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 55.0,
        "max_wid_cm": 33.0,
        "max_dep_cm": 45.0,
        "is_upcoming": false
      },
      {
        "process_name": "Cadmium",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 69.0,
        "max_wid_cm": 44.0,
        "max_dep_cm": 82.0,
        "is_upcoming": false
      },
      {
        "process_name": "Chemical Cleaning",
        "process_group": "OTHER",
        "bay": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "process_name": "Chromate (Chem Film)",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 120.0,
        "max_wid_cm": 60.0,
        "max_dep_cm": 110.0,
        "is_upcoming": false
      },
      {
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "bay": null,
        "max_len_cm": 130.0,
        "max_wid_cm": 85.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "process_name": "Coating (inexhaustive)",
        "process_group": "COATING",
        "bay": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "process_name": "Copper Plating",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 160.0,
        "max_wid_cm": 68.0,
        "max_dep_cm": 85.0,
        "is_upcoming": false
      },
      {
        "process_name": "Electroless Nickel",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 69.0,
        "max_wid_cm": 44.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "process_name": "Electropolishing",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 40.0,
        "max_wid_cm": 100.0,
        "max_dep_cm": 45.0,
        "is_upcoming": false
      },
      {
        "process_name": "Gold Plating",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 16.0,
        "max_wid_cm": 16.0,
        "max_dep_cm": 30.0,
        "is_upcoming": false
      },
      {
        "process_name": "Hard Chrome",
        "process_group": "OTHER",
        "bay": null,
        "max_len_cm": 72.0,
        "max_wid_cm": 88.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "process_name": "NDT",
        "process_group": "NDT",
        "bay": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "process_name": "Nickel Plating",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 59.0,
        "max_wid_cm": 44.0,
        "max_dep_cm": 99.0,
        "is_upcoming": false
      },
      {
        "process_name": "Nickel Plating/ Nickel + Chromium/ Copper + Nickel/ Copper + Nickel + Chromium",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "process_name": "Other non-cleanroom surface treatment",
        "process_group": "CLEANROOM",
        "bay": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "process_name": "Passivation",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 80.0,
        "max_wid_cm": 60.0,
        "max_dep_cm": 82.0,
        "is_upcoming": false
      },
      {
        "process_name": "Phosphating",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 158.0,
        "max_wid_cm": 100.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "process_name": "Silver Plating",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 69.0,
        "max_wid_cm": 50.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "process_name": "Welding",
        "process_group": "OTHER",
        "bay": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "process_name": "Weldment cleaning",
        "process_group": "OTHER",
        "bay": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "process_name": "Zinc Plating",
        "process_group": "ELECTROPLATING",
        "bay": null,
        "max_len_cm": 84.0,
        "max_wid_cm": 60.0,
        "max_dep_cm": 120.0,
        "is_upcoming": false
      }
    ],
    "total": 22
  },
  "/mod28/capabilities": {
    "items": [
      {
        "capability_id": 1,
        "capability_ref": "PCM-2026-0001",
        "process_name": "Anodizing",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "MIL-PRF-8625F (Formerly known as MIL-A-8625)",
        "tier1_class": "Type I: Chromic Acid Anodication",
        "tier2_class": "Class 1: Not dyed Class 2: Dyed",
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 119.0,
        "max_wid_cm": 60.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "capability_id": 2,
        "capability_ref": "PCM-2026-0002",
        "process_name": "Anodizing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS2470R",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 119.0,
        "max_wid_cm": 60.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "capability_id": 3,
        "capability_ref": "PCM-2026-0003",
        "process_name": "Anodizing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS2472J",
        "tier1_class": "Class 1: Coatings for identification Class 2: Coatings for decorative purposes",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 4,
        "capability_ref": "PCM-2026-0004",
        "process_name": "Anodizing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS2482F",
        "tier1_class": "Type 1: PTFE-impregnated aluminum oxide",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 5,
        "capability_ref": "PCM-2026-0005",
        "process_name": "Anodizing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Meggit",
        "specification": "EPRO 276 - Issue 6",
        "tier1_class": "Hard Anodizing",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 119.0,
        "max_wid_cm": 60.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "capability_id": 6,
        "capability_ref": "PCM-2026-0006",
        "process_name": "Anodizing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Boeing",
        "specification": "BAC 5019 Rev AA",
        "tier1_class": "CHROMIC ACID ANODIZING",
        "tier2_class": "Class 1: Nondyed coating; for general painted or unpainted service (meeting the requirements of MIL-PRF-8625, Type I)",
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 119.0,
        "max_wid_cm": 60.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "capability_id": 7,
        "capability_ref": "PCM-2026-0007",
        "process_name": "Anodizing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Standard Aero",
        "specification": "SPM 70-61-32",
        "tier1_class": "SULFURIC ACID ANODIZING - ANODIZE",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 8,
        "capability_ref": "PCM-2026-0008",
        "process_name": "Anodizing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abbott S204928A",
        "specification": "ANODIZE PER 204928-03",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 9,
        "capability_ref": "PCM-2026-0009",
        "process_name": "Anodizing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abbott S204928A",
        "specification": "ANODIZE PER 204928-04, COLOR",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 10,
        "capability_ref": "PCM-2026-0010",
        "process_name": "Anodizing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abbott S204928A",
        "specification": "HARD ANODIZE PER 204928-06",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 11,
        "capability_ref": "PCM-2026-0011",
        "process_name": "Anodizing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abbott S204928A",
        "specification": "HARD ANODIZE PER 204928-07, COLOR",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 12,
        "capability_ref": "PCM-2026-0012",
        "process_name": "Black Oxide",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "MIL-DTL-13924F",
        "tier1_class": "Class 4: Black oxide alkaline oxidizing process (for other corrosion resistant steel alloys).",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 55.0,
        "max_wid_cm": 33.0,
        "max_dep_cm": 45.0,
        "is_upcoming": false
      },
      {
        "capability_id": 13,
        "capability_ref": "PCM-2026-0013",
        "process_name": "Black Oxide",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "AMS2484C",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 14,
        "capability_ref": "PCM-2026-0014",
        "process_name": "Black Oxide",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "AMS2485M",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 15,
        "capability_ref": "PCM-2026-0015",
        "process_name": "Black Oxide",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abbott S204928A",
        "specification": "BLACK OXIDE PER 204928-13",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 16,
        "capability_ref": "PCM-2026-0016",
        "process_name": "Zinc Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "ASTM B633-23",
        "tier1_class": "SC4: Using FE/Zn25 Substrate  SC3: Using FE/Zn13 Substrate  SC2: Using FE/Zn8 Substrate  SC1: Using FE/Zn5 Substrate",
        "tier2_class": "Type I: As-plated without supplementary  treatments Type II: With colored chromate coatings (Eg. Blue Zinc, yellow zinc, black zinc) Type III: With colorless chromate  conversion coatings Type IV:  With phosphate conversion  coatings Type V: With colorless passivate Type VI: With colored passivate",
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 84.0,
        "max_wid_cm": 60.0,
        "max_dep_cm": 120.0,
        "is_upcoming": false
      },
      {
        "capability_id": 17,
        "capability_ref": "PCM-2026-0017",
        "process_name": "Zinc Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "Jin Pao (Airbus)",
        "specification": "SEP014 Indice: D",
        "tier1_class": "Classification based on plating thickness:  ZN8/Y: 8 ± 2 µm (Operational condition: hot and dry atmosphere) ZN10/Y: 10 ± 2 µm  (Operational condition: warm and dry atmosphere) ZN12/Y: 12 ± 2 µm (Operational condition: possibly of condensation)",
        "tier2_class": "Classification based on Passivation Type: Type B: Whitened (Appearance: Transparent, slightly iridescent) Type C: Iridescent (Appearance: Cr(VI) Yellow iridescent) Type F: Black (Appearance: Black)",
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 18,
        "capability_ref": "PCM-2026-0018",
        "process_name": "Zinc Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abbott S204928A",
        "specification": "ZINC PLATE PER 204928-16",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 19,
        "capability_ref": "PCM-2026-0019",
        "process_name": "Copper Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "Vallourec",
        "specification": "TSLI390/391",
        "tier1_class": "Remarks: Cyanide Copper",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 160.0,
        "max_wid_cm": 68.0,
        "max_dep_cm": 85.0,
        "is_upcoming": false
      },
      {
        "capability_id": 20,
        "capability_ref": "PCM-2026-0020",
        "process_name": "Copper Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "Baker Hughes",
        "specification": "BCS A204 Rev F",
        "tier1_class": "Remarks: Cyanide Copper",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 21,
        "capability_ref": "PCM-2026-0021",
        "process_name": "Copper Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "SIA",
        "specification": "SIA Drawing 12DDR-25-8174 (as revised) SIA Drawing A350DR-25-8172 (as revised)",
        "tier1_class": "Remarks: \"SIA COPPER TRIM\", Acidic Copper (higher copper, low acid)",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 100.0,
        "max_wid_cm": 30.0,
        "max_dep_cm": 40.0,
        "is_upcoming": false
      },
      {
        "capability_id": 22,
        "capability_ref": "PCM-2026-0022",
        "process_name": "Electroless Nickel",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "ASTM B733-22",
        "tier1_class": "Classification based on usage: SC0: Minimum Thickness SC1: Light Service SC2: Mild Service SC3: Moderate Service SC4: Severe Service",
        "tier2_class": "Classification based on Post Heat Treatment: Class 1: No heat treatment, as plated",
        "tier3_class": "Classification based on deposited alloy: Type I: No Requirement for Phosphorus Type IV: 5 - 9% wt phosphorous (Mid P) Type V: ≥ 10% wt phosphorous (High P)",
        "tier4_class": null,
        "max_len_cm": 69.0,
        "max_wid_cm": 44.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "capability_id": 23,
        "capability_ref": "PCM-2026-0023",
        "process_name": "Electroless Nickel",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS2404K",
        "tier1_class": "Classification based on thermal treatment: Class 1: Except for hydrogen embrittlement relief, no post plating thermal treatment Class 2: Thermal treatment to harden the deposit Class 3: Thermal treatment to improve adhesion for non heat-treatable aluminium alloys and beryllium alloys Class 4: Thermal treatment to improve adhesion for heat-treatable aluminium alloys Class 5: Thermal treatment required adhesion on titanium alloys, when Class 2 heat treatment for deposit hardening is not required.",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 24,
        "capability_ref": "PCM-2026-0024",
        "process_name": "Electroless Nickel",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS-C-26074D",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 25,
        "capability_ref": "PCM-2026-0025",
        "process_name": "Electroless Nickel",
        "process_group": "ELECTROPLATING",
        "customer_category": "Billion (Meggit)",
        "specification": "ST-001",
        "tier1_class": "High Phosphorus Electroless Nickel",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 26,
        "capability_ref": "PCM-2026-0026",
        "process_name": "Electroless Nickel",
        "process_group": "ELECTROPLATING",
        "customer_category": "ONN WAH (Meggit)",
        "specification": "EPRO 116 ISSUE 10",
        "tier1_class": "Mid Phosphorous Electroless Nickel",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 27,
        "capability_ref": "PCM-2026-0027",
        "process_name": "Electroless Nickel",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abbott S204928A",
        "specification": "ELECTROLESS NICKEL PLATE PER 204928-08",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 28,
        "capability_ref": "PCM-2026-0028",
        "process_name": "Electroless Nickel",
        "process_group": "ELECTROPLATING",
        "customer_category": "Pratt & Whitney",
        "specification": "SPOP-311",
        "tier1_class": "n/a",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 95.0,
        "max_wid_cm": 45.0,
        "max_dep_cm": 90.0,
        "is_upcoming": false
      },
      {
        "capability_id": 29,
        "capability_ref": "PCM-2026-0029",
        "process_name": "Nickel Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "AMS-QQ-N-290 (Rev D)",
        "tier1_class": "Classification based on functionality: Class 1: Corrosion protective plating",
        "tier2_class": "Classification based on plating thickness: Grade A: ≥ 0.0016 in/40.64 µm (Only for Steels, Zinc and Zinc Alloys substrate) Grade B: ≥ 0.0012 in/30.48 µm  Grade C: ≥ 0.0010 in/25.4 µm Grade D: ≥ 0.0008 in/20.32 µm Grade E: ≥ 0.0006 in/15.24 µm Grade F: ≥ 0.0004 in/10.16 µm Grade G: ≥ 0.0002 in/5.08 µm (Only for Copper and Copper Alloys)",
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 59.0,
        "max_wid_cm": 44.0,
        "max_dep_cm": 99.0,
        "is_upcoming": false
      },
      {
        "capability_id": 30,
        "capability_ref": "PCM-2026-0030",
        "process_name": "Nickel Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abbott S204928A",
        "specification": "NICKEL PLATE PER 204928-09, _____ THICK, CLASS _____",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 31,
        "capability_ref": "PCM-2026-0031",
        "process_name": "Nickel Plating/ Nickel + Chromium/ Copper + Nickel/ Copper + Nickel + Chromium",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "DIN EN ISO 1456:2009",
        "tier1_class": "Classification based on types of copper coating: a: Ductile",
        "tier2_class": "Classification based on types of nickel coating: p: Dull or semi-bright nickel which has been mechanically polished  s: Sulfur-free dull or semi-bright nickel with a columnar structure that has not been mechanically polished  d: double or triple-layer nickel",
        "tier3_class": "Classification based on types of chromium coating: r: regular (conventional) chromium having a minimal local thickness of 0.3 um",
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 32,
        "capability_ref": "PCM-2026-0032",
        "process_name": "Silver Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "ASTM B700-20",
        "tier1_class": "Classification based on purity: Type 1: min 99.9% Type 2: min 99.0% Type 3: min 98.0%",
        "tier2_class": "Classification based on apprearance: Grade A, Matt Grade B, Bright Grade C, Bright Grade D, Semibright",
        "tier3_class": "Classification based on surface treatment:  Class N: A silver finish that has had no supplementary tarnish resistant treatment.  Class S: A silver finish that has had a supplementary chromate treatment to resist tarnishing.  Class T: A silver finish that has had a supplementary non-chromate treatment to resist tarnishing.",
        "tier4_class": null,
        "max_len_cm": 69.0,
        "max_wid_cm": 50.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "capability_id": 33,
        "capability_ref": "PCM-2026-0033",
        "process_name": "Silver Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS 2410M",
        "tier1_class": "Plating, Silver Nickel Strike, High Bake",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 34,
        "capability_ref": "PCM-2026-0034",
        "process_name": "Silver Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS 2411K",
        "tier1_class": "Plating, Silver for High Temperature Applications",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 35,
        "capability_ref": "PCM-2026-0035",
        "process_name": "Silver Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS 2412L",
        "tier1_class": "Plating, Silver Copper Strike, Low Bake",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 36,
        "capability_ref": "PCM-2026-0036",
        "process_name": "Silver Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aker Solution",
        "specification": "10000312211-PDC-000 Ver 06",
        "tier1_class": "Electrodeposited silver",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 37,
        "capability_ref": "PCM-2026-0037",
        "process_name": "Phosphating",
        "process_group": "ELECTROPLATING",
        "customer_category": "ST Engineering",
        "specification": "IFMA 820 (Issue C)",
        "tier1_class": "Zinc Phosphate",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 158.0,
        "max_wid_cm": 100.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "capability_id": 38,
        "capability_ref": "PCM-2026-0038",
        "process_name": "Phosphating",
        "process_group": "ELECTROPLATING",
        "customer_category": "Baker Hughes",
        "specification": "BCS A401 (Rev J)",
        "tier1_class": "Zinc Phosphate",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 60.0,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 39,
        "capability_ref": "PCM-2026-0039",
        "process_name": "Phosphating",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS 2481L",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 40,
        "capability_ref": "PCM-2026-0040",
        "process_name": "Phosphating",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "MIL-DTL-16232H",
        "tier1_class": "Classification based on type of phosphating: Type M: Manganese Phosphate Base Type Z: Zinc phosphate base",
        "tier2_class": "Classification based on supplementary treatment: Class 1: Supplementary preservative treatment or coating, as specified Class 2: Supplementary treatment with lubricating oil conforming to MIL-PRF-16173, Grade 3 or MIL-PRF-3150 Class 3: No supplementary treatment Class 4: Chemically converted (may be dyed to color as specified) with no supplementary coating or coating as specified",
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 41,
        "capability_ref": "PCM-2026-0041",
        "process_name": "Phosphating",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "TT-C-490 Rev J",
        "tier1_class": "Type I: Zinc phosphate (Coating Weights: 150 - 500 mg/ft2 (1.6 - 5.4 g/m2))",
        "tier2_class": "Classification based on Surface Cleaning: Method I: Mechanical or abrasive blast cleaning, sanding, grinding, in accordance with The Society for Protective Coatings (SSPC)/ The Association for Materials Protection and Performance (AMPP) standards  Method II: Solvent cleaning by immersion, spray, vapor, or hand wiping.  Method III: Detergent cleaning by immersion, spray, ultrasonic, hot alkaline, or electrolytic methods.",
        "tier3_class": "Classification based on Process Forms: Form 3: Immersion application Form 4: Immersion application and rinse",
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 42,
        "capability_ref": "PCM-2026-0042",
        "process_name": "Gold Plating",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "MIL-DTL-45204D (Previously known as MIL-G-45204)",
        "tier1_class": "Classification base on Gold Content: Type I: ≥ 99.7%",
        "tier2_class": "Classification base on Hardness: Grade A: ≤ 90 Knoop",
        "tier3_class": "Impurities requirement:  Chromium, copper, tin, lead, silver, cadmium, or zinc: ≤ 0.1 % w/w Iron, nickel and cobalt combined:  ≤ 0.05% w/w Iron, nickel or cobalt by individual:  ≤ 0.03% w/w",
        "tier4_class": "Classification based on thickness: Class 00: ≥ 0.00002 in (0.508 µm) Class 0: ≥ 0.00003 in (0.762 µm) Class 1: ≥ 0.00005 in (1.27 µm) Class 2: ≥ 0.00010 in (2.54 µm) Class 3: ≥ 0.00020 in (5.08 µm) Class 4: ≥ 0.00030 in (7.62 µm) Class 5: ≥ 0.00050 in (12.7 µm) Class 6: ≥ 0.00150 in (38.1 µm)",
        "max_len_cm": 16.0,
        "max_wid_cm": 16.0,
        "max_dep_cm": 30.0,
        "is_upcoming": false
      },
      {
        "capability_id": 43,
        "capability_ref": "PCM-2026-0043",
        "process_name": "Chromate (Chem Film)",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "MIL-DTL-5541F",
        "tier1_class": "Classification based on type of chromate: Type I (Yellow Chromate): Compositions containing hexavalent chromium",
        "tier2_class": "Classification based on functionality: Class 1A: For maximum protection against corrosion, painted or unpainted. Class 3: For protection against corrosion where low electrical resistance is required.",
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 120.0,
        "max_wid_cm": 60.0,
        "max_dep_cm": 110.0,
        "is_upcoming": false
      },
      {
        "capability_id": 44,
        "capability_ref": "PCM-2026-0044",
        "process_name": "Chromate (Chem Film)",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "TT-C-490 Rev J",
        "tier1_class": "Type VI: MIL-DTL-81706 Chemical conversion coating materials and MIL-DTL-5541 for Chemical Conversion Coating process for aluminum and aluminum alloys",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 45,
        "capability_ref": "PCM-2026-0045",
        "process_name": "Chromate (Chem Film)",
        "process_group": "ELECTROPLATING",
        "customer_category": "Liebherr",
        "specification": "LSI/VWI/001 Rev 05",
        "tier1_class": "Alodine 1200 Chromating Treatment (Equivalent to MIL-DTL-5541F Type I Class 1A)",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 46,
        "capability_ref": "PCM-2026-0046",
        "process_name": "Chromate (Chem Film)",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abbott S204928A",
        "specification": "CHEM FILM PER 204928-01",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 47,
        "capability_ref": "PCM-2026-0047",
        "process_name": "Chromate (Chem Film)",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abbott S204928A",
        "specification": "CHEM FILM PER 204928-02",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 48,
        "capability_ref": "PCM-2026-0048",
        "process_name": "Passivation",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "ASTM A967/A967M − 25",
        "tier1_class": "Classification based on acid conc and bath temp: Nitric 1 (20-25 % v/v HNO3, 2.5 ± 0.5 % w/w Na₂Cr₂O₇·2H₂O, 50 °C to 55 °C)",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 80.0,
        "max_wid_cm": 60.0,
        "max_dep_cm": 82.0,
        "is_upcoming": false
      },
      {
        "capability_id": 49,
        "capability_ref": "PCM-2026-0049",
        "process_name": "Passivation",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS2700G",
        "tier1_class": "Method 1 Type II: 20 to 25% by volume of 42 degree Baume HNO3  -2 to 3% by weight Na2Cr2O7·2H2O, 120 to 130 °F (49 to 54 °C)",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 50,
        "capability_ref": "PCM-2026-0050",
        "process_name": "Passivation",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aerospace (AMC)",
        "specification": "PS-17-01 Rev 08",
        "tier1_class": "Process Application Option I",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 51,
        "capability_ref": "PCM-2026-0051",
        "process_name": "Passivation",
        "process_group": "ELECTROPLATING",
        "customer_category": "AB SCIEX",
        "specification": "D5030980",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 52,
        "capability_ref": "PCM-2026-0052",
        "process_name": "Passivation",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abcet",
        "specification": "S-3609",
        "tier1_class": "Type II: Medium temperature nitric acid and sodium dichromate",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 53,
        "capability_ref": "PCM-2026-0053",
        "process_name": "Passivation",
        "process_group": "ELECTROPLATING",
        "customer_category": "LAM Research",
        "specification": "202-090181-001 (Service provided by ATC CLEANTEC)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 54,
        "capability_ref": "PCM-2026-0054",
        "process_name": "Passivation",
        "process_group": "ELECTROPLATING",
        "customer_category": "LAM Research",
        "specification": "520-090181-001  (Service provided by ATC CLEANTEC)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 55,
        "capability_ref": "PCM-2026-0055",
        "process_name": "Passivation",
        "process_group": "ELECTROPLATING",
        "customer_category": "ASM",
        "specification": "1029-681-1 Pickling & Passivation (Service provided by ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 56,
        "capability_ref": "PCM-2026-0056",
        "process_name": "Passivation",
        "process_group": "ELECTROPLATING",
        "customer_category": "Mattson Technology Inc.",
        "specification": "075-00685-00 Passivate (Service provided by ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 57,
        "capability_ref": "PCM-2026-0057",
        "process_name": "Passivation",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abbott S204928A",
        "specification": "PASSIVATE PER 204928-11",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 58,
        "capability_ref": "PCM-2026-0058",
        "process_name": "Passivation",
        "process_group": "ELECTROPLATING",
        "customer_category": "Amphenol",
        "specification": "9-997",
        "tier1_class": "Nitric 1 (Reference Type II)",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 59,
        "capability_ref": "PCM-2026-0059",
        "process_name": "Hard Chrome",
        "process_group": "OTHER",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS2460B",
        "tier1_class": "Classification based on type of plating: Class 1 (Flash & Nickel Chrome): Corrosion protective plating",
        "tier2_class": "Classification based on appearance: Type I: Bright finish Type II: Satin finish",
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 72.0,
        "max_wid_cm": 88.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "capability_id": 60,
        "capability_ref": "PCM-2026-0060",
        "process_name": "Hard Chrome",
        "process_group": "OTHER",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS2406R",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 61,
        "capability_ref": "PCM-2026-0061",
        "process_name": "Cadmium",
        "process_group": "ELECTROPLATING",
        "customer_category": "Aerospace (SAE AMS)",
        "specification": "AMS Q-P-416G (formerly known as AMS Q-P-416)",
        "tier1_class": "Classification based on plating thickness: Class 1: ≥ 0.0005 in (12.7 µm) Class 2: ≥ 0.0003 in (7.62 µm) Class 3: ≥ 0.0002 in (5.08 µm)",
        "tier2_class": "Classification based on supplementary treatment: Type I: As plated Type IIA: With supplementary hexavalent chromate treatment, maximum service temperature 150 °F (66 °C) Type IIB: With supplemetary hexavalent chrome free treatment, maximum service temperature 375 °F (191 °C) Type III: With supplementary phosphate treatment",
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 69.0,
        "max_wid_cm": 44.0,
        "max_dep_cm": 82.0,
        "is_upcoming": false
      },
      {
        "capability_id": 62,
        "capability_ref": "PCM-2026-0062",
        "process_name": "Chemical Cleaning",
        "process_group": "OTHER",
        "customer_category": "Honeywell",
        "specification": "SPM 20-00-02/70-00-01 Rev 24",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 63,
        "capability_ref": "PCM-2026-0063",
        "process_name": "Electropolishing",
        "process_group": "ELECTROPLATING",
        "customer_category": "General",
        "specification": "ASTM B912−02",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 40.0,
        "max_wid_cm": 100.0,
        "max_dep_cm": 45.0,
        "is_upcoming": false
      },
      {
        "capability_id": 64,
        "capability_ref": "PCM-2026-0064",
        "process_name": "Electropolishing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Baker Hughes",
        "specification": "BCS A102 Rev D",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 65,
        "capability_ref": "PCM-2026-0065",
        "process_name": "Electropolishing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Applied Materials",
        "specification": "AMAT-0250-13605 Rev 05 (Service Provided by ATC CLEANTEC)",
        "tier1_class": "Classification based on functionality: Class II (General) Class IB (Critical without Corrosion Resistance)",
        "tier2_class": "Classification based on appearance of the surface finish: Type 1:  Luster finish Type 2: Matt finish Type 3: Burr Removal",
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 66,
        "capability_ref": "PCM-2026-0066",
        "process_name": "Electropolishing",
        "process_group": "ELECTROPLATING",
        "customer_category": "Abbott S204928A",
        "specification": "ELECTROPOLISH PER 204928-12",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 67,
        "capability_ref": "PCM-2026-0067",
        "process_name": "Other non-cleanroom surface treatment",
        "process_group": "CLEANROOM",
        "customer_category": "Airbus",
        "specification": "80-T-35-0104",
        "tier1_class": "Pickling of Stainless, Austenitic Steel",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 68,
        "capability_ref": "PCM-2026-0068",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "Applied Materials",
        "specification": "AMAT-0250-70351 Rev 07",
        "tier1_class": "Classification base on component: Type I: Any component/assembly used in environments of ambient or rough vacuum.",
        "tier2_class": "Classification based on base material: Aluminium Stainless steel",
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": 130.0,
        "max_wid_cm": 85.0,
        "max_dep_cm": 100.0,
        "is_upcoming": false
      },
      {
        "capability_id": 69,
        "capability_ref": "PCM-2026-0069",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "Applied Materials",
        "specification": "AMAT-0250-20000 Rev 16",
        "tier1_class": "Appendix D: CHEMICAL CLEANING OF ALUMINUM",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 70,
        "capability_ref": "PCM-2026-0070",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "Applied Materials",
        "specification": "AMAT-0250-29357 Rev 06 (Service Provided by ATC CLEANTEC)",
        "tier1_class": "Classification based on component type: Type I - Critical Path Components and Assemblies",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 71,
        "capability_ref": "PCM-2026-0071",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "Applied Materials",
        "specification": "AMAT 0250-63409 Rev 01 (Service Provided by ATC CLEANTEC)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 72,
        "capability_ref": "PCM-2026-0072",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "SEMI",
        "specification": "SEMI F19-0304",
        "tier1_class": "Classification based on grade: General Purpose Grade (GP): Components intended for use in fluid distribution systems of semiconductor manufacturing facilities that do not have sringent cleanliness requirements.",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 73,
        "capability_ref": "PCM-2026-0073",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "ASML",
        "specification": "GSA-07-9410 Rev 03",
        "tier1_class": "Classification based on cleanliness requirement: Grade 5: The cleanliness requirements for packing material that is used outside the cleanroom.",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 74,
        "capability_ref": "PCM-2026-0074",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "ASML",
        "specification": "GSA-07-9510 Rev 02",
        "tier1_class": "Classification based on cleanliness requirement: Grade 5: Requirement for molecular contamination of packing and tooling that is used outside the cleanroom.",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 75,
        "capability_ref": "PCM-2026-0075",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "ASML",
        "specification": "GSA-07-2220 Grade 2",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 76,
        "capability_ref": "PCM-2026-0076",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "ASML",
        "specification": "GSA-07-4320 Rev 01 Grade 4",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 77,
        "capability_ref": "PCM-2026-0077",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "MKS / Spectra Physics",
        "specification": "Drawing # 0453-3250",
        "tier1_class": "CLASS 1 Chemically cleaned",
        "tier2_class": "Classification based on materials: Elastomers (O-rings) Metallic hardware",
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 78,
        "capability_ref": "PCM-2026-0078",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "Mattson Technology Inc.",
        "specification": "075-00723 Rev C (Service provided by ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 79,
        "capability_ref": "PCM-2026-0079",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "Mattson Technology Inc.",
        "specification": "075-00003-00 Clean and Pack (Service provided by ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 80,
        "capability_ref": "PCM-2026-0080",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "Mattson Technology Inc.",
        "specification": "0759-01920 Rev D",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 81,
        "capability_ref": "PCM-2026-0081",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "General",
        "specification": "ISO 14644-9",
        "tier1_class": "SCP Class 4",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 82,
        "capability_ref": "PCM-2026-0082",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "AB SCIEX",
        "specification": "D5030980A",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 83,
        "capability_ref": "PCM-2026-0083",
        "process_name": "Cleanroom Surface Pre-treatment",
        "process_group": "CLEANROOM",
        "customer_category": "AMEC",
        "specification": "180-00003-000 (Rev 001) (Finishing Methods for Al Components)",
        "tier1_class": "Class IA - Critical Surfaces",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 84,
        "capability_ref": "PCM-2026-0084",
        "process_name": "NDT",
        "process_group": "NDT",
        "customer_category": "General",
        "specification": "ASTM E1417/E1417M − 21",
        "tier1_class": "Type I—Fluorescent dye",
        "tier2_class": "Method A—Water washable",
        "tier3_class": "Sensitivity Level 2—Medium",
        "tier4_class": "Form a—Dry powder. Form d—Nonaqueous for Type I fluorescent penetrant.",
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 85,
        "capability_ref": "PCM-2026-0085",
        "process_name": "NDT",
        "process_group": "NDT",
        "customer_category": "General",
        "specification": "ASTM E1444/E1444M − 11",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 86,
        "capability_ref": "PCM-2026-0086",
        "process_name": "NDT",
        "process_group": "NDT",
        "customer_category": "General",
        "specification": "Eddy Current Test",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 87,
        "capability_ref": "PCM-2026-0087",
        "process_name": "NDT",
        "process_group": "NDT",
        "customer_category": "General",
        "specification": "Ultrasonic Test",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 88,
        "capability_ref": "PCM-2026-0088",
        "process_name": "NDT",
        "process_group": "NDT",
        "customer_category": "General",
        "specification": "ASTM E1742/E1742M-18 Radiographic Inspection (RT) 2-2T",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 89,
        "capability_ref": "PCM-2026-0089",
        "process_name": "Weldment cleaning",
        "process_group": "OTHER",
        "customer_category": "LAM Research",
        "specification": "202-010805-001 (Service provided by ATC CLEANTEC)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 90,
        "capability_ref": "PCM-2026-0090",
        "process_name": "Welding",
        "process_group": "OTHER",
        "customer_category": "Aerospace",
        "specification": "AWS Welding Specification for Fusion Welding for Aerospace Applications Gas Tungsten Arc Welding (GTAW) orbital weld",
        "tier1_class": "D17.1",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 91,
        "capability_ref": "PCM-2026-0091",
        "process_name": "Coating (inexhaustive)",
        "process_group": "COATING",
        "customer_category": "Applied Materials",
        "specification": "0250-01021 (Service provided by ATCC, ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 92,
        "capability_ref": "PCM-2026-0092",
        "process_name": "Coating (inexhaustive)",
        "process_group": "COATING",
        "customer_category": "LAM Research",
        "specification": "202-103106-001 Teflon 954G  (Service provided by ATCC, ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 93,
        "capability_ref": "PCM-2026-0093",
        "process_name": "Coating (inexhaustive)",
        "process_group": "COATING",
        "customer_category": "LAM Research",
        "specification": "202-010816-002/003 Xylan 1010 (Service provided by ATCC, ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 94,
        "capability_ref": "PCM-2026-0094",
        "process_name": "Coating (inexhaustive)",
        "process_group": "COATING",
        "customer_category": "LAM Research",
        "specification": "75-00001-29 Everslick 1201 Black (Service provided by ATCC, ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 95,
        "capability_ref": "PCM-2026-0095",
        "process_name": "Coating (inexhaustive)",
        "process_group": "COATING",
        "customer_category": "LAM Research",
        "specification": "75-00001-25 Sky White Powder (Service provided by ATCC, ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 96,
        "capability_ref": "PCM-2026-0096",
        "process_name": "Coating (inexhaustive)",
        "process_group": "COATING",
        "customer_category": "LAM Research",
        "specification": "75-00001-21 Pearl White (Service provided by ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 97,
        "capability_ref": "PCM-2026-0097",
        "process_name": "Coating (inexhaustive)",
        "process_group": "COATING",
        "customer_category": "ASM",
        "specification": "1029-684-1 Painting ASM J Black (Service provided by ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 98,
        "capability_ref": "PCM-2026-0098",
        "process_name": "Coating (inexhaustive)",
        "process_group": "COATING",
        "customer_category": "ASM",
        "specification": "1029-684-1 Painting ASM Blue, White (Service provided by ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 99,
        "capability_ref": "PCM-2026-0099",
        "process_name": "Coating (inexhaustive)",
        "process_group": "COATING",
        "customer_category": "ASM",
        "specification": "05-114502A Paint Color 11, 12, 14, 1013, color 1 & 2 (Service provided by ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 100,
        "capability_ref": "PCM-2026-0100",
        "process_name": "Coating (inexhaustive)",
        "process_group": "COATING",
        "customer_category": "Mattson Technology Inc.",
        "specification": "KCC White/Red Powder Coating (Service provided by ATC Surface Finishing)",
        "tier1_class": null,
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      },
      {
        "capability_id": 101,
        "capability_ref": "PCM-2026-0101",
        "process_name": "Coating (inexhaustive)",
        "process_group": "COATING",
        "customer_category": "Liebherr",
        "specification": "LSI/VWI/001 Rev 05 (Service provided by ATCC)",
        "tier1_class": "Varnishing/painting",
        "tier2_class": null,
        "tier3_class": null,
        "tier4_class": null,
        "max_len_cm": null,
        "max_wid_cm": null,
        "max_dep_cm": null,
        "is_upcoming": false
      }
    ],
    "total": 101
  },
  "/mod28/revisions": {
    "items": [
      {
        "document_no": "ATC-PCM-001",
        "revision": "A",
        "rev_date": "07/01/2025",
        "originator": "JF TEH",
        "change_details": "INITIAL RELEASE",
        "reason": null
      }
    ],
    "total": 1
  },
  "/mod29/alerts/summary": {
    "in_gap_analysis": 1,
    "gaps_open": 2,
    "in_qualification": 1,
    "awarded_active": 1,
    "audits_due": 1,
    "expiring_90d": 0,
    "total": 3
  },
  "/mod29/qualifications": {
    "items": [
      {
        "qual_id": 1,
        "qual_ref": "QUAL-2026-0001",
        "customer_name": "Boeing",
        "process_name": "Anodizing",
        "specification": "BAC 5019 Rev AA — Chromic Acid Anodizing",
        "status": "PERIODIC_AUDIT",
        "certificate_no": "BOE-SP-2026-0142",
        "valid_from": "2026-02-01",
        "valid_to": "2028-02-01",
        "next_audit_due": "2026-08-01",
        "gaps_total": 3,
        "gaps_closed": 3
      },
      {
        "qual_id": 2,
        "qual_ref": "QUAL-2026-0002",
        "customer_name": "Pratt & Whitney",
        "process_name": "Electroless Nickel",
        "specification": "SPOP-311 — High Phosphorus EN",
        "status": "QUALIFICATION",
        "certificate_no": null,
        "valid_from": null,
        "valid_to": null,
        "next_audit_due": null,
        "gaps_total": 2,
        "gaps_closed": 2
      },
      {
        "qual_id": 3,
        "qual_ref": "QUAL-2026-0003",
        "customer_name": "Airbus (Jin Pao)",
        "process_name": "Zinc Plating",
        "specification": "SEP014 Indice D — ZN12/Y Type C",
        "status": "GAP_ANALYSIS",
        "certificate_no": null,
        "valid_from": null,
        "valid_to": null,
        "next_audit_due": null,
        "gaps_total": 3,
        "gaps_closed": 1
      }
    ],
    "total": 3
  },
  "/mod29/qualifications/1": {
    "qual_id": 1,
    "qual_ref": "QUAL-2026-0001",
    "customer_name": "Boeing",
    "capability_id": 6,
    "process_name": "Anodizing",
    "specification": "BAC 5019 Rev AA — Chromic Acid Anodizing",
    "status": "PERIODIC_AUDIT",
    "certificate_no": "BOE-SP-2026-0142",
    "approval_authority": "Boeing Supplier Quality (D1-4426)",
    "valid_from": "2026-02-01",
    "valid_to": "2028-02-01",
    "audit_interval_months": 12,
    "next_audit_due": "2026-08-01",
    "gaps": [
      {
        "gap_id": 1,
        "gap_no": 1,
        "requirement": "BAC 5019 §4.2 tank temperature recording every 30 min",
        "gap_desc": "No automated temperature log on CAA tank",
        "severity": "HIGH",
        "owner_name": "Ahmad Bin Rashid",
        "due_date": "2026-01-15",
        "status": "CLOSED"
      },
      {
        "gap_id": 2,
        "gap_no": 2,
        "requirement": "BAC 5019 §5.1 operator certification",
        "gap_desc": "2 operators not yet BAC-certified",
        "severity": "MEDIUM",
        "owner_name": "Sarah Lim Mei Ling",
        "due_date": "2026-01-20",
        "status": "CLOSED"
      },
      {
        "gap_id": 3,
        "gap_no": 3,
        "requirement": "Boeing D1-4426 self-audit checklist",
        "gap_desc": "Checklist not yet adopted into QMS",
        "severity": "LOW",
        "owner_name": "James Tan Wei Liang",
        "due_date": "2026-01-25",
        "status": "CLOSED"
      }
    ],
    "activities": [
      {
        "activity_id": 1,
        "activity_type": "DOC_REVIEW",
        "activity_date": "2026-01-10",
        "performed_by": "James Tan Wei Liang",
        "result": "PASS",
        "report_ref": "DR-2026-0007"
      },
      {
        "activity_id": 2,
        "activity_type": "FAI",
        "activity_date": "2026-01-22",
        "performed_by": "Boeing SQE",
        "result": "PASS",
        "report_ref": "FAI-2026-0003"
      }
    ],
    "periodic_audits": [
      {
        "audit_id": 1,
        "audit_no": 1,
        "scheduled_date": "2026-02-01",
        "actual_date": "2026-02-03",
        "auditor": "Boeing SQE — R. Watson",
        "result": "PASS",
        "next_due": "2026-08-01"
      }
    ]
  },
  "/mod29/qualifications/2": {
    "qual_id": 2,
    "qual_ref": "QUAL-2026-0002",
    "customer_name": "Pratt & Whitney",
    "capability_id": null,
    "process_name": "Electroless Nickel",
    "specification": "SPOP-311 — High Phosphorus EN",
    "status": "QUALIFICATION",
    "certificate_no": null,
    "approval_authority": null,
    "valid_from": null,
    "valid_to": null,
    "audit_interval_months": 12,
    "next_audit_due": null,
    "gaps": [
      {
        "gap_id": 4,
        "gap_no": 1,
        "requirement": "SPOP-311 §6 phosphorus content 10–13% verification",
        "gap_desc": "XRF method not validated for P range",
        "severity": "HIGH",
        "owner_name": "James Tan Wei Liang",
        "due_date": "2026-05-30",
        "status": "CLOSED"
      },
      {
        "gap_id": 5,
        "gap_no": 2,
        "requirement": "SPOP-311 §8 bath analysis frequency",
        "gap_desc": "Daily Ni titration log not retained 7 years",
        "severity": "MEDIUM",
        "owner_name": "Ahmad Bin Rashid",
        "due_date": "2026-06-05",
        "status": "CLOSED"
      }
    ],
    "activities": [
      {
        "activity_id": 3,
        "activity_type": "TRIAL",
        "activity_date": "2026-06-10",
        "performed_by": "Ahmad Bin Rashid",
        "result": "PASS",
        "report_ref": "TRIAL-2026-0011"
      },
      {
        "activity_id": 4,
        "activity_type": "CUSTOMER_AUDIT",
        "activity_date": "2026-06-15",
        "performed_by": "P&W SQR",
        "result": null,
        "report_ref": "Scheduled"
      }
    ],
    "periodic_audits": []
  },
  "/mod29/qualifications/3": {
    "qual_id": 3,
    "qual_ref": "QUAL-2026-0003",
    "customer_name": "Airbus (Jin Pao)",
    "capability_id": null,
    "process_name": "Zinc Plating",
    "specification": "SEP014 Indice D — ZN12/Y Type C",
    "status": "GAP_ANALYSIS",
    "certificate_no": null,
    "approval_authority": null,
    "valid_from": null,
    "valid_to": null,
    "audit_interval_months": 12,
    "next_audit_due": null,
    "gaps": [
      {
        "gap_id": 6,
        "gap_no": 1,
        "requirement": "SEP014 §4 passivation Type C (yellow iridescent)",
        "gap_desc": "Cr(VI)-free passivate line not yet installed",
        "severity": "CRITICAL",
        "owner_name": "James Tan Wei Liang",
        "due_date": "2026-07-15",
        "status": "OPEN"
      },
      {
        "gap_id": 7,
        "gap_no": 2,
        "requirement": "SEP014 thickness 12±2µm control",
        "gap_desc": "No in-line thickness gauge",
        "severity": "HIGH",
        "owner_name": "Ahmad Bin Rashid",
        "due_date": "2026-07-20",
        "status": "IN_PROGRESS"
      },
      {
        "gap_id": 8,
        "gap_no": 3,
        "requirement": "Airbus operator approval",
        "gap_desc": "Operators need Airbus SEP014 training",
        "severity": "MEDIUM",
        "owner_name": "Sarah Lim Mei Ling",
        "due_date": "2026-06-30",
        "status": "CLOSED"
      }
    ],
    "activities": [],
    "periodic_audits": []
  },
  "/mod30/alerts/summary": {
    "total_ovens": 10,
    "overdue_pyrometry": 1,
    "due_soon": 1,
    "tc_expiring": 2,
    "aerospace_ovens": 3,
    "total": 2
  },
  "/mod30/ovens": {
    "items": [
      {
        "oven_id": 1,
        "oven_code": "ATCT OVEN 8",
        "oven_name": "Baking & Heat Treatment Oven 8",
        "function_type": "BAKE_HEATTREAT",
        "standard_ref": "AMS 2750H",
        "furnace_class": "2",
        "instrument_type": "C",
        "temp_min_c": 85,
        "temp_max_c": 300,
        "aerospace_only": 1,
        "area": "Production",
        "tus_interval_days": 90,
        "sat_interval_days": 30,
        "last_tus": "2026-04-10",
        "last_sat": "2026-06-02",
        "rag_status": "AMBER"
      },
      {
        "oven_id": 2,
        "oven_code": "ATCT OVEN 9",
        "oven_name": "Baking & Heat Treatment Oven 9",
        "function_type": "BAKE_HEATTREAT",
        "standard_ref": "AMS 2750H",
        "furnace_class": "2",
        "instrument_type": "C",
        "temp_min_c": 125,
        "temp_max_c": 400,
        "aerospace_only": 1,
        "area": "Production",
        "tus_interval_days": 90,
        "sat_interval_days": 30,
        "last_tus": "2026-05-15",
        "last_sat": "2026-06-10",
        "rag_status": "GREEN"
      },
      {
        "oven_id": 3,
        "oven_code": "ATCT OVEN 16",
        "oven_name": "Muffle Furnace 16",
        "function_type": "MUFFLE",
        "standard_ref": "AMS 2750H",
        "furnace_class": "3",
        "instrument_type": "D",
        "temp_min_c": 40,
        "temp_max_c": 1200,
        "aerospace_only": 1,
        "area": "Production",
        "tus_interval_days": 90,
        "sat_interval_days": 30,
        "last_tus": "2026-02-20",
        "last_sat": "2026-04-01",
        "rag_status": "RED"
      },
      {
        "oven_id": 4,
        "oven_code": "ATCT OVEN 12",
        "oven_name": "Drying Oven 12 (Honeywell Ti/Steel/Mg)",
        "function_type": "DRYING",
        "standard_ref": "AMS 2750H",
        "furnace_class": "4",
        "instrument_type": "D",
        "temp_min_c": 111,
        "temp_max_c": 131,
        "aerospace_only": 1,
        "area": "Production",
        "tus_interval_days": 180,
        "sat_interval_days": 60,
        "last_tus": "2026-05-01",
        "last_sat": "2026-06-05",
        "rag_status": "GREEN"
      },
      {
        "oven_id": 5,
        "oven_code": "ATCT OVEN 4",
        "oven_name": "Drying Oven 4 (Honeywell Al/Carbon Fibre)",
        "function_type": "DRYING",
        "standard_ref": null,
        "furnace_class": null,
        "instrument_type": null,
        "temp_min_c": 50,
        "temp_max_c": 70,
        "aerospace_only": 0,
        "area": "Production",
        "tus_interval_days": 180,
        "sat_interval_days": 60,
        "last_tus": "2026-05-20",
        "last_sat": "2026-06-12",
        "rag_status": "GREEN"
      },
      {
        "oven_id": 6,
        "oven_code": "ATCT OVEN 5",
        "oven_name": "Drying Oven 5",
        "function_type": "DRYING",
        "standard_ref": null,
        "furnace_class": null,
        "instrument_type": null,
        "temp_min_c": 50,
        "temp_max_c": 70,
        "aerospace_only": 0,
        "area": "Production",
        "tus_interval_days": 180,
        "sat_interval_days": 60,
        "last_tus": "2026-05-20",
        "last_sat": "2026-06-12",
        "rag_status": "GREEN"
      },
      {
        "oven_id": 7,
        "oven_code": "ATCT OVEN 10",
        "oven_name": "Drying Oven 10",
        "function_type": "DRYING",
        "standard_ref": null,
        "furnace_class": null,
        "instrument_type": null,
        "temp_min_c": 50,
        "temp_max_c": 70,
        "aerospace_only": 0,
        "area": "Production",
        "tus_interval_days": 180,
        "sat_interval_days": 60,
        "last_tus": "2026-05-22",
        "last_sat": "2026-06-12",
        "rag_status": "GREEN"
      },
      {
        "oven_id": 8,
        "oven_code": "ATCT OVEN 11",
        "oven_name": "Drying Oven 11",
        "function_type": "DRYING",
        "standard_ref": null,
        "furnace_class": null,
        "instrument_type": null,
        "temp_min_c": 50,
        "temp_max_c": 70,
        "aerospace_only": 0,
        "area": "Production",
        "tus_interval_days": 180,
        "sat_interval_days": 60,
        "last_tus": "2026-05-22",
        "last_sat": "2026-06-12",
        "rag_status": "GREEN"
      },
      {
        "oven_id": 9,
        "oven_code": "ATCT OVEN 13",
        "oven_name": "Drying Oven 13 (N2, small parts)",
        "function_type": "DRYING",
        "standard_ref": null,
        "furnace_class": null,
        "instrument_type": null,
        "temp_min_c": 30,
        "temp_max_c": 150,
        "aerospace_only": 0,
        "area": "Cleanroom",
        "tus_interval_days": 180,
        "sat_interval_days": 60,
        "last_tus": "2026-05-25",
        "last_sat": "2026-06-14",
        "rag_status": "GREEN"
      },
      {
        "oven_id": 10,
        "oven_code": "ATCT OVEN 14",
        "oven_name": "Drying Oven 14 (N2, large parts)",
        "function_type": "DRYING",
        "standard_ref": null,
        "furnace_class": null,
        "instrument_type": null,
        "temp_min_c": 30,
        "temp_max_c": 200,
        "aerospace_only": 0,
        "area": "Cleanroom",
        "tus_interval_days": 180,
        "sat_interval_days": 60,
        "last_tus": "2026-05-25",
        "last_sat": "2026-06-14",
        "rag_status": "GREEN"
      }
    ],
    "total": 10
  },
  "/mod30/ovens/1": {
    "oven_id": 1,
    "oven_code": "ATCT OVEN 8",
    "oven_name": "Baking & Heat Treatment Oven 8",
    "function_type": "BAKE_HEATTREAT",
    "standard_ref": "AMS 2750H",
    "furnace_class": "2",
    "instrument_type": "C",
    "temp_min_c": 85,
    "temp_max_c": 300,
    "aerospace_only": 1,
    "area": "Production",
    "tus_interval_days": 90,
    "sat_interval_days": 30,
    "rag_status": "AMBER",
    "tests": [
      {
        "test_id": 1,
        "test_ref": "PYR-2026-0007",
        "test_type": "SAT",
        "test_date": "2026-06-02",
        "set_point_c": 300,
        "max_dev_c": 1.2,
        "tolerance_c": 2.0,
        "result": "PASS",
        "next_due": "2026-07-02"
      },
      {
        "test_id": 2,
        "test_ref": "PYR-2026-0003",
        "test_type": "TUS",
        "test_date": "2026-04-10",
        "set_point_c": 200,
        "max_dev_c": 4.1,
        "tolerance_c": 8.0,
        "result": "PASS",
        "next_due": "2026-07-09"
      }
    ],
    "thermocouples": [
      {
        "tc_id": 1,
        "tc_code": "TC-008-CTL",
        "tc_type": "K",
        "tc_class": "Control",
        "expiry_date": "2026-09-01",
        "status": "IN_USE"
      },
      {
        "tc_id": 2,
        "tc_code": "TC-008-LD1",
        "tc_type": "K",
        "tc_class": "Load",
        "expiry_date": "2026-07-05",
        "status": "IN_USE"
      }
    ]
  },
  "/mod30/ovens/3": {
    "oven_id": 3,
    "oven_code": "ATCT OVEN 16",
    "oven_name": "Muffle Furnace 16",
    "function_type": "MUFFLE",
    "standard_ref": "AMS 2750H",
    "furnace_class": "3",
    "instrument_type": "D",
    "temp_min_c": 40,
    "temp_max_c": 1200,
    "aerospace_only": 1,
    "area": "Production",
    "tus_interval_days": 90,
    "sat_interval_days": 30,
    "rag_status": "RED",
    "tests": [
      {
        "test_id": 3,
        "test_ref": "PYR-2026-0001",
        "test_type": "TUS",
        "test_date": "2026-02-20",
        "set_point_c": 600,
        "max_dev_c": 7.5,
        "tolerance_c": 10.0,
        "result": "PASS",
        "next_due": "2026-05-21"
      }
    ],
    "thermocouples": []
  },
  "/mod30/thermocouples": {
    "items": [
      {
        "tc_id": 1,
        "tc_code": "TC-008-CTL",
        "oven_code": "ATCT OVEN 8",
        "tc_type": "K",
        "tc_class": "Control",
        "install_date": "2026-03-01",
        "expiry_date": "2026-09-01",
        "uses_count": 12,
        "uses_max": 90,
        "status": "IN_USE",
        "expiry_status": "OK"
      },
      {
        "tc_id": 2,
        "tc_code": "TC-008-LD1",
        "oven_code": "ATCT OVEN 8",
        "tc_type": "K",
        "tc_class": "Load",
        "install_date": "2026-01-05",
        "expiry_date": "2026-07-05",
        "uses_count": 78,
        "uses_max": 90,
        "status": "IN_USE",
        "expiry_status": "EXPIRING"
      },
      {
        "tc_id": 3,
        "tc_code": "TC-009-CTL",
        "oven_code": "ATCT OVEN 9",
        "tc_type": "N",
        "tc_class": "Control",
        "install_date": "2026-04-01",
        "expiry_date": "2026-10-01",
        "uses_count": 8,
        "uses_max": 90,
        "status": "IN_USE",
        "expiry_status": "OK"
      },
      {
        "tc_id": 4,
        "tc_code": "TC-016-TEST",
        "oven_code": "ATCT OVEN 16",
        "tc_type": "R",
        "tc_class": "Test/SAT",
        "install_date": "2025-12-01",
        "expiry_date": "2026-07-01",
        "uses_count": 40,
        "uses_max": 45,
        "status": "IN_USE",
        "expiry_status": "EXPIRING"
      }
    ],
    "total": 4
  },
  "/mod30/routing": {
    "items": [
      {
        "oven_id": 2,
        "oven_code": "ATCT OVEN 9",
        "oven_name": "Baking & Heat Treatment Oven 9",
        "temp_min_c": 125,
        "temp_max_c": 400,
        "aerospace_only": 1,
        "rag_status": "GREEN"
      },
      {
        "oven_id": 1,
        "oven_code": "ATCT OVEN 8",
        "oven_name": "Baking & Heat Treatment Oven 8",
        "temp_min_c": 85,
        "temp_max_c": 300,
        "aerospace_only": 1,
        "rag_status": "AMBER"
      }
    ],
    "eligible": 2,
    "total": 2
  },
  "/mod31/alerts/summary": {
    "total_competencies": 11,
    "approved_operators": 5,
    "expiring_90d": 1,
    "suspended": 1,
    "signoffs_today": 3,
    "total": 2
  },
  "/mod31/competencies": {
    "items": [
      {
        "competency_id": 1,
        "personnel_id": 5,
        "full_name": "Ahmad Bin Rashid",
        "employee_id": "ATCA-005",
        "process_area": "Anodizing",
        "customer_category": "General",
        "bay": "Bay 5",
        "approval_level": "OPERATOR",
        "approved_date": "2025-09-01",
        "expiry_date": "2027-09-01",
        "status": "ACTIVE",
        "approver_name": "James Tan Wei Liang",
        "expiry_flag": "OK"
      },
      {
        "competency_id": 2,
        "personnel_id": 5,
        "full_name": "Ahmad Bin Rashid",
        "employee_id": "ATCA-005",
        "process_area": "Anodizing",
        "customer_category": "Boeing",
        "bay": "Bay 5",
        "approval_level": "OPERATOR",
        "approved_date": "2026-01-20",
        "expiry_date": "2028-01-20",
        "status": "ACTIVE",
        "approver_name": "James Tan Wei Liang",
        "expiry_flag": "OK"
      },
      {
        "competency_id": 3,
        "personnel_id": 5,
        "full_name": "Ahmad Bin Rashid",
        "employee_id": "ATCA-005",
        "process_area": "Electroless Nickel",
        "customer_category": "Pratt & Whitney",
        "bay": "Bay 2",
        "approval_level": "SIGNATORY",
        "approved_date": "2025-11-01",
        "expiry_date": "2027-11-01",
        "status": "ACTIVE",
        "approver_name": "James Tan Wei Liang",
        "expiry_flag": "OK"
      },
      {
        "competency_id": 4,
        "personnel_id": 1,
        "full_name": "James Tan Wei Liang",
        "employee_id": "ATCA-001",
        "process_area": "FPI",
        "customer_category": "General",
        "bay": "NDT",
        "approval_level": "SIGNATORY",
        "approved_date": "2024-02-01",
        "expiry_date": "2027-02-01",
        "status": "ACTIVE",
        "approver_name": "Gary Tan Beng Huat",
        "expiry_flag": "OK"
      },
      {
        "competency_id": 5,
        "personnel_id": 1,
        "full_name": "James Tan Wei Liang",
        "employee_id": "ATCA-001",
        "process_area": "Anodizing",
        "customer_category": "Boeing",
        "bay": "Bay 5",
        "approval_level": "TRAINER",
        "approved_date": "2025-06-01",
        "expiry_date": "2027-06-01",
        "status": "ACTIVE",
        "approver_name": "Gary Tan Beng Huat",
        "expiry_flag": "OK"
      },
      {
        "competency_id": 6,
        "personnel_id": 2,
        "full_name": "Hendrich Lim Jun Wei",
        "employee_id": "ATCA-002",
        "process_area": "FPI",
        "customer_category": "General",
        "bay": "NDT",
        "approval_level": "SIGNATORY",
        "approved_date": "2024-09-15",
        "expiry_date": "2026-09-15",
        "status": "ACTIVE",
        "approver_name": "James Tan Wei Liang",
        "expiry_flag": "OK"
      },
      {
        "competency_id": 7,
        "personnel_id": 2,
        "full_name": "Hendrich Lim Jun Wei",
        "employee_id": "ATCA-002",
        "process_area": "MPT",
        "customer_category": "General",
        "bay": "NDT",
        "approval_level": "OPERATOR",
        "approved_date": "2025-01-10",
        "expiry_date": "2027-01-10",
        "status": "ACTIVE",
        "approver_name": "James Tan Wei Liang",
        "expiry_flag": "OK"
      },
      {
        "competency_id": 8,
        "personnel_id": 3,
        "full_name": "Cabal Lo Wen Xin",
        "employee_id": "ATCA-003",
        "process_area": "FPI",
        "customer_category": "General",
        "bay": "NDT",
        "approval_level": "OPERATOR",
        "approved_date": "2024-07-01",
        "expiry_date": "2026-08-20",
        "status": "ACTIVE",
        "approver_name": "James Tan Wei Liang",
        "expiry_flag": "EXPIRING"
      },
      {
        "competency_id": 9,
        "personnel_id": 4,
        "full_name": "Sarah Lim Mei Ling",
        "employee_id": "EMP-0002",
        "process_area": "Passivation",
        "customer_category": "General",
        "bay": "Bay 4",
        "approval_level": "OPERATOR",
        "approved_date": "2025-03-01",
        "expiry_date": "2027-03-01",
        "status": "ACTIVE",
        "approver_name": "James Tan Wei Liang",
        "expiry_flag": "OK"
      },
      {
        "competency_id": 10,
        "personnel_id": 4,
        "full_name": "Sarah Lim Mei Ling",
        "employee_id": "EMP-0002",
        "process_area": "Zinc Plating",
        "customer_category": "Airbus (Jin Pao)",
        "bay": "Bay 3",
        "approval_level": "TRAINEE",
        "approved_date": "2026-06-01",
        "expiry_date": null,
        "status": "ACTIVE",
        "approver_name": "James Tan Wei Liang",
        "expiry_flag": "OK"
      },
      {
        "competency_id": 11,
        "personnel_id": 6,
        "full_name": "Kevin Raj Kumar",
        "employee_id": "EMP-0003",
        "process_area": "Zinc Plating",
        "customer_category": "General",
        "bay": "Bay 3",
        "approval_level": "OPERATOR",
        "approved_date": "2025-08-01",
        "expiry_date": "2026-05-01",
        "status": "SUSPENDED",
        "approver_name": "Ahmad Bin Rashid",
        "expiry_flag": "EXPIRED"
      }
    ],
    "total": 11
  },
  "/mod31/signoffs": {
    "items": [
      {
        "signoff_id": 12,
        "full_name": "Ahmad Bin Rashid",
        "employee_id": "ATCA-005",
        "action": "Anodize Type II bath daily check",
        "module_id": "MOD-06",
        "record_ref": "EP-AN2-001",
        "process_area": "Anodizing",
        "signed_at": "2026-06-17T07:32:00",
        "lan_ip": "192.168.1.19"
      },
      {
        "signoff_id": 11,
        "full_name": "Hendrich Lim Jun Wei",
        "employee_id": "ATCA-002",
        "action": "FPI step 7 — Interpretation sign-off",
        "module_id": "MOD-03",
        "record_ref": "FPI-2026-0002",
        "process_area": "FPI",
        "signed_at": "2026-06-17T06:50:00",
        "lan_ip": "192.168.1.18"
      },
      {
        "signoff_id": 10,
        "full_name": "Ahmad Bin Rashid",
        "employee_id": "ATCA-005",
        "action": "EN bath Ni titration sign-off",
        "module_id": "MOD-06",
        "record_ref": "EP-EN-001",
        "process_area": "Electroless Nickel",
        "signed_at": "2026-06-17T06:15:00",
        "lan_ip": "192.168.1.19"
      },
      {
        "signoff_id": 9,
        "full_name": "James Tan Wei Liang",
        "employee_id": "ATCA-001",
        "action": "FPI final disposition",
        "module_id": "MOD-03",
        "record_ref": "FPI-2026-0001",
        "process_area": "FPI",
        "signed_at": "2026-06-16T16:40:00",
        "lan_ip": "192.168.1.22"
      }
    ],
    "total": 4
  },

  /* ── MOD-32 Bay Load Scheduler ───────────────────────────────── */
  "/mod32/alerts/summary": {
    "scheduled_today": 9,
    "oversize_flagged": 1,
    "pending_confirmation": 3,
    "in_progress": 2,
    "total": 4
  },
  "/mod32/schedule": {
    "items": [
      { "schedule_id": 1, "schedule_ref": "SCH-0001", "job_description": "GRN-2026-0101 — Sulfuric anodize Boeing brackets (Lot A)", "customer_code": "Boeing", "process_area": "Anodizing", "bay": "BAY2", "line_code": "BAY2-ANOD", "shift": "SHIFT_1", "part_len_cm": 45.0, "part_wid_cm": 20.0, "part_dep_cm": 10.0, "part_qty": 12, "fit_checked": true, "fit_result": "PASS", "oversize_flagged": false, "fit_notes": null, "is_manual": false, "priority": 2, "status": "CONFIRMED", "scheduled_date": "2026-06-20", "created_at": "2026-06-19T08:00:00Z", "tank_code": "BATH-PLT-001", "tank_len": 120.0, "tank_wid": 60.0, "tank_dep": 80.0 },
      { "schedule_id": 2, "schedule_ref": "SCH-0002", "job_description": "GRN-2026-0102 — EN plating P&W turbine components", "customer_code": "P&W", "process_area": "Electroless Nickel", "bay": "BAY2", "line_code": "BAY2-EN", "shift": "SHIFT_1", "part_len_cm": 30.0, "part_wid_cm": 15.0, "part_dep_cm": 8.0, "part_qty": 5, "fit_checked": true, "fit_result": "PASS", "oversize_flagged": false, "fit_notes": null, "is_manual": false, "priority": 3, "status": "IN_PROGRESS", "scheduled_date": "2026-06-20", "created_at": "2026-06-19T09:00:00Z", "tank_code": null, "tank_len": null, "tank_wid": null, "tank_dep": null },
      { "schedule_id": 3, "schedule_ref": "SCH-0003", "job_description": "GRN-2026-0103 — Cadmium plating Airbus fasteners (OVERSIZE)", "customer_code": "Airbus", "process_area": "Cadmium Plating", "bay": "BAY4", "line_code": "BAY4-CAD", "shift": "SHIFT_2", "part_len_cm": 200.0, "part_wid_cm": 80.0, "part_dep_cm": 50.0, "part_qty": 3, "fit_checked": true, "fit_result": "FAIL", "oversize_flagged": true, "fit_notes": "Part 200×80×50 cm exceeds tank envelope 150×60×40 cm.", "is_manual": true, "priority": 1, "status": "OVERSIZE", "scheduled_date": "2026-06-20", "created_at": "2026-06-19T10:30:00Z", "tank_code": "BATH-PLT-005", "tank_len": 150.0, "tank_wid": 60.0, "tank_dep": 40.0 },
      { "schedule_id": 4, "schedule_ref": "SCH-0004", "job_description": "GRN-2026-0104 — Passivation SIA Engineering parts", "customer_code": "SIA Engineering", "process_area": "Passivation", "bay": "BAY5", "line_code": "BAY5-PASS", "shift": "SHIFT_1", "part_len_cm": 60.0, "part_wid_cm": 30.0, "part_dep_cm": 20.0, "part_qty": 20, "fit_checked": true, "fit_result": "PASS", "oversize_flagged": false, "fit_notes": null, "is_manual": false, "priority": 3, "status": "PENDING", "scheduled_date": "2026-06-20", "created_at": "2026-06-19T11:00:00Z", "tank_code": null, "tank_len": null, "tank_wid": null, "tank_dep": null },
      { "schedule_id": 5, "schedule_ref": "SCH-0005", "job_description": "GRN-2026-0105 — FPI Honeywell turbine blades", "customer_code": "Honeywell", "process_area": "FPI", "bay": "NDT", "line_code": "NDT-FPI", "shift": "SHIFT_1", "part_len_cm": null, "part_wid_cm": null, "part_dep_cm": null, "part_qty": 8, "fit_checked": false, "fit_result": "N/A", "oversize_flagged": false, "fit_notes": null, "is_manual": false, "priority": 2, "status": "IN_PROGRESS", "scheduled_date": "2026-06-20", "created_at": "2026-06-19T06:00:00Z", "tank_code": null, "tank_len": null, "tank_wid": null, "tank_dep": null },
      { "schedule_id": 6, "schedule_ref": "SCH-0006", "job_description": "GRN-2026-0106 — Heat treat Meggitt brackets (AMS 2750H)", "customer_code": "Meggitt", "process_area": "Heat Treatment", "bay": "HEAT", "line_code": "HEAT-OVEN", "shift": "SHIFT_2", "part_len_cm": 80.0, "part_wid_cm": 40.0, "part_dep_cm": 30.0, "part_qty": 6, "fit_checked": true, "fit_result": "PASS", "oversize_flagged": false, "fit_notes": null, "is_manual": false, "priority": 2, "status": "PENDING", "scheduled_date": "2026-06-20", "created_at": "2026-06-19T12:00:00Z", "tank_code": null, "tank_len": null, "tank_wid": null, "tank_dep": null }
    ],
    "total": 6,
    "date": "2026-06-20"
  },
  "/mod32/tank-fit": {
    "part_dims": { "len": 80.0, "wid": 40.0, "dep": 30.0 },
    "eligible_tanks": [
      { "bath_id": 1, "bath_code": "BATH-PLT-001", "bath_name": "Sulfuric Anodize Tank 1", "bath_type": "ANODIZE_SULFURIC", "bay": "BAY2", "process_category": "ELECTROPLATING", "max_len_cm": 120.0, "max_wid_cm": 60.0, "max_dep_cm": 80.0, "rag_status": "GREEN", "status": "IN_SERVICE" },
      { "bath_id": 3, "bath_code": "BATH-PLT-003", "bath_name": "Passivation Tank A", "bath_type": "PASSIVATION", "bay": "BAY5", "process_category": "ELECTROPLATING", "max_len_cm": 100.0, "max_wid_cm": 50.0, "max_dep_cm": 60.0, "rag_status": "GREEN", "status": "IN_SERVICE" }
    ],
    "total": 2
  },
  "/mod32/bay-load": {
    "items": [
      { "scheduled_date": "2026-06-20", "bay": "BAY2", "shift": "SHIFT_1", "total_slots": 2, "oversize_count": 0, "pending_count": 0, "confirmed_count": 1, "inprogress_count": 1, "completed_count": 0 },
      { "scheduled_date": "2026-06-20", "bay": "BAY4", "shift": "SHIFT_2", "total_slots": 1, "oversize_count": 1, "pending_count": 0, "confirmed_count": 0, "inprogress_count": 0, "completed_count": 0 },
      { "scheduled_date": "2026-06-20", "bay": "BAY5", "shift": "SHIFT_1", "total_slots": 1, "oversize_count": 0, "pending_count": 1, "confirmed_count": 0, "inprogress_count": 0, "completed_count": 0 },
      { "scheduled_date": "2026-06-20", "bay": "NDT",  "shift": "SHIFT_1", "total_slots": 1, "oversize_count": 0, "pending_count": 0, "confirmed_count": 0, "inprogress_count": 1, "completed_count": 0 },
      { "scheduled_date": "2026-06-20", "bay": "HEAT", "shift": "SHIFT_2", "total_slots": 1, "oversize_count": 0, "pending_count": 1, "confirmed_count": 0, "inprogress_count": 0, "completed_count": 0 }
    ],
    "date": "2026-06-20"
  },
  "/mod32/lines": {
    "items": [
      { "line_id": 1, "bay": "BAY2", "line_code": "BAY2-ANOD", "line_name": "Bay 2 — Anodizing Line", "process_area": "Anodizing", "max_slots_per_shift": 2, "is_active": true },
      { "line_id": 2, "bay": "BAY2", "line_code": "BAY2-EN", "line_name": "Bay 2 — Electroless Nickel Line", "process_area": "Electroless Nickel", "max_slots_per_shift": 2, "is_active": true },
      { "line_id": 3, "bay": "BAY3", "line_code": "BAY3-ANC", "line_name": "Bay 3 — Chromic Anodize Line", "process_area": "Chromic Anodize", "max_slots_per_shift": 2, "is_active": true },
      { "line_id": 4, "bay": "BAY4", "line_code": "BAY4-CAD", "line_name": "Bay 4 — Cadmium Plating Line", "process_area": "Cadmium Plating", "max_slots_per_shift": 1, "is_active": true },
      { "line_id": 5, "bay": "BAY5", "line_code": "BAY5-PASS", "line_name": "Bay 5 — Passivation Line", "process_area": "Passivation", "max_slots_per_shift": 3, "is_active": true },
      { "line_id": 6, "bay": "NDT", "line_code": "NDT-FPI", "line_name": "NDT — FPI Line (ApolloFlow)", "process_area": "FPI", "max_slots_per_shift": 4, "is_active": true },
      { "line_id": 7, "bay": "HEAT", "line_code": "HEAT-OVEN", "line_name": "Heat-Treat — Oven Bay", "process_area": "Heat Treatment", "max_slots_per_shift": 3, "is_active": true }
    ],
    "total": 7
  },

  /* ── MOD-33 Spec & Flowdown / Frozen Process ─────────────────── */
  "/mod33/alerts/summary": {
    "active_specs": 10,
    "frozen_specs": 5,
    "ecn_pending": 2,
    "ecn_overdue": 1,
    "aam_entries": 10,
    "frozen_recipes": 3,
    "total": 3
  },
  "/mod33/specs": {
    "items": [
      { "spec_id": 1, "spec_code": "BAC5019", "spec_title": "Boeing Anodize Coating (Chromic/Sulfuric)", "revision": "Rev T", "customer_code": "Boeing", "spec_type": "CUSTOMER", "process_area": "Anodizing", "is_frozen": true, "frozen_since": "2024-01-01", "status": "ACTIVE", "approved_date": "2024-01-01", "param_count": 6, "recipe_count": 2, "open_ecn_count": 1 },
      { "spec_id": 2, "spec_code": "BAC5719", "spec_title": "Boeing Chemical Film Coating (Alodine)", "revision": "Rev F", "customer_code": "Boeing", "spec_type": "CUSTOMER", "process_area": "Chemical Film", "is_frozen": true, "frozen_since": "2023-06-01", "status": "ACTIVE", "approved_date": "2023-06-01", "param_count": 4, "recipe_count": 1, "open_ecn_count": 0 },
      { "spec_id": 3, "spec_code": "SEP014", "spec_title": "Safran Special Electroless Nickel Process", "revision": "Rev 5", "customer_code": "Safran", "spec_type": "CUSTOMER", "process_area": "Electroless Nickel", "is_frozen": true, "frozen_since": "2024-03-01", "status": "ACTIVE", "approved_date": "2024-03-01", "param_count": 8, "recipe_count": 1, "open_ecn_count": 1 },
      { "spec_id": 4, "spec_code": "SPOP-311", "spec_title": "Spirit AeroSystems Passivation Process", "revision": "Rev B", "customer_code": "Spirit", "spec_type": "CUSTOMER", "process_area": "Passivation", "is_frozen": false, "frozen_since": null, "status": "ACTIVE", "approved_date": "2024-05-01", "param_count": 3, "recipe_count": 1, "open_ecn_count": 0 },
      { "spec_id": 5, "spec_code": "EPRO-7", "spec_title": "Airbus Electroplating Process Order 7", "revision": "Rev 3", "customer_code": "Airbus", "spec_type": "CUSTOMER", "process_area": "Cadmium Plating", "is_frozen": true, "frozen_since": "2023-09-01", "status": "ACTIVE", "approved_date": "2023-09-01", "param_count": 7, "recipe_count": 2, "open_ecn_count": 0 },
      { "spec_id": 6, "spec_code": "AMS2470", "spec_title": "Hard Anodizing of Aluminum Alloys (AMS)", "revision": "Rev H", "customer_code": null, "spec_type": "INDUSTRY", "process_area": "Anodizing", "is_frozen": false, "frozen_since": null, "status": "ACTIVE", "approved_date": "2023-01-01", "param_count": 5, "recipe_count": 0, "open_ecn_count": 0 },
      { "spec_id": 7, "spec_code": "AMS2750", "spec_title": "Pyrometry Requirements for Thermal Processing Equip", "revision": "Rev H", "customer_code": null, "spec_type": "INDUSTRY", "process_area": "Heat Treatment", "is_frozen": true, "frozen_since": "2022-06-01", "status": "ACTIVE", "approved_date": "2022-06-01", "param_count": 12, "recipe_count": 1, "open_ecn_count": 0 },
      { "spec_id": 8, "spec_code": "MIL-A-8625", "spec_title": "Anodic Coatings for Aluminum (MIL-SPEC)", "revision": "Rev F", "customer_code": null, "spec_type": "INDUSTRY", "process_area": "Anodizing", "is_frozen": false, "frozen_since": null, "status": "ACTIVE", "approved_date": "2021-01-01", "param_count": 4, "recipe_count": 0, "open_ecn_count": 0 },
      { "spec_id": 9, "spec_code": "AMS2480", "spec_title": "Hard Chrome Plating of Steel Parts", "revision": "Rev C", "customer_code": null, "spec_type": "INDUSTRY", "process_area": "Chrome Plating", "is_frozen": false, "frozen_since": null, "status": "ACTIVE", "approved_date": "2023-01-01", "param_count": 6, "recipe_count": 0, "open_ecn_count": 0 },
      { "spec_id": 10, "spec_code": "ATCA-WI-001", "spec_title": "ATCA Internal Work Instruction — FPI Setup", "revision": "Rev 2", "customer_code": null, "spec_type": "INTERNAL", "process_area": "FPI", "is_frozen": false, "frozen_since": null, "status": "ACTIVE", "approved_date": "2025-01-01", "param_count": 3, "recipe_count": 0, "open_ecn_count": 0 }
    ],
    "total": 10
  },
  "/mod33/specs/1": {
    "spec_id": 1, "spec_code": "BAC5019", "spec_title": "Boeing Anodize Coating (Chromic/Sulfuric)", "revision": "Rev T", "customer_code": "Boeing", "spec_type": "CUSTOMER", "process_area": "Anodizing", "is_frozen": true, "frozen_since": "2024-01-01", "status": "ACTIVE", "notes": "Boeing-controlled frozen process. ECN required for any parameter change.",
    "parameters": [
      { "param_id": 1, "spec_id": 1, "param_name": "H2SO4 Concentration", "param_category": "Bath Chemistry", "value_nominal": "165", "value_min": "155", "value_max": "175", "unit": "g/L", "tolerance": "±10", "is_frozen": true, "is_critical": true, "test_method": "Titration", "frequency": "Daily" },
      { "param_id": 2, "spec_id": 1, "param_name": "Bath Temperature", "param_category": "Temperature", "value_nominal": "18", "value_min": "16", "value_max": "21", "unit": "°C", "tolerance": "±2", "is_frozen": true, "is_critical": true, "test_method": "Calibrated thermometer", "frequency": "Every batch" },
      { "param_id": 3, "spec_id": 1, "param_name": "Current Density", "param_category": "Electrical", "value_nominal": "1.3", "value_min": "1.0", "value_max": "1.6", "unit": "A/dm²", "tolerance": "±0.15", "is_frozen": true, "is_critical": true, "test_method": "Ammeter", "frequency": "Every batch" },
      { "param_id": 4, "spec_id": 1, "param_name": "Anodize Time", "param_category": "Time", "value_nominal": "30", "value_min": "25", "value_max": "35", "unit": "min", "tolerance": "±5", "is_frozen": false, "is_critical": false, "test_method": "Timer", "frequency": "Every batch" },
      { "param_id": 5, "spec_id": 1, "param_name": "Aluminium Content (max)", "param_category": "Bath Chemistry", "value_nominal": null, "value_min": null, "value_max": "15", "unit": "g/L", "tolerance": null, "is_frozen": true, "is_critical": true, "test_method": "ICP analysis", "frequency": "Weekly" },
      { "param_id": 6, "spec_id": 1, "param_name": "Coating Thickness", "param_category": "Output", "value_nominal": "12", "value_min": "8", "value_max": "15", "unit": "µm", "tolerance": null, "is_frozen": false, "is_critical": true, "test_method": "Eddy current gauge", "frequency": "Each lot" }
    ],
    "recipes": [
      { "recipe_id": 1, "recipe_ref": "RCP-0001", "recipe_name": "BAC5019 Standard Sulfuric Anodize", "version": "2.1", "process_area": "Anodizing", "bay": "BAY2", "is_frozen": true, "frozen_at": "2024-01-15T00:00:00Z", "status": "FROZEN", "spec_code": "BAC5019" },
      { "recipe_id": 2, "recipe_ref": "RCP-0002", "recipe_name": "BAC5019 Hard Coat Variant", "version": "1.0", "process_area": "Anodizing", "bay": "BAY3", "is_frozen": false, "frozen_at": null, "status": "APPROVED", "spec_code": "BAC5019" }
    ],
    "ecns": [
      { "ecn_id": 1, "ecn_ref": "ECN-2026-0001", "title": "BAC5019 H2SO4 concentration lower limit adjustment", "change_type": "PARAMETER_CHANGE", "status": "PENDING_CUSTOMER", "risk_level": "HIGH", "submitted_at": "2026-05-01T00:00:00Z", "target_date": "2026-07-01" }
    ]
  },
  "/mod33/ecn": {
    "items": [
      { "ecn_id": 1, "ecn_ref": "ECN-2026-0001", "title": "BAC5019 H2SO4 concentration lower limit adjustment", "change_type": "PARAMETER_CHANGE", "risk_level": "HIGH", "status": "PENDING_CUSTOMER", "customer_approval_required": true, "submitted_at": "2026-05-01T00:00:00Z", "target_date": "2026-07-01", "customer_approval_date": null, "implemented_at": null, "days_open": 50, "spec_code": "BAC5019", "spec_title": "Boeing Anodize Coating (Chromic/Sulfuric)", "customer_code": "Boeing" },
      { "ecn_id": 2, "ecn_ref": "ECN-2026-0002", "title": "SEP014 bath temperature range tightening (±1.5°C)", "change_type": "PARAMETER_CHANGE", "risk_level": "MEDIUM", "status": "PENDING_REVIEW", "customer_approval_required": true, "submitted_at": "2026-06-01T00:00:00Z", "target_date": "2026-08-15", "customer_approval_date": null, "implemented_at": null, "days_open": 19, "spec_code": "SEP014", "spec_title": "Safran Special Electroless Nickel Process", "customer_code": "Safran" },
      { "ecn_id": 3, "ecn_ref": "ECN-2025-0009", "title": "EPRO-7 cadmium bath current density update", "change_type": "PARAMETER_CHANGE", "risk_level": "HIGH", "status": "IMPLEMENTED", "customer_approval_required": true, "submitted_at": "2025-09-01T00:00:00Z", "target_date": "2025-11-30", "customer_approval_date": "2025-11-01", "implemented_at": "2025-11-15T00:00:00Z", "days_open": null, "spec_code": "EPRO-7", "spec_title": "Airbus Electroplating Process Order 7", "customer_code": "Airbus" }
    ],
    "total": 3
  },
  "/mod33/aam": {
    "items": [
      { "aam_id": 1, "process_area": "All", "action_type": "Approve Certificate of Conformance", "min_role": "QA_MANAGER", "two_person_required": true, "second_role": "ENGINEER", "requires_operator_pin": false, "requires_qam_approval": true, "is_irreversible": false, "effective_date": "2024-01-01", "is_active": true, "notes": "AS9100D §8.6 — QA_MANAGER must sign; ENGINEER counter-signs." },
      { "aam_id": 2, "process_area": "FPI", "action_type": "Release FPI Lot to Next Operation", "min_role": "SUPERVISOR", "two_person_required": false, "second_role": null, "requires_operator_pin": true, "requires_qam_approval": false, "is_irreversible": false, "effective_date": "2024-01-01", "is_active": true, "notes": "Operator PIN sign-off required on traveler step." },
      { "aam_id": 3, "process_area": "MPT", "action_type": "Release MPT Lot to Next Operation", "min_role": "SUPERVISOR", "two_person_required": false, "second_role": null, "requires_operator_pin": true, "requires_qam_approval": false, "is_irreversible": false, "effective_date": "2024-01-01", "is_active": true, "notes": "Operator PIN sign-off required." },
      { "aam_id": 4, "process_area": "Cadmium Plating", "action_type": "Approve Cadmium Bath Make-Up", "min_role": "ENGINEER", "two_person_required": true, "second_role": "QA_MANAGER", "requires_operator_pin": false, "requires_qam_approval": true, "is_irreversible": false, "effective_date": "2024-01-01", "is_active": true, "notes": "2-person required — controlled substance (cyanide cadmium)." },
      { "aam_id": 5, "process_area": "Heat Treatment", "action_type": "Sign Off TUS/SAT Test Result", "min_role": "ENGINEER", "two_person_required": false, "second_role": null, "requires_operator_pin": false, "requires_qam_approval": false, "is_irreversible": false, "effective_date": "2024-01-01", "is_active": true, "notes": "Engineer records TUS/SAT; QA reviews overdue." },
      { "aam_id": 6, "process_area": "All", "action_type": "Raise Engineering Change Notice (ECN)", "min_role": "ENGINEER", "two_person_required": false, "second_role": null, "requires_operator_pin": false, "requires_qam_approval": true, "is_irreversible": true, "effective_date": "2024-01-01", "is_active": true, "notes": "Frozen-process change — irreversible until customer approves." },
      { "aam_id": 7, "process_area": "All", "action_type": "Approve ECN (Internal Release)", "min_role": "QA_MANAGER", "two_person_required": true, "second_role": "ENGINEER", "requires_operator_pin": false, "requires_qam_approval": true, "is_irreversible": true, "effective_date": "2024-01-01", "is_active": true, "notes": "QA_MANAGER + ENGINEER dual approval for frozen-process ECNs." },
      { "aam_id": 8, "process_area": "NDT", "action_type": "Sign Level III Interpretation Report", "min_role": "ENGINEER", "two_person_required": false, "second_role": null, "requires_operator_pin": true, "requires_qam_approval": false, "is_irreversible": false, "effective_date": "2024-01-01", "is_active": true, "notes": "NAS410 Level III PIN sign-off." },
      { "aam_id": 9, "process_area": "All", "action_type": "Archive/Withdraw Active Spec", "min_role": "ADMIN", "two_person_required": true, "second_role": "QA_MANAGER", "requires_operator_pin": false, "requires_qam_approval": true, "is_irreversible": true, "effective_date": "2024-01-01", "is_active": true, "notes": "Withdrawal of active spec is irreversible without ECN." },
      { "aam_id": 10, "process_area": "All", "action_type": "Unlock Frozen Process Recipe", "min_role": "QA_MANAGER", "two_person_required": true, "second_role": "ADMIN", "requires_operator_pin": false, "requires_qam_approval": true, "is_irreversible": true, "effective_date": "2024-01-01", "is_active": true, "notes": "Must have approved ECN. QA_MANAGER + ADMIN dual unlock." }
    ],
    "total": 10
  },
  "/mod33/recipes": {
    "items": [
      { "recipe_id": 1, "recipe_ref": "RCP-0001", "recipe_name": "BAC5019 Standard Sulfuric Anodize", "spec_code": "BAC5019", "spec_title": "Boeing Anodize Coating", "customer_code": "Boeing", "process_area": "Anodizing", "bay": "BAY2", "version": "2.1", "status": "FROZEN", "is_frozen": true, "frozen_at": "2024-01-15T00:00:00Z", "approved_at": "2024-01-10T00:00:00Z" },
      { "recipe_id": 2, "recipe_ref": "RCP-0002", "recipe_name": "BAC5019 Hard Coat Variant", "spec_code": "BAC5019", "spec_title": "Boeing Anodize Coating", "customer_code": "Boeing", "process_area": "Anodizing", "bay": "BAY3", "version": "1.0", "status": "APPROVED", "is_frozen": false, "frozen_at": null, "approved_at": "2024-02-01T00:00:00Z" },
      { "recipe_id": 3, "recipe_ref": "RCP-0003", "recipe_name": "SEP014 EN Standard Recipe", "spec_code": "SEP014", "spec_title": "Safran Electroless Nickel", "customer_code": "Safran", "process_area": "Electroless Nickel", "bay": "BAY2", "version": "1.2", "status": "FROZEN", "is_frozen": true, "frozen_at": "2024-03-10T00:00:00Z", "approved_at": "2024-03-05T00:00:00Z" },
      { "recipe_id": 4, "recipe_ref": "RCP-0004", "recipe_name": "EPRO-7 Cadmium Plating Recipe", "spec_code": "EPRO-7", "spec_title": "Airbus Electroplating Process Order 7", "customer_code": "Airbus", "process_area": "Cadmium Plating", "bay": "BAY4", "version": "2.0", "status": "FROZEN", "is_frozen": true, "frozen_at": "2023-09-15T00:00:00Z", "approved_at": "2023-09-10T00:00:00Z" },
      { "recipe_id": 5, "recipe_ref": "RCP-0005", "recipe_name": "AMS2750 Oven Process Recipe", "spec_code": "AMS2750", "spec_title": "Pyrometry Thermal Processing", "customer_code": null, "process_area": "Heat Treatment", "bay": "HEAT", "version": "1.0", "status": "DRAFT", "is_frozen": false, "frozen_at": null, "approved_at": null }
    ],
    "total": 5
  },

  // ── MOD-34 Chemical & Hazmat Control + Alert Escalation Engine ──
  "/mod34/alerts/summary": {
    "sds_active": 12, "sds_expiring_30d": 2, "controlled_substances": 2,
    "replenishment_pending": 3, "escalation_rules_active": 10,
    "unacknowledged_alerts": 2, "low_stock_chemicals": 1, "total": 12
  },
  "/mod34/sds": [
    { "sds_id": 1, "chemical_name": "Sulfuric Acid", "common_name": "Battery Acid / Anodizing Electrolyte", "un_number": "UN1830", "cas_number": "7664-93-9", "hazard_class": "CORROSIVE", "supplier": "Univar Solutions", "sds_version": "Rev 4", "issue_date": "2025-01-15", "expiry_date": "2027-01-15", "is_controlled": false, "status": "ACTIVE", "days_to_expiry": 574, "expiry_rag": "OK", "special_handling": "Always add acid to water, never water to acid.", "ppe_required": "Full face shield, acid-resistant gloves, apron", "storage_conditions": "Locked corrosives cabinet", "disposal_method": "Neutralise with sodium bicarbonate, dispose via licensed contractor" },
    { "sds_id": 2, "chemical_name": "Nitric Acid (65%)", "common_name": "Passivation / Bright Dip", "un_number": "UN2031", "cas_number": "7697-37-2", "hazard_class": "CORROSIVE", "supplier": "Thermo Fisher Scientific", "sds_version": "Rev 3", "issue_date": "2025-03-01", "expiry_date": "2027-03-01", "is_controlled": false, "status": "ACTIVE", "days_to_expiry": 619, "expiry_rag": "OK", "special_handling": "Strong oxidiser — keep away from organics.", "ppe_required": "Full face shield, chemical-resistant gloves, apron", "storage_conditions": "Ventilated corrosives cabinet", "disposal_method": "Dilute and neutralise; licensed contractor" },
    { "sds_id": 3, "chemical_name": "Chromic Acid (Chromium Trioxide)", "common_name": "Hard Chrome Bath", "un_number": "UN1463", "cas_number": "1333-82-0", "hazard_class": "TOXIC", "supplier": "Atotech", "sds_version": "Rev 6", "issue_date": "2024-11-01", "expiry_date": "2026-11-01", "is_controlled": false, "status": "ACTIVE", "days_to_expiry": 133, "expiry_rag": "OK", "special_handling": "Carcinogen (Cr VI). Mandatory LEV.", "ppe_required": "Full face shield, supplied-air respirator", "storage_conditions": "Locked oxidiser store", "disposal_method": "Cr VI reduction then licensed disposal" },
    { "sds_id": 4, "chemical_name": "Sodium Hydroxide (Caustic Soda)", "common_name": "Etch / Degreaser", "un_number": "UN1824", "cas_number": "1310-73-2", "hazard_class": "CORROSIVE", "supplier": "Brenntag", "sds_version": "Rev 3", "issue_date": "2025-06-01", "expiry_date": "2027-06-01", "is_controlled": false, "status": "ACTIVE", "days_to_expiry": 710, "expiry_rag": "OK", "special_handling": "Highly exothermic dissolution.", "ppe_required": "Safety goggles, chemical-resistant gloves", "storage_conditions": "Corrosives cabinet, away from acids", "disposal_method": "Neutralise and dispose via trade effluent" },
    { "sds_id": 5, "chemical_name": "Cadmium Cyanide Plating Solution", "common_name": "Cad Plating Bath (AMS 2400)", "un_number": "UN1891", "cas_number": "592-01-8", "hazard_class": "CONTROLLED", "supplier": "MacDermid Enthone", "sds_version": "Rev 8", "issue_date": "2025-02-01", "expiry_date": "2026-02-01", "is_controlled": true, "status": "ACTIVE", "days_to_expiry": -140, "expiry_rag": "OVERDUE", "special_handling": "CONTROLLED — Two-person rule. Acid MUST NOT contact.", "ppe_required": "Full face shield, cyanide antidote kit", "storage_conditions": "Locked secure cabinet", "disposal_method": "Licensed cyanide-destruction only" },
    { "sds_id": 6, "chemical_name": "Sodium Cyanide (Solid)", "common_name": "Gold/Silver Cyanide Bath Make-up", "un_number": "UN1689", "cas_number": "143-33-9", "hazard_class": "CONTROLLED", "supplier": "Cyanco", "sds_version": "Rev 7", "issue_date": "2025-04-01", "expiry_date": "2026-04-01", "is_controlled": true, "status": "ACTIVE", "days_to_expiry": -81, "expiry_rag": "OVERDUE", "special_handling": "CONTROLLED — Two-person rule. Acids PROHIBITED in same area.", "ppe_required": "Full face shield, SCBA, cyanide antidote kit", "storage_conditions": "Locked secure vault", "disposal_method": "Licensed cyanide-destruction. Regulatory notification required." },
    { "sds_id": 7, "chemical_name": "Phosphoric Acid (85%)", "common_name": "Phosphating Bath / Anodize Additive", "un_number": "UN1805", "cas_number": "7664-38-2", "hazard_class": "CORROSIVE", "supplier": "ICL Group", "sds_version": "Rev 2", "issue_date": "2025-05-01", "expiry_date": "2027-05-01", "is_controlled": false, "status": "ACTIVE", "days_to_expiry": 679, "expiry_rag": "OK", "special_handling": "Less aggressive than H2SO4.", "ppe_required": "Safety goggles, chemical-resistant gloves", "storage_conditions": "Corrosives cabinet, cool dry", "disposal_method": "Dilute and neutralise" },
    { "sds_id": 8, "chemical_name": "Nickel Sulphamate Solution", "common_name": "Electroless Nickel Bath", "un_number": "UN3077", "cas_number": "13770-89-3", "hazard_class": "ENVIRONMENTAL", "supplier": "Atotech", "sds_version": "Rev 5", "issue_date": "2024-12-01", "expiry_date": "2026-12-01", "is_controlled": false, "status": "ACTIVE", "days_to_expiry": 163, "expiry_rag": "OK", "special_handling": "Nickel sensitiser. Avoid skin contact.", "ppe_required": "Chemical-resistant gloves, safety goggles", "storage_conditions": "5–30°C", "disposal_method": "Nickel recovery / licensed contractor" },
    { "sds_id": 9, "chemical_name": "Silver Nitrate Solution (30%)", "common_name": "Silver Plating Bath", "un_number": "UN1493", "cas_number": "7761-88-8", "hazard_class": "OXIDIZER", "supplier": "Metalor Technologies", "sds_version": "Rev 3", "issue_date": "2025-01-01", "expiry_date": "2027-01-01", "is_controlled": false, "status": "ACTIVE", "days_to_expiry": 559, "expiry_rag": "OK", "special_handling": "Stains skin black. Keep from organics.", "ppe_required": "Safety goggles, chemical-resistant gloves", "storage_conditions": "Amber containers, away from light", "disposal_method": "Silver recovery via licensed contractor" },
    { "sds_id": 10, "chemical_name": "Ammonium Bifluoride", "common_name": "Titanium Etch / Surface Prep", "un_number": "UN2854", "cas_number": "1341-49-7", "hazard_class": "TOXIC", "supplier": "Solvay", "sds_version": "Rev 4", "issue_date": "2025-03-15", "expiry_date": "2027-03-15", "is_controlled": false, "status": "ACTIVE", "days_to_expiry": 633, "expiry_rag": "OK", "special_handling": "Fluoride burns are delayed. Calcium gluconate gel MUST be available.", "ppe_required": "Full face shield, heavy-duty gloves", "storage_conditions": "Locked fluoride store", "disposal_method": "Fluoride precipitation, licensed disposal" },
    { "sds_id": 11, "chemical_name": "Acetone", "common_name": "Degreaser / Parts Cleaning", "un_number": "UN1090", "cas_number": "67-64-1", "hazard_class": "FLAMMABLE", "supplier": "Shell Chemicals", "sds_version": "Rev 2", "issue_date": "2025-07-01", "expiry_date": "2027-07-01", "is_controlled": false, "status": "ACTIVE", "days_to_expiry": 740, "expiry_rag": "OK", "special_handling": "Highly flammable. No ignition sources.", "ppe_required": "Safety goggles, nitrile gloves", "storage_conditions": "Flammables cabinet", "disposal_method": "Licensed solvent waste contractor" },
    { "sds_id": 12, "chemical_name": "Hydrochloric Acid (30%)", "common_name": "Pickling / Acid Dip", "un_number": "UN1789", "cas_number": "7647-01-0", "hazard_class": "CORROSIVE", "supplier": "Brenntag", "sds_version": "Rev 3", "issue_date": "2025-08-01", "expiry_date": "2027-08-01", "is_controlled": false, "status": "ACTIVE", "days_to_expiry": 771, "expiry_rag": "OK", "special_handling": "Fuming — mandatory LEV. Reacts with cyanides → HCN.", "ppe_required": "Full face shield, chemical-resistant gloves, apron", "storage_conditions": "Ventilated cabinet. Separated from cyanides.", "disposal_method": "Neutralise with NaHCO3, trade effluent" }
  ],
  "/mod34/inventory": [
    { "inventory_id": 1, "sds_id": 1, "chemical_name": "Sulfuric Acid", "hazard_class": "CORROSIVE", "un_number": "UN1830", "is_controlled": false, "location": "BAY2 Chemical Store", "quantity": 45.0, "quantity_unit": "kg", "received_date": "2026-05-10", "expiry_date": "2028-05-10", "min_stock_kg": 20.0, "stock_rag": "OK", "inv_expiry_rag": "OK" },
    { "inventory_id": 2, "sds_id": 2, "chemical_name": "Nitric Acid (65%)", "hazard_class": "CORROSIVE", "un_number": "UN2031", "is_controlled": false, "location": "BAY3 Chemical Store", "quantity": 12.0, "quantity_unit": "L", "received_date": "2026-04-15", "expiry_date": "2028-04-15", "min_stock_kg": 5.0, "stock_rag": "OK", "inv_expiry_rag": "OK" },
    { "inventory_id": 3, "sds_id": 3, "chemical_name": "Chromic Acid", "hazard_class": "TOXIC", "un_number": "UN1463", "is_controlled": false, "location": "BAY4 Chrome Area", "quantity": 8.5, "quantity_unit": "kg", "received_date": "2026-03-01", "expiry_date": "2027-03-01", "min_stock_kg": 3.0, "stock_rag": "OK", "inv_expiry_rag": "OK" },
    { "inventory_id": 4, "sds_id": 4, "chemical_name": "Sodium Hydroxide", "hazard_class": "CORROSIVE", "un_number": "UN1824", "is_controlled": false, "location": "BAY2 Chemical Store", "quantity": 30.0, "quantity_unit": "kg", "received_date": "2026-05-20", "expiry_date": "2028-05-20", "min_stock_kg": 15.0, "stock_rag": "OK", "inv_expiry_rag": "OK" },
    { "inventory_id": 5, "sds_id": 5, "chemical_name": "Cadmium Cyanide Plating Solution", "hazard_class": "CONTROLLED", "un_number": "UN1891", "is_controlled": true, "location": "BAY4 Secure Cabinet", "quantity": 2.0, "quantity_unit": "L", "received_date": "2026-02-01", "expiry_date": "2026-12-01", "min_stock_kg": 1.0, "stock_rag": "OK", "inv_expiry_rag": "EXPIRING" },
    { "inventory_id": 6, "sds_id": 6, "chemical_name": "Sodium Cyanide (Solid)", "hazard_class": "CONTROLLED", "un_number": "UN1689", "is_controlled": true, "location": "Secure Vault", "quantity": 0.5, "quantity_unit": "kg", "received_date": "2026-04-01", "expiry_date": "2026-10-01", "min_stock_kg": 0.25, "stock_rag": "OK", "inv_expiry_rag": "EXPIRING" },
    { "inventory_id": 7, "sds_id": 7, "chemical_name": "Phosphoric Acid (85%)", "hazard_class": "CORROSIVE", "un_number": "UN1805", "is_controlled": false, "location": "BAY3 Chemical Store", "quantity": 20.0, "quantity_unit": "kg", "received_date": "2026-05-01", "expiry_date": "2028-05-01", "min_stock_kg": 8.0, "stock_rag": "OK", "inv_expiry_rag": "OK" },
    { "inventory_id": 8, "sds_id": 8, "chemical_name": "Nickel Sulphamate Solution", "hazard_class": "ENVIRONMENTAL", "un_number": "UN3077", "is_controlled": false, "location": "BAY2 EN Area", "quantity": 50.0, "quantity_unit": "L", "received_date": "2026-01-15", "expiry_date": "2027-01-15", "min_stock_kg": 20.0, "stock_rag": "OK", "inv_expiry_rag": "OK" },
    { "inventory_id": 9, "sds_id": 9, "chemical_name": "Silver Nitrate Solution", "hazard_class": "OXIDIZER", "un_number": "UN1493", "is_controlled": false, "location": "BAY4 Precious Metal Store", "quantity": 5.0, "quantity_unit": "L", "received_date": "2026-03-10", "expiry_date": "2028-03-10", "min_stock_kg": 2.0, "stock_rag": "OK", "inv_expiry_rag": "OK" },
    { "inventory_id": 10, "sds_id": 10, "chemical_name": "Ammonium Bifluoride", "hazard_class": "TOXIC", "un_number": "UN2854", "is_controlled": false, "location": "BAY5 Chemical Store", "quantity": 3.0, "quantity_unit": "kg", "received_date": "2026-02-20", "expiry_date": "2028-02-20", "min_stock_kg": 1.0, "stock_rag": "OK", "inv_expiry_rag": "OK" },
    { "inventory_id": 11, "sds_id": 11, "chemical_name": "Acetone", "hazard_class": "FLAMMABLE", "un_number": "UN1090", "is_controlled": false, "location": "Flammables Cabinet", "quantity": 18.0, "quantity_unit": "L", "received_date": "2026-06-01", "expiry_date": "2027-06-01", "min_stock_kg": 10.0, "stock_rag": "OK", "inv_expiry_rag": "OK" },
    { "inventory_id": 12, "sds_id": 12, "chemical_name": "Hydrochloric Acid (30%)", "hazard_class": "CORROSIVE", "un_number": "UN1789", "is_controlled": false, "location": "BAY3 Chemical Store", "quantity": 7.5, "quantity_unit": "L", "received_date": "2026-05-15", "expiry_date": "2028-05-15", "min_stock_kg": 8.0, "stock_rag": "LOW", "inv_expiry_rag": "OK" }
  ],
  "/mod34/formulas": [
    { "formula_id": 1, "bath_type_code": "HARD_ANODIZE", "process_area": "BAY2", "chemical_name": "Sulfuric Acid (98%)", "qty_per_1000L": 178.0, "unit": "kg", "concentration_target": "165–185 g/L", "add_sequence": 1, "safety_note": "Add acid to DI water slowly with cooling. Max 15°C.", "hazard_class": "CORROSIVE", "is_controlled": false },
    { "formula_id": 2, "bath_type_code": "EN", "process_area": "BAY2", "chemical_name": "Nickel Sulphamate Solution", "qty_per_1000L": 200.0, "unit": "L", "concentration_target": "5–6 g/L Ni", "add_sequence": 1, "safety_note": "Heat bath to 85°C before adding reducer.", "hazard_class": "ENVIRONMENTAL", "is_controlled": false },
    { "formula_id": 3, "bath_type_code": "CAD_PLATE", "process_area": "BAY4", "chemical_name": "Cadmium Cyanide Plating Solution", "qty_per_1000L": 120.0, "unit": "L", "concentration_target": "Per AMS 2400 §4.2", "add_sequence": 1, "safety_note": "TWO-PERSON RULE. No acids in bay during make-up.", "hazard_class": "CONTROLLED", "is_controlled": true },
    { "formula_id": 4, "bath_type_code": "CAD_PLATE", "process_area": "BAY4", "chemical_name": "Sodium Hydroxide", "qty_per_1000L": 20.0, "unit": "kg", "concentration_target": "75–90 g/L NaOH", "add_sequence": 2, "safety_note": "Add after cad solution, never before.", "hazard_class": "CORROSIVE", "is_controlled": false },
    { "formula_id": 5, "bath_type_code": "SILVER_PLATE", "process_area": "BAY4", "chemical_name": "Silver Nitrate Solution (30%)", "qty_per_1000L": 80.0, "unit": "L", "concentration_target": "30–40 g/L Ag", "add_sequence": 1, "safety_note": "Keep away from organics. Use amber container.", "hazard_class": "OXIDIZER", "is_controlled": false },
    { "formula_id": 6, "bath_type_code": "PHOSPHATE", "process_area": "BAY3", "chemical_name": "Phosphoric Acid (85%)", "qty_per_1000L": 35.0, "unit": "kg", "concentration_target": "30–40 g/L", "add_sequence": 1, "safety_note": "Add to water, stir well before heating.", "hazard_class": "CORROSIVE", "is_controlled": false },
    { "formula_id": 7, "bath_type_code": "PASSIVATION", "process_area": "BAY5", "chemical_name": "Nitric Acid (65%)", "qty_per_1000L": 22.0, "unit": "L", "concentration_target": "20–25% v/v", "add_sequence": 1, "safety_note": "Always add acid to water. Do not exceed 35°C.", "hazard_class": "CORROSIVE", "is_controlled": false }
  ],
  "/mod34/replenishment": [
    { "replenishment_id": 1, "replenishment_ref": "REP-0001", "bath_name": "H2SO4 Anodize #1", "bay_location": "BAY2", "trigger_type": "OUT_OF_SPEC", "param_name": "H2SO4 Concentration", "current_value": 158.0, "target_value": 175.0, "quantity_to_add": 3.2, "add_unit": "kg", "status": "PENDING", "initiated_at": "2026-06-20T08:30:00", "chemical_name": "Sulfuric Acid", "is_controlled": false, "hours_open": 4 },
    { "replenishment_id": 2, "replenishment_ref": "REP-0002", "bath_name": "EN Bath #1", "bay_location": "BAY2", "trigger_type": "SCHEDULED", "param_name": "Ni Concentration", "current_value": 4.2, "target_value": 5.5, "quantity_to_add": 18.0, "add_unit": "L", "status": "IN_PROGRESS", "initiated_at": "2026-06-20T07:00:00", "chemical_name": "Nickel Sulphamate Solution", "is_controlled": false, "hours_open": 5 },
    { "replenishment_id": 3, "replenishment_ref": "REP-0003", "bath_name": "Silver Plate Bath", "bay_location": "BAY4", "trigger_type": "LOW_STOCK", "param_name": "Silver Ion Concentration", "current_value": 28.0, "target_value": 35.0, "quantity_to_add": 2.5, "add_unit": "L", "status": "PENDING", "initiated_at": "2026-06-20T09:15:00", "chemical_name": "Silver Nitrate Solution (30%)", "is_controlled": false, "hours_open": 3 }
  ],
  "/mod34/escalation/rules": [
    { "rule_id": 1, "rule_name": "Bath Out-of-Spec — ALERT", "module_id": "mod06", "alert_field": "out_of_spec", "threshold_value": 0, "operator": "GT", "level": "ALERT", "notify_roles": "SUPERVISOR,ENGINEER", "escalation_delay_hours": 0, "is_active": true },
    { "rule_id": 2, "rule_name": "Bath Out-of-Spec — CRITICAL", "module_id": "mod06", "alert_field": "out_of_spec", "threshold_value": 3, "operator": "GT", "level": "CRITICAL", "notify_roles": "QA_MANAGER,ADMIN", "escalation_delay_hours": 1, "is_active": true },
    { "rule_id": 3, "rule_name": "Overdue Pyrometry TUS/SAT", "module_id": "mod30", "alert_field": "overdue_pyrometry", "threshold_value": 0, "operator": "GT", "level": "ALERT", "notify_roles": "ENGINEER,QA_MANAGER", "escalation_delay_hours": 0, "is_active": true },
    { "rule_id": 4, "rule_name": "TC Expiring Within 30 Days", "module_id": "mod30", "alert_field": "tc_expiring", "threshold_value": 0, "operator": "GT", "level": "WARNING", "notify_roles": "SUPERVISOR,ENGINEER", "escalation_delay_hours": 0, "is_active": true },
    { "rule_id": 5, "rule_name": "Open NCRs — ALERT", "module_id": "mod07", "alert_field": "open_ncr", "threshold_value": 10, "operator": "GT", "level": "ALERT", "notify_roles": "QA_MANAGER", "escalation_delay_hours": 24, "is_active": true },
    { "rule_id": 6, "rule_name": "Overdue CAPA — CRITICAL", "module_id": "mod07", "alert_field": "overdue_capa", "threshold_value": 0, "operator": "GT", "level": "CRITICAL", "notify_roles": "QA_MANAGER,ADMIN", "escalation_delay_hours": 0, "is_active": true },
    { "rule_id": 7, "rule_name": "Operator Competency Expiring", "module_id": "mod31", "alert_field": "expiring_90d", "threshold_value": 0, "operator": "GT", "level": "WARNING", "notify_roles": "SUPERVISOR,ENGINEER", "escalation_delay_hours": 0, "is_active": true },
    { "rule_id": 8, "rule_name": "SDS Expiring — WARNING", "module_id": "mod34", "alert_field": "sds_expiring_30d", "threshold_value": 0, "operator": "GT", "level": "WARNING", "notify_roles": "ENGINEER,QA_MANAGER", "escalation_delay_hours": 0, "is_active": true },
    { "rule_id": 9, "rule_name": "Equipment Calibration OOT", "module_id": "mod05", "alert_field": "cal_overdue", "threshold_value": 0, "operator": "GT", "level": "ALERT", "notify_roles": "SUPERVISOR,QA_MANAGER", "escalation_delay_hours": 0, "is_active": true },
    { "rule_id": 10, "rule_name": "ECN Overdue", "module_id": "mod33", "alert_field": "ecn_overdue", "threshold_value": 0, "operator": "GT", "level": "ALERT", "notify_roles": "QA_MANAGER", "escalation_delay_hours": 0, "is_active": true }
  ],
  "/mod34/escalation/log": [
    { "log_id": 1, "rule_id": 1, "rule_name": "Bath Out-of-Spec — ALERT", "module_id": "mod06", "rule_level": "ALERT", "triggered_at": "2026-06-20T08:35:00", "alert_value": 1, "level": "ALERT", "notified_roles": "SUPERVISOR,ENGINEER", "acknowledged_by": null, "acknowledged_at": null },
    { "log_id": 2, "rule_id": 6, "rule_name": "Overdue CAPA — CRITICAL", "module_id": "mod07", "rule_level": "CRITICAL", "triggered_at": "2026-06-20T06:00:00", "alert_value": 2, "level": "CRITICAL", "notified_roles": "QA_MANAGER,ADMIN", "acknowledged_by": null, "acknowledged_at": null },
    { "log_id": 3, "rule_id": 3, "rule_name": "Overdue Pyrometry TUS/SAT", "module_id": "mod30", "rule_level": "ALERT", "triggered_at": "2026-06-19T08:00:00", "alert_value": 1, "level": "ALERT", "notified_roles": "ENGINEER,QA_MANAGER", "acknowledged_by": 1, "acknowledged_at": "2026-06-19T09:30:00" }
  ],

  // ══ MOD-35 Regulatory Certification Renewal ══
  "/mod35/alerts/summary": { "total_certs": 12, "active_certs": 8, "expired_certs": 2, "renewal_in_progress": 2, "overdue_certs": 3, "due_soon_certs": 4, "total": 7 },
  "/mod35/bodies": { "items": [
    { "body_id":1, "body_name":"NADCAP / Performance Review Institute (PRI)", "body_type":"NADCAP",     "country":"USA",       "is_active":1 },
    { "body_id":2, "body_name":"Boeing Commercial Airplanes",                  "body_type":"CUSTOMER",   "country":"USA",       "is_active":1 },
    { "body_id":3, "body_name":"Airbus SAS",                                   "body_type":"CUSTOMER",   "country":"France",    "is_active":1 },
    { "body_id":4, "body_name":"Pratt & Whitney (RTX)",                        "body_type":"CUSTOMER",   "country":"USA",       "is_active":1 },
    { "body_id":5, "body_name":"Rolls-Royce plc",                              "body_type":"CUSTOMER",   "country":"UK",        "is_active":1 },
    { "body_id":6, "body_name":"Ministry of Manpower Singapore (MOM)",         "body_type":"GOVERNMENT", "country":"Singapore", "is_active":1 },
    { "body_id":7, "body_name":"Workplace Safety & Health Council (WSHC)",     "body_type":"GOVERNMENT", "country":"Singapore", "is_active":1 },
    { "body_id":8, "body_name":"Bureau Veritas Certification",                  "body_type":"ISO_BODY",   "country":"France",    "is_active":1 },
    { "body_id":9, "body_name":"Civil Aviation Authority of Singapore (CAAS)", "body_type":"GOVERNMENT", "country":"Singapore", "is_active":1 }
  ], "total": 9 },
  "/mod35/certs": { "items": [
    { "cert_id":3,  "cert_name":"NADCAP Non-Destructive Testing Accreditation",  "cert_number":"NADCAP-NDT-2024-SG042", "body_name":"NADCAP / PRI", "body_type":"NADCAP",    "cert_type":"ACCREDITATION", "expiry_date":"2026-04-01", "renewal_lead_days":90,  "status":"RENEWAL_IN_PROGRESS", "days_to_expiry":-81,  "expiry_rag":"OVERDUE",   "scope":"FPI, MPI, RT/X-Ray — NAS410 Level II/III",        "cert_doc_ref":"CERT/NADCAP/NDT/2024" },
    { "cert_id":4,  "cert_name":"Boeing D6-82479 Approved Processor",            "cert_number":"D6-82479-ATC-2024",     "body_name":"Boeing",       "body_type":"CUSTOMER",  "cert_type":"APPROVAL",       "expiry_date":"2026-03-01", "renewal_lead_days":60,  "status":"EXPIRED",             "days_to_expiry":-112, "expiry_rag":"OVERDUE",   "scope":"Cadmium plating, anodize Type II, chemical film",  "cert_doc_ref":"CERT/CUST/BOEING/2024" },
    { "cert_id":7,  "cert_name":"Rolls-Royce Approved Special Processor",        "cert_number":"RR-APSP-2024-ATC",      "body_name":"Rolls-Royce",  "body_type":"CUSTOMER",  "cert_type":"APPROVAL",       "expiry_date":"2025-11-01", "renewal_lead_days":60,  "status":"EXPIRED",             "days_to_expiry":-232, "expiry_rag":"OVERDUE",   "scope":"FPI, MPI, passivation — Trent XWB",               "cert_doc_ref":"CERT/CUST/RR/2024" },
    { "cert_id":1,  "cert_name":"NADCAP Heat Treatment Accreditation",           "cert_number":"NADCAP-HT-2025-SG042",  "body_name":"NADCAP / PRI", "body_type":"NADCAP",    "cert_type":"ACCREDITATION", "expiry_date":"2026-07-01", "renewal_lead_days":90,  "status":"RENEWAL_IN_PROGRESS", "days_to_expiry":10,   "expiry_rag":"DUE_SOON", "scope":"AMS 2750H pyrometry, vacuum HT, precipitation HT", "cert_doc_ref":"CERT/NADCAP/HT/2025" },
    { "cert_id":2,  "cert_name":"NADCAP Chemical Processing Accreditation",      "cert_number":"NADCAP-CP-2025-SG042",  "body_name":"NADCAP / PRI", "body_type":"NADCAP",    "cert_type":"ACCREDITATION", "expiry_date":"2026-09-15", "renewal_lead_days":90,  "status":"ACTIVE",              "days_to_expiry":86,   "expiry_rag":"DUE_SOON", "scope":"Anodize I/II/III, cadmium/silver/nickel plating",  "cert_doc_ref":"CERT/NADCAP/CP/2025" },
    { "cert_id":5,  "cert_name":"Airbus AIMS 04-00-002 Process Approval",        "cert_number":"AIMS-ATC-SG-2025",      "body_name":"Airbus SAS",   "body_type":"CUSTOMER",  "cert_type":"APPROVAL",       "expiry_date":"2026-07-15", "renewal_lead_days":60,  "status":"ACTIVE",              "days_to_expiry":24,   "expiry_rag":"DUE_SOON", "scope":"Anodise, electroless nickel, passivation — A320",  "cert_doc_ref":"CERT/CUST/AIRBUS/2025" },
    { "cert_id":10, "cert_name":"CAAS Approved Maintenance Organisation (AMO)",  "cert_number":"CAAS-AMO-2025-1234",    "body_name":"CAAS",         "body_type":"GOVERNMENT","cert_type":"APPROVAL",       "expiry_date":"2026-08-01", "renewal_lead_days":90,  "status":"ACTIVE",              "days_to_expiry":41,   "expiry_rag":"DUE_SOON", "scope":"Component maintenance — NDT and surface treatment", "cert_doc_ref":"CERT/GOVT/CAAS/2025" },
    { "cert_id":6,  "cert_name":"Pratt & Whitney Special Process Approval",      "cert_number":"PW-PROC-ATC-2025",      "body_name":"P&W",          "body_type":"CUSTOMER",  "cert_type":"APPROVAL",       "expiry_date":"2027-04-01", "renewal_lead_days":60,  "status":"ACTIVE",              "days_to_expiry":649,  "expiry_rag":"OK",       "scope":"Shot peen, anodize, plating — PW1100G",            "cert_doc_ref":"CERT/CUST/PW/2025" },
    { "cert_id":8,  "cert_name":"MOM Factory Registration — Chemical Works",     "cert_number":"MOM-FR-2025-12345",     "body_name":"MOM Singapore","body_type":"GOVERNMENT","cert_type":"LICENSE",         "expiry_date":"2026-12-31", "renewal_lead_days":60,  "status":"ACTIVE",              "days_to_expiry":193,  "expiry_rag":"OK",       "scope":"Factory registration — Bays 2–5",                  "cert_doc_ref":"CERT/GOVT/MOM/FR/2025" },
    { "cert_id":9,  "cert_name":"WSHC Workplace Safety Certificate",             "cert_number":"WSHC-WSC-2025-ATC",     "body_name":"WSHC",         "body_type":"GOVERNMENT","cert_type":"QUALIFICATION",   "expiry_date":"2027-03-01", "renewal_lead_days":90,  "status":"ACTIVE",              "days_to_expiry":618,  "expiry_rag":"OK",       "scope":"Workplace safety management system — all bays",    "cert_doc_ref":"CERT/GOVT/WSHC/2025" },
    { "cert_id":11, "cert_name":"AS9100D Rev D Quality Management System",       "cert_number":"BV-AS9100D-2024-SG042", "body_name":"Bureau Veritas","body_type":"ISO_BODY",  "cert_type":"REGISTRATION",   "expiry_date":"2027-05-01", "renewal_lead_days":120, "status":"ACTIVE",              "days_to_expiry":679,  "expiry_rag":"OK",       "scope":"Full QMS — NDT, special processes, heat treatment", "cert_doc_ref":"CERT/ISO/AS9100D/2024" },
    { "cert_id":12, "cert_name":"ISO 9001:2015 Certification",                   "cert_number":"BV-ISO9001-2024-SG042", "body_name":"Bureau Veritas","body_type":"ISO_BODY",  "cert_type":"REGISTRATION",   "expiry_date":"2027-05-01", "renewal_lead_days":120, "status":"ACTIVE",              "days_to_expiry":679,  "expiry_rag":"OK",       "scope":"Quality management — commercial ops",               "cert_doc_ref":"CERT/ISO/9001/2024" }
  ], "total": 12 },
  "/mod35/renewal-actions": { "items": [
    { "action_id":8, "cert_id":10, "cert_name":"CAAS AMO",                           "body_name":"CAAS",        "action_type":"INITIATE",          "action_date":"2026-06-10T08:00:00","due_date":"2026-07-10","performed_by":"Gary Tan Beng Huat",  "notes":"CAAS AMO renewal initiated; expiry 2026-08-01 (41 days)","status":"OPEN" },
    { "action_id":7, "cert_id":4,  "cert_name":"Boeing D6-82479 Approved Processor", "body_name":"Boeing",      "action_type":"ESCALATE",          "action_date":"2026-04-15T09:00:00","due_date":"2026-05-15","performed_by":"James Tan Wei Liang", "notes":"ESCALATED — Boeing approval expired 2026-03-01. All D6-82479 jobs on hold.","status":"OPEN" },
    { "action_id":5, "cert_id":1,  "cert_name":"NADCAP Heat Treatment",              "body_name":"NADCAP / PRI","action_type":"SUBMIT_APPLICATION","action_date":"2026-06-01T10:00:00","due_date":"2026-06-20","performed_by":"James Tan Wei Liang", "notes":"Application submitted via eAuditNet; awaiting audit date","status":"OPEN" },
    { "action_id":3, "cert_id":3,  "cert_name":"NADCAP NDT Accreditation",           "body_name":"NADCAP / PRI","action_type":"AUDIT_SCHEDULED",   "action_date":"2026-05-22T14:00:00","due_date":"2026-07-20","performed_by":"James Tan Wei Liang", "notes":"PRI audit scheduled for 2026-07-20","status":"OPEN" },
    { "action_id":4, "cert_id":1,  "cert_name":"NADCAP Heat Treatment",              "body_name":"NADCAP / PRI","action_type":"INITIATE",          "action_date":"2026-05-15T09:00:00","due_date":"2026-06-15","performed_by":"James Tan Wei Liang", "notes":"HT NADCAP renewal initiated — expiry 2026-07-01","status":"COMPLETED" },
    { "action_id":2, "cert_id":3,  "cert_name":"NADCAP NDT Accreditation",           "body_name":"NADCAP / PRI","action_type":"SUBMIT_APPLICATION","action_date":"2026-04-18T10:00:00","due_date":"2026-05-15","performed_by":"James Tan Wei Liang", "notes":"Application submitted via eAuditNet ref #PRE-SG042-NDT-2026","status":"COMPLETED" },
    { "action_id":1, "cert_id":3,  "cert_name":"NADCAP NDT Accreditation",           "body_name":"NADCAP / PRI","action_type":"INITIATE",          "action_date":"2026-04-05T08:30:00","due_date":"2026-05-01","performed_by":"James Tan Wei Liang", "notes":"NDT NADCAP renewal initiated — audit interval expired","status":"COMPLETED" }
  ], "total": 7 },

  // ══ MOD-36 Equipment Periodic Preventive Maintenance ══
  "/mod36/alerts/summary": { "total_assets": 15, "overdue_pm": 4, "due_soon_pm": 3, "under_maintenance": 1, "pm_completed_this_month": 6, "total_schedules": 12, "total": 7 },
  "/mod36/assets": { "items": [
    { "asset_id":1,  "asset_tag":"EQ-OVEN-004", "asset_name":"Drying Oven 4 — Al/Carbon Fibre",            "asset_category":"OVEN",         "location":"Bay 2 Production","manufacturer":"Despatch Industries","install_date":"2018-03-01","status":"OPERATIONAL",       "schedule_count":1,"last_pm_date":"2026-06-17" },
    { "asset_id":2,  "asset_tag":"EQ-OVEN-008", "asset_name":"Baking & Heat Treatment Oven 8",             "asset_category":"OVEN",         "location":"Bay 3 Production","manufacturer":"Grieve Corporation", "install_date":"2016-06-15","status":"OPERATIONAL",       "schedule_count":1,"last_pm_date":"2026-05-15" },
    { "asset_id":3,  "asset_tag":"EQ-OVEN-009", "asset_name":"Baking & Heat Treatment Oven 9",             "asset_category":"OVEN",         "location":"Bay 3 Production","manufacturer":"Grieve Corporation", "install_date":"2016-06-15","status":"OPERATIONAL",       "schedule_count":0,"last_pm_date":null },
    { "asset_id":4,  "asset_tag":"EQ-OVEN-016", "asset_name":"Muffle Furnace 16 — High-Temp",              "asset_category":"OVEN",         "location":"Bay 4 Production","manufacturer":"Carbolite Gero",     "install_date":"2019-09-01","status":"UNDER_MAINTENANCE", "schedule_count":1,"last_pm_date":null },
    { "asset_id":5,  "asset_tag":"EQ-TANK-CAD1","asset_name":"Cadmium Cyanide Plating Tank #1",            "asset_category":"TANK",         "location":"Bay 2 Plating",   "manufacturer":"ATCA In-house",      "install_date":"2015-01-01","status":"OPERATIONAL",       "schedule_count":1,"last_pm_date":null },
    { "asset_id":6,  "asset_tag":"EQ-TANK-ANO1","asset_name":"Type II Sulfuric Acid Anodizing Tank",       "asset_category":"TANK",         "location":"Bay 5 Anodize",   "manufacturer":"Technic Inc",         "install_date":"2017-04-01","status":"OPERATIONAL",       "schedule_count":1,"last_pm_date":null },
    { "asset_id":7,  "asset_tag":"EQ-TANK-EN1", "asset_name":"Electroless Nickel Plating Tank",            "asset_category":"TANK",         "location":"Bay 2 Plating",   "manufacturer":"MacDermid Enthone",   "install_date":"2018-08-01","status":"OPERATIONAL",       "schedule_count":0,"last_pm_date":null },
    { "asset_id":8,  "asset_tag":"EQ-FPI-001",  "asset_name":"FPI Fluorescent Penetrant Inspection Unit", "asset_category":"NDT_EQUIPMENT","location":"NDT Bay FPI",     "manufacturer":"Magnaflux",           "install_date":"2019-02-01","status":"OPERATIONAL",       "schedule_count":1,"last_pm_date":"2026-03-01" },
    { "asset_id":9,  "asset_tag":"EQ-MPI-001",  "asset_name":"MPI Wet Fluorescent Bench Unit",            "asset_category":"NDT_EQUIPMENT","location":"NDT Bay MPI",     "manufacturer":"Magnaflux",           "install_date":"2019-02-01","status":"OPERATIONAL",       "schedule_count":1,"last_pm_date":null },
    { "asset_id":10, "asset_tag":"EQ-COMP-001", "asset_name":"Air Compressor #1 — Atlas Copco",           "asset_category":"COMPRESSOR",   "location":"Compressor Room", "manufacturer":"Atlas Copco",         "install_date":"2017-11-01","status":"OPERATIONAL",       "schedule_count":1,"last_pm_date":"2026-05-05" },
    { "asset_id":11, "asset_tag":"EQ-COMP-002", "asset_name":"Air Compressor #2 (Standby)",               "asset_category":"COMPRESSOR",   "location":"Compressor Room", "manufacturer":"Atlas Copco",         "install_date":"2017-11-01","status":"OPERATIONAL",       "schedule_count":1,"last_pm_date":"2026-06-10" },
    { "asset_id":12, "asset_tag":"EQ-RECT-001", "asset_name":"Plating Rectifier #1 — Anodize Line",       "asset_category":"RECTIFIER",    "location":"Bay 5 Anodize",   "manufacturer":"Dynacraft",           "install_date":"2016-05-01","status":"OPERATIONAL",       "schedule_count":1,"last_pm_date":"2026-03-10" },
    { "asset_id":13, "asset_tag":"EQ-RECT-002", "asset_name":"Plating Rectifier #2 — Cadmium/Zinc Line",  "asset_category":"RECTIFIER",    "location":"Bay 2 Plating",   "manufacturer":"Dynacraft",           "install_date":"2018-01-01","status":"OPERATIONAL",       "schedule_count":0,"last_pm_date":null },
    { "asset_id":14, "asset_tag":"EQ-HVAC-001", "asset_name":"Chemical Fume Extraction Unit — Bays 2–3",  "asset_category":"HVAC",         "location":"Roof / Bays 2–3", "manufacturer":"Fantech",             "install_date":"2016-03-01","status":"OPERATIONAL",       "schedule_count":1,"last_pm_date":null },
    { "asset_id":15, "asset_tag":"EQ-INST-001", "asset_name":"Portable pH Meter & Probe Set",             "asset_category":"INSTRUMENT",   "location":"Bath Lab",        "manufacturer":"Mettler-Toledo",      "install_date":"2021-07-01","status":"OPERATIONAL",       "schedule_count":1,"last_pm_date":null }
  ], "total": 15 },
  "/mod36/schedules": { "items": [
    { "schedule_id":1,  "asset_id":4,  "asset_tag":"EQ-OVEN-016", "asset_name":"Muffle Furnace 16",        "asset_category":"OVEN",         "location":"Bay 4 Production","asset_status":"UNDER_MAINTENANCE","schedule_name":"Muffle Furnace 16 Monthly Safety Inspection",       "frequency":"MONTHLY",   "last_done_date":"2026-05-01","next_due_date":"2026-06-01","days_until_due":-20,"estimated_hours":2.0,"assigned_role":"ENGINEER",  "pm_rag":"OVERDUE" },
    { "schedule_id":2,  "asset_id":5,  "asset_tag":"EQ-TANK-CAD1","asset_name":"Cadmium Tank #1",          "asset_category":"TANK",         "location":"Bay 2 Plating",   "asset_status":"OPERATIONAL",      "schedule_name":"Cadmium Tank #1 Weekly Chemistry & Safety Check",   "frequency":"WEEKLY",    "last_done_date":"2026-06-07","next_due_date":"2026-06-14","days_until_due":-7, "estimated_hours":0.5,"assigned_role":"SUPERVISOR","pm_rag":"OVERDUE" },
    { "schedule_id":3,  "asset_id":10, "asset_tag":"EQ-COMP-001", "asset_name":"Air Compressor #1",        "asset_category":"COMPRESSOR",   "location":"Compressor Room", "asset_status":"OPERATIONAL",      "schedule_name":"Air Compressor #1 Monthly Service",                  "frequency":"MONTHLY",   "last_done_date":"2026-05-05","next_due_date":"2026-06-05","days_until_due":-16,"estimated_hours":1.5,"assigned_role":"SUPERVISOR","pm_rag":"OVERDUE" },
    { "schedule_id":4,  "asset_id":12, "asset_tag":"EQ-RECT-001", "asset_name":"Plating Rectifier #1",     "asset_category":"RECTIFIER",    "location":"Bay 5 Anodize",   "asset_status":"OPERATIONAL",      "schedule_name":"Plating Rectifier #1 Quarterly Service",             "frequency":"QUARTERLY", "last_done_date":"2026-03-10","next_due_date":"2026-06-10","days_until_due":-11,"estimated_hours":3.0,"assigned_role":"ENGINEER",  "pm_rag":"OVERDUE" },
    { "schedule_id":5,  "asset_id":1,  "asset_tag":"EQ-OVEN-004", "asset_name":"Drying Oven 4",            "asset_category":"OVEN",         "location":"Bay 2 Production","asset_status":"OPERATIONAL",      "schedule_name":"Drying Oven 4 Weekly Temperature Uniformity Check",  "frequency":"WEEKLY",    "last_done_date":"2026-06-17","next_due_date":"2026-06-24","days_until_due":3,  "estimated_hours":0.5,"assigned_role":"SUPERVISOR","pm_rag":"DUE_SOON" },
    { "schedule_id":6,  "asset_id":9,  "asset_tag":"EQ-MPI-001",  "asset_name":"MPI Bench Unit",           "asset_category":"NDT_EQUIPMENT","location":"NDT Bay MPI",     "asset_status":"OPERATIONAL",      "schedule_name":"MPI Bench Monthly Service & Field-Strength Check",   "frequency":"MONTHLY",   "last_done_date":"2026-05-25","next_due_date":"2026-06-25","days_until_due":4,  "estimated_hours":1.5,"assigned_role":"ENGINEER",  "pm_rag":"DUE_SOON" },
    { "schedule_id":7,  "asset_id":14, "asset_tag":"EQ-HVAC-001", "asset_name":"Fume Extraction Unit",     "asset_category":"HVAC",         "location":"Roof / Bays 2–3", "asset_status":"OPERATIONAL",      "schedule_name":"Fume Extraction Unit Monthly Airflow Check",         "frequency":"MONTHLY",   "last_done_date":"2026-05-26","next_due_date":"2026-06-26","days_until_due":5,  "estimated_hours":1.0,"assigned_role":"SUPERVISOR","pm_rag":"DUE_SOON" },
    { "schedule_id":8,  "asset_id":2,  "asset_tag":"EQ-OVEN-008", "asset_name":"Baking Oven 8",            "asset_category":"OVEN",         "location":"Bay 3 Production","asset_status":"OPERATIONAL",      "schedule_name":"Oven 8 Quarterly Full PM Service",                   "frequency":"QUARTERLY", "last_done_date":"2026-05-15","next_due_date":"2026-08-15","days_until_due":55, "estimated_hours":4.0,"assigned_role":"ENGINEER",  "pm_rag":"OK" },
    { "schedule_id":9,  "asset_id":8,  "asset_tag":"EQ-FPI-001",  "asset_name":"FPI Inspection Unit",      "asset_category":"NDT_EQUIPMENT","location":"NDT Bay FPI",     "asset_status":"OPERATIONAL",      "schedule_name":"FPI Unit Annual Full Service",                       "frequency":"ANNUAL",    "last_done_date":"2025-12-01","next_due_date":"2026-12-01","days_until_due":163,"estimated_hours":6.0,"assigned_role":"ENGINEER",  "pm_rag":"OK" },
    { "schedule_id":10, "asset_id":6,  "asset_tag":"EQ-TANK-ANO1","asset_name":"Anodizing Tank #1",        "asset_category":"TANK",         "location":"Bay 5 Anodize",   "asset_status":"OPERATIONAL",      "schedule_name":"Anodizing Tank Annual Deep Clean & Inspection",       "frequency":"ANNUAL",    "last_done_date":"2025-09-01","next_due_date":"2026-09-01","days_until_due":72, "estimated_hours":8.0,"assigned_role":"ENGINEER",  "pm_rag":"OK" },
    { "schedule_id":11, "asset_id":11, "asset_tag":"EQ-COMP-002", "asset_name":"Air Compressor #2",        "asset_category":"COMPRESSOR",   "location":"Compressor Room", "asset_status":"OPERATIONAL",      "schedule_name":"Air Compressor #2 Monthly Service",                  "frequency":"MONTHLY",   "last_done_date":"2026-06-10","next_due_date":"2026-07-10","days_until_due":19, "estimated_hours":1.5,"assigned_role":"SUPERVISOR","pm_rag":"OK" },
    { "schedule_id":12, "asset_id":15, "asset_tag":"EQ-INST-001", "asset_name":"pH Meter",                 "asset_category":"INSTRUMENT",   "location":"Bath Lab",        "asset_status":"OPERATIONAL",      "schedule_name":"pH Meter Annual Calibration & Probe Replacement",    "frequency":"ANNUAL",    "last_done_date":"2025-11-01","next_due_date":"2026-11-01","days_until_due":133,"estimated_hours":0.5,"assigned_role":"SUPERVISOR","pm_rag":"OK" }
  ], "total": 12 },
  "/mod36/log": { "items": [
    { "log_id":1,"schedule_id":5, "asset_id":1,  "asset_tag":"EQ-OVEN-004","asset_name":"Drying Oven 4",        "asset_category":"OVEN",        "schedule_name":"Oven 4 Weekly Temp Check","frequency":"WEEKLY",   "performed_date":"2026-06-17","performed_by":"Ahmad Bin Rashid",     "duration_hours":0.5,"status":"COMPLETED","findings":"All 3 TC positions within ±3°C. No anomalies.","corrective_action":null },
    { "log_id":3,"schedule_id":11,"asset_id":11, "asset_tag":"EQ-COMP-002","asset_name":"Air Compressor #2",    "asset_category":"COMPRESSOR",  "schedule_name":"Compressor #2 Monthly",  "frequency":"MONTHLY",  "performed_date":"2026-06-10","performed_by":"Ahmad Bin Rashid",     "duration_hours":1.5,"status":"COMPLETED","findings":"All checks passed. Oil filter replaced.","corrective_action":null },
    { "log_id":5,"schedule_id":3, "asset_id":10, "asset_tag":"EQ-COMP-001","asset_name":"Air Compressor #1",    "asset_category":"COMPRESSOR",  "schedule_name":"Compressor #1 Monthly",  "frequency":"MONTHLY",  "performed_date":"2026-05-05","performed_by":"Ahmad Bin Rashid",     "duration_hours":1.5,"status":"COMPLETED","findings":"All checks passed. Belt tension nominal.","corrective_action":null },
    { "log_id":2,"schedule_id":8, "asset_id":2,  "asset_tag":"EQ-OVEN-008","asset_name":"Baking & HT Oven 8",   "asset_category":"OVEN",        "schedule_name":"Oven 8 Quarterly PM",    "frequency":"QUARTERLY","performed_date":"2026-05-15","performed_by":"James Tan Wei Liang", "duration_hours":3.5,"status":"COMPLETED","findings":"Door seal slightly worn — flagged for next service.","corrective_action":"Monitor seal; replace at next quarterly PM." },
    { "log_id":4,"schedule_id":9, "asset_id":8,  "asset_tag":"EQ-FPI-001", "asset_name":"FPI Inspection Unit",  "asset_category":"NDT_EQUIPMENT","schedule_name":"FPI Annual Service",     "frequency":"ANNUAL",   "performed_date":"2026-03-01","performed_by":"Hendrich Lim Jun Wei","duration_hours":5.0,"status":"COMPLETED","findings":"UV lamps replaced (hrs: 2840). FPI fully operational.","corrective_action":"UV lamps replaced as scheduled." },
    { "log_id":6,"schedule_id":4, "asset_id":12, "asset_tag":"EQ-RECT-001","asset_name":"Plating Rectifier #1", "asset_category":"RECTIFIER",   "schedule_name":"Rectifier #1 Quarterly","frequency":"QUARTERLY","performed_date":"2026-03-10","performed_by":"James Tan Wei Liang", "duration_hours":2.8,"status":"COMPLETED","findings":"Capacitor bank 8% below nominal.","corrective_action":"Capacitor bank flagged for replacement at annual service." }
  ], "total": 6 }
};
