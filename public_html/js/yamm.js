var yammDB;
var accounts;
var transactions;

function addAccount(provider) {
    document.getElementById("main").innerHTML = "<img src='/img/loading.svg' id='loading' alt='Loading...' />";
    jsonStr = JSON.stringify({"provider": provider});
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:" + sessionStorage.port + "/v1/account-requests?auth=" + sessionStorage.secret, true);
    xhr.send(jsonStr);
    xhr.onload = function() {
        if (this.status == 201) {
            console.log("Account added successfully!")
            swal(
                "Account added successfully!",
                "",
                "success"
            );
        } else {
            swal(
                "Error",
                xhr.statusText,
                "error"
            );
        }
        displayProviders();
    };
}

function displayAccountDetails(id) {
    yammDB.select().from(accounts).where(accounts.id.eq(id)).exec().then(function(account) {
        account = account[0]; // there should only be one account per primary key!

        swal({
            title: "Account Details",
            type: "info",
            customClass: "swal2-account-details",
            // assumes all accounts are held in GBP
            // TODO: fix this assumption!
            html: `
                <table>
                    <tr>
                        <th>Nickname</th>
                        <td>${account.nickname} <a href="javascript:editAccountNickname('${account.id}')" style="font-size:small"><i class="fa fa-pencil" aria-hidden="true"></i> edit</a></td>
                    </tr>
                    <tr class="blank"></tr>
                    <tr>
                        <th>Balance</th>
                        <td>£${(account.balance / 100).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <th>Funds Available</th>
                        <td>£${(account.availableToSpend / 100).toFixed(2)}</td>
                    </tr>
                    <tr class="blank"></tr>
                    <tr>
                        <th>Account Number</th>
                        <td>${account.accountNumber}</td>
                    </tr>
                    <tr>
                        <th>Sort Code</th>
                        <td>${account.sortCode}</td>
                    </tr>
                    <tr class="blank"></tr>
                    <tr>
                        <th>IBAN</th>
                        <td>${account.iban}</td>
                    </tr>
                    <tr>
                        <th>BIC</th>
                        <td>${account.bic}</td>
                    </tr>
                </table>
            `
          });
    });
}

function displayProviders() {
    var version;

    return new Promise(function(resolve, reject) {
        // get the client version
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "http://127.0.0.1:" + sessionStorage.port + "/v1/about?auth=" + sessionStorage.secret, true);
        xhr.onload = function() {
            if (this.status == 200) {
                version = JSON.parse(xhr.response).version;
                resolve();
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
    }).then(function() {
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "/json/providers.json", true);
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
    }).then(function(providers) {
        var availableProviders = [];

        for (i in providers) {
            if (providers[i].minVersion <= version) {
                availableProviders.push(providers[i]);
            }
        }

        document.getElementById("main").innerHTML = "<h2>Add Account</h2>";

        if (availableProviders.length == 0) {
            document.getElementById("main").innerHTML += "<div class='alert alert-danger'>No providers available for YAMM client version " + version + "!</div>";
        } else {
            document.getElementById("main").innerHTML += "<ul>";
            for (i in availableProviders) {
                document.getElementById("main").innerHTML += "<li><a href=\"javascript:addAccount('" + availableProviders[i].slug +"')\">" + availableProviders[i].name + "</a></li>";
            }
            document.getElementById("main").innerHTML += "</ul>";
        }
    });
}

function launchApp() {
    console.log("YAMM client port: " + sessionStorage.port);
    console.log("YAMM client secret: " + sessionStorage.secret);
    console.log("https://local.yamm.io/app/#port=" + sessionStorage.port + ",secret=" + sessionStorage.secret);
    console.log("https://alpha.yamm.io/app/#port=" + sessionStorage.port + ",secret=" + sessionStorage.secret);
    console.log("https://beta.yamm.io/app/#port=" + sessionStorage.port + ",secret=" + sessionStorage.secret);
    console.log("https://yamm.io/app/#port=" + sessionStorage.port + ",secret=" + sessionStorage.secret);

    var schemaBuilder = lf.schema.create("YAMM", 1);

    schemaBuilder.createTable("accounts").
        addColumn("id", lf.Type.STRING).
        addColumn("accountNumber", lf.Type.STRING).
        addColumn("availableToSpend", lf.Type.NUMBER).
        addColumn("balance", lf.Type.NUMBER).
        addColumn("bic", lf.type.STRING).
        addColumn("currency", lf.Type.STRING).
        addColumn("iban", lf.Type.STRING).
        addColumn("nickname", lf.Type.STRING).
        addColumn("sortCode", lf.Type.STRING).
        addPrimaryKey(["id"]);

    schemaBuilder.createTable("transactions").
        addColumn("id", lf.Type.STRING).
        addColumn("account", lf.Type.STRING).
        addColumn("amount", lf.Type.NUMBER).
        addColumn("balance", lf.Type.NUMBER).
        addColumn("category", lf.Type.STRING).
        addColumn("counterpartyAccountNumber", lf.type.STRING).
        addColumn("counterpartyAddressApprox", lf.type.BOOLEAN).
        addColumn("counterpartyAddressCity", lf.type.STRING).
        addColumn("counterpartyAddressCountry", lf.type.STRING).
        addColumn("counterpartyAddressLatitude", lf.type.STRING).
        addColumn("counterpartyAddressLongitude", lf.type.STRING).
        addColumn("counterpartyAddressPostcode", lf.type.STRING).
        addColumn("counterpartyAddressStreet", lf.type.STRING).
        addColumn("counterpartyIcon", lf.type.STRING).
        addColumn("counterpartyName", lf.type.STRING).
        addColumn("counterpartySortCode", lf.type.STRING).
        addColumn("counterpartyWebsite", lf.type.STRING).
        addColumn("created", lf.type.DATE_TIME).
        addColumn("declineReason", lf.type.STRING).
        addColumn("description", lf.type.STRING).
        addColumn("localAmount", lf.type.NUMBER).
        addColumn("localCurrency", lf.type.STRING).
        addColumn("mcc", lf.type.STRING).
        addColumn("providerId", lf.type.STRING).
        addColumn("settled", lf.type.DATE_TIME).
        addColumn("type", lf.type.STRING).
        addNullable(["localAmount", "settled"]).
        addPrimaryKey(["id"]);
    
    schemaBuilder.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(db) {
        yammDB = db;
        accounts = db.getSchema().table("accounts");
        transactions = db.getSchema().table("transactions");
    }).then(function() {
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
    }).then(function(accts) {
        var accountRows = [];

        for (i in accts) {
            accountRows.push(accounts.createRow({
                "id": accts[i].id,
                "accountNumber": accts[i].accountNumber || "",
                "availableToSpend": accts[i].availableToSpend,
                "balance": accts[i].balance,
                "bic": accts[i].bic || "",
                "currency": accts[i].currency,
                "iban": accts[i].iban || "",
                "nickname": accts[i].nickname,
                "sortCode": accts[i].sortCode || ""
            }));
        }
        
        return yammDB.insertOrReplace().into(accounts).values(accountRows).exec();
    }).then(function() {
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "http://127.0.0.1:" + sessionStorage.port + "/v1/transactions?auth=" + sessionStorage.secret, true);
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
    }).then(function(txns) {
        var transactionRows = [];
        
        for (i in txns) {
            var transaction = {};
            transaction.id = txns[i].id;
            transaction.account = txns[i].account;
            transaction.amount = txns[i].amount;
            transaction.balance = txns[i].balance;
            transaction.category = txns[i].category;
            if (typeof txns[i].counterparty != "undefined") {
                transaction.counterpartyAccountNumber = txns[i].counterparty.accountNumber || "";
                transaction.counterpartyIcon = txns[i].counterparty.icon || "";
                transaction.counterpartyName = txns[i].counterparty.name || "";
                transaction.counterpartySortCode = txns[i].counterparty.sortCode || "";
                transaction.counterpartyWebsite = txns[i].counterparty.website || "";
                if (typeof txns[i].counterparty.address != "undefined") {
                    transaction.counterpartyAddressApprox = txns[i].counterparty.address.approximate || true;
                    transaction.counterpartyAddressCity = txns[i].counterparty.address.city || "";
                    transaction.counterpartyAddresscountry = txns[i].counterparty.address.country || "";
                    transaction.counterpartyAddresscounty = txns[i].counterparty.address.county || "";
                    transaction.counterpartyAddressLatitude = txns[i].counterparty.address.latitude || "";
                    transaction.counterpartyAddressLongitude = txns[i].counterparty.address.longitude || "";
                    transaction.counterpartyAddressPostcode = txns[i].counterparty.address.postcode || "";
                    transaction.counterpartyAddressStreet = txns[i].counterparty.address.streetAddress || "";
                } else {
                    transaction.counterpartyAddressApprox = true;
                    transaction.counterpartyAddressCity = "";
                    transaction.counterpartyAddressCountry = "";
                    transaction.counterpartyAddressCounty = "";
                    transaction.counterpartyAddressLatitude = "";
                    transaction.counterpartyAddressLongitude = "";
                    transaction.counterpartyAddressPostcode = "";
                    transaction.counterpartyAddressStreet = "";
                }
            } else {
                transaction.counterpartyAccountNumber = "";
                transaction.counterpartyIcon = "";
                transaction.counterpartyName = "";
                transaction.counterpartySortCode = "";
                transaction.counterpartyWebsite = "";
                transaction.counterpartyAddressApprox = true;
                transaction.counterpartyAddressCity = "";
                transaction.counterpartyAddressCountry = "";
                transaction.counterpartyAddressCounty = "";
                transaction.counterpartyAddressLatitude = "";
                transaction.counterpartyAddressLongitude = "";
                transaction.counterpartyAddressPostcode = "";
                transaction.counterpartyAddressStreet = "";
            }
            transaction.created = txns[i].created;
            transaction.declineReason = txns[i].declineReason || "";
            transaction.description =  txns[i].description;
            transaction.localAmount = txns[i].localAmount || null;
            transaction.localCurrency = txns[i].localCurrency || "";
            transaction.mcc = txns[i].mcc || "";
            transaction.providerId = txns[i].providerId || "";
            transaction.settled = txns[i].settled || null;
            transaction.type = txns[i].type;
            
            transactionRows.push(transactions.createRow(transaction));
        }

        return yammDB.insertOrReplace().into(transactions).values(transactionRows).exec();
    }).then(function() {
        return yammDB.select().from(accounts).exec();
    }).then(function(results) {
        console.log(results);
    }).then(function() {
        return yammDB.select().from(transactions).orderBy(transactions.created, lf.Order.DESC).exec();
    }).then(function(results) {
        console.log(results);
    }).then(function() {
        return yammDB.select().from(accounts).exec();
    }).then(function(accounts) {
        // show UI

        // add menu items
        document.getElementById("navbar").innerHTML += `
            <ul class="navbar-nav navbar-right">
                <li class="dropdown">
                    <a class="nav-link dropdown-toggle" data-toggle="dropdown" href="#"><i class="fa fa-plus" aria-hidden="true"></i> Add...</a>
                    <ul class="dropdown-menu">
                        <li><a class="nav-link" href="/app/add-account"><i class="fa fa-institution" aria-hidden="true"></i> Account</a></li>
                        <li><a class="nav-link disabled" href="#"><i class="fa fa-table" aria-hidden="true"></i> Table</a></li>
                        <li><a class="nav-link disabled" href="#"><i class="fa fa-pie-chart" aria-hidden="true"></i> Chart</a></li>
                    </ul>
                </li>
            </ul>
        `;

        // display summary data (left hand column)
        // assumes all accounts are held in GBP
        // TODO: fix this assumption! (by having one overview per currency)
        var positives = 0;
        var negatives = 0;
        for (i in accounts) {
            if (accounts[i].balance > 0) {
                positives += accounts[i].balance;
            } else {
                negatives += accounts[i].balance;
            }
        }
        var positivesStr = (positives / 100).toFixed(2);
        var negativesStr = (negatives / -100).toFixed(2);
        var balanceStr = ((positives + negatives) / 100).toFixed(2);
        document.getElementById("main").innerHTML = `
            <div class="col-lg-3">
                <h2>Overview</h2>
                <table style="width:100%">
                    <tr class="text-success">
                        <td>Positives</td>
                        <td style="text-align:right">£${positivesStr}</td>
                    </tr>
                    <tr class="text-danger">
                        <td>Negatives</td>
                        <td style="text-align:right">-£${negativesStr}</td>
                    </tr>
                    <tr class="text-${positives + negatives >= 0 ? "success" : "danger"}" style="font-weight: bold">
                        <td>Balance</td>
                        <td style="text-align:right">£${balanceStr}</td>
                    </tr>
                </table>
                <hr />
                <h2>Accounts</h2>
                ${accounts.map(account => `
                    <h5>${account.nickname} <a href="javascript:displayAccountDetails('${account.id}')" style="font-size:small"><i class="fa fa-info-circle" aria-hidden="true"></i> details</a></h5>
                    <table style="width:100%">
                        <tr>
                            <td>Balance</td>
                            <td style="text-align:right">£${(account.balance / 100).toFixed(2)}</td>
                        </tr>
                        <tr>
                            <td>Funds Available</td>
                            <td style="text-align:right">£${(account.availableToSpend / 100).toFixed(2)}</td>
                        </tr>
                    </table>
                `)}
            </div>
        `;

        // TODO: display saved UI elements
    });
}

function setPortAndSecret() {
    // set port and secret, redirect to remove parameters from URL
    if (sessionStorage.port && sessionStorage.secret) { // if YAMM port and secret have been set
        if (params.length == 2 && params[0].indexOf("port") != -1 && params[1].indexOf("secret") != -1) { // if they're still in the URL
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
            document.getElementById("main").innerHTML = "<div class='alert alert-danger'>Port and secret not found! Please note that you cannot open YAMM in another tab or browser.</div>";
        }
    }
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
