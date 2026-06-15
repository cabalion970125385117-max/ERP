/**
 * ATCA-ERP v1.0 — MOD-06 Router
 * NADCAP AC7108 | AC7110 | AC7114
 */
'use strict';

const express = require('express');
const router  = express.Router();

router.use('/', require('./chemical-baths.routes'));

module.exports = router;
