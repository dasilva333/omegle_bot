var express = require('express');
var router = express.Router();

/* GET logs listing. */
router.get('/', function(req, res, next) {
  res.render('logs', { title: 'Logs' });
});


module.exports = router;
