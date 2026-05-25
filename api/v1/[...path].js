'use strict';
/**
 * ATCA-ERP — Vercel Serverless Stub API
 * Handles all /api/v1/* requests and returns preview stub data.
 * No database required — for demo/preview deployment only.
 */

const STUBS = {
  // ── Auth ──────────────────────────────────────────────────────
  'GET /api/v1/auth/me': {
    user_id: 1, username: 'admin', role: 'QA_MANAGER',
    full_name: 'James Tan Wei Liang', employee_id: 'ATCA-001', personnel_id: 1,
  },
  'POST /api/v1/auth/session-extend': { message: 'Session extended.' },
  'GET /api/v1/auth/logout':          { message: 'Logged out.' },
  'POST /api/v1/auth/logout':         { message: 'Logged out.' },

  // ── Global alerts ─────────────────────────────────────────────
  'GET /api/v1/alerts/summary': { total: 4 },

  // ── MOD-04 alerts ─────────────────────────────────────────────
  'GET /api/v1/mod04/alerts/summary': {
    certs_expiring_90d: 2, expired_certs: 1,
    eye_expiring_60d: 1,   expired_eye_exams: 0,
  },

  // ── MOD-05 alerts ─────────────────────────────────────────────
  'GET /api/v1/mod05/alerts/summary': {
    cal_overdue: 1, cal_due_30d: 3, never_calibrated: 0, total: 4,
  },

  // ── MOD-06 alerts ─────────────────────────────────────────────
  'GET /api/v1/mod06/alerts/summary': {
    baths_out_of_spec: 1, tests_overdue: 2, tests_due_today: 3, never_tested: 0, total: 3,
  },

  // ── MOD-07 alerts ─────────────────────────────────────────────
  'GET /api/v1/mod07/alerts/summary': {
    open_ncr: 2, overdue_capa: 1, pending_verify: 1, ncr_open_only: 2, total: 4,
  },

  // ── MOD-01 ────────────────────────────────────────────────────
  'GET /api/v1/mod01/policy/current': {
    policy_id: 1, revision: 'Rev 4', status: 'APPROVED',
    effective_date: '2025-01-01', title: 'Quality Policy',
  },
  'GET /api/v1/mod01/objectives': { items: [
    { objective_id:1, objective_ref:'QO-2025-01', title:'Achieve NADCAP accreditation renewal',    status:'ON_TRACK', target_date:'2025-12-31' },
    { objective_id:2, objective_ref:'QO-2025-02', title:'Reduce NCR turnaround to <5 days',        status:'AT_RISK',  target_date:'2025-09-30' },
    { objective_id:3, objective_ref:'QO-2025-03', title:'100% personnel NAS410 recertification',   status:'ON_TRACK', target_date:'2025-10-15' },
  ], total: 3 },
  'GET /api/v1/mod01/risks': { items: [
    { risk_id:1, risk_ref:'RSK-001', description:'Chemical bath out-of-spec during NADCAP audit', risk_score_pre:15, status:'OPEN' },
    { risk_id:2, risk_ref:'RSK-002', description:'Inspector certification lapse before renewal',   risk_score_pre:12, status:'OPEN' },
  ], total: 2 },
  'GET /api/v1/mod01/reviews': { items: [
    { review_id:1, review_ref:'MR-2025-01', review_type:'QUARTERLY', review_date:'2025-07-15', chaired_by_name:'Gary Tan Beng Huat', status:'PLANNED', open_actions:0 },
    { review_id:2, review_ref:'MR-2025-02', review_type:'ANNUAL',    review_date:'2025-03-10', chaired_by_name:'Gary Tan Beng Huat', status:'CLOSED',  open_actions:2 },
  ], total: 2 },

  // ── MOD-02 ────────────────────────────────────────────────────
  'GET /api/v1/mod02/alerts/summary': {
    pending_approval: 0, review_overdue: 1, review_due_soon: 1,
  },
  'GET /api/v1/mod02/documents': { items: [
    { doc_id:1, doc_number:'ATCA-QP-001',     title:'Quality Manual',          category:'Quality Procedure', process_area:'All', current_revision:'Rev 4', status:'APPROVED', effective_date:'2025-01-01', review_due_date:'2026-01-01', owner_name:'Gary Tan Beng Huat' },
    { doc_id:2, doc_number:'ATCA-WI-FPI-001', title:'FPI Process Instruction', category:'Work Instruction',  process_area:'FPI', current_revision:'Rev 2', status:'APPROVED', effective_date:'2024-06-01', review_due_date:'2025-06-01', owner_name:'James Tan Wei Liang' },
  ], total: 2 },
  'GET /api/v1/mod02/categories': [
    { category_id:1, name:'Quality Procedure' },
    { category_id:2, name:'Work Instruction'  },
    { category_id:3, name:'Form'              },
  ],

  // ── MOD-04 ────────────────────────────────────────────────────
  'GET /api/v1/mod04/personnel': { items: [
    { personnel_id:1, employee_id:'ATCA-001', full_name:'James Tan Wei Liang',  designation:'LEVEL_2', employment_type:'PERMANENT', active_certs:3, latest_exam_date:'2024-11-01', latest_exam_expiry:'2025-11-01', exam_days_left:160  },
    { personnel_id:2, employee_id:'ATCA-002', full_name:'Hendrich Lim Jun Wei', designation:'LEVEL_2', employment_type:'PERMANENT', active_certs:2, latest_exam_date:'2024-09-15', latest_exam_expiry:'2025-09-15', exam_days_left:113  },
    { personnel_id:3, employee_id:'ATCA-003', full_name:'Cabal Lo Wen Xin',     designation:'LEVEL_2', employment_type:'CONTRACT',  active_certs:2, latest_exam_date:'2024-07-01', latest_exam_expiry:'2025-07-01', exam_days_left:37   },
    { personnel_id:5, employee_id:'ATCA-005', full_name:'Azman Bin Ayub',       designation:'LEVEL_2', employment_type:'PERMANENT', active_certs:1, latest_exam_date:'2023-12-01', latest_exam_expiry:'2024-12-01', exam_days_left:-175 },
  ], total: 4 },
  'GET /api/v1/mod04/certifications': { items: [
    { cert_id:1, personnel_id:1, full_name:'James Tan Wei Liang',  employee_id:'ATCA-001', method:'PT', ndt_level:'II', cert_scheme:'NAS410', cert_number:'ATCA-PT-001', issuing_authority:'CAAS Singapore', issue_date:'2022-01-10', expiry_date:'2027-01-10', days_left:600,  status:'ACTIVE'  },
    { cert_id:2, personnel_id:2, full_name:'Hendrich Lim Jun Wei', employee_id:'ATCA-002', method:'MT', ndt_level:'II', cert_scheme:'NAS410', cert_number:'ATCA-MT-002', issuing_authority:'CAAS Singapore', issue_date:'2020-06-01', expiry_date:'2025-06-01', days_left:-10,  status:'EXPIRED' },
  ], total: 2 },

  // ── MOD-05 ────────────────────────────────────────────────────
  'GET /api/v1/mod05/equipment': { items: [
    { equipment_id:1, equip_code:'UV-001', description:'UV-A Lamp — Magnaflux ZB-100F',  equip_type:'UV_LAMP',       process_area:'FPI', make_model:'Magnaflux ZB-100F', serial_number:'MF-ZB-2021-0042',  last_cal_date:'2025-02-14', cal_due_date:'2026-02-14', cal_days_left:265,  cal_rag_status:'CURRENT'  },
    { equipment_id:2, equip_code:'TH-001', description:'Digital Thermometer — Fluke 52 II', equip_type:'THERMOMETER', process_area:'FPI', make_model:'Fluke 52 II',      serial_number:'FL-52-2019-0118',  last_cal_date:'2024-12-01', cal_due_date:'2025-06-01', cal_days_left:-10,  cal_rag_status:'OVERDUE'  },
    { equipment_id:3, equip_code:'PG-001', description:'Pressure Gauge 0–60 psi',        equip_type:'PRESSURE_GAUGE',process_area:'MPT', make_model:'Ashcroft 1009SW',   serial_number:'AC-1009-2022-0007',last_cal_date:'2025-04-01', cal_due_date:'2025-10-01', cal_days_left:28,   cal_rag_status:'DUE_SOON' },
  ], total: 3 },
  'GET /api/v1/mod05/calibrations': { items: [
    { cal_id:1, cal_ref:'CAL-2025-001', equipment_id:1, equip_code:'UV-001', description:'UV-A Lamp — Magnaflux ZB-100F', cal_date:'2025-02-14', cal_due_date:'2026-02-14', vendor:'SATS Engineering', cert_number:'SATS-CAL-2025-0042', measured_value:'≥1000 µW/cm² @ 38cm', out_of_tolerance:false, result:'PASS', recorded_by_name:'James Tan Wei Liang' },
  ], total: 1 },

  // ── MOD-06 ────────────────────────────────────────────────────
  'GET /api/v1/mod06/baths': { items: [
    { bath_id:1, bath_code:'FPI-PT-001', bath_name:'Penetrant Tank #1',      bath_type:'PT_PENETRANT',       process_area:'FPI', chemical_product:'Magnaflux ZL-60D',  spec_ref:'ASTM E1417',            concentration_min:null, concentration_max:null, temp_min_c:16, temp_max_c:52, current_temp_c:22, last_test_date:'2025-05-20', next_test_due:'2025-05-27', status:'IN_SPEC',     active:true },
    { bath_id:2, bath_code:'FPI-EM-001', bath_name:'Emulsifier Tank #1',     bath_type:'PT_EMULSIFIER',      process_area:'FPI', chemical_product:'Magnaflux ZR-10B',  spec_ref:'ASTM E1417',            concentration_min:5,    concentration_max:35,   temp_min_c:16, temp_max_c:52, current_temp_c:21, last_test_date:'2025-05-18', next_test_due:'2025-05-25', status:'OUT_OF_SPEC', active:true },
    { bath_id:3, bath_code:'FPI-DV-001', bath_name:'Developer Tank #1',      bath_type:'PT_DEVELOPER',       process_area:'FPI', chemical_product:'Magnaflux ZP-4B',   spec_ref:'ASTM E1417',            concentration_min:10,   concentration_max:30,   temp_min_c:16, temp_max_c:52, current_temp_c:20, last_test_date:'2025-05-15', next_test_due:'2025-05-22', status:'IN_SPEC',     active:true },
    { bath_id:4, bath_code:'MPT-WF-001', bath_name:'Wet Fluorescent Bath',   bath_type:'MT_WET_FLUORESCENT', process_area:'MPT', chemical_product:'Magnaflux 14HF',    spec_ref:'ASTM E1444 / AMS 2641', concentration_min:0.1,  concentration_max:0.4,  temp_min_c:10, temp_max_c:40, current_temp_c:19, last_test_date:'2025-05-19', next_test_due:'2025-05-26', status:'IN_SPEC',     active:true },
  ], total: 4 },
  'GET /api/v1/mod06/logs': { items: [
    { log_id:1, bath_id:2, bath_code:'FPI-EM-001', bath_name:'Emulsifier Tank #1',  test_date:'2025-05-18', tested_by_name:'James Tan Wei Liang',  temp_c:21, concentration_pct:38,   fluorescent_brightness:null,        contamination_check:'PASS', result:'FAIL', notes:'Concentration 38% exceeds max 35% — bath flagged OUT_OF_SPEC', ncr_raised:true,  ncr_ref:'NCR-2025-001' },
    { log_id:2, bath_id:4, bath_code:'MPT-WF-001', bath_name:'Wet Fluorescent Bath', test_date:'2025-05-19', tested_by_name:'Hendrich Lim Jun Wei', temp_c:19, concentration_pct:0.22, fluorescent_brightness:'ACCEPTABLE', contamination_check:'PASS', result:'PASS', notes:'All readings within spec',                                       ncr_raised:false, ncr_ref:null },
    { log_id:3, bath_id:1, bath_code:'FPI-PT-001', bath_name:'Penetrant Tank #1',   test_date:'2025-05-20', tested_by_name:'James Tan Wei Liang',  temp_c:22, concentration_pct:null, fluorescent_brightness:'ACCEPTABLE', contamination_check:'PASS', result:'PASS', notes:'Daily check — all OK',                                           ncr_raised:false, ncr_ref:null },
  ], total: 3 },

  // ── MOD-25 ────────────────────────────────────────────────────
  'GET /api/v1/mod25/alerts/summary': {
    total_users: 6, active_users: 5, inactive_users: 1, elevated_roles: 2,
  },
  'GET /api/v1/mod25/users': { items: [
    { user_id:1, username:'james.tan',       full_name:'James Tan Wei Liang',  role:'QA_MANAGER',    employee_id:'ATCA-001', personnel_id:1, active:true,  created_date:'2025-01-01', last_login:'2025-05-26T08:30:00' },
    { user_id:2, username:'gary.tan',        full_name:'Gary Tan Beng Huat',   role:'ADMIN',         employee_id:'ATCA-004', personnel_id:4, active:true,  created_date:'2025-01-01', last_login:'2025-05-25T14:15:00' },
    { user_id:3, username:'hendrich.lim',    full_name:'Hendrich Lim Jun Wei', role:'NDT_INSPECTOR', employee_id:'ATCA-002', personnel_id:2, active:true,  created_date:'2025-01-15', last_login:'2025-05-25T07:45:00' },
    { user_id:4, username:'cabal.lo',        full_name:'Cabal Lo Wen Xin',     role:'NDT_INSPECTOR', employee_id:'ATCA-003', personnel_id:3, active:true,  created_date:'2025-02-01', last_login:'2025-05-24T09:00:00' },
    { user_id:5, username:'azman.ayub',      full_name:'Azman Bin Ayub',       role:'SUPERVISOR',    employee_id:'ATCA-005', personnel_id:5, active:false, created_date:'2025-02-10', last_login:'2025-04-10T16:00:00' },
    { user_id:6, username:'hariharan.raju',  full_name:'Hariharan s/o Raju',   role:'NDT_INSPECTOR', employee_id:'ATCA-006', personnel_id:6, active:true,  created_date:'2025-03-01', last_login:'2025-05-23T08:00:00' },
  ], total: 6 },

  // ── MOD-07 ────────────────────────────────────────────────────
  'GET /api/v1/mod07/ncr': { items: [
    { ncr_id:1, ncr_ref:'NCR-2025-001', ncr_type:'PROCESS', process_area:'FPI', description:'Bath concentration found out of spec during periodic check', detected_date:'2025-05-10', severity:'MJ', source:'INTERNAL_AUDIT', status:'OPEN', raised_by_name:'James Tan Wei Liang', raised_date:'2025-05-10', target_close_date:'2025-06-10', days_open:15, disposition:null, open_capa_count:0, capa_required:true },
    { ncr_id:2, ncr_ref:'NCR-2025-002', ncr_type:'PROCESS', process_area:'FPI', description:'UV lamp intensity reading below 1000 µW/cm² minimum requirement', detected_date:'2025-04-20', severity:'MN', source:'PROCESS_CHECK', status:'CAPA_IN_PROGRESS', raised_by_name:'Hendrich Lim Jun Wei', raised_date:'2025-04-20', target_close_date:'2025-05-20', days_open:35, disposition:'REWORK', open_capa_count:1, capa_required:true },
  ], total: 2 },
  'GET /api/v1/mod07/capa': { items: [
    { capa_id:1, capa_ref:'CAPA-2025-001', capa_type:'CORRECTIVE', ncr_id:2, ncr_ref:'NCR-2025-002', root_cause_method:'5WHY', root_cause_description:'UV lamp bulb past service interval; no PM schedule in place', corrective_action:'Replace bulb; add PM schedule', preventive_action:'Add UV lamp to monthly PM checklist', status:'IN_PROGRESS', owner_name:'Hendrich Lim Jun Wei', assigned_to_name:'Hendrich Lim Jun Wei', target_completion_date:'2025-05-20', target_date:'2025-05-20', effectiveness_result:null, verified_by_name:null, closed_date:null, days_overdue:5 },
  ], total: 1 },
};

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  // Reconstruct the /api/v1/... path from the catch-all segments
  const segments = Array.isArray(req.query.path) ? req.query.path : [req.query.path].filter(Boolean);
  const apiPath  = '/api/v1/' + segments.join('/');

  // ── POST /api/v1/auth/login ───────────────────────────────────
  if (req.method === 'POST' && apiPath === '/api/v1/auth/login') {
    const { username, password } = req.body || {};
    if (username === 'admin' && password === 'preview123') {
      return res.status(200).json({
        message: 'Login successful.', user_id: 1, username: 'admin',
        role: 'QA_MANAGER', full_name: 'James Tan Wei Liang',
      });
    }
    return res.status(401).json({ message: 'Preview mode — use: admin / preview123' });
  }

  // ── /api/v1/auth/logout (GET redirect) ───────────────────────
  if (apiPath === '/api/v1/auth/logout') {
    res.setHeader('Location', '/login');
    return res.status(302).end();
  }

  // ── Stub lookup ───────────────────────────────────────────────
  const key = `${req.method} ${apiPath}`;
  if (Object.prototype.hasOwnProperty.call(STUBS, key)) {
    return res.status(200).json(STUBS[key]);
  }

  // Fallback: accept any POST/PUT gracefully
  if (req.method === 'POST' || req.method === 'PUT') {
    return res.status(200).json({ message: 'ok' });
  }

  res.status(404).json({ message: `Not found: ${apiPath}` });
};
