'use strict';
//console.log("88888");
// simple express server
var express = require('express');
var app = express();
app.set('view engine', 'ejs');
var router = express.Router();
var crypto = require('crypto');
var pg = require("pg");
var request = require('request');
var bodyParser = require('body-parser');
var session = require('express-session');
var config = require("./config");
var connectionString = config.postgres;
var db_name = config.db.CDC_contact_person;
var CDC_contact_person = require("./bin/CDC_contact_person");
var Common = require("./bin/Common");
app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.use('/javascripts', express.static('javascripts'));
app.use('/stylesheets', express.static('stylesheets'));
app.use(session({
	secret: 'lindingyuan', // 建议使用 128 个字符的随机字符串
	saveUninitialized: false,  // 是否自动保存未初始化的会话，建议false
	resave: false
	//cookie: { maxAge: 60 * 1000 }
}));
app.use(express.static('pages'));
app.get('/', function (req, res) {
	res.render('enter');
})
app.get('/view/muti_case', function (req, res) {
	if(req.session.name!=undefined){
		res.render('muti_case',{
			name: req.session.name,
			authority: req.session.authority,
			identity:req.session.identity
		});
	}else{
		res.render('enter');
	}
})
app.get('/view/one_case', function (req, res) {
	if(req.session.name!=undefined){
		res.render('one_case',{
			name: req.session.name,
			authority: req.session.authority,
			identity:req.session.identity
		});
	}else{
		res.render('enter');
	}
})
app.get('/view/trace_report_chart', function (req, res) {
	if(req.session.name!=undefined){
		res.render('trace_report_chart',{
			name: req.session.name,
			authority: req.session.authority,
			identity:req.session.identity
		});
	}else{
		res.render('enter');
	}
})
app.get('/view/view_case', function (req, res) {
	if(req.session.name!=undefined){
		res.render('view_case',{
			name: req.session.name,
			authority: req.session.authority,
			identity:req.session.identity,
			disease:req.query.disease
		});
	}else{
		res.render('enter');
	}
})
app.get('/view/waiting_case', function (req, res) {
	if(req.session.name!=undefined){
		res.render('waiting_case',{
			name: req.session.name,
			authority: req.session.authority,
			identity:req.session.identity
		});
	}else{
		res.render('enter');
	}
})
app.get('/view/contact_edit', function (req, res) {
	if(req.session.name!=undefined){
		res.render('contact_edit',{
			name: req.session.name,
			authority: req.session.authority,
			identity:req.session.identity
		});
	}else{
		res.render('enter');
	}
})
app.get('/view/add_news', function (req, res) {
	if(req.session.name!=undefined){
		res.render('add_news',{
			name: req.session.name,
			authority: req.session.authority,
			identity:req.session.identity
		});
	}else{
		res.render('enter');
	}
})
app.get('/view/add_muti_case', function (req, res) {
	if(req.session.name!=undefined){
		res.render('add_muti_case',{
			name: req.session.name,
			authority: req.session.authority,
			identity:req.session.identity
		});
	}else{
		res.render('enter');
	}
})
app.all('/api/cdc_check_authority', function (req, res) {
	var pg = require('pg');
	var conString = connectionString + db_name;
	var client = new pg.Client(conString);
	client.connect();
	client.query('SELECT * FROM "member" left join "permission_set" on "member"."identity" = "permission_set"."identity"  WHERE "name"=$1::text AND \"pass\"= $2::text',[req.body.name, req.body.pass], function (err, row) {
		var identity;
		
		if (row.rowCount > 0) {
			if(row.rows[0]["authority"]=='1'){identity='管理員'}
			if(row.rows[0]["authority"]=='2'){identity='疾管署'}
			if(row.rows[0]["authority"]=='3'){identity='區管'}
			if(row.rows[0]["authority"]=='4'){identity='衛生局'}
			if(row.rows[0]["authority"]=='5'){identity='衛生所'}
			req.session.name = row.rows[0]["name"];
			req.session.authority =row.rows[0]["authority"];
			req.session.identity = identity;
			res.render('one_case', {
                name: row.rows[0]["name"],
				authority: row.rows[0]["authority"],
				identity:identity
            });
		} else {
			res.render('enter');
		}
	});
});

// CDC接觸者
app.all(["/api/CDC_contact_person/:name", "/api/CDC_contact_person/:name/*"], function (req, res) {
	// if hydro data hava a object, then use it
	var functionName = req.params.name.toLowerCase();
	
	var query = req.query;

	var ftype = "json"; // default json
	if (query.ftype && ["json", "kml", "xml"].indexOf(query.ftype)) {
		ftype = query.ftype;
	}

	if (functionName && CDC_contact_person[functionName]) {
		getDataFromPostgres(res,
			CDC_contact_person[functionName].db,
			CDC_contact_person[functionName].queryString(query),
			CDC_contact_person[functionName].rearrangeFunction,
			CDC_contact_person[functionName].isGeoData,
			ftype);
	} else {
		res.send("Wrong parameters or function name");
	}
});



function getDataFromPostgres(res, db, queryString, rearrangeFunction, isGeoData, ftype) {
	if (queryString == null) {
		res.writeHead(500);
		res.end(JSON.stringify({ success: false, message: "wrong query" }));
		return;
	}

	var client = new pg.Client(connectionString + db);
	client.connect(function (err) {
		if (err) {
			Common.logWithDatetime("db connect error", err);
			res.writeHead(500);
			res.end(JSON.stringify({ success: false, message: "could not connect to db" }));
			return;
		}
		client.query(queryString, function (err, data) {
			if (err) {
				Common.logWithDatetime("data select error", err);
				res.writeHead(500);
				res.end(JSON.stringify({ success: false, message: "select data error" }));
				return;
			}
			client.end();

			// data rearrange or not
			var result;
				if (typeof (rearrangeFunction) === "function") {
					result = rearrangeFunction(data);
				} else {
					result = data;
				}


			//choose file type
			switch (ftype) {
				case "json":
					res.writeHead(200, {
						"Content-Type": "application/json; charset=utf-8"
					});
					res.end(JSON.stringify(result), 'utf-8');
					break;
				case "kml":
					//should be geo data
					if (isGeoData) {
						res.writeHead(200, {
							"Content-Type": "application/vnd.google-earth.kml+xml; charset=utf-8",
							"Content-disposition": "attachment; filename=data.kml"
						});
						res.end(tokml(result), 'utf-8');
					} else {
						res.writeHead(200, {
							"Content-Type": "application/json; charset=utf-8"
						});
						res.end(JSON.stringify({ success: false, data: {}, message: "not a geo data, can not use kml format" }));
					}
					break;
				case "xml":
					res.writeHead(200, {
						"Content-Type": "application/xml; charset=utf-8"
					});
					res.end(js2xmlparser("conetent", result), "utf-8");
					break;
				// case "csv":
				// 	res.writeHead(200, {
				// 		"Content-Type": "text/csv; charset=utf-8"
				// 	});
				// 	json2csv({ data: result }, function (err, csv) {
				// 		if (err) console.log(err);
				// 		//console.log(csv);
				// 		res.end(csv, "utf-8");
				// 	});
				// 	break;
				default: // default json
					res.writeHead(200, {
						"Content-Type": "application/json; charset=utf-8"
					});
					res.end(JSON.stringify(result), 'utf-8');
					break;
			}
			Common.logWithDatetime(db, queryString, ftype);
			return;
		});
	});
}
app.listen(3310);