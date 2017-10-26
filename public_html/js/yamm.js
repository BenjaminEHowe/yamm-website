// set url parameters
var params;
var url;
if (window.location.href.indexOf("#") == -1) {
    params = [];
    url = window.location.href;
} else {
    params = window.location.href.split("#")[1].split(",");
    url = window.location.href.split("#")[0];
}

if (sessionStorage.port && sessionStorage.secret) { // if YAMM port and secret have been set
    console.log(params);
    if (params.length == 2 && params[0].indexOf("port") != -1 && params[1].indexOf("secret") != -1) {
        window.location.replace(url); // redirect to remove parameters        
    }
} else {
    for (i in params) {
        var param = params[i].split("=");
        if (param[0] == "port") {
            sessionStorage.port = param[1];
        } else if (param[0] == "secret") {
            sessionStorage.secret = param[1];
        }
    }
    if (sessionStorage.port && sessionStorage.secret) { // if port and secret are now both set
        window.location.replace(url); // redirect to remove parameters
    } else {
        alert("Port and secret not found! Please note that you cannot open YAMM in another tab or browser.")
    }
}
