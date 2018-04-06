var yammDB;
var accounts;
var transactions;

function addAccount(provider) {
    document.getElementById("main").innerHTML = "<img src='/img/loading.svg' id='loading' alt='Loading...' />";
    var xhr = new XMLHttpRequest();
    xhr.open("POST", "http://127.0.0.1:" + sessionStorage.port + "/v1/account-requests?auth=" + sessionStorage.secret, true);
    xhr.send(JSON.stringify({"provider": provider}));
    xhr.onload = function() {
        var alertMessage;
        var alertType;
        var responseJson = JSON.parse(xhr.response);

        // set the message
        if (responseJson.hasOwnProperty("message")) {
            alertMessage = responseJson.message;
        } else {
            alertMessage = xhr.statusText;
        }

        // log (if requried) to console
        if (responseJson.hasOwnProperty("technical_message")) {
            console.log(responseJson.technical_message);
        }

        // check the type
        if (this.status < 400) {
            alertType = "success";
        } else {
            alertType = "error";
        }

        // actually display the alert
        swal({
            title: alertMessage,
            type: alertType
        });
        
        // go back to the list of providers
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
                        <td>${account.balance >= 0 ? "£" : "-£"}${(Math.abs(account.balance) / 100).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <th>Funds Available</th>
                        <td>${account.availableToSpend >= 0 ? "£" : "-£"}${(Math.abs(account.availableToSpend) / 100).toFixed(2)}</td>
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

function displayAccounts() {
    yammDB.select().from(accounts).orderBy(accounts.nicknameLower).exec().then(function(accounts) {
        console.log("Accounts: ", accounts); // debug: dump accounts list to the console

        // display overview
        // assumes all accounts are held in GBP
        // TODO: fix this assumption!
        var positives = 0;
        var negatives = 0;
        for (i in accounts) {
            if (accounts[i].balance > 0) {
                positives += accounts[i].balance;
            } else {
                negatives += accounts[i].balance;
            }
        }
        var balance = positives + negatives;
        document.getElementById("sidebar-overview").innerHTML = `
            <h2>Overview</h2>
            <table style="width:100%">
                <tr class="text-success">
                    <td>Positives</td>
                    <td style="text-align:right">£${(positives / 100).toFixed(2)}</td>
                </tr>
                <tr class="text-danger">
                    <td>Negatives</td>
                    <td style="text-align:right">-£${(negatives / -100).toFixed(2)}</td>
                </tr>
                <tr class="text-${balance >= 0 ? "success" : "danger"}" style="font-weight: bold">
                    <td>Balance</td>
                    <td style="text-align:right">${balance >= 0 ? "£" : "-£"}${(Math.abs(balance) / 100).toFixed(2)}</td>
                </tr>
            </table>`;

        // display accounts list
        document.getElementById("sidebar-accounts").innerHTML += "<h2>Accounts</h2>";
        if (accounts.length !== 0) {
            document.getElementById("sidebar-accounts").innerHTML += `${accounts.map(account => `
                <h5>${account.nickname} <a href="javascript:displayAccountDetails('${account.id}')" style="font-size:small"><i class="fa fa-info-circle" aria-hidden="true"></i> details</a></h5>
                <table style="width:100%">
                    <tr>
                        <td>Balance</td>
                        <td style="text-align:right">${account.balance >= 0 ? "£" : "-£"}${(Math.abs(account.balance) / 100).toFixed(2)}</td>
                    </tr>
                    <tr>
                        <td>Funds Available</td>
                        <td style="text-align:right">${account.availableToSpend >= 0 ? "£" : "-£"}${(Math.abs(account.availableToSpend) / 100).toFixed(2)}</td>
                    </tr>
                </table>
            `).join("")}`;
        } else {
            document.getElementById("sidebar-accounts").innerHTML += "<p>You have not added any accounts to YAMM yet.</p>";
        }
    });
}

function displayCategory(text) {
    text = text.replace("_", " ");
    text = text.replace("AND", "&");
    // below code from https://stackoverflow.com/a/5574446
    return text.replace(/\w\S*/g, function(t){return t.charAt(0).toUpperCase() + t.substr(1).toLowerCase();});
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

function displayTransactions() {
    yammDB.select().from(transactions).orderBy(transactions.created, lf.Order.DESC).exec().then(function(transactions) {
        console.log("Transactions: ", transactions); // debug: dump transactions to the console

        document.getElementById("main").getElementsByTagName("div")[0].innerHTML += `
            <div id="main-column" class="col-lg-9">
                <h2>Transactions</h2>
            </div>`;

        if (transactions.length !== 0) {
            document.getElementById("main-column").innerHTML += `
                <table id="transactions" class="table table-hover">
                    <thead class="thead-light">
                        <tr>
                            <th></th>
                            <th>Date</th>
                            <th colspan="2">Name</th>
                            <th>Category</th>
                            <th>Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                    </tbody>
                </table>`;
            var columns = ["type", "date", "icon", "name", "category", "amount"];
            var tableBody = document.getElementById("transactions").tBodies[0];
            for (var i = 0; i < transactions.length; i++) {
                var row = document.createElement("tr");
                for (var j = 0; j < columns.length; j++) {
                    var cell = document.createElement("td");

                    var node;
                    switch (columns[j]) {
                        case "amount":
                            var styles = "text-align:right;" // otherwise the table looks *very* messy
                            var text = "£" + (Math.abs(transactions[i]["amount"]) / 100).toFixed(2); // TODO: don't assume all accounts are billed in £

                            if (transactions[i]["amount"] > 0) { // if the transaction is a credit
                                text = "+" + text;
                                cell.setAttribute("class", "text-success");
                            } else if (transactions[i]["amount"] < 0) { // if the transaction is a debit
                                cell.setAttribute("class", "text-danger");
                            }

                            if (transactions[i]["localCurrency"].length != 0 && transactions[i]["localCurrency"] != "GBP") { // if the transaction is in a foreign currency
                                // work out how many decimal places the currency has
                                var localCurrencyFormatArray = (1).toLocaleString("en-GB", { style: "currency", currency: transactions[i]["localCurrency"] }).split(".");
                                var decimalPlaces;
                                if (localCurrencyFormatArray.length == 1) { // no decimal places
                                    decimalPlaces = 0;
                                } else { // some decimal places
                                    decimalPlaces = localCurrencyFormatArray[1].length;
                                }
                                var foreignAmountDecimal = transactions[i]["localAmount"] / Math.pow(10, decimalPlaces);

                                // display the foreign currency
                                cell.setAttribute("data-toggle", "tooltip");
                                cell.setAttribute("title", foreignAmountDecimal.toLocaleString("en-GB", { style: "currency", currency: transactions[i]["localCurrency"] }));
                                styles += "text-decoration: underline; text-decoration-style: dotted;";
                            }

                            cell.setAttribute("style", styles);
                            node = document.createTextNode(text);
                            break;
                        
                        case "category":
                            node = document.createTextNode(displayCategory(transactions[i]["category"]));
                            break;

                        case "date":
                            var text;
                            var date = new Date(transactions[i]["created"]);
                            if (date.toLocaleTimeString() == "00:00:00") { // the transaction occurred at *exactly* midnight so just show the date
                                text = date.toLocaleDateString();
                            } else {
                                text = date.toLocaleString();
                            }
                            node = document.createTextNode(text);
                            break;
                        
                        case "icon":
                            if (transactions[i]["counterpartyIcon"].length != 0) { // if the transaction has an icon
                                node = document.createElement("img");
                                node.src = transactions[i]["counterpartyIcon"];
                            } else {
                                node = document.createTextNode("");
                            }
                            break;

                        case "name":
                            var text;
                            if (transactions[i]["counterpartyName"].length != 0) {
                                text = transactions[i]["counterpartyName"];
                                if (transactions[i]["counterpartyName"] != transactions[i]["description"]) {
                                    cell.setAttribute("data-toggle", "tooltip");
                                    cell.setAttribute("title", transactions[i]["description"]);
                                    cell.setAttribute("style", "text-decoration: underline; text-decoration-style: dotted;");
                                }
                            } else {
                                text = transactions[i]["description"];
                            }
                            node = document.createTextNode(text);
                            break;
                        
                        case "type":
                            node = document.createElement("img");

                            switch (transactions[i]["type"]) {
                                case "BACS":
                                    node.src = "../img/bacs.png";
                                    break;
                                
                                case "CARD_CONTACTLESS":
                                    node.src = "../img/contactless.png";
                                    break;
                                
                                case "CARD_PIN":
                                    node.src = "../img/chip-and-pin.png";
                                    break;
                                
                                case "FASTER_PAYMENT":
                                    node.src = "../img/faster-payments.png";
                                    break;
                                
                                case "MOBILE_ANDROID":
                                    node.src = "../img/android-pay.png";
                                    break;
                                
                                default:
                                    node = document.createTextNode("");
                                    break;
                            }

                            break;
                    }

                    cell.appendChild(node);
                    row.appendChild(cell);
                }
                tableBody.appendChild(row);
            }
        } else {
            document.getElementById("main-column").innerHTML += "<p>You do not have any transactions loaded into YAMM yet.</p>";
        }
    });
}

function displaySpend() {
    yammDB
	    .select(transactions.category.as("name"), lf.fn.sum(transactions.amount).as("amount"))
        .from(transactions)
        .where(transactions.created.gte(new Date(new Date().setDate(new Date().getDate() - 90))))
        .groupBy(transactions.category)
        .orderBy(transactions.category)
	.exec().then(function(categories) {
        console.log("Spend categories: ", categories); // debug: dump spend categories to the console

        // write the bare spend widget
        document.getElementById("sidebar-spend").innerHTML += `
            <h2>Spend</h2>
            <p style="margin-bottom:0.35rem">Over the last 90 days:</p>
            <table style="width:100%">
                <thead>
                    <th>Category</th>
                    <th style="text-align:right">Amount</th>
                </thead>
                <tbody id="sidebar-spend-body">
                </tbody>
            </table>`;

        // populate the spend widget
        document.getElementById("sidebar-spend-body").innerHTML += `${categories.map(category => `
            <tr>
                <td>${displayCategory(category.name)}</td>
                <td style="text-align:right">${category.amount >= 0 ? "£" : "-£"}${(Math.abs(category.amount) / 100).toFixed(2)}</td>
            </tr>
        `).join("")}`;
    });
}

function editAccountNickname(id) {
    console.log("Editing account nickname for account " + id);
    yammDB.select().from(accounts).where(accounts.id.eq(id)).exec().then(function(account) {
        account = account[0]; // there should only be one account per primary key!
        console.log("Successfully selected account from Lovefield DB");

        swal({
            title: "Update Account Nickname",
            input: "text",
            showCancelButton: true,
            confirmButtonText: "Update",
            showLoaderOnConfirm: true,
            preConfirm: (nickname) => {
                return new Promise(function(resolve, reject) {
                    console.log("Successfully launched preConfirm promise");
                    var xhr = new XMLHttpRequest();
                    xhr.open("PATCH", `http://127.0.0.1:${sessionStorage.port}/v1/accounts/${account.id}?auth=${sessionStorage.secret}`);
                    xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
                    xhr.onload = function() {
                        console.log("XHR loaded");
                        if (this.status == 204) {
                            resolve({
                                status: this.status
                            })
                        } else {
                            reject({
                                status: this.status,
                                statusText: xhr.statusText
                            })
                        }
                    }
                    xhr.onerror = function() {
                        console.log("XHR error, status " + this.status)
                        reject({
                            status: this.status,
                            statusText: xhr.statusText
                        })
                    }
                    xhr.send(JSON.stringify({"nickname": nickname}));
                    console.log("XHR sent");
                })
            },
            allowOutsideClick: false
        }).then((result) => {
            swal({
                title: "Account Nickname Updated",
                type: "success"
            });
        }).then(function() {
            reset();
            loadApp();
        });
    });
}

function loadApp() {
    // print debugging information to the console
    console.log("YAMM client port: " + sessionStorage.port);
    console.log("YAMM client secret: " + sessionStorage.secret);
    console.log("https://local.yamm.io/app/#port=" + sessionStorage.port + ",secret=" + sessionStorage.secret);
    console.log("https://alpha.yamm.io/app/#port=" + sessionStorage.port + ",secret=" + sessionStorage.secret);
    console.log("https://beta.yamm.io/app/#port=" + sessionStorage.port + ",secret=" + sessionStorage.secret);
    console.log("https://yamm.io/app/#port=" + sessionStorage.port + ",secret=" + sessionStorage.secret);

    // create schema for the lovefield database
    var schemaBuilder = lf.schema.create("YAMM", 1);
    schemaBuilder.createTable("accounts").
        addColumn("id", lf.Type.STRING).
        addColumn("accountNumber", lf.Type.STRING).
        addColumn("availableToSpend", lf.Type.NUMBER).
        addColumn("balance", lf.Type.NUMBER).
        addColumn("bic", lf.Type.STRING).
        addColumn("currency", lf.Type.STRING).
        addColumn("iban", lf.Type.STRING).
        addColumn("nickname", lf.Type.STRING).
        addColumn("nicknameLower", lf.Type.STRING).
        addColumn("sortCode", lf.Type.STRING).
        addPrimaryKey(["id"]);
    schemaBuilder.createTable("transactions").
        addColumn("id", lf.Type.STRING).
        addColumn("account", lf.Type.STRING).
        addColumn("amount", lf.Type.NUMBER).
        addColumn("balance", lf.Type.NUMBER).
        addColumn("category", lf.Type.STRING).
        addColumn("counterpartyAccountNumber", lf.Type.STRING).
        addColumn("counterpartyAddressApprox", lf.Type.BOOLEAN).
        addColumn("counterpartyAddressCity", lf.Type.STRING).
        addColumn("counterpartyAddressCountry", lf.Type.STRING).
        addColumn("counterpartyAddressLatitude", lf.Type.STRING).
        addColumn("counterpartyAddressLongitude", lf.Type.STRING).
        addColumn("counterpartyAddressPostcode", lf.Type.STRING).
        addColumn("counterpartyAddressStreet", lf.Type.STRING).
        addColumn("counterpartyIcon", lf.Type.STRING).
        addColumn("counterpartyName", lf.Type.STRING).
        addColumn("counterpartySortCode", lf.Type.STRING).
        addColumn("counterpartyWebsite", lf.Type.STRING).
        addColumn("created", lf.Type.DATE_TIME).
        addColumn("declineReason", lf.Type.STRING).
        addColumn("description", lf.Type.STRING).
        addColumn("localAmount", lf.Type.NUMBER).
        addColumn("localCurrency", lf.Type.STRING).
        addColumn("mcc", lf.Type.STRING).
        addColumn("providerId", lf.Type.STRING).
        addColumn("settled", lf.Type.DATE_TIME).
        addColumn("type", lf.Type.STRING).
        addNullable(["localAmount", "settled"]).
        addPrimaryKey(["id"]);
    
    schemaBuilder.connect({storeType: lf.schema.DataStoreType.MEMORY}).then(function(db) {
        // connect to the newly specified database
        yammDB = db;
        accounts = db.getSchema().table("accounts");
        transactions = db.getSchema().table("transactions");
    }).then(function() {
        // get the account data from the YAMM client
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
        // insert the data into the accounts table
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
                "nicknameLower": accts[i].nickname.toLowerCase(),
                "sortCode": accts[i].sortCode || ""
            }));
        }
        return yammDB.insertOrReplace().into(accounts).values(accountRows).exec();
    }).then(function() {
        // get the transaction data from the YAMM client
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
        // insert the data into the transactions table
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
            transaction.created = new Date(txns[i].created);
            transaction.declineReason = txns[i].declineReason || "";
            transaction.description =  txns[i].description;
            transaction.localAmount = txns[i].localAmount || null;
            transaction.localCurrency = txns[i].localCurrency || "";
            transaction.mcc = txns[i].mcc || "";
            transaction.providerId = txns[i].providerId || "";
            transaction.settled = new Date(txns[i].settled) || null;
            transaction.type = txns[i].type;
            transactionRows.push(transactions.createRow(transaction));
        }

        return yammDB.insertOrReplace().into(transactions).values(transactionRows).exec();
    }).then(function() {
        // add menu items
        document.getElementById("navbar").innerHTML += `
            <ul class="navbar-nav navbar-right" id="navbar-app">
                <li><a class="nav-link" href="/app/add-account"><i class="fa fa-plus" aria-hidden="true"></i> Add account</a></li>
            </ul>
        `;

        // add sidebar and main section
        document.getElementById("main").innerHTML = `
            <div class="row">
                <div id="sidebar-column" class="col-lg-3">
                    <div id="sidebar-overview"></div>
                    <hr />
                    <div id="sidebar-accounts"></div>
                    <hr />
                    <div id="sidebar-spend"></div>
                </div>
            </div>`;

        displayAccounts(); // display accounts overview & list
        displayTransactions(); // display transactions
        displaySpend(); // display spend categories
    });
}

function reset() {
    var appNavbar = document.getElementById("navbar-app");
    appNavbar.parentNode.removeChild(appNavbar);
    document.getElementById("main").innerHTML = '<img src="/img/loading.svg" id="loading" alt="Loading..." />';
    yammDB.close();
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
