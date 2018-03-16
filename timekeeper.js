/* jshint esversion:6 */

var alarmListener = function(alarm) {
    if (alarm.name == 'wdttg_alarm') {
        getActiveHosts(function(ge,gd) {
            if (!ge) {
                updateHostData(gd,function(ue,ud) {
                    console.log(ue,ud);
                });
            }
        });
    }
};

var extractHostName = function(url) {
    var hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname

    if (url.indexOf("://") > -1) {
        hostname = url.split('/')[2];
    }
    else {
        hostname = url.split('/')[0];
    }

    //find & remove port number
    hostname = hostname.split(':')[0];
    //find & remove "?"
    hostname = hostname.split('?')[0];

    return hostname;
};

var DateToDateString = function(idt) {
    var d = idt;
    d.setHours(0,0,0,0);
    return d.toISOString();
};

var updateHostData = function(current,cb) {
   chrome.storage.local.get(['hostdata'],function(sdata) {
       if (!sdata || !sdata.hostdata) {
           sdata = { hostdata: {} };
       }
       var dtstr = DateToDateString(new Date());
       if (!sdata.hostdata[dtstr]) {
           sdata.hostdata[dtstr] = { showing: {}, active: {} };
       }
       Object.keys(current).forEach(function(groupname) {
           current[groupname].forEach(function(host) {
               if (!sdata.hostdata[dtstr][groupname][host]) {
                   sdata.hostdata[dtstr][groupname][host] = 1;
               } else {
                   sdata.hostdata[dtstr][groupname][host] += 1;
               }
           });
       });
       chrome.storage.local.set({hostdata: sdata.hostdata});
       cb(null,sdata);
   });
};

var getActiveHosts = function(cb) {
  chrome.windows.getAll({populate:true},function(windows){
    var rv = { showing: [], active: [] };
    windows.forEach(function(window){
      var window_showing  = window.state != 'minimized';
      window.tabs.forEach(function(tab){
        var host = extractHostName(tab.url);
        var showing = tab.active && window_showing;
        var active = showing && window.focused;
        if (showing) rv.showing.push(host);
        if (active) rv.active.push(host);
      });
    });
    if (!rv.showing.length) rv.showing.push('[Browser not showing]');
    if (!rv.active.length) rv.active.push('[Browser not focused]');
    return cb(null,rv);
  });
};

var period = 1.0;
if (false) period = 0.1667;

var init = function() {
    chrome.alarms.onAlarm.addListener(alarmListener);
    chrome.alarms.create('wdttg_alarm', { delayInMinutes: period, periodInMinutes: period });
};


init();

