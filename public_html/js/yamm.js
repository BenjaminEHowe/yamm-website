function addAccount(provider) {
    jsonStr = JSON.stringify({"provider": provider});
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:" + sessionStorage.port + "/v1/account-requests?auth=" + sessionStorage.secret, true);
    xhr.send(jsonStr);
    xhr.onload = function() {
        if (this.status == 201) {
            displayAccounts();
        }
    };
}

function displayAccounts() {
    getAccounts().then(function (accounts) {
        document.getElementById("accounts").innerHTML = "<h2>Accounts</h2>";
        document.getElementById("transactions").innerHTML = "<h2>Transactions</h2>";
        accountsStr = "";
        for (i in accounts) {
            document.getElementById("accounts").innerHTML += "<li><code>" + JSON.stringify(accounts[i]) + "</code></li>";
            document.getElementById("transactions").innerHTML += "<div id='" + accounts[i].id + "'></div>";
            displayTransactions(accounts[i]);
        }
        if (accounts.length == 0) {
            document.getElementById("accounts").innerHTML = "";  
            document.getElementById("transactions").innerHTML = "";            
        }
    }).catch(function (err) {
        console.error('Augh, there was an error!', err.statusText);
    });
}

function displayTransactions(account) {
    getTransactions(account.id).then(function (transactions) {
        document.getElementById(account.id).innerHTML = "<h3>" + account.nickname + "</h3><ul>";
        for (i in transactions) {
            document.getElementById(account.id).innerHTML += "<li><code>" + JSON.stringify(transactions[i]) + "</code></li>";
        }
        document.getElementById(account.id).innerHTML += "</ul>";
        if (transactions.length == 0) {
            document.getElementById("accounts").innerHTML = "";            
        }
    }).catch(function (err) {
        console.error('Augh, there was an error!', err.statusText);
    });
}

function getAccounts() {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "http://127.0.0.1:" + sessionStorage.port + "/v1/accounts?auth=" + sessionStorage.secret, true);
        xhr.onload = function() {
            if (this.status == 200) {
                resolve(JSON.parse(xhr.response));
            } else {
                reject({
                    body: JSON.parse(xhr.response),
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function() {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
      });
}

function getTransactions(accountId) {
    return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "http://127.0.0.1:" + sessionStorage.port + "/v1/accounts/" + accountId + "/transactions?auth=" + sessionStorage.secret, true);
        xhr.onload = function() {
            if (this.status == 200) {
                resolve(JSON.parse(xhr.response));
            } else {
                reject({
                    body: JSON.parse(xhr.response),
                    status: this.status,
                    statusText: xhr.statusText
                });
            }
        };
        xhr.onerror = function() {
            reject({
                status: this.status,
                statusText: xhr.statusText
            });
        };
        xhr.send();
      });
}

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
