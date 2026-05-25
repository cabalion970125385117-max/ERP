"""
ATCA-ERP Static Preview Server (Python 3)
Serves frontend files + stub API responses — no Node.js or SQL Server needed.
Usage: python preview_server.py
"""

import json
import os
from http.server import HTTPServer, SimpleHTTPRequestHandler
from urllib.parse import urlparse, parse_qs

FRONTEND_DIR = os.path.join(os.path.dirname(__file__), "src", "frontend")
PORT = 3000

# ── Stub API data ────────────────────────────────────────────
STUBS = {
    "GET /api/v1/auth/me": {
        "user_id": 1, "username": "admin", "role": "QA_MANAGER",
        "full_name": "James Tan Wei Liang", "employee_id": "ATCA-001", "personnel_id": 1
    },
    "POST /api/v1/auth/session-extend": {"message": "Session extended."},
    "POST /api/v1/auth/logout": {"message": "Logged out."},
    "GET /api/v1/alerts/summary": {"total": 3},
    "GET /api/v1/mod04/alerts/summary": {
        "certs_expiring_90d": 2, "expired_certs": 1,
        "eye_expiring_60d": 1,   "expired_eye_exams": 0
    },
    "GET /api/v1/mod05/alerts/summary": {
        "cal_overdue": 1, "cal_due_30d": 3, "never_calibrated": 0, "total": 4
    },
    "GET /api/v1/mod07/alerts/summary": {
        "open_ncr": 2, "overdue_capa": 1, "pending_verify": 1, "ncr_open_only": 2, "total": 4
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
        {"ncr_id":1,"ncr_ref":"NCR-2025-001","ncr_type":"PROCESS","process_area":"FPI","description":"Bath concentration found out of spec during periodic check","detected_date":"2025-05-10","severity":"MJ","source":"INTERNAL_AUDIT","status":"OPEN","raised_by_name":"James Tan Wei Liang","raised_date":"2025-05-10","target_close_date":"2025-06-10","days_open":15,"disposition":None,"open_capa_count":0,"capa_required":True},
        {"ncr_id":2,"ncr_ref":"NCR-2025-002","ncr_type":"PROCESS","process_area":"FPI","description":"UV lamp intensity reading below 1000 µW/cm² minimum requirement","detected_date":"2025-04-20","severity":"MN","source":"PROCESS_CHECK","status":"CAPA_IN_PROGRESS","raised_by_name":"Hendrich Lim Jun Wei","raised_date":"2025-04-20","target_close_date":"2025-05-20","days_open":35,"disposition":"REWORK","open_capa_count":1,"capa_required":True},
    ], "total": 2},
    "GET /api/v1/mod07/capa": {"items": [
        {"capa_id":1,"capa_ref":"CAPA-2025-001","capa_type":"CORRECTIVE","ncr_id":2,"ncr_ref":"NCR-2025-002","root_cause_method":"5WHY","root_cause_description":"UV lamp bulb past service interval; no PM schedule in place","corrective_action":"Replace bulb; add PM schedule","preventive_action":"Add UV lamp to monthly PM checklist","status":"IN_PROGRESS","owner_name":"Hendrich Lim Jun Wei","assigned_to_name":"Hendrich Lim Jun Wei","target_completion_date":"2025-05-20","target_date":"2025-05-20","effectiveness_result":None,"verified_by_name":None,"closed_date":None,"days_overdue":5},
    ], "total": 1},
    "GET /api/v1/mod06/alerts/summary": {
        "baths_out_of_spec": 1, "tests_overdue": 2, "tests_due_today": 3, "never_tested": 0, "total": 3
    },
    "GET /api/v1/mod06/baths": {"items": [
        {"bath_id":1,"bath_code":"FPI-PT-001","bath_name":"Penetrant Tank #1","bath_type":"PT_PENETRANT","process_area":"FPI","chemical_product":"Magnaflux ZL-60D","spec_ref":"ASTM E1417","concentration_min":None,"concentration_max":None,"temp_min_c":16,"temp_max_c":52,"current_temp_c":22,"last_test_date":"2025-05-20","next_test_due":"2025-05-27","status":"IN_SPEC","active":True},
        {"bath_id":2,"bath_code":"FPI-EM-001","bath_name":"Emulsifier Tank #1","bath_type":"PT_EMULSIFIER","process_area":"FPI","chemical_product":"Magnaflux ZR-10B","spec_ref":"ASTM E1417","concentration_min":5,"concentration_max":35,"temp_min_c":16,"temp_max_c":52,"current_temp_c":21,"last_test_date":"2025-05-18","next_test_due":"2025-05-25","status":"OUT_OF_SPEC","active":True},
        {"bath_id":3,"bath_code":"FPI-DV-001","bath_name":"Developer Tank #1","bath_type":"PT_DEVELOPER","process_area":"FPI","chemical_product":"Magnaflux ZP-4B","spec_ref":"ASTM E1417","concentration_min":10,"concentration_max":30,"temp_min_c":16,"temp_max_c":52,"current_temp_c":20,"last_test_date":"2025-05-15","next_test_due":"2025-05-22","status":"IN_SPEC","active":True},
        {"bath_id":4,"bath_code":"MPT-WF-001","bath_name":"Wet Fluorescent Bath","bath_type":"MT_WET_FLUORESCENT","process_area":"MPT","chemical_product":"Magnaflux 14HF","spec_ref":"ASTM E1444 / AMS 2641","concentration_min":0.1,"concentration_max":0.4,"temp_min_c":10,"temp_max_c":40,"current_temp_c":19,"last_test_date":"2025-05-19","next_test_due":"2025-05-26","status":"IN_SPEC","active":True},
    ], "total": 4},
    "GET /api/v1/mod06/logs": {"items": [
        {"log_id":1,"bath_id":2,"bath_code":"FPI-EM-001","bath_name":"Emulsifier Tank #1","test_date":"2025-05-18","tested_by_name":"James Tan Wei Liang","temp_c":21,"concentration_pct":38,"fluorescent_brightness":None,"contamination_check":"PASS","result":"FAIL","notes":"Concentration 38% exceeds max 35% — bath flagged OUT_OF_SPEC","ncr_raised":True,"ncr_ref":"NCR-2025-001"},
        {"log_id":2,"bath_id":4,"bath_code":"MPT-WF-001","bath_name":"Wet Fluorescent Bath","test_date":"2025-05-19","tested_by_name":"Hendrich Lim Jun Wei","temp_c":19,"concentration_pct":0.22,"fluorescent_brightness":"ACCEPTABLE","contamination_check":"PASS","result":"PASS","notes":"All readings within spec","ncr_raised":False,"ncr_ref":None},
        {"log_id":3,"bath_id":1,"bath_code":"FPI-PT-001","bath_name":"Penetrant Tank #1","test_date":"2025-05-20","tested_by_name":"James Tan Wei Liang","temp_c":22,"concentration_pct":None,"fluorescent_brightness":"ACCEPTABLE","contamination_check":"PASS","result":"PASS","notes":"Daily check — all OK","ncr_raised":False,"ncr_ref":None},
    ], "total": 3},
}


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

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS")
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
                    "username": "admin", "role": "QA_MANAGER",
                    "full_name": "James Tan Wei Liang"
                })
            return self.send_json(401, {"message": "Preview mode — use: admin / preview123"})

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

        # 404 for unknown API routes
        if path.startswith("/api/"):
            return self.send_json(404, {"message": "Not found."})

        # Static assets (CSS, JS, fonts, module HTML)
        super().do_GET()

    def serve_file(self, filename):
        filepath = os.path.join(FRONTEND_DIR, filename)
        if not os.path.exists(filepath):
            self.send_json(404, {"message": f"{filename} not found"})
            return
        with open(filepath, "rb") as f:
            content = f.read()
        self.send_response(200)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", len(content))
        self.end_headers()
        self.wfile.write(content)


if __name__ == "__main__":
    server = HTTPServer(("0.0.0.0", PORT), ATCAHandler)
    print(f"[ATCA-ERP Preview]  http://localhost:{PORT}/login")
    print(f"  Credentials: admin / preview123")
    print(f"  Ctrl+C to stop")
    server.serve_forever()
