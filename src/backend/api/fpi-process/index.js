/**
 * ATCA-ERP v1.0 — MOD-03 Router
 * NADCAP AC7114 | ASTM E1417 | AMS 2644 | NAS410
 */
'use strict';

const express = require('express');
const router  = express.Router();

router.use('/', require('./fpi-inspection.routes'));

module.exports = router;
