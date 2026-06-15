/**
 * ATCA-ERP — Static Preview Server
 * Serves the frontend at http://localhost:3000 without a database.
 * API calls will return stub data so the UI is fully navigable.
 *
 * Usage: node preview-server.js
 */

'use strict';

const express = require('express');
const path    = require('path');
const app     = express();
const PORT    = process.env.PORT || 3001;

const FRONTEND_DIR = path.join(__dirname, 'src/frontend');

app.use(express.json());

/* ── Static assets ─────────────────────────────────────────── */
app.use(express.static(FRONTEND_DIR));

/* ── Stub API responses (minimal, enough to render UI) ─────── */

// Auth
app.post('/api/v1/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (username === 'admin' && password === 'preview123') {
    return res.json({ message: 'Login successful.', user_id: 1, username: 'admin',
      role: 'QA_MANAGER', full_name: 'Preview Admin' });
  }
  res.status(401).json({ message: 'Preview mode: use admin / preview123' });
});

app.get('/api/v1/auth/me', (req, res) => {
  res.json({ user_id: 1, username: 'admin', role: 'QA_MANAGER',
    full_name: 'James Tan Wei Liang', employee_id: 'ATCA-001', personnel_id: 1 });
});

app.post('/api/v1/auth/session-extend', (req, res) => res.json({ message: 'Session extended.' }));
app.post('/api/v1/auth/logout', (req, res) => res.json({ message: 'Logged out.' }));

// Global alerts
app.get('/api/v1/alerts/summary', (req, res) => res.json({ total: 3 }));

// MOD-04 alerts
app.get('/api/v1/mod04/alerts/summary', (req, res) => res.json({
  certs_expiring_90d: 2, expired_certs: 1,
  eye_expiring_60d: 1,   expired_eye_exams: 0,
}));

// MOD-05 alerts
app.get('/api/v1/mod05/alerts/summary', (req, res) => res.json({
  cal_overdue: 1, cal_due_30d: 3, never_calibrated: 0, total: 4,
}));

// MOD-06 alerts
app.get('/api/v1/mod06/alerts/summary', (req, res) => res.json({
  out_of_spec: 1, overdue_sample: 1, due_soon: 2, total_baths: 7, total: 2,
}));

// MOD-03 alerts
app.get('/api/v1/mod03/alerts/summary', (req, res) => res.json({
  in_progress: 2, pending_signoff: 1, rejected: 0, total: 2,
}));

// MOD-07 alerts
app.get('/api/v1/mod07/alerts/summary', (req, res) => res.json({
  open_ncr: 2, overdue_capa: 1, pending_verify: 1, ncr_open_only: 2, total: 4,
}));

// MOD-01 stubs
app.get('/api/v1/mod01/policy/current', (req, res) => res.json({
  policy_id: 1, revision: 'Rev 4', status: 'APPROVED',
  effective_date: '2025-01-01', title: 'Quality Policy' }));

app.get('/api/v1/mod01/objectives', (req, res) => res.json({ items: [
  { objective_id:1, objective_ref:'QO-2025-01', title:'Achieve NADCAP accreditation renewal', status:'ON_TRACK', target_date:'2025-12-31' },
  { objective_id:2, objective_ref:'QO-2025-02', title:'Reduce NCR turnaround to <5 days',      status:'AT_RISK',  target_date:'2025-09-30' },
  { objective_id:3, objective_ref:'QO-2025-03', title:'100% personnel NAS410 recertification',  status:'ON_TRACK', target_date:'2025-10-15' },
], total: 3 }));

app.get('/api/v1/mod01/risks', (req, res) => res.json({ items: [
  { risk_id:1, risk_ref:'RSK-001', description:'Chemical bath out-of-spec during NADCAP audit', risk_score_pre:15, status:'OPEN' },
  { risk_id:2, risk_ref:'RSK-002', description:'Inspector certification lapse before renewal',    risk_score_pre:12, status:'OPEN' },
], total: 2 }));

app.get('/api/v1/mod01/reviews', (req, res) => res.json({ items: [
  { review_id:1, review_ref:'MR-2025-01', review_type:'QUARTERLY', review_date:'2025-07-15',
    chaired_by_name:'Gary Tan Beng Huat', status:'PLANNED', open_actions: 0 },
  { review_id:2, review_ref:'MR-2025-02', review_type:'ANNUAL',    review_date:'2025-03-10',
    chaired_by_name:'Gary Tan Beng Huat', status:'CLOSED',  open_actions: 2 },
], total: 2 }));

// MOD-02 stubs
app.get('/api/v1/mod02/documents', (req, res) => res.json({ items: [
  { doc_id:1, doc_number:'ATCA-QP-001', title:'Quality Manual', category:'Quality Procedure',
    process_area:'All', current_revision:'Rev 4', status:'APPROVED', effective_date:'2025-01-01',
    review_due_date:'2026-01-01', owner_name:'Gary Tan Beng Huat' },
  { doc_id:2, doc_number:'ATCA-WI-FPI-001', title:'FPI Process Instruction', category:'Work Instruction',
    process_area:'FPI', current_revision:'Rev 2', status:'APPROVED', effective_date:'2024-06-01',
    review_due_date:'2025-06-01', owner_name:'James Tan Wei Liang' },
], total: 2 }));

app.get('/api/v1/mod02/categories', (req, res) => res.json([
  { category_id:1, name:'Quality Procedure' },
  { category_id:2, name:'Work Instruction' },
  { category_id:3, name:'Form' },
]));

// MOD-04 stubs
app.get('/api/v1/mod04/personnel', (req, res) => res.json({ items: [
  { personnel_id:1, employee_id:'ATCA-001', full_name:'James Tan Wei Liang',
    designation:'LEVEL_2', employment_type:'PERMANENT', active_certs:3,
    latest_exam_date:'2024-11-01', latest_exam_expiry:'2025-11-01', exam_days_left:160 },
  { personnel_id:2, employee_id:'ATCA-002', full_name:'Hendrich Lim Jun Wei',
    designation:'LEVEL_2', employment_type:'PERMANENT', active_certs:2,
    latest_exam_date:'2024-09-15', latest_exam_expiry:'2025-09-15', exam_days_left:113 },
  { personnel_id:3, employee_id:'ATCA-003', full_name:'Cabal Lo Wen Xin',
    designation:'LEVEL_2', employment_type:'CONTRACT', active_certs:2,
    latest_exam_date:'2024-07-01', latest_exam_expiry:'2025-07-01', exam_days_left:37 },
  { personnel_id:5, employee_id:'ATCA-005', full_name:'Azman Bin Ayub',
    designation:'LEVEL_2', employment_type:'PERMANENT', active_certs:1,
    latest_exam_date:'2023-12-01', latest_exam_expiry:'2024-12-01', exam_days_left:-175 },
], total: 6 }));

app.get('/api/v1/mod04/certifications', (req, res) => res.json({ items: [
  { cert_id:1, personnel_id:1, full_name:'James Tan Wei Liang', employee_id:'ATCA-001',
    method:'PT', ndt_level:'II', cert_scheme:'NAS410', cert_number:'ATCA-PT-001',
    issuing_authority:'CAAS Singapore', issue_date:'2022-01-10', expiry_date:'2027-01-10',
    days_left:600, status:'ACTIVE' },
  { cert_id:2, personnel_id:2, full_name:'Hendrich Lim Jun Wei', employee_id:'ATCA-002',
    method:'MT', ndt_level:'II', cert_scheme:'NAS410', cert_number:'ATCA-MT-002',
    issuing_authority:'CAAS Singapore', issue_date:'2020-06-01', expiry_date:'2025-06-01',
    days_left:-10, status:'EXPIRED' },
], total: 2 }));

// MOD-05 stubs
app.get('/api/v1/mod05/equipment', (req, res) => res.json({ items: [
  { equipment_id:1, equip_code:'UV-001', description:'UV-A Lamp — Magnaflux ZB-100F',
    equip_type:'UV_LAMP', process_area:'FPI', make_model:'Magnaflux ZB-100F',
    serial_number:'MF-ZB-2021-0042', last_cal_date:'2025-02-14', cal_due_date:'2026-02-14',
    cal_days_left:265, cal_rag_status:'CURRENT' },
  { equipment_id:2, equip_code:'TH-001', description:'Digital Thermometer — Fluke 52 II',
    equip_type:'THERMOMETER', process_area:'FPI', make_model:'Fluke 52 II',
    serial_number:'FL-52-2019-0118', last_cal_date:'2024-12-01', cal_due_date:'2025-06-01',
    cal_days_left:-10, cal_rag_status:'OVERDUE' },
  { equipment_id:3, equip_code:'PG-001', description:'Pressure Gauge 0–60 psi',
    equip_type:'PRESSURE_GAUGE', process_area:'MPT', make_model:'Ashcroft 1009SW',
    serial_number:'AC-1009-2022-0007', last_cal_date:'2025-04-01', cal_due_date:'2025-10-01',
    cal_days_left:28, cal_rag_status:'DUE_SOON' },
], total: 3 }));

app.get('/api/v1/mod05/calibrations', (req, res) => res.json({ items: [
  { cal_id:1, cal_ref:'CAL-2025-001', equipment_id:1, equip_code:'UV-001',
    description:'UV-A Lamp — Magnaflux ZB-100F', cal_date:'2025-02-14', cal_due_date:'2026-02-14',
    vendor:'SATS Engineering', cert_number:'SATS-CAL-2025-0042',
    measured_value:'≥1000 µW/cm² @ 38cm', out_of_tolerance:false, result:'PASS',
    recorded_by_name:'James Tan Wei Liang' },
], total: 1 }));

// MOD-07 stubs
app.get('/api/v1/mod07/ncr', (req, res) => res.json({ items: [
  { ncr_id:1, ncr_ref:'NCR-2025-001', title:'Bath concentration out of spec',
    severity:'MJ', source:'INTERNAL_AUDIT', status:'OPEN',
    raised_by_name:'James Tan Wei Liang', raised_date:'2025-05-10',
    target_close_date:'2025-06-10', days_open: 15 },
  { ncr_id:2, ncr_ref:'NCR-2025-002', title:'UV lamp intensity below minimum',
    severity:'MN', source:'PROCESS_CHECK', status:'CAPA_IN_PROGRESS',
    raised_by_name:'Hendrich Lim Jun Wei', raised_date:'2025-04-20',
    target_close_date:'2025-05-20', days_open: 35 },
], total: 2 }));

app.get('/api/v1/mod07/capa', (req, res) => res.json({ items: [
  { capa_id:1, capa_ref:'CAPA-2025-001', ncr_id:2, ncr_ref:'NCR-2025-002',
    root_cause:'UV lamp bulb past service interval', corrective_action:'Replace bulb; add PM schedule',
    status:'IN_PROGRESS', assigned_to_name:'Hendrich Lim Jun Wei',
    target_date:'2025-05-20', verified_by_name: null, closed_date: null, days_overdue: 5 },
], total: 1 }));

// MOD-06 stubs
app.get('/api/v1/mod06/baths', (req, res) => res.json({ items: [
  { bath_id:1, bath_code:'BATH-PT-001', bath_name:'Penetrant Tank A — Type I FPI',
    bath_type:'PENETRANT', process_area:'FPI Bay 1', spec_ref:'AMS 2644 / ASTM E1417',
    sample_frequency_days:7, last_sample_ref:'BS-2026-0003', last_sampled_at:'2026-06-11T08:00:00Z',
    days_since_sample:1, last_status:'PASS', last_sampled_by_name:'James Tan Wei Liang', rag_status:'GREEN' },
  { bath_id:2, bath_code:'BATH-EM-001', bath_name:'Hydrophilic Emulsifier — Method D',
    bath_type:'EMULSIFIER', process_area:'FPI Bay 1', spec_ref:'AMS 2644 §5.3',
    sample_frequency_days:7, last_sample_ref:'BS-2026-0002', last_sampled_at:'2026-06-05T08:00:00Z',
    days_since_sample:7, last_status:'PASS', last_sampled_by_name:'James Tan Wei Liang', rag_status:'AMBER' },
  { bath_id:3, bath_code:'BATH-DV-001', bath_name:'Wet Developer Tank',
    bath_type:'DEVELOPER', process_area:'FPI Bay 1', spec_ref:'AMS 2644 / ASTM E1417 §6.4',
    sample_frequency_days:7, last_sample_ref:'BS-2026-0001', last_sampled_at:'2026-05-30T08:00:00Z',
    days_since_sample:13, last_status:'FAIL', last_sampled_by_name:'Hendrich Lim Jun Wei', rag_status:'RED' },
  { bath_id:4, bath_code:'BATH-AN-001', bath_name:'Anodize Tank — Type II Sulfuric Acid',
    bath_type:'ANODIZE', process_area:'Chem Lab', spec_ref:'AMS 2469 / NADCAP AC7110',
    sample_frequency_days:1, last_sample_ref:'BS-2026-0004', last_sampled_at:'2026-06-12T06:00:00Z',
    days_since_sample:0, last_status:'PASS', last_sampled_by_name:'Cabal Lo Wen Xin', rag_status:'GREEN' },
  { bath_id:5, bath_code:'BATH-PS-001', bath_name:'Passivation Bath — Citric Acid',
    bath_type:'PASSIVATION', process_area:'Chem Lab', spec_ref:'ASTM A967 / NADCAP AC7110',
    sample_frequency_days:7, last_sample_ref:null, last_sampled_at:null,
    days_since_sample:null, last_status:null, last_sampled_by_name:null, rag_status:'RED' },
], total: 5 }));

app.get('/api/v1/mod06/baths/:id', (req, res) => res.json({
  bath_id:1, bath_code:'BATH-PT-001', bath_name:'Penetrant Tank A — Type I FPI',
  bath_type:'PENETRANT', process_area:'FPI Bay 1', spec_ref:'AMS 2644 / ASTM E1417',
  sample_frequency_days:7, is_active:true, rag_status:'GREEN',
  last_sampled_at:'2026-06-11T08:00:00Z', days_since_sample:1,
  last_status:'PASS', last_sampled_by_name:'James Tan Wei Liang',
  parameters: [
    { param_id:1, param_name:'Fluorescent Brightness', unit:'fc',  min_value:500, max_value:null, test_method:'Fluorometer per AMS 2644 §7.4' },
    { param_id:2, param_name:'Water Content',          unit:'%',   min_value:null, max_value:5.0, test_method:'ASTM D1744' },
    { param_id:3, param_name:'Contamination (Turbidity)', unit:'NTU', min_value:null, max_value:20.0, test_method:'Turbidimeter' },
  ],
}));

app.get('/api/v1/mod06/baths/:id/samples', (req, res) => res.json({ items: [
  { sample_id:3, sample_ref:'BS-2026-0003', sampled_at:'2026-06-11T08:00:00Z',
    sampled_by_name:'James Tan Wei Liang', overall_status:'PASS', failed_params:0, corrective_action:null },
  { sample_id:2, sample_ref:'BS-2026-0002', sampled_at:'2026-06-04T08:00:00Z',
    sampled_by_name:'James Tan Wei Liang', overall_status:'PASS', failed_params:0, corrective_action:null },
  { sample_id:1, sample_ref:'BS-2026-0001', sampled_at:'2026-05-28T08:00:00Z',
    sampled_by_name:'Hendrich Lim Jun Wei', overall_status:'FAIL', failed_params:1,
    corrective_action:'Replenished penetrant concentrate; re-tested 2026-05-28 PASS.' },
], total: 3 }));

app.post('/api/v1/mod06/baths', (req, res) => res.status(201).json({ bath_id:99, message:'Bath created.' }));
app.put('/api/v1/mod06/baths/:id', (req, res) => res.json({ message:'Bath updated.' }));
app.post('/api/v1/mod06/baths/:id/samples', (req, res) => res.status(201).json({
  sample_id:99, sample_ref:'BS-2026-0099', overall_status:'PASS', message:'Sample recorded.',
}));

// MOD-03 stubs
app.get('/api/v1/mod03/jobs', (req, res) => res.json({ items: [
  { job_id:1, job_ref:'FPI-2026-0001', work_order_ref:'WO-2026-042', customer:'SIA Engineering',
    part_number:'737-FAN-BLADE-A01', part_description:'737 Fan Blade — Stage 1',
    quantity:6, penetrant_type:'TYPE_I', penetrant_bath_code:'BATH-PT-001',
    method:'METHOD_D', sensitivity_level:3, developer_type:'WET_AQUEOUS',
    status:'IN_PROGRESS', disposition:null, indication_found:null,
    created_at:'2026-06-12T06:00:00Z', created_by_name:'James Tan Wei Liang',
    final_signed_by_name:null, final_signed_at:null, total_steps:8, completed_steps:5 },
  { job_id:2, job_ref:'FPI-2026-0002', work_order_ref:'WO-2026-039', customer:'ST Engineering',
    part_number:'A320-FITTING-B07', part_description:'A320 Engine Fitting',
    quantity:2, penetrant_type:'TYPE_I', penetrant_bath_code:'BATH-PT-001',
    method:'METHOD_D', sensitivity_level:2, developer_type:'DRY',
    status:'COMPLETE', disposition:'ACCEPT', indication_found:false,
    created_at:'2026-06-10T08:00:00Z', created_by_name:'Hendrich Lim Jun Wei',
    final_signed_by_name:'Hendrich Lim Jun Wei', final_signed_at:'2026-06-11T14:00:00Z',
    total_steps:8, completed_steps:8 },
], total: 2 }));

app.get('/api/v1/mod03/jobs/:id', (req, res) => {
  const id = parseInt(req.params.id);
  const steps = [
    { step_id:1,  step_seq:1, step_name:'PRE_CLEAN',       signed_off:true,  result:'PASS', performed_by_name:'James Tan Wei Liang', performed_at:'2026-06-12T07:00:00Z', duration_min:20, uv_intensity_fc:null, white_light_fc:null, temp_c:22, notes:null },
    { step_id:2,  step_seq:2, step_name:'PENETRANT_APPLY',  signed_off:true,  result:'PASS', performed_by_name:'James Tan Wei Liang', performed_at:'2026-06-12T07:25:00Z', duration_min:5,  uv_intensity_fc:null, white_light_fc:null, temp_c:null, notes:null },
    { step_id:3,  step_seq:3, step_name:'PENETRANT_DWELL',  signed_off:true,  result:'PASS', performed_by_name:'James Tan Wei Liang', performed_at:'2026-06-12T07:55:00Z', duration_min:30, uv_intensity_fc:null, white_light_fc:null, temp_c:null, notes:null },
    { step_id:4,  step_seq:4, step_name:'RINSE',            signed_off:true,  result:'PASS', performed_by_name:'James Tan Wei Liang', performed_at:'2026-06-12T08:05:00Z', duration_min:10, uv_intensity_fc:null, white_light_fc:null, temp_c:null, notes:null },
    { step_id:5,  step_seq:5, step_name:'DEVELOPER_APPLY',  signed_off:true,  result:'PASS', performed_by_name:'James Tan Wei Liang', performed_at:'2026-06-12T08:10:00Z', duration_min:5,  uv_intensity_fc:null, white_light_fc:null, temp_c:null, notes:null },
    { step_id:6,  step_seq:6, step_name:'DEVELOPER_DWELL',  signed_off:false, result:null,   performed_by_name:null, performed_at:null, duration_min:null, uv_intensity_fc:null, white_light_fc:null, temp_c:null, notes:null },
    { step_id:7,  step_seq:7, step_name:'INTERPRET',        signed_off:false, result:null,   performed_by_name:null, performed_at:null, duration_min:null, uv_intensity_fc:null, white_light_fc:null, temp_c:null, notes:null },
    { step_id:8,  step_seq:8, step_name:'POST_CLEAN',       signed_off:false, result:null,   performed_by_name:null, performed_at:null, duration_min:null, uv_intensity_fc:null, white_light_fc:null, temp_c:null, notes:null },
  ];
  res.json({
    job_id:id, job_ref:'FPI-2026-0001', work_order_ref:'WO-2026-042', customer:'SIA Engineering',
    part_number:'737-FAN-BLADE-A01', part_description:'737 Fan Blade — Stage 1',
    material_spec:'AMS 4045', quantity:6, penetrant_type:'TYPE_I', penetrant_bath_code:'BATH-PT-001',
    method:'METHOD_D', sensitivity_level:3, developer_type:'WET_AQUEOUS',
    status:'IN_PROGRESS', created_by_name:'James Tan Wei Liang',
    created_at:'2026-06-12T06:00:00Z', total_steps:8, completed_steps:5,
    disposition:null, final_result:null, steps,
  });
});

app.post('/api/v1/mod03/jobs', (req, res) => res.status(201).json({
  job_id:99, job_ref:'FPI-2026-0099', message:'FPI job created.',
}));
app.post('/api/v1/mod03/jobs/:id/steps/:seq/signoff', (req, res) => res.json({ message:'Step signed off.' }));
app.post('/api/v1/mod03/jobs/:id/result', (req, res) => res.status(201).json({ message:'FPI job ACCEPT. Job closed.' }));
app.put('/api/v1/mod03/jobs/:id/cancel', (req, res) => res.json({ message:'Job cancelled.' }));

// ── MOD-09 stubs ──────────────────────────────────────────────
app.get('/api/v1/mod09/alerts/summary', (req, res) => res.json({
  pending_reviews: 1, pending_grn_inspection: 2, ready_to_ship: 1, expired_quotations: 0, total: 3,
}));
app.get('/api/v1/mod09/customers', (req, res) => res.json({ items: [
  { customer_id:1, customer_code:'CUST-0001', company_name:'SIA Engineering Company', contact_person:'Alice Tan', customer_type:'OEM', approved_vendor:true, quotation_count:3, is_active:1 },
  { customer_id:2, customer_code:'CUST-0002', company_name:'ST Engineering Aerospace', contact_person:'Bob Lim', customer_type:'TIER1', approved_vendor:true, quotation_count:1, is_active:1 },
], total: 2 }));
app.post('/api/v1/mod09/customers', (req, res) => res.status(201).json({ customer_id:99, customer_code:'CUST-0099', message:'Customer created.' }));
app.put('/api/v1/mod09/customers/:id', (req, res) => res.json({ message:'Customer updated.' }));
app.get('/api/v1/mod09/parts', (req, res) => res.json({ items: [
  { part_id:1, part_number:'737-FAN-BLADE-A01', part_description:'737 Fan Blade Stage 1', part_type:'COMPONENT', process_area:'FPI', unit_of_measure:'EA', standard_price:250.00 },
  { part_id:2, part_number:'SVC-FPI-INSPECTION', part_description:'FPI Inspection Service', part_type:'SERVICE', process_area:'FPI', unit_of_measure:'EA', standard_price:180.00 },
], total: 2 }));
app.post('/api/v1/mod09/parts', (req, res) => res.status(201).json({ part_id:99, message:'Part created.' }));
app.get('/api/v1/mod09/quotations', (req, res) => res.json({ items: [
  { quotation_id:1, quotation_ref:'QT-2026-0001', customer_name:'SIA Engineering Company', quotation_date:'2026-06-01', valid_until:'2026-07-01', total_amount:2700.00, status:'SENT', prepared_by_name:'James Tan Wei Liang' },
], total: 1 }));
app.post('/api/v1/mod09/quotations', (req, res) => res.status(201).json({ quotation_id:99, quotation_ref:'QT-2026-0099', message:'Quotation created.' }));
app.patch('/api/v1/mod09/quotations/:id/status', (req, res) => res.json({ message:'Status updated.' }));
app.get('/api/v1/mod09/contract-reviews', (req, res) => res.json({ items: [
  { review_id:1, review_ref:'CR-2026-0001', customer_name:'SIA Engineering Company', po_number:'SIA-PO-2026-0042', review_date:'2026-06-10', reviewer_name:'James Tan Wei Liang', spec_reviewed:true, capability_ok:true, delivery_ok:true, status:'PENDING' },
], total: 1 }));
app.post('/api/v1/mod09/contract-reviews', (req, res) => res.status(201).json({ review_id:99, review_ref:'CR-2026-0099', message:'Contract review created.' }));
app.patch('/api/v1/mod09/contract-reviews/:id/approve', (req, res) => res.json({ message:'Contract review approved.' }));
app.get('/api/v1/mod09/grn', (req, res) => res.json({ items: [
  { grn_id:1, grn_ref:'GRN-2026-0001', supplier_name:'Magnaflux Asia Pacific', delivery_note_no:'MAG-DN-2026-0012', received_date:'2026-06-12', inspection_reqd:true, inspection_done:false, inspect_result:null, status:'PENDING', received_by_name:'Hendrich Lim Jun Wei' },
], total: 1 }));
app.post('/api/v1/mod09/grn', (req, res) => res.status(201).json({ grn_id:99, grn_ref:'GRN-2026-0099', message:'GRN created.' }));
app.patch('/api/v1/mod09/grn/:id/inspect', (req, res) => res.json({ message:'Inspection recorded.' }));
app.get('/api/v1/mod09/delivery-orders', (req, res) => res.json({ items: [
  { do_id:1, do_ref:'DO-2026-0001', customer_name:'SIA Engineering Company', delivery_date:'2026-06-20', shipped_date:null, tracking_number:null, status:'READY', prepared_by_name:'James Tan Wei Liang' },
], total: 1 }));
app.post('/api/v1/mod09/delivery-orders', (req, res) => res.status(201).json({ do_id:99, do_ref:'DO-2026-0099', message:'Delivery order created.' }));
app.patch('/api/v1/mod09/delivery-orders/:id/ship', (req, res) => res.json({ message:'Delivery order shipped.' }));

// ── MOD-20 stubs ──────────────────────────────────────────────
app.get('/api/v1/mod20/alerts/summary', (req, res) => res.json({
  open_complaints: 3, critical_open: 1, overdue_complaints: 1, open_8d: 2, total: 4,
}));
app.get('/api/v1/mod20/complaints', (req, res) => res.json({ items: [
  { complaint_id:1, complaint_ref:'CC-2026-0001', customer_name:'SIA Engineering Company', complaint_type:'QUALITY', severity:'HIGH', subject:'Incomplete penetrant coverage on fan blade batch FPI-2026-0001', received_date:'2026-06-10', target_close_date:'2026-06-30', owned_by_name:'James Tan Wei Liang', status:'OPEN', has_8d:0 },
  { complaint_id:2, complaint_ref:'CC-2026-0002', customer_name:'ST Engineering Aerospace', complaint_type:'DELIVERY', severity:'MEDIUM', subject:'Late delivery of CoC documentation', received_date:'2026-06-11', target_close_date:'2026-06-25', owned_by_name:'Gary Tan Beng Huat', status:'8D_IN_PROGRESS', has_8d:1 },
], total: 2 }));
app.post('/api/v1/mod20/complaints', (req, res) => res.status(201).json({ complaint_id:99, complaint_ref:'CC-2026-0099', message:'Complaint logged.' }));
app.patch('/api/v1/mod20/complaints/:id/status', (req, res) => res.json({ message:'Status updated.' }));
app.get('/api/v1/mod20/8d-reports', (req, res) => res.json({ items: [
  { report_id:1, report_ref:'8D-2026-0001', complaint_ref:'CC-2026-0002', customer_name:'ST Engineering Aerospace', subject:'Late delivery of CoC documentation', severity:'MEDIUM', d1_completed:true, d2_completed:true, d3_completed:true, d4_completed:false, d5_completed:false, d6_completed:false, d7_completed:false, d8_completed:false, overall_status:'IN_PROGRESS', created_by_name:'James Tan Wei Liang' },
], total: 1 }));
app.post('/api/v1/mod20/8d-reports', (req, res) => res.status(201).json({ report_id:99, report_ref:'8D-2026-0099', message:'8D Report opened.' }));
app.get('/api/v1/mod20/8d-reports/:id', (req, res) => res.json({
  report_id:1, report_ref:'8D-2026-0001', complaint_ref:'CC-2026-0002', subject:'Late delivery of CoC documentation', severity:'MEDIUM',
  customer_name:'ST Engineering Aerospace', overall_status:'IN_PROGRESS', created_by_name:'James Tan Wei Liang', approved_by_name:null,
  d1_completed:true, d1_team_leader:'James Tan Wei Liang', d1_team_members:'Gary Tan Beng Huat, Hendrich Lim Jun Wei',
  d2_completed:true, d2_problem_stmt:'CoC not issued within 24h of product release — customer received parts without documentation.',
  d2_is_what:'CoC missing for DO-2026-0001 shipped 10 Jun 2026', d2_is_not_what:'All other shipments this quarter included CoC',
  d3_completed:true, d3_containment:'Manual CoC issued and sent by email within 1 hour of complaint receipt.', d3_effectiveness:'Customer confirmed receipt.',
  d4_completed:false, d4_root_cause:null, d4_method:null,
  d5_completed:false, d6_completed:false, d7_completed:false, d8_completed:false,
}));
app.patch('/api/v1/mod20/8d-reports/:id/d/:step', (req, res) => res.json({ message:`D${req.params.step} updated.` }));
app.patch('/api/v1/mod20/8d-reports/:id/approve', (req, res) => res.json({ message:'8D approved.' }));

// ── MOD-10 stubs ──────────────────────────────────────────────
app.get('/api/v1/mod10/alerts/summary', (req, res) => res.json({
  due_soon: 2, overdue_jobs: 0, incomplete_checklists: 1, failed_test_pieces: 0, total: 1,
}));
app.get('/api/v1/mod10/route-cards', (req, res) => res.json({ items: [
  { route_id:1, route_ref:'RC-2026-0001', part_number:'737-FAN-BLADE-A01', part_description:'737 Fan Blade Stage 1', customer_name:'SIA Engineering Company', quantity:6, job_type:'FPI', priority:'HIGH', required_by_date:'2026-06-18', done_ops:3, total_ops:5, status:'IN_PROGRESS' },
  { route_id:2, route_ref:'RC-2026-0002', part_number:'CFM56-COMP-BLADE', part_description:'CFM56 Compressor Blade', customer_name:'ST Engineering Aerospace', quantity:12, job_type:'MPT', priority:'NORMAL', required_by_date:'2026-06-25', done_ops:0, total_ops:4, status:'OPEN' },
], total: 2 }));
app.get('/api/v1/mod10/route-cards/:id', (req, res) => res.json({
  route_id:1, route_ref:'RC-2026-0001', part_number:'737-FAN-BLADE-A01', status:'IN_PROGRESS',
  operations:[
    { op_id:1, op_seq:1, op_name:'Pre-clean', status:'COMPLETE', result:'PASS', assigned_to_name:'James Tan Wei Liang' },
    { op_id:2, op_seq:2, op_name:'Penetrant Application', status:'COMPLETE', result:'PASS', assigned_to_name:'James Tan Wei Liang' },
    { op_id:3, op_seq:3, op_name:'Penetrant Dwell', status:'COMPLETE', result:'PASS', assigned_to_name:'James Tan Wei Liang' },
    { op_id:4, op_seq:4, op_name:'Developer & Inspection', status:'IN_PROGRESS', result:null, assigned_to_name:'Hendrich Lim Jun Wei' },
    { op_id:5, op_seq:5, op_name:'Post-clean', status:'PENDING', result:null, assigned_to_name:null },
  ],
}));
app.post('/api/v1/mod10/route-cards', (req, res) => res.status(201).json({ route_id:99, route_ref:'RC-2026-0099', message:'Route card created.' }));
app.patch('/api/v1/mod10/route-cards/:id/status', (req, res) => res.json({ message:'Status updated.' }));
app.patch('/api/v1/mod10/route-cards/:id/ops/:seq/complete', (req, res) => res.json({ message:'Operation completed.' }));
app.get('/api/v1/mod10/production-conditions', (req, res) => res.json({ items: [
  { condition_id:1, condition_ref:'PC-2026-0001', process_type:'FPI', process_spec:'AMS 2644 Type I Method D', route_ref:'RC-2026-0001', check_date:'2026-06-13T07:00:00Z', checked_by_name:'James Tan Wei Liang', bath_temp_ok:true, uv_intensity_ok:true, ambient_light_ok:true, overall_ok:true },
], total: 1 }));
app.post('/api/v1/mod10/production-conditions', (req, res) => res.status(201).json({ condition_id:99, condition_ref:'PC-2026-0099', overall_ok:true, message:'Condition recorded.' }));
app.get('/api/v1/mod10/test-pieces', (req, res) => res.json({ items: [
  { test_piece_id:1, test_piece_ref:'TP-2026-0001', test_piece_type:'TAM_PANEL', serial_number:'TAM-ATCA-001', route_ref:'RC-2026-0001', standard_ref:'AC7114 §5.3', check_date:'2026-06-13T07:05:00Z', checked_by_name:'James Tan Wei Liang', result:'PASS' },
], total: 1 }));
app.post('/api/v1/mod10/test-pieces', (req, res) => res.status(201).json({ test_piece_id:99, test_piece_ref:'TP-2026-0099', message:'Test piece recorded.' }));
app.get('/api/v1/mod10/shift-checklists', (req, res) => res.json({ items: [
  { checklist_id:1, checklist_ref:'SC-2026-0001', shift_type:'DAY', check_date:'2026-06-13', process_area:'FPI', equipment_ready:true, chemicals_ok:true, ppe_available:true, uv_lamp_checked:true, checked_by_name:'James Tan Wei Liang', supervisor_name:null, status:'SUBMITTED' },
], total: 1 }));
app.post('/api/v1/mod10/shift-checklists', (req, res) => res.status(201).json({ checklist_id:99, checklist_ref:'SC-2026-0099', message:'Checklist submitted.' }));
app.patch('/api/v1/mod10/shift-checklists/:id/approve', (req, res) => res.json({ message:'Checklist approved.' }));

// ── MOD-19 stubs ──────────────────────────────────────────────
app.get('/api/v1/mod19/alerts/summary', (req, res) => res.json({
  overdue_analyses: 1, due_soon: 3, low_stock: 1, lab_accred_expiring: 0, validation_overdue: 1, total: 3,
}));
app.get('/api/v1/mod19/analysis-schedules', (req, res) => res.json({ items: [
  { schedule_id:1, schedule_ref:'AS-2026-0001', analysis_name:'FPI Bath Concentration Check (Ardrox 9PR1)', analysis_type:'CHEMICAL', process_area:'FPI', frequency_type:'DAILY', next_due_date:'2026-06-13', last_done_date:'2026-06-12', responsible_name:'James Tan Wei Liang', external_lab:false, external_lab_name:null, days_to_due:0 },
  { schedule_id:2, schedule_ref:'AS-2026-0002', analysis_name:'MPT Particle Concentration (Carrier Fluid)', analysis_type:'CHEMICAL', process_area:'MPT', frequency_type:'WEEKLY', next_due_date:'2026-06-15', last_done_date:'2026-06-08', responsible_name:'Hendrich Lim Jun Wei', external_lab:false, external_lab_name:null, days_to_due:2 },
  { schedule_id:3, schedule_ref:'AS-2026-0003', analysis_name:'Chemical Bath Heavy Metal Analysis', analysis_type:'CHEMICAL', process_area:'CHEM_PROC', frequency_type:'QUARTERLY', next_due_date:'2026-06-01', last_done_date:'2026-03-01', responsible_name:'Gary Tan Beng Huat', external_lab:true, external_lab_name:'TÜV SÜD Singapore', days_to_due:-12 },
], total: 3 }));
app.post('/api/v1/mod19/analysis-schedules', (req, res) => res.status(201).json({ schedule_id:99, schedule_ref:'AS-2026-0099', message:'Schedule created.' }));
app.get('/api/v1/mod19/analysis-results', (req, res) => res.json({ items: [
  { result_id:1, result_ref:'AR-2026-0001', analysis_name:'FPI Bath Concentration Check (Ardrox 9PR1)', process_area:'FPI', test_date:'2026-06-12T08:00:00Z', result_value:'4.2', result_unit:'% v/v', pass_fail:'PASS', out_of_spec:false, tested_by_name:'James Tan Wei Liang' },
], total: 1 }));
app.post('/api/v1/mod19/analysis-results', (req, res) => res.status(201).json({ result_id:99, result_ref:'AR-2026-0099', message:'Result recorded.' }));
app.get('/api/v1/mod19/chemical-inventory', (req, res) => res.json({ items: [
  { chem_id:1, chem_code:'CHEM-001', chem_name:'Ardrox 9PR1 Fluorescent Penetrant', cas_number:'64742-47-8', process_use:'FPI penetrant', unit_of_measure:'L', qty_on_hand:18.5, qty_minimum:20.0, location:'FPI Store Room', sds_version:'Rev 3', sds_date:'2024-01-15', sds_next_review:'2026-01-15', hazard_class:'Flammable Liquid Cat 3', is_low_stock:1 },
  { chem_id:2, chem_code:'CHEM-002', chem_name:'Ardrox 9D1B Developer', cas_number:'7732-18-5', process_use:'FPI developer', unit_of_measure:'kg', qty_on_hand:12.0, qty_minimum:5.0, location:'FPI Store Room', sds_version:'Rev 2', sds_date:'2023-06-01', sds_next_review:'2025-06-01', hazard_class:'Non-Hazardous', is_low_stock:0 },
  { chem_id:3, chem_code:'CHEM-003', chem_name:'Magnaflux 7HF Magnetic Particle Concentrate', cas_number:'1309-37-1', process_use:'MPT wet fluorescent', unit_of_measure:'L', qty_on_hand:8.0, qty_minimum:5.0, location:'MPT Store Room', sds_version:'Rev 1', sds_date:'2024-03-01', sds_next_review:'2026-03-01', hazard_class:'Non-Hazardous', is_low_stock:0 },
], total: 3 }));
app.post('/api/v1/mod19/chemical-inventory', (req, res) => res.status(201).json({ chem_id:99, chem_code:'CHEM-099', message:'Chemical registered.' }));
app.post('/api/v1/mod19/chemical-inventory/:id/transaction', (req, res) => res.status(201).json({ message:'Transaction recorded.' }));
app.get('/api/v1/mod19/lab-validations', (req, res) => res.json({ items: [
  { validation_id:1, validation_ref:'LV-2026-0001', validation_type:'METHOD', description:'FPI penetrant system sensitivity verification (TAM Panel vs System Sensitivity Chart)', process_area:'FPI', standard_ref:'AC7114 §5.3 / ASTM E1417', validation_date:'2026-03-01', next_review_date:'2026-09-01', performed_by_name:'James Tan Wei Liang', approved_by_name:'Gary Tan Beng Huat', result:'VALID', days_to_review:80 },
], total: 1 }));
app.post('/api/v1/mod19/lab-validations', (req, res) => res.status(201).json({ validation_id:99, validation_ref:'LV-2026-0099', message:'Validation recorded.' }));
app.get('/api/v1/mod19/external-labs', (req, res) => res.json({ items: [
  { lab_id:1, lab_code:'ELAB-001', lab_name:'TÜV SÜD Singapore Pte Ltd', accreditation_body:'SAC-SINGLAS', accreditation_no:'LAB-001-2022', accreditation_expiry:'2026-12-31', scope_summary:'Chemical analysis, environmental testing, materials testing', contact_person:'Chen Wei Ming', approved_status:'APPROVED', last_audit_date:'2025-06-01', next_audit_date:'2026-06-01', days_to_expiry:201 },
], total: 1 }));
app.post('/api/v1/mod19/external-labs', (req, res) => res.status(201).json({ lab_id:99, lab_code:'ELAB-099', message:'External lab registered.' }));
app.get('/api/v1/mod19/external-lab-jobs', (req, res) => res.json({ items: [
  { ext_job_id:1, ext_job_ref:'ELJ-2026-0001', lab_name:'TÜV SÜD Singapore Pte Ltd', sample_desc:'Chemical bath sample — Ardrox 9PR1 heavy metal content analysis', submitted_date:'2026-06-01', expected_by:'2026-06-20', received_date:null, cert_number:null, pass_fail:'PENDING', submitted_by_name:'Gary Tan Beng Huat' },
], total: 1 }));
app.post('/api/v1/mod19/external-lab-jobs', (req, res) => res.status(201).json({ ext_job_id:99, ext_job_ref:'ELJ-2026-0099', message:'External lab job submitted.' }));
app.patch('/api/v1/mod19/external-lab-jobs/:id/result', (req, res) => res.json({ message:'Result recorded.' }));

// ── MOD-08 Audit Management ─────────────────────────────────
app.get('/api/v1/mod08/alerts/summary', (req, res) => res.json({
  planned_audits: 2, open_findings: 5, overdue_findings: 2, pending_verification: 3
}));
app.get('/api/v1/mod08/audit-plans', (req, res) => res.json([
  { audit_plan_id:1, audit_number:'AP-2026-0001', audit_title:'Annual Internal FPI Process Audit', audit_type:'INTERNAL',
    audit_scope:'Review all FPI process steps against AC7114 requirements', standard_ref:'AS9100D §9.2, AC7114 Rev F',
    planned_date:'2026-06-20', actual_date:null, lead_auditor_full_name:'James Tan Wei Liang',
    auditee_dept:'NDT Operations', status:'PLANNED', total_findings:0, open_findings:0 },
  { audit_plan_id:2, audit_number:'AP-2026-0002', audit_title:'NADCAP Pre-Audit Readiness Review', audit_type:'NADCAP',
    audit_scope:'Full NADCAP AC7114 checklist review prior to audit visit', standard_ref:'AC7114 Rev F Checklist',
    planned_date:'2026-07-10', actual_date:null, lead_auditor_full_name:'Sarah Lim Mei Ling',
    auditee_dept:'Quality Assurance', status:'PLANNED', total_findings:3, open_findings:3 },
  { audit_plan_id:3, audit_number:'AP-2025-0004', audit_title:'Q4 2025 Internal Audit — Document Control', audit_type:'INTERNAL',
    audit_scope:'Review document control processes per AS9100D §7.5', standard_ref:'AS9100D §7.5',
    planned_date:'2025-11-15', actual_date:'2025-11-16', lead_auditor_full_name:'Ahmad Bin Rashid',
    auditee_dept:'Administration', status:'COMPLETE', overall_result:'MINOR_NC', total_findings:2, open_findings:0 },
]));
app.get('/api/v1/mod08/audit-plans/:id', (req, res) => res.json({
  audit_plan_id:1, audit_number:'AP-2026-0001', audit_title:'Annual Internal FPI Process Audit',
  audit_type:'INTERNAL', audit_scope:'Review all FPI process steps against AC7114 requirements',
  standard_ref:'AS9100D §9.2, AC7114 Rev F', planned_date:'2026-06-20', status:'PLANNED',
  auditee_dept:'NDT Operations', lead_auditor_full_name:'James Tan Wei Liang',
  findings:[], checklist:[]
}));
app.post('/api/v1/mod08/audit-plans', (req, res) => res.status(201).json({ audit_plan_id:99, audit_number:'AP-2026-0099' }));
app.patch('/api/v1/mod08/audit-plans/:id/status', (req, res) => res.json({ message:'Status updated.' }));
app.patch('/api/v1/mod08/audit-plans/:id/checklist/:iid', (req, res) => res.json({ message:'Updated.' }));

app.get('/api/v1/mod08/findings', (req, res) => res.json([
  { finding_id:1, finding_number:'AF-2026-0001', audit_number:'AP-2026-0002', finding_type:'MINOR_NC',
    clause_reference:'AC7114 §4.3.2', description:'UV lamp intensity not recorded in calibration log for 3 consecutive weeks',
    objective_evidence:'Calibration log entries missing weeks 18–20 of 2026', assigned_full_name:'Ahmad Bin Rashid',
    due_date:'2026-07-01', status:'OPEN', root_cause:null, corrective_action:null },
  { finding_id:2, finding_number:'AF-2026-0002', audit_number:'AP-2026-0002', finding_type:'OBSERVATION',
    clause_reference:'AS9100D §8.5.1', description:'Process traveler sign-off fields not consistently completed',
    objective_evidence:'Sample of 10 job travelers: 4 had blank sign-off fields', assigned_full_name:'Sarah Lim Mei Ling',
    due_date:'2026-06-30', status:'RESPONSE_SUBMITTED', root_cause:'Awareness gap in process', corrective_action:'Refresher training scheduled' },
  { finding_id:3, finding_number:'AF-2025-0009', audit_number:'AP-2025-0004', finding_type:'MINOR_NC',
    clause_reference:'AS9100D §7.5.3', description:'Document revision history not updated on 2 controlled documents',
    objective_evidence:'Docs ATCA-QP-003 Rev B and ATCA-WI-012 Rev A', assigned_full_name:'James Tan Wei Liang',
    due_date:'2025-12-15', status:'VERIFIED', root_cause:'Document control procedure not followed', corrective_action:'Procedure reviewed with all document owners' },
]));
app.post('/api/v1/mod08/findings', (req, res) => res.status(201).json({ finding_id:99, finding_number:'AF-2026-0099' }));
app.post('/api/v1/mod08/findings/:id/response', (req, res) => res.json({ message:'Response submitted.' }));
app.patch('/api/v1/mod08/findings/:id/verify', (req, res) => res.json({ message:'Finding verified.' }));

// ── MOD-13 Work Order / Job Traveler ────────────────────────
app.get('/api/v1/mod13/alerts/summary', (req, res) => res.json({
  active_jobs: 4, overdue_jobs: 1, pending_qa: 2, coc_pending: 1
}));
app.get('/api/v1/mod13/work-orders', (req, res) => res.json([
  { work_order_id:1, wo_number:'WO-2026-0001', job_title:'FPI + MPT on Engine Fan Blades Batch #12',
    customer_name:'SIA Engineering Company', part_number:'GE90-7B-FAN-BLADE', priority:'HIGH',
    planned_end:'2026-06-15', status:'IN_PROGRESS', total_steps:4, done_steps:2,
    assigned_supervisor_id:1, supervisor_name:'James Tan Wei Liang' },
  { work_order_id:2, wo_number:'WO-2026-0002', job_title:'Chemical Bath + Visual Inspection — Landing Gear Components',
    customer_name:'ST Engineering Aerospace', part_number:'LG-ACTUATOR-A320', priority:'NORMAL',
    planned_end:'2026-06-20', status:'PENDING_QA', total_steps:3, done_steps:3,
    assigned_supervisor_id:2, supervisor_name:'Sarah Lim Mei Ling' },
  { work_order_id:3, wo_number:'WO-2026-0003', job_title:'MPT on Turbine Disc Slots',
    customer_name:'Rolls-Royce Singapore', part_number:'RR-DISC-TRENT-1000', priority:'URGENT',
    planned_end:'2026-06-14', status:'IN_PROGRESS', total_steps:2, done_steps:0,
    assigned_supervisor_id:1, supervisor_name:'James Tan Wei Liang' },
]));
app.get('/api/v1/mod13/work-orders/:id', (req, res) => res.json({
  work_order_id:1, wo_number:'WO-2026-0001', job_title:'FPI + MPT on Engine Fan Blades Batch #12',
  customer_name:'SIA Engineering Company', part_number:'GE90-7B-FAN-BLADE', quantity:12,
  priority:'HIGH', planned_end:'2026-06-15', status:'IN_PROGRESS',
  supervisor_name:'James Tan Wei Liang',
  steps:[
    { step_id:1, step_seq:1, step_name:'Pre-Cleaning', process_type:'OTHER', standard_ref:'ATCA-WI-003', status:'COMPLETE', assigned_name:'Ahmad Bin Rashid', completed_name:'Ahmad Bin Rashid', completed_at:'2026-06-12' },
    { step_id:2, step_seq:2, step_name:'FPI Inspection', process_type:'FPI', standard_ref:'AC7114 §4', status:'COMPLETE', assigned_name:'James Tan Wei Liang', completed_name:'James Tan Wei Liang', completed_at:'2026-06-13' },
    { step_id:3, step_seq:3, step_name:'MPT Inspection', process_type:'MPT', standard_ref:'AC7114 §5', status:'PENDING', assigned_name:'Sarah Lim Mei Ling', completed_name:null, completed_at:null },
    { step_id:4, step_seq:4, step_name:'Final Visual + Dimensional', process_type:'VISUAL', standard_ref:'Customer Spec Rev C', status:'PENDING', assigned_name:null, completed_name:null, completed_at:null },
  ],
  documents:[], notes:[
    { note_type:'STATUS_CHANGE', note_text:'Status changed to IN_PROGRESS', created_at:'2026-06-11' },
  ]
}));
app.post('/api/v1/mod13/work-orders', (req, res) => res.status(201).json({ work_order_id:99, wo_number:'WO-2026-0099' }));
app.patch('/api/v1/mod13/work-orders/:id/status', (req, res) => res.json({ message:'Status updated.' }));
app.patch('/api/v1/mod13/work-orders/:id/steps/:sid/complete', (req, res) => res.json({ message:'Step signed off.' }));

// ── MOD-17 MPT Process Control ───────────────────────────────
app.get('/api/v1/mod17/alerts/summary', (req, res) => res.json({
  active_jobs: 3, pending_review: 1, overdue: 1, rejected_this_month: 0
}));
app.get('/api/v1/mod17/jobs', (req, res) => res.json([
  { mpt_job_id:1, job_number:'MPT-2026-0001', customer_name:'SIA Engineering Company',
    part_number:'GE90-7B-FAN-BLADE', technique:'WET_FLUORESCENT', magnetisation_method:'CIRCULAR',
    inspector_name:'James Tan Wei Liang', planned_date:'2026-06-14', status:'IN_PROGRESS', steps_done:2 },
  { mpt_job_id:2, job_number:'MPT-2026-0002', customer_name:'Rolls-Royce Singapore',
    part_number:'RR-DISC-TRENT-1000', technique:'WET_FLUORESCENT', magnetisation_method:'MULTIDIRECTIONAL',
    inspector_name:'Sarah Lim Mei Ling', planned_date:'2026-06-13', status:'RECEIVED', steps_done:0 },
  { mpt_job_id:3, job_number:'MPT-2026-0003', customer_name:'ST Engineering Aerospace',
    part_number:'LG-ACTUATOR-A320', technique:'DRY', magnetisation_method:'LONGITUDINAL',
    inspector_name:'Ahmad Bin Rashid', planned_date:'2026-06-10', status:'ACCEPTED', steps_done:6 },
]));
app.get('/api/v1/mod17/jobs/:id', (req, res) => res.json({
  mpt_job_id:1, job_number:'MPT-2026-0001', customer_name:'SIA Engineering Company',
  part_number:'GE90-7B-FAN-BLADE', technique:'WET_FLUORESCENT', magnetisation_method:'CIRCULAR',
  material_spec:'AMS2641', quantity:12, status:'IN_PROGRESS', inspector_name:'James Tan Wei Liang',
  steps:[
    { step_id:1, step_number:1, step_name:'Pre-Cleaning', status:'COMPLETE', performed_name:'Ahmad Bin Rashid', cleaning_method:'Solvent wipe', solvent_used:'MEK' },
    { step_id:2, step_number:2, step_name:'Equipment Setup & Verification', status:'COMPLETE', performed_name:'James Tan Wei Liang', uv_lamp_intensity_fc:1200, uv_lamp_ok:true, ambient_light_fc:1.5, ambient_light_ok:true },
    { step_id:3, step_number:3, step_name:'Magnetisation', status:'PENDING', performed_name:null },
    { step_id:4, step_number:4, step_name:'Particle Application', status:'PENDING', performed_name:null },
    { step_id:5, step_number:5, step_name:'Examination & Interpretation', status:'PENDING', performed_name:null },
    { step_id:6, step_number:6, step_name:'Demagnetisation & Post-Cleaning', status:'PENDING', performed_name:null },
  ],
  result:null
}));
app.post('/api/v1/mod17/jobs', (req, res) => res.status(201).json({ mpt_job_id:99, job_number:'MPT-2026-0099' }));
app.patch('/api/v1/mod17/jobs/:id/steps/:sn', (req, res) => res.json({ message:'Step updated.' }));
app.patch('/api/v1/mod17/jobs/:id/status', (req, res) => res.json({ message:'Status updated.' }));
app.post('/api/v1/mod17/results', (req, res) => res.status(201).json({ result_id:99 }));

// ── MOD-24 Certificate of Conformance ───────────────────────
app.get('/api/v1/mod24/alerts/summary', (req, res) => res.json({
  draft_cocs: 2, issued_cocs: 15, pending_coc: 1, voided_cocs: 0
}));
app.get('/api/v1/mod24/cocs', (req, res) => res.json([
  { coc_id:1, coc_number:'COC-2026-0001', customer_name:'SIA Engineering Company',
    customer_po:'PO-2026-0088', part_number:'GE90-7B-FAN-BLADE', quantity_certified:12,
    process_fpi:true, process_mpt:true, process_chem_bath:false, process_other:null,
    issued_by_name:'James Tan Wei Liang', approved_by_name:'James Tan Wei Liang',
    issued_at:'2026-06-10', status:'ISSUED' },
  { coc_id:2, coc_number:'COC-2026-0002', customer_name:'Rolls-Royce Singapore',
    customer_po:'PO-2026-0101', part_number:'RR-DISC-TRENT-1000', quantity_certified:4,
    process_fpi:false, process_mpt:true, process_chem_bath:false, process_other:null,
    issued_by_name:null, approved_by_name:null, issued_at:null, status:'DRAFT' },
  { coc_id:3, coc_number:'COC-2026-0003', customer_name:'ST Engineering Aerospace',
    customer_po:'PO-2026-0077', part_number:'LG-ACTUATOR-A320', quantity_certified:8,
    process_fpi:true, process_mpt:false, process_chem_bath:true, process_other:null,
    issued_by_name:'Sarah Lim Mei Ling', approved_by_name:'Sarah Lim Mei Ling',
    issued_at:'2026-06-08', status:'ISSUED' },
]));
app.get('/api/v1/mod24/cocs/:id', (req, res) => res.json({
  coc_id:2, coc_number:'COC-2026-0002', customer_name:'Rolls-Royce Singapore',
  customer_po:'PO-2026-0101', part_number:'RR-DISC-TRENT-1000', part_description:'HP Turbine Disc',
  part_serial_no:'SN-2026-0044', quantity_certified:4,
  process_fpi:false, process_mpt:true, process_chem_bath:false, process_other:null,
  specification_refs:'AMS2641, AC7114 Rev F, Customer Spec RR-NDT-001',
  material_cert_ref:'CERT-2026-0089', inspection_report_ref:'IR-2026-0033',
  conformance_statement:'We hereby certify that the product described above was produced, inspected and tested in accordance with the referenced specifications and requirements, and meets all applicable requirements.',
  exceptions_noted:null, status:'DRAFT', issued_at:null, approved_by_name:null,
  issued_by_name:null, approved_at:null,
  line_items:[
    { line_seq:1, process_module:'MOD17', reference_number:'MPT-2026-0003', process_description:'Magnetic Particle Testing', result:'ACCEPT', notes:'No relevant indications found' },
  ]
}));
app.post('/api/v1/mod24/cocs', (req, res) => res.status(201).json({ coc_id:99, coc_number:'COC-2026-0099' }));
app.patch('/api/v1/mod24/cocs/:id/issue', (req, res) => res.json({ message:'CoC issued.' }));
app.patch('/api/v1/mod24/cocs/:id/void', (req, res) => res.json({ message:'CoC voided.' }));

/* ── Page routes ───────────────────────────────────────────── */
app.get('/login',  (req, res) => res.sendFile(path.join(FRONTEND_DIR, 'login.html')));
app.get('/logout', (req, res) => res.redirect('/login'));
app.get('*',       (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ message: 'Not found.' });
  res.sendFile(path.join(FRONTEND_DIR, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[ATCA-ERP Preview] http://localhost:${PORT}/login`);
  console.log(`  Login: admin / preview123`);
});
