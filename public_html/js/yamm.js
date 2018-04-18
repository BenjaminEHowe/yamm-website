"use strict";

// variables
var accounts;
var categories;
var charts = [];
var googleChartsLoaded = false;
var params;
var transactions;
var url;
var yammDB;


// functions
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

function createCharts() {
    googleChartsLoaded = true;
    // call each "create chart" function
    for (var i = 0; i < charts.length; i++) {
        charts[i].data = charts[i].create();
    }
    // draw all the charts
    drawCharts();
}

function displayAccountDetails(id) {
    yammDB.select().from(accounts).where(accounts.id.eq(id)).exec().then(function(account) {
        account = account[0]; // there should only be one account per primary key!

        swal({
            "title": "Account Details",
            "type": "info",
            "customClass": "swal2-account-details",
            "html": `
                <table>
                    <tr>
                        <th>Nickname</th>
                        <td>${account.nickname} <a href="#" id="nicknameEditLink"><i class="fa fa-pencil" aria-hidden="true"></i> edit</a></td>
                    </tr>
                    <tr class="blank"></tr>
                    <tr>
                        <th>Balance</th>
                        <td>${formatAmount(account.balance, account.currency)}</td>
                    </tr>
                    <tr>
                        <th>Funds Available</th>
                        <td>${formatAmount(account.availableToSpend, account.currency)}</td>
                    </tr>
                    ${account.accountNumber !== undefined || account.sortCode !== undefined ? `
                        <tr class="blank"></tr>
                        ${account.accountNumber !== undefined ? `
                            <tr>
                                <th>Account Number</th>
                                <td>${account.accountNumber}</td>
                            </tr>
                        ` : ``}
                        ${account.sortCode !== undefined ? `
                            <tr>
                                <th>Sort Code</th>
                                <td>${account.sortCode}</td>
                            </tr>
                        ` : ``}
                    ` : ``}
                    ${account.iban !== undefined || account.bic !== undefined ? `
                        <tr class="blank"></tr>
                        ${account.iban !== undefined ? `
                            <tr>
                                <th>IBAN</th>
                                <td>${account.iban}</td>
                            </tr>
                        ` : ``}
                        ${account.bic  !== undefined ? `
                            <tr>
                                <th>BIC</th>
                                <td>${account.bic}</td>
                            </tr>
                        ` : ``}
                    ` : ``}
                </table>`,
            "onBeforeOpen": function(dom) {
                    var editLink = document.getElementById("nicknameEditLink");
                    editLink.addEventListener("click", function(event) {
                        editAccountNickname(account.id);
                    });
                }
          });
    });
}

function displayAccounts() {
    yammDB.select().from(accounts).orderBy(accounts.nicknameLower).exec().then(function(accounts) {
        console.log("Accounts: ", accounts); // debug: dump accounts list to the console

        // TODO: fix the assumption that all accounts are held in GBP
        // this probably requires talking to people who have accounts in multiple currencies
        // to find out how they mentally manage their money...
        var positives = 0;
        var negatives = 0;
        for(var i in accounts) {
            if (accounts[i].balance > 0) {
                positives += accounts[i].balance;
            } else {
                negatives += accounts[i].balance;
            }
        }
        var balance = positives + negatives;
        document.getElementById("sidebar-balance").innerHTML = `
            <h2>Balance</h2>
            <table>
                <tr class="text-success">
                    <td>Positives</td>
                    <td>${formatAmount(positives, "GBP")}</td>
                </tr>
                <tr class="text-danger">
                    <td>Negatives</td>
                    <td>${formatAmount(negatives, "GBP")}</td>
                </tr>
                <tr class="text-${balance >= 0 ? "success" : "danger"}">
                    <td>Overall</td>
                    <td>${formatAmount(balance, "GBP")}</td>
                </tr>
            </table>`;

        // display accounts list
        document.getElementById("sidebar-accounts").innerHTML += "<h2>Accounts</h2>";
        if (accounts.length !== 0) {
            // output account details as HTML
            document.getElementById("sidebar-accounts").innerHTML += `${accounts.map(account => `
                <h5>${account.nickname} <a href="#" class="accountDetailsLink" data-account-id="${account.id}"><i class="fa fa-info-circle" aria-hidden="true"></i> details</a></h5>
                <table>
                    <tr>
                        <td>Balance</td>
                        <td>${formatAmount(account.balance, account.currency)}</td>
                    </tr>
                    <tr>
                        <td>Funds Available</td>
                        <td>${formatAmount(account.availableToSpend, account.currency)}</td>
                    </tr>
                </table>
            `).join("")}`;

            // add event listener(s) to details link(s)
            var accountDetailsLinks = document.querySelectorAll("#sidebar-accounts .accountDetailsLink");
            Array.from(accountDetailsLinks).map(function(accountDetailsLink) {
                accountDetailsLink.addEventListener("click", function(event) {
                    displayAccountDetails(this.dataset.accountId);
                });
            });
        } else {
            document.getElementById("sidebar-accounts").innerHTML += "<p>You have not added any accounts to YAMM yet.</p>";
        }
    });
}

function displayProviders() {
    var version;

    // clear the window
    document.getElementById("main").innerHTML = '<img src="/img/loading.svg" id="loading" alt="Loading..." />';

    // display the return button
    document.getElementById("navbar-app").innerHTML = '<li><a href="#" id="returnLink" class="nav-link"><i class="fa fa-arrow-left" aria-hidden="true"></i> Return</a></li>';

    // add listener to return button
        document.getElementById("returnLink").addEventListener("click", function(event) {
            reset();
            loadApp();
        });

    new Promise(function(resolve, reject) {
        // get the client version
        var xhr = new XMLHttpRequest();
        xhr.open("GET", "http://127.0.0.1:" + sessionStorage.port + "/v1/about?auth=" + sessionStorage.secret, true);
        xhr.onload = function() {
            if (this.status === 200) {
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
                if (this.status === 200) {
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

        for(var i in providers) {
            if (providers[i].minVersion <= version) {
                availableProviders.push(providers[i]);
            }
        }

        document.getElementById("main").innerHTML = "<h2>Add Account</h2>";

        if (availableProviders.length === 0) {
            document.getElementById("main").innerHTML += "<div class='alert alert-danger'>No providers available for YAMM client version " + version + "!</div>";
        } else {
            var providerList = document.createElement("ul");
            for(i in availableProviders) {
                // create the bits and bobs
                var node = document.createElement("li");
                var hyperlink = document.createElement("a");
                var text = document.createTextNode(availableProviders[i].name);

                // set up hyperlink with event listener
                hyperlink.href = "#";
                hyperlink.dataset.slug = availableProviders[i].slug;
                hyperlink.addEventListener("click", function(event) {
                    addAccount(this.dataset.slug);
                });

                // connect everything together
                hyperlink.appendChild(text);
                node.appendChild(hyperlink);
                providerList.appendChild(node);
            }
            document.getElementById("main").appendChild(providerList);
        }
    });
}

function displayTransactionDetails(id) {
    yammDB
        .select()
        .from(accounts, transactions)
        .where(lf.op.and(
            accounts.id.eq(transactions.account),
            transactions.id.eq(id))
        )
    .exec().then(function(transaction) {
        // there should be only one transaction and account per primary key
        console.log(transaction);
        var account = transaction[0].accounts;
        var transaction = transaction[0].transactions;

        // define settlement value
        var settled;
        if (transaction.settled === undefined) {
            settled = "No";
        } else if (transaction.settled < transaction.created) {
            settled = "Yes";
        } else {
            settled = transaction.settled.toLocaleString();
        }

        // define category HTML
        var category = categories[transaction.category];
        var textColour = category.textColour;
        if (textColour === "000000") {
            textColour = "595959";
        }
        var categoryHTML = `<span class="category" `;
        categoryHTML += `style="background:#${category.backgroundColour};color:#${textColour}">`;
        categoryHTML += `${category.name}</span> `;
        categoryHTML += `<a href="#" id="categoryEditLink"><i class="fa fa-pencil" aria-hidden="true"></i> edit</a>`;

        swal({
            "title": "Transaction Details",
            "type": "info",
            "customClass": "swal2-transaction-details",
            "html": `
                <table>
                    <tr>
                        <th>Account</th>
                        <td>${account.nickname}</td>
                    </tr>
                    <tr class="blank"></tr>
                    <tr>
                        <th>Created</th>
                        <td>${transaction.created.toLocaleString()}</td>
                    </tr>
                    <tr>
                        <th>Settled</th>
                        <td>${settled}</td>
                    </tr>
                    <tr class="blank"></tr>
                    <tr>
                        <th>Amount</th>
                        <td>${formatAmount(transaction.amount, account.currency, true)}</td>
                    </tr>
                    ${transaction.localCurrency !== undefined && transaction.localCurrency !== account.currency ? `
                        <tr>
                            <th>Local Amount</th>
                            <td>${formatAmount(transaction.localAmount, transaction.localCurrency)}</td>
                        </tr>
                    ` : ``}
                    <tr class="blank"></tr>
                    <tr>
                        <th>Category</th>
                        <td>${categoryHTML}</td>
                    </tr>
                    <tr class="blank"></tr>
                    ${transaction.counterpartyName !== undefined ? `
                        <tr>
                            <th>Counterparty</th>
                            <td>${transaction.counterpartyName}</td>
                        </tr>
                    ` : ``}
                    <tr>
                        <th>Description</th>
                        <td>${transaction.description}</td>
                    </tr>
                    ${transaction.mcc !== undefined ? `
                        <tr class="blank"></tr>
                        <tr>
                            <th><abbr title="Merchant Category Code">MCC</abbr></th>
                            <td>${transaction.mcc}</td>
                        </tr>
                    ` : ``}
                </table>`,
                "onBeforeOpen": function(dom) {
                        var editLink = document.getElementById("categoryEditLink");
                        editLink.addEventListener("click", function(event) {
                            editTransactionCategory(transaction.id);
                        });
                    }
          });
    });
}

function displayTransactions(query) {
    yammDB
        .select()
        .from(accounts, transactions)
		.where(lf.op.and(
			lf.op.or(
                transactions.descriptionLower.match(query.toLowerCase()),
                transactions.counterpartyNameLower.match(query.toLowerCase()),
            ),
			transactions.account.eq(accounts.id)
		))
        .orderBy(transactions.created, lf.Order.DESC)
    .exec().then(function(results) {
        console.log("Transactions: ", results); // debug: dump transactions to the console

        if (results.length !== 0) {
            document.getElementById("transactions-results").innerHTML = `
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
            for(var i = 0; i < results.length; i++) {
                var row = document.createElement("tr");
                row.id = results[i].transactions.id;
                row.onclick = function() {displayTransactionDetails(this.id)};
                for(var j = 0; j < columns.length; j++) {
                    var cell = document.createElement("td");

                    var node;
                    switch (columns[j]) {
                        case "amount":
                            cell.classList.add("amount");
                            var text = formatAmount(results[i].transactions.amount, results[i].accounts.currency);

                            if (results[i].transactions.amount > 0) { // if the transaction is a credit
                                text = "+" + text;
                                cell.classList.add("text-success");
                            } else if (results[i].transactions.amount < 0) { // if the transaction is a debit
                                text = text.slice(1); // remove the minus sign
                                cell.classList.add("text-danger");
                            }

                            if (results[i].transactions.localCurrency !== undefined && results[i].transactions.localCurrency !== results[i].accounts.currency) { // if the transaction is in a foreign currency
                                cell.classList.add("foreign");
                                cell.setAttribute("data-toggle", "tooltip");
                                cell.setAttribute("title", formatAmount(results[i].transactions.localAmount, results[i].transactions.localCurrency));
                            }

                            node = document.createTextNode(text);
                            break;
                        
                        case "category":
                            cell.classList.add("category");
                            var category = categories[results[i].transactions.category];
                            node = document.createTextNode(category.name);
                            cell.setAttribute("style", `background:#${category.backgroundColour};color:#${category.textColour}`);
                            break;

                        case "date":
                            var date = new Date(results[i].transactions.created);
                            node = document.createTextNode(`${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
                            cell.classList.add("date");
                            break;
                        
                        case "icon":
                            if (results[i].transactions.counterpartyIcon !== undefined) { // if the transaction has an icon
                                node = document.createElement("img");
                                node.src = results[i].transactions.counterpartyIcon;
                            } else {
                                node = document.createTextNode("");
                            }
                            break;

                        case "name":
                            cell.classList.add("name");
                            var text;
                            if (results[i].transactions.counterpartyName !== undefined) {
                                text = results[i].transactions.counterpartyName;
                                if (results[i].transactions.counterpartyName !== results[i].transactions.description) {
                                    cell.classList.add("more");
                                    cell.setAttribute("data-toggle", "tooltip");
                                    cell.setAttribute("title", results[i].transactions.description);
                                }
                            } else {
                                text = results[i].transactions.description;
                            }
                            node = document.createTextNode(text);
                            break;
                        
                        case "type":
                            node = document.createElement("img");

                            switch (results[i].transactions.type) {
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
            if (query === "") {
                document.getElementById("transactions-results").innerHTML = "<p>You do not have any transactions loaded into YAMM yet.</p>";
            } else {
                document.getElementById("transactions-results").innerHTML = `<p>No transactions found matching query "${query}".</p>`;
            }
        }
    });
}

function displaySpend(days) {
    // TODO: fix the fact that this breaks for transactions which aren't in GBP

    document.getElementById("sidebar-spend-body").innerHTML = ""; // clear the spend table
    days = Math.round(days); // round to the nearest whole number of days

    var categorySpend = {};
    for(var category in categories) {
        if (categories[category].includeInSpending) {
            categorySpend[category] = 0;
        }
    }

    yammDB
	    .select(transactions.category.as("category"), lf.fn.sum(transactions.amount).as("amount"))
        .from(transactions)
        .where(transactions.created.gte(new Date(new Date().setDate(new Date().getDate() - days))))
        .groupBy(transactions.category)
	.exec().then(function(categoriesWithSpend) {
        console.log("Spend categories: ", categoriesWithSpend); // debug: dump categories with spend to the console

        // update the category spend
        for(var i = 0; i < categoriesWithSpend.length; i++) {
            if (categories[categoriesWithSpend[i].category].includeInSpending) {
                categorySpend[categoriesWithSpend[i].category] = categoriesWithSpend[i].amount;
            }
        }

        // populate the spend widget
        for (var category in categorySpend) {
            var backgroundColour = categories[category].backgroundColour;
            var textColour = categories[category].textColour;
            var formattedAmount = formatAmount(categorySpend[category], "GBP");
            if (categorySpend[category] < 0) {
                // if the spend is negative, i.e. a spend, remove the minus sign
                formattedAmount = formattedAmount.slice(1);
            } else if (categorySpend[category] > 0) {
                // if the spend is positive, i.e. income, add a plus sign
                formattedAmount = "+" + formattedAmount;
            }
            document.getElementById("sidebar-spend-body").innerHTML += `
                <tr style="background:#${backgroundColour}; color:#${textColour}">
                    <td>${categories[category].name}</td>
                    <td>${formattedAmount}</td>
                </tr>
            `;
        }

        // define how to create the spend chart
        var createChart = function() {
            var data = new google.visualization.DataTable();
            data.addColumn("string", "Category");
            data.addColumn("number", "Amount");
            data.addColumn({"role": "style", "type": "string"});
            for (var category in categorySpend) {
                data.addRow([
                    categories[category].name,
                    {"v": categorySpend[category], "f": formatAmount(categorySpend[category], "GBP")},
                    "color:" + categories[category].backgroundColour + "; stroke-color:#ccc"
                ]);
            }
            return data;
        }
        
        // define how to draw the spend chart
        var drawChart = function(data) {
            var options = {
                "chartArea": {"height": "100%", "width": "100%"},
            };
            //var chart = new google.visualization.BarChart(document.getElementById("sidebar-spend-chart"));
            var chart = new google.visualization.ColumnChart(document.getElementById("sidebar-spend-chart"));
            chart.draw(data, options);
        }
        
        // draw the chart, or queue the drawing of the chart
        var chart = {"create": createChart, "data": null, "draw": drawChart};
        if (googleChartsLoaded) {
            chart.data = chart.create();
            chart.draw(chart.data);
        }
        charts.push(chart);
    });
}

function drawCharts() {
    // call each "draw chart" function
    for (var i = 0; i < charts.length; i++) {
        charts[i].draw(charts[i].data);
    }
}

function editAccountNickname(id) {
    console.log("Editing account nickname for account " + id);
    yammDB.select().from(accounts).where(accounts.id.eq(id)).exec().then(function(account) {
        account = account[0]; // there should only be one account per primary key!

        swal({
            title: "Update Account Nickname",
            input: "text",
            showCancelButton: true,
            confirmButtonText: "Update",
            showLoaderOnConfirm: true,
            preConfirm: (nickname) => {
                return new Promise(function(resolve, reject) {
                    var xhr = new XMLHttpRequest();
                    xhr.open("PATCH", `http://127.0.0.1:${sessionStorage.port}/v1/accounts/${account.id}?auth=${sessionStorage.secret}`);
                    xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
                    xhr.onload = function() {
                        if (this.status === 204) {
                            resolve({
                                status: this.status
                            });
                        } else {
                            reject({
                                status: this.status,
                                statusText: xhr.statusText
                            });
                        }
                    }
                    xhr.onerror = function() {
                        reject({
                            status: this.status,
                            statusText: xhr.statusText
                        });
                    }
                    xhr.send(JSON.stringify({"nickname": nickname}));
                })
            },
            allowOutsideClick: false
        }).then(function(result) {
            if (!result.hasOwnProperty("dismiss")) { // if the user did not dismiss the input request
                swal({
                    title: "Account Nickname Updated",
                    type: "success"
                });
                reset();
                loadApp();
            }
        });
    });
}

function editTransactionCategory(id) {
    var newCategory;

    yammDB
        .select()
        .from(transactions)
        .where(transactions.id.eq(id))
    .exec().then(function(transaction) {
        transaction = transaction[0]; // there should only be one transaction per primary key!

        // build the list of options
        var inputOptions = {};
        for (var category in categories) {
            inputOptions[category] = categories[category].name;
        }

        swal({
            "confirmButtonText": "Update",
            "input": "select",
            "inputOptions": inputOptions,
            "inputValue": transaction.category,
            "onBeforeOpen": function(dom) {
                var select = dom.querySelector(".swal2-select");

                // style the select, apply new styles onchange
                var category = categories[transaction.category];
                select.setAttribute("style", `background:#${category.backgroundColour};color:#${category.textColour};display:block`);
                select.addEventListener("change", function(event) {
                    this.setAttribute('style', `background:#${categories[this.value].backgroundColour};color:#${categories[this.value].textColour};display:block`)
                });

                // style the options
                for (var rawCategory in categories) {
                    var category = categories[rawCategory];
                    var option = select.querySelector(`option[value=${rawCategory}]`);
                    option.setAttribute("style", `background:#${category.backgroundColour};color:#${category.textColour};`);
                }
            },
            "preConfirm": (category) => {
                newCategory = category;
                return new Promise(function(resolve, reject) {
                    var xhr = new XMLHttpRequest();
                    xhr.open("PATCH", `http://127.0.0.1:${sessionStorage.port}/v1/accounts/${transaction.account}/transactions/${transaction.id}?auth=${sessionStorage.secret}`);
                    xhr.setRequestHeader('Content-type','application/json; charset=utf-8');
                    xhr.onload = function() {
                        if (this.status === 204) {
                            resolve({
                                status: this.status
                            });
                        } else {
                            reject({
                                status: this.status,
                                statusText: xhr.statusText
                            });
                        }
                    }
                    xhr.onerror = function() {
                        reject({
                            status: this.status,
                            statusText: xhr.statusText
                        });
                    }
                    xhr.send(JSON.stringify({"category": newCategory}));
                })
            },
            "showCancelButton": true,
            "showLoaderOnConfirm": true,
            "title": "Update Transaction Category"
        }).then(function(result) {
            if (!result.hasOwnProperty("dismiss")) { // if the user did not dismiss the input request
                swal({
                    title: "Transaction Category Updated",
                    type: "success"
                });
                yammDB
                    .update(transactions)
                    .set(transactions.category, newCategory)
                    .where(transactions.id.eq(id))
                .exec().then(function() {
                    displaySpend(90);
                    displayTransactions(document.getElementById("transactions-query").value);
                });
            }
        });
    });
}

function formatAmount(amount, currency, alwaysShowSign) {
    // amount: the amount in minor units
    // currency: the ISO 4217 3 character currency code
    // alwaysShowSign: show sign even if it's unnescasary. default false
    var alwaysShowSign = alwaysShowSign || false;

    // work out how many decimal places the currency has
    var localCurrencyFormatArray = (1).toLocaleString("en-GB", { "style": "currency", "currency": currency }).split(".");
    var decimalPlaces;
    if (localCurrencyFormatArray.length === 1) { // no decimal places
        decimalPlaces = 0;
    } else { // some decimal places
        decimalPlaces = localCurrencyFormatArray[1].length;
    }
    var foreignAmountDecimal = amount / Math.pow(10, decimalPlaces);
    var foreignAmountString = foreignAmountDecimal.toLocaleString("en-GB", { "style": "currency", "currency": currency });

    if (alwaysShowSign && amount > 0) {
        foreignAmountString = "+" + foreignAmountString;
    }

    return foreignAmountString;
}

function loadApp() {
    // print debugging information to the console
    console.log("YAMM client port: " + sessionStorage.port);
    console.log("YAMM client secret: " + sessionStorage.secret);
    console.log("https://local.yamm.io/app/#port=" + sessionStorage.port + ",secret=" + sessionStorage.secret);
    console.log("https://alpha.yamm.io/app/#port=" + sessionStorage.port + ",secret=" + sessionStorage.secret);
    console.log("https://beta.yamm.io/app/#port=" + sessionStorage.port + ",secret=" + sessionStorage.secret);
    console.log("https://yamm.io/app/#port=" + sessionStorage.port + ",secret=" + sessionStorage.secret);

    // add menu items
    document.getElementById("navbar-app").innerHTML = '<li><a href="#" id="addAccountLink" class="nav-link"><i class="fa fa-plus" aria-hidden="true"></i> Add account</a></li>';
    
    // add menu item listeners
    document.getElementById("addAccountLink").addEventListener("click", function(event) {
        displayProviders();
    });

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
        addNullable(["accountNumber", "bic", "iban", "sortCode"]).
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
        addColumn("counterpartyAddressCounty", lf.Type.STRING).
        addColumn("counterpartyAddressLatitude", lf.Type.STRING).
        addColumn("counterpartyAddressLongitude", lf.Type.STRING).
        addColumn("counterpartyAddressPostcode", lf.Type.STRING).
        addColumn("counterpartyAddressStreet", lf.Type.STRING).
        addColumn("counterpartyIcon", lf.Type.STRING).
        addColumn("counterpartyName", lf.Type.STRING).
        addColumn("counterpartyNameLower", lf.Type.STRING).
        addColumn("counterpartySortCode", lf.Type.STRING).
        addColumn("counterpartyWebsite", lf.Type.STRING).
        addColumn("created", lf.Type.DATE_TIME).
        addColumn("declineReason", lf.Type.STRING).
        addColumn("description", lf.Type.STRING).
        addColumn("descriptionLower", lf.Type.STRING).
        addColumn("localAmount", lf.Type.NUMBER).
        addColumn("localCurrency", lf.Type.STRING).
        addColumn("mcc", lf.Type.STRING).
        addColumn("providerId", lf.Type.STRING).
        addColumn("settled", lf.Type.DATE_TIME).
        addColumn("type", lf.Type.STRING).
        addNullable([
            "counterpartyAccountNumber",
            "counterpartyAddressCity",
            "counterpartyAddressCountry",
            "counterpartyAddressCounty",
            "counterpartyAddressLatitude",
            "counterpartyAddressLongitude",
            "counterpartyAddressPostcode",
            "counterpartyAddressStreet",
            "counterpartyIcon",
            "counterpartyName",
            "counterpartyNameLower",
            "counterpartySortCode",
            "counterpartyWebsite",
            "declineReason",
            "localAmount",
            "localCurrency",
            "mcc",
            "providerId",
            "settled"
        ]).
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
                if (this.status === 200) {
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
        for(var i in accts) {
            accountRows.push(accounts.createRow({
                "id": accts[i].id,
                "accountNumber": accts[i].accountNumber,
                "availableToSpend": accts[i].availableToSpend,
                "balance": accts[i].balance,
                "bic": accts[i].bic,
                "currency": accts[i].currency,
                "iban": accts[i].iban,
                "nickname": accts[i].nickname,
                "nicknameLower": accts[i].nickname.toLowerCase(),
                "sortCode": accts[i].sortCode
            }));
        }
        return yammDB.insertOrReplace().into(accounts).values(accountRows).exec();
    }).then(function() {
        // get the transaction data from the YAMM client
        return new Promise(function(resolve, reject) {
            var xhr = new XMLHttpRequest();
            xhr.open("GET", "http://127.0.0.1:" + sessionStorage.port + "/v1/transactions?auth=" + sessionStorage.secret, true);
            xhr.onload = function() {
                if (this.status === 200) {
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
        for(var i in txns) {
            var transaction = {};
            transaction.id = txns[i].id;
            transaction.account = txns[i].account;
            transaction.amount = txns[i].amount;
            transaction.balance = txns[i].balance;
            transaction.category = txns[i].category;
            if (txns[i].counterparty !== undefined) {
                transaction.counterpartyAccountNumber = txns[i].counterparty.accountNumber;
                transaction.counterpartyIcon = txns[i].counterparty.icon;
                transaction.counterpartyName = txns[i].counterparty.name;
                transaction.counterpartyNameLower = txns[i].counterparty.name.toLowerCase();
                transaction.counterpartySortCode = txns[i].counterparty.sortCode;
                transaction.counterpartyWebsite = txns[i].counterparty.website;
                if (txns[i].counterparty.address !== undefined) {
                    transaction.counterpartyAddressApprox = txns[i].counterparty.address.approximate || true;
                    transaction.counterpartyAddressCity = txns[i].counterparty.address.city;
                    transaction.counterpartyAddressCountry = txns[i].counterparty.address.country;
                    transaction.counterpartyAddressCounty = txns[i].counterparty.address.county;
                    transaction.counterpartyAddressLatitude = txns[i].counterparty.address.latitude;
                    transaction.counterpartyAddressLongitude = txns[i].counterparty.address.longitude;
                    transaction.counterpartyAddressPostcode = txns[i].counterparty.address.postcode;
                    transaction.counterpartyAddressStreet = txns[i].counterparty.address.streetAddress;
                } else {
                    transaction.counterpartyAddressApprox = true;
                }
            } else {
                transaction.counterpartyAddressApprox = true;
            }
            transaction.created = new Date(txns[i].created);
            transaction.declineReason = txns[i].declineReason;
            transaction.description =  txns[i].description;
            transaction.descriptionLower =  txns[i].description.toLowerCase();
            transaction.localAmount = txns[i].localAmount;
            transaction.localCurrency = txns[i].localCurrency;
            transaction.mcc = txns[i].mcc;
            transaction.providerId = txns[i].providerId;
            if (txns[i].settled !== undefined) {
                transaction.settled = new Date(txns[i].settled);
            }
            transaction.type = txns[i].type;
            transactionRows.push(transactions.createRow(transaction));
        }

        return yammDB.insertOrReplace().into(transactions).values(transactionRows).exec();
    }).then(function() {
        // add sidebar and main section
        document.getElementById("main").innerHTML = `
            <div class="row">
                <div id="sidebar-column" class="col-lg-3">
                    <div id="sidebar-balance"></div>
                    <hr />
                    <div id="sidebar-accounts"></div>
                    <hr />
                    <div id="sidebar-spend">
                        <h2>Spending</h2>
                        <p>Over the last <input type="number" value="90" min="7" step="1"> days:</p>
                        <table class="table">
                            <thead class="thead-light">
                                <th>Category</th>
                                <th>Amount</th>
                            </thead>
                            <tbody id="sidebar-spend-body">
                            </tbody>
                        </table>
                        <div id="sidebar-spend-chart"></div>
                    </div>
                </div>
                <div id="main-column" class="col-lg-9">
                    <h2>Transactions</h2>
                    <input type="text" id="transactions-query" placeholder="Filter transactions">
                    <div id="transactions-results"></div>
                </div>
            </div>`;
        
        // add listeners for spending (number of days) and transactions (query)
        document.querySelector("#sidebar-spend input").addEventListener("input", function(event) {
            displaySpend(this.value);
        });
        document.querySelector("#main-column input").addEventListener("input", function(event) {
            displayTransactions(this.value);
        });

        displayAccounts(); // display accounts overview & list

        // fetch the list of categories, parse as JSON, display transactions and spend
        fetch("/json/categories.json").then(function(response) {
            // handle potential errors
            if (response.status !== 200) {
                swal({
                    "title": "Error while fetching categories",
                    "text": "HTTP " + response.status + " (" + response.statusText + ")",
                    "type": "error",
                });
                return;
            }

            return response.json();
        }).then(function(json) {
            categories = json;
            displayTransactions(""); // display transactions
            displaySpend(90); // display spend categories
        });
    });
}

function reset() {
    document.getElementById("navbar-app").innerHTML = "";
    document.getElementById("main").innerHTML = '<img src="/img/loading.svg" id="loading" alt="Loading..." />';
    yammDB.close();
}

function setPortAndSecret() {
    // set port and secret, redirect to remove parameters from URL
    if (sessionStorage.port && sessionStorage.secret) { // if YAMM port and secret have been set
        if (params.length === 2 && params[0].indexOf("port") !== -1 && params[1].indexOf("secret") !== -1) { // if they're still in the URL
            // remove parameters from URL
            if (history.replaceState !== undefined) { // if replaceState (HTML5 history API) is supported
                history.replaceState(null, "", "/app/");
            } else {
                window.location.hash = "";
            }   
        }
    } else {
        for(var i in params) {
            var param = params[i].split("=");
            if (param[0] === "port") {
                sessionStorage.port = param[1];
            } else if (param[0] === "secret") {
                sessionStorage.secret = param[1];
            }
        }
        if (sessionStorage.port && sessionStorage.secret) { // if port and secret are now both set
            // remove parameters from URL
            if (history.replaceState !== undefined) { // if replaceState (HTML5 history API) is supported
                history.replaceState(null, "", "/app/");
            } else {
                window.location.hash = "";
            }
        } else {
            document.getElementById("main").innerHTML = "<div class='alert alert-danger'>Port and secret not found! Please note that you cannot open YAMM in another tab or browser.</div>";
        }
    }
}


// set url parameters
if (window.location.href.indexOf("#") === -1) {
    params = [];
    url = window.location.href;
} else {
    params = window.location.href.split("#")[1].split(",");
    url = window.location.href.split("#")[0];
}
setPortAndSecret();
if (sessionStorage.port && sessionStorage.secret) {
    loadApp();
}

// load Google Charts
google.charts.load('current', {packages: ['corechart', 'bar']});
google.charts.setOnLoadCallback(createCharts);
window.onresize = drawCharts;
