/*jshint esversion:6 */

var Configuration = function(defaults = null) {
    this.defaults = defaults;
    this.config = {};
    this.control_linkages = {};
    var tthis = this;
    Object.keys(this.defaults).forEach(function(n) {
        tthis.config[n] = tthis.defaults[n];
    });
};

Configuration.prototype.load = function(cb = null) {
    var tthis = this;
    chrome.storage.local.get(['config'],function(cd) {
        if (cd && cd.config) {
            Object.keys(cd.config).forEach(function(kn) {
                tthis.config[kn] = cd.config[kn];
            });
        }
        tthis.resetControls();
        if (cb) return cb();
    });
};

Configuration.prototype.resetControls = function() {
    var tthis = this;
    Object.keys(this.control_linkages).forEach(function(vn) {
        var val = tthis.config[vn];
        var elem = gebi(tthis.control_linkages[vn]);
        elem.value = val;
    });
};

Configuration.prototype.linkToControl = function(associations) {

    var tthis = this;
    associations.forEach(function(association) {
      var ename = association.element;
      var vname = association.variable;

      tthis.control_linkages[vname] = ename;

      gebi(ename).addEventListener('change',function(ev) {
        var value = ev.target.value;
        tthis.set(vname,value,true);
        drawChartWrapper();
      });
    });
};



Configuration.prototype.store = function(cb = null) {
    chrome.storage.local.set({config: this.config}, function() {
        if (cb) return cb();
    });
};

Configuration.prototype.get = function(n) {
    if (this.config && this.config[n]) return this.config[n];
    return null;
};

Configuration.prototype.set = function(n,v,store = true, cb=null) {
    this.config[n] = v;
    this.store(cb);
};

var host2 = function(host) {
    var chunks = host.split(/\./);
    var rv = host;
    if (chunks.length > 2) {
        rv = chunks.slice(-2).join('.');
    }
    return rv;
};


var getData = function(from, to, group, cb) {
    chrome.storage.local.get(['hostdata'],function(gd) {
        var timecounts = {};
        if (gd && gd.hostdata) {
            Object.keys(gd.hostdata).forEach(function(dtstr) {
                var ddate = new Date(dtstr);
                if ((ddate <= to) && (ddate >= from)) {
                    var hostcounts = gd.hostdata[dtstr][group];
                    Object.keys(hostcounts).forEach(function(hostname) {
                        var shostname = cfg.get('toponly') == 'true' ? host2(hostname) : hostname;
                        if (timecounts[shostname]) {
                            timecounts[shostname] += hostcounts[hostname];
                        } else {
                            timecounts[shostname] = hostcounts[hostname];
                        }
                    });
                }
            });
            return cb(null,timecounts);
        }
        return cb('no_data');
    });
};

var todayMidnight = function() {
    var d = new Date();
    d.setHours(0,0,0,0);
    return d;
};

function clearStorage( cb = null) {
    chrome.storage.local.clear(function() {
        if (cb) return cb();
    });
}

var drawChart = function(target, from, to, group, cb = null) {
    getData(from, to, group, function(ge,gd) {
        var data = [['site','minutes']];
        var total_minutes = 0;
        var total_browser_minutes = 0;
        if (!gd) {
            if (cb) cb('no_data');
            return;
        }
        Object.keys(gd).forEach(function(hostname) {
            var minutes = gd[hostname];
            data.push([hostname, minutes]);
            total_minutes += minutes;
            if (!hostname.match(/^\[/)) total_browser_minutes += minutes;
        });
        gebi('total_minutes').innerText = 
            'Total minutes recorded: ' + total_minutes;
        gebi('browser_minutes').innerText = 
            'Total time in browser: ' + total_browser_minutes;
        var cdata = google.visualization.arrayToDataTable(data);
        var chart = null;
        var daterange = from.toDateString();
        if (from.getDate() != to.getDate()) {
            daterange += ' to ' + to.toDateString();
        }
        var chtype = cfg.get('graphtype');
        var choptions = {
            legend: 'none',
            backgroundColor: '#dee6f2',
            width: 500,
            height: 500,
            title: 'How I spent ' + daterange + '.',
        };
        switch (chtype) {
            case 'pie':
                choptions.pieSliceText = 'label';
                choptions.chartArea = {
                    width: '95%',
                    height: '95%',
                };
                chart = new google.visualization.PieChart(target);
                break;
            case 'column':
                /*
                choptions.chartArea = {
                    width: '65%',
                    height: '65%',
                };
                */
                choptions.vAxis = {
                    title: 'minutes',
                };
                chart = new google.visualization.ColumnChart(target);
                break;
            default:
                chart = new google.visualization.PieChart(target);
        }
        chart.draw(cdata, choptions);
        if (cb) return cb();
    });
};

var populateDateRange = function(cb) {
    chrome.storage.local.get(['hostdata'],function(gd) {
        if (gd && gd.hostdata) {
            var dates = Object.keys(gd.hostdata);
            var to_sel = gebi('to_sel');
            var fr_sel = gebi('fr_sel');

            dates.forEach(function(ds_long) {
                var d = new Date(ds_long);
                var ds_short = d.toDateString();
                var opt0 = cr('option',null,ds_short);
                var opt1 = cr('option',null,ds_short);
                opt0.value = ds_long;
                opt1.value = ds_long;
                to_sel.appendChild(opt0);
                fr_sel.appendChild(opt1);
            });
        }
        return cb();
    });
};

var drawChartWrapper = function(cb = null) {
    var today = todayMidnight();
    var to_d = new Date(today);
    var fr_d = new Date(today);
    var dur  = cfg.get('timerange');
    switch (dur) {
        case 'today':
            break;
        case 'yesterday':
            to_d.setDate(today.getDate() - 1);
            fr_d.setDate(today.getDate() - 1);
            break;
        case '1week':
            fr_d.setDate(today.getDate() - 7);
            break;
        case '2week':
            fr_d.setDate(today.getDate() - 14);
            break;
        default:
            break;
    }
    drawChart(
        gebi('timechart'), 
        fr_d, to_d,
        cfg.get('type'),
        function() { 
            if (cb) cb();
        }
    );
};

var toChanged = function(ev) {
    var dt_to = new Date(gebi('to_sel').value);
    var dt_fr = new Date(gebi('fr_sel').value);
    if (dt_fr > dt_fr) {
        gebi('fr_sel').value = gebi('to_sel').value;
    }

    drawChartWrapper();
};

var frChanged = function(ev) {
    var dt_to = new Date(gebi('to_sel').value);
    var dt_fr = new Date(gebi('fr_sel').value);
    if (dt_to < dt_fr) {
        gebi('to_sel').value = gebi('fr_sel').value;
    }
    drawChartWrapper();
};


var cfg = new Configuration(defaults);

function options_init() {
    gebi('dclear').addEventListener('click',clearStorage);
    cfg.linkToControl([
        { element: 'type',      variable: 'type', },
        { element: 'toponly',   variable: 'toponly', },
        { element: 'timerange', variable: 'timerange', },
        { element: 'graphtype', variable: 'graphtype', },
    ]);

    document.addEventListener('DOMContentLoaded', function() {
      google.charts.load('upcoming',{'packages':['corechart','bar']});
      google.charts.setOnLoadCallback(function() {
        cfg.load(function() {
          var tmn = todayMidnight();
          setTimeout(function() {
            drawChartWrapper(function() {
            });
          },200);
        });
      });
    });
}

options_init();
