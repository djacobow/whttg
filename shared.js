/*jshint esversion:6 */
var debug_mode = false;

var log_count = 0;

function gebi(n) { return document.getElementById(n); }

function cr(n,c,it) {
    var e = document.createElement(n);
    if (c) e.className = c;
    if (it) e.innerText = it;
    return e;
}


function log(t) {
    try {
        sd = document.getElementById('statusdiv');
        sd.innerText += '(' + log_count + '): ' + t + "\n";
        sd.scrollTop = sd.scrollHeight;
        log_count += 1;
    } catch (e) {}
    if (debug_mode) {
        console.log(t);
    }
}

function removeChildrenReplaceWith(elem, newchildren) {
    while (elem.firstChild) {
        elem.removeChild(elem.firstChild);
    }
    for (var i = 0; i < newchildren.length; i++) {
        elem.appendChild(newchildren[i]);
    }
}

function useIfElse(dict, name, deflt) {
    return dict.hasOwnProperty(name) ? dict[name] : deflt;
}
