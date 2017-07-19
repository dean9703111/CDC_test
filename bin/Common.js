//var fs = require("fs");
var Common = {};

Common.genQueryString = function(query, whereArray, orderbyArray) {
    var conditionString = "";
    if (query && query.bbox) {
        if (!whereArray) whereArray = [];
        var bbox = query.bbox.split(",");
        if (!isNaN(bbox[0]) && !isNaN(bbox[1]) && !isNaN(bbox[2]) && !isNaN(bbox[3])) {
            var polygon = "POLYGON((" + bbox[0] + " " + bbox[1] + "," + bbox[2] + " " + bbox[1] + "," + bbox[2] + " " + bbox[3] + "," + bbox[0] + " " + bbox[3] + "," + bbox[0] + " " + bbox[1] + "))";
            //conditionString += "ST_Intersects(\"wgs84\", ST_GeomFromText('" + polygon + "',4326))";
            whereArray.push("ST_Intersects(\"wgs84\", ST_GeomFromText('" + polygon + "',4326))");
        }

        query.all = "true";
    }

    //generate where string
    if (whereArray && whereArray.length > 0) conditionString += " WHERE " + whereArray.join(" AND ");
    //generate order by string
    if (orderbyArray && orderbyArray.length > 0) conditionString += " Order by " + orderbyArray.join(",");

    if (query && query.all && query.all.toLowerCase() === "true") {
        conditionString += ";";
    } else {
        conditionString += " limit 100;";
    }
    return conditionString;
}

// generate geo json object structure
Common.genGeoJsonObj = function(columns, data) {
    var result = {};
    result.type = "FeatureCollection";
    result.features = [];
    for (var i = 0; i < data.rowCount; i++) {
        var row = {};
        row.type = "Feature";
        row.geometry = JSON.parse(data.rows[i].st_asgeojson);
        row.properties = {};
        // if object key have value,then use it, else ""
        for (var j = 0; j < columns.length; j++) {
            row.properties[columns[j]] = data.rows[i][columns[j]] ? data.rows[i][columns[j]] : "";
        }
        result.features.push(row);
    }
    return result;
}

Common.datetimeFormat = function (datetime) {
    return datetime.getFullYear() + "/" + toDoubleDigit(datetime.getMonth() + 1) + "/" + toDoubleDigit(datetime.getDate()) + " " +
        toDoubleDigit(datetime.getHours()) + ":" + toDoubleDigit(datetime.getMinutes()) + ":" + toDoubleDigit(datetime.getSeconds());
}

Common.datetimeFormatMillisecond = function (datetime) {
    return datetime.getFullYear() + "/" + toDoubleDigit(datetime.getMonth() + 1) + "/" + toDoubleDigit(datetime.getDate()) + " " +
        toDoubleDigit(datetime.getHours()) + ":" + toDoubleDigit(datetime.getMinutes()) + ":" + toDoubleDigit(datetime.getSeconds()) + "." + toTripleDigit(datetime.getMilliseconds());
}

// Common.datetimeFormatSecond = function (datetime) {
// 	return datetime.getFullYear() + "/" + toDoubleDigit(datetime.getMonth() + 1) + "/" + toDoubleDigit(datetime.getDate()) + " " +
// 		toDoubleDigit(datetime.getHours()) + ":" + toDoubleDigit(datetime.getMinutes()) + ":" + toDoubleDigit(datetime.getSeconds());
// }

Common.dateFormatFlat = function (datetime) {
    return datetime.getFullYear() + "" + toDoubleDigit(datetime.getMonth() + 1) + "" + toDoubleDigit(datetime.getDate());
}

Common.logWithDatetime = function () {
    var log = Common.datetimeFormatMillisecond(new Date());
    for (var i in arguments) {
        log += " | " + arguments[i];
    }
	
    // fs.appendFile("log/"+ Common.dateFormatFlat(new Date()) + ".log", log + "\n", function (err) {
    // 	if (err) console.log(err);
    // });
    //console.log(log);
}

Common.TWD67ToTWD97 = function (twd67_X, twd67_Y) {
    // parameters=======
    var g_TM2Factor_A = 0.00001549;
    var g_TM2Factor_B = 0.000006521;
    // =================

    var x = parseFloat(twd67_X) + 807.8 + g_TM2Factor_A * parseFloat(twd67_X) + g_TM2Factor_B * parseFloat(twd67_Y);
    var y = parseFloat(twd67_Y) - 248.6 + g_TM2Factor_A * parseFloat(twd67_Y) + g_TM2Factor_B * parseFloat(twd67_X);

    var TWD97XY = new Array(x, y)
    return TWD97XY;
}

Common.TWD97ToWGS84_121 = function (_x, _y) {
    // earth paremter====
    var pi = 3.141592653589793238462643383;

    var a = 6378137.0;
    var b = 6356752.314245;
    var lon0 = 121 * pi / 180;
    var k0 = 0.9999;
    var dx = 250000;
    //===================

    var dy = 0;
    var e = Math.pow((1 - Math.pow(b, 2) / Math.pow(a, 2)), 0.5);

    _x -= dx;
    _y -= dy;

    // Calculate the Meridional Arc
    var M = _y / k0;

    // Calculate Footprint Latitude
    var mu = M / (a * (1.0 - Math.pow(e, 2) / 4.0 - 3 * Math.pow(e, 4) / 64.0 - 5 * Math.pow(e, 6) / 256.0));
    var e1 = (1.0 - Math.pow((1.0 - Math.pow(e, 2)), 0.5)) / (1.0 + Math.pow((1.0 - Math.pow(e, 2)), 0.5));

    var J1 = (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32.0);
    var J2 = (21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32.0);
    var J3 = (151 * Math.pow(e1, 3) / 96.0);
    var J4 = (1097 * Math.pow(e1, 4) / 512.0);

    var fp = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);

    // Calculate Latitude and Longitude

    var e2 = Math.pow((e * a / b), 2);
    var C1 = Math.pow(e2 * Math.cos(fp), 2);
    var T1 = Math.pow(Math.tan(fp), 2);
    var R1 = a * (1 - Math.pow(e, 2)) / Math.pow((1 - Math.pow(e, 2) * Math.pow(Math.sin(fp), 2)), (3.0 / 2.0));
    var N1 = a / Math.pow((1 - Math.pow(e, 2) * Math.pow(Math.sin(fp), 2)), 0.5);

    var D = _x / (N1 * k0);

    // 計算緯度
    var Q1 = N1 * Math.tan(fp) / R1;
    var Q2 = (Math.pow(D, 2) / 2.0);
    var Q3 = (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e2) * Math.pow(D, 4) / 24.0;
    var Q4 = (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 3 * Math.pow(C1, 2) - 252 * e2) * Math.pow(D, 6) / 720.0;
    var lat = fp - Q1 * (Q2 - Q3 + Q4);

    // 計算經度
    var Q5 = D;
    var Q6 = (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6;
    var Q7 = (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e2 + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120.0;
    var lon = lon0 + (Q5 - Q6 + Q7) / Math.cos(fp);

    lat = (lat * 180) / Math.PI; //緯
    lon = (lon * 180) / Math.PI; //經

    var lonlat = new Array(lon, lat);
    return lonlat;
}

Common.TWD97ToWGS84_119 = function (_x, _y) {
    // earth paremter====
    var pi = 3.141592653589793238462643383;

    var a = 6378137.0;
    var b = 6356752.314245;
    var lon0 = 119 * pi / 180;
    var k0 = 0.9999;
    var dx = 250000;
    //===================

    var dy = 0;
    var e = Math.pow((1 - Math.pow(b, 2) / Math.pow(a, 2)), 0.5);

    _x -= dx;
    _y -= dy;

    // Calculate the Meridional Arc
    var M = _y / k0;

    // Calculate Footprint Latitude
    var mu = M / (a * (1.0 - Math.pow(e, 2) / 4.0 - 3 * Math.pow(e, 4) / 64.0 - 5 * Math.pow(e, 6) / 256.0));
    var e1 = (1.0 - Math.pow((1.0 - Math.pow(e, 2)), 0.5)) / (1.0 + Math.pow((1.0 - Math.pow(e, 2)), 0.5));

    var J1 = (3 * e1 / 2 - 27 * Math.pow(e1, 3) / 32.0);
    var J2 = (21 * Math.pow(e1, 2) / 16 - 55 * Math.pow(e1, 4) / 32.0);
    var J3 = (151 * Math.pow(e1, 3) / 96.0);
    var J4 = (1097 * Math.pow(e1, 4) / 512.0);

    var fp = mu + J1 * Math.sin(2 * mu) + J2 * Math.sin(4 * mu) + J3 * Math.sin(6 * mu) + J4 * Math.sin(8 * mu);

    // Calculate Latitude and Longitude

    var e2 = Math.pow((e * a / b), 2);
    var C1 = Math.pow(e2 * Math.cos(fp), 2);
    var T1 = Math.pow(Math.tan(fp), 2);
    var R1 = a * (1 - Math.pow(e, 2)) / Math.pow((1 - Math.pow(e, 2) * Math.pow(Math.sin(fp), 2)), (3.0 / 2.0));
    var N1 = a / Math.pow((1 - Math.pow(e, 2) * Math.pow(Math.sin(fp), 2)), 0.5);

    var D = _x / (N1 * k0);

    // 計算緯度
    var Q1 = N1 * Math.tan(fp) / R1;
    var Q2 = (Math.pow(D, 2) / 2.0);
    var Q3 = (5 + 3 * T1 + 10 * C1 - 4 * Math.pow(C1, 2) - 9 * e2) * Math.pow(D, 4) / 24.0;
    var Q4 = (61 + 90 * T1 + 298 * C1 + 45 * Math.pow(T1, 2) - 3 * Math.pow(C1, 2) - 252 * e2) * Math.pow(D, 6) / 720.0;
    var lat = fp - Q1 * (Q2 - Q3 + Q4);

    // 計算經度
    var Q5 = D;
    var Q6 = (1 + 2 * T1 + C1) * Math.pow(D, 3) / 6;
    var Q7 = (5 - 2 * C1 + 28 * T1 - 3 * Math.pow(C1, 2) + 8 * e2 + 24 * Math.pow(T1, 2)) * Math.pow(D, 5) / 120.0;
    var lon = lon0 + (Q5 - Q6 + Q7) / Math.cos(fp);

    lat = (lat * 180) / Math.PI; //緯
    lon = (lon * 180) / Math.PI; //經

    var lonlat = new Array(lon, lat);
    return lonlat;
}

function toDoubleDigit(numb) {
    if (parseInt(numb) < 10) {
        return "0" + numb;
    } else {
        return numb;
    }
}

function toTripleDigit(numb) {
    var int_temp = parseInt(numb);
    if (int_temp < 10) {
        return "00" + numb;
    } else if (int_temp >= 10 && int_temp < 100) {
        return "0" + numb;
    } else {
        return numb;
    }
}


module.exports = Common;