// Lisbon

var Lisbon = {}; // namespace

Lisbon.version = "1.1.0";

// CSS for Chooser

Lisbon._chooserCss = "\
body {\
 margin: 0; border: 0; padding: 0;\
 font-family: 'Open Sans', 'Lucida Grande', Arial, Verdana, sans-serif;\
 font-size: 13px;\
}\
#title {\
 border-bottom: 1px solid #bbb;\
 padding: 1ex 1em;\
}\
h1 {\
 font-size: 15px;\
}\
h2 {\
 margin: 0;\
 font-size: 13px;\
 margin-left: 1em;\
 color: #999;\
}\
#message {\
 margin: 1ex 1em;\
}\
table {\
 width: 100%;\
 border-collapse: collapse;\
 margin: 0 0 7ex;\
}\
tr:hover {\
 background: #def;\
 cursor: pointer;\
}\
tr.row-selected:hover {\
 background: #26f;\
 cursor: pointer;\
}\
td {\
 font-size: 15px;\
 padding: 0.5ex 1em;\
 }\
a {\
 text-decoration: none;\
 color: inherit;\
}\
\
.row-deselected {\
}\
.row-selected {\
 background: #39f;\
 color: #fff;\
}\
#nav-footer {\
 position: fixed;\
 bottom: 0;\
 width: 100%;\
 margin: 0;\
 padding: 1ex 0em;\
 border-top: 1px solid #bbb;\
 background: white;\
 text-align: right;\
 }\
#chooseBtn, #cancelBtn {\
 display: inline-block;\
 margin: 1ex 1em 1ex 0.5em;\
 border: 1px solid inherit;\
 border-radius: 3px;\
 padding: 1ex 1em;\
}\
\
#cancelBtn {\
 border: 1px solid #bbb;\
 color: #333;\
 cursor: pointer;\
}\
#cancelBtn:hover {\
 background: #ccc;\
 color: black;\
 border: 1px solid #000;\
}\
\
#chooseBtn {\
 color: white;\
}\
.btnDisabled, .btnDisabled:hover {\
 background: #ccc;\
 color: white;\
 border: 1px solid #bbb;\
 cursor: not-allowed;\
}\
.btnEnabled {\
 background: #39f;\
 border: 1px solid #26f;\
 cursor: pointer;\
}\
.btnEnabled:hover {\
 background: #3af;\
 border: 1px solid #000;\
}\
";

//----------------------------------------------------------------
// HTML utility function (from section 15.8.1 of "JavaScript: The
// Definitive Guide", 5th edition)

function make(doc, tagName, attributes, children) {
    // If we were invoked with two arguments, the attributes argument is
    // an array or string; it should really be the children arguments.
    if (arguments.length === 2 &&
        (attributes instanceof Array || typeof attributes === "string")) {
        children = attributes;
        attributes = null;
    }

    // Create the element
    var e = doc.createElement(tagName);

    // Set attributes
    if (attributes) {
        for (var name in attributes) {
            if (attributes.hasOwnProperty(name)) {
                e.setAttribute(name, attributes[name]);
            }
        }
    }
    // Add children, if any were specified.
    if (children !== null) {
        if (children instanceof Array) {  // If it really is an array
            for (var i = 0; i < children.length; i++) { // Loop through kids
                var child = children[i];
                if (typeof child === "string")          // Handle text nodes
                    child = doc.createTextNode(child);
                e.appendChild(child);  // Assume anything else is a Node
            }
        }
        else if (typeof children === "string") // Handle single text child
            e.appendChild(doc.createTextNode(children));
        else e.appendChild(children);
        // Finally, return the element.
        return e;
    }
}

function maker(doc, tag) {
    return function (attributes, kids) {
        if (arguments.length === 1)
            return make(doc, tag, attributes);
        else
            return make(doc, tag, attributes, kids);
    }
}

//================================================================
// Class for representing a running instance of the Chooser.

Lisbon._ChooserContext = function (options) {

    this.options = options;

    // These will be populated when run() method is invoked
    this.window = null;
    this.document = null;
    this.items = [];
};

// Returns the number of items currently selected.

Lisbon._ChooserContext.prototype.numSelected = function () {
    var count = 0;
    for (var i = 0, len = this.items.length; i < len; i++) {
        if (this.items[i].selected) {
            count++;
        }
    }
    return count;
};

// Returns a list of URLs for the items that are currently selected.

Lisbon._ChooserContext.prototype.selectedUrls = function () {
    var results = [];
    for (var i = 0, len = this.items.length; i < len; i++) {
        if (this.items[i].selected) {
            results.push(this.items[i]);
        }
    }
    return results;
};

Lisbon._ChooserContext.prototype._doSuccess = function () {
    this.window.close();
    if (this.options.success) {
        this.options.success(this.selectedUrls());
    }

};

Lisbon._ChooserContext.prototype._doCancel = function () {
    this.window.close();
    if (this.options.cancel) {
        this.options.cancel(); // invoke callback
    }
};

//----------------------------------------------------------------
// Parse an XML DOM for a value to use as the subtitle.

Lisbon._ChooserContext.prototype._parseXMLTitle = function (xmlDom) {
    var name;

    var c = xmlDom.children;
    for (var i = 0, len = c.length; i < len; i++) {
        var child = c[i];
        if (child.nodeName === 'container') {
            var candidateName = child.getAttribute("name");
            if (candidateName !== null && candidateName !== '') {
                name = candidateName;
            }
        }
    }

    return name;
};

// Parse an XML DOM for items.
// Populates the `item` member.

Lisbon._ChooserContext.prototype._parseXMLItems = function (xmlDom) {
    var baseUrl = this.options.src;

    this.items.length = 0; // clear any members in the array

    var timestampRegExp = new RegExp("[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(\.[0-9]+)?$");

    var c1 = xmlDom.children;
    for (var i1 = 0, len1 = c1.length; i1 < len1; i1++) {
        if (c1[i1].nodeName === 'container') {
            var container = c1[i1];

            // Look for <object> inside the <container>

            var c2 = container.children;
            for (var i2 = 0, len2 = c2.length; i2 < len2; i2++) {
                if (c2[i2].nodeName === "object") {
                    var obj = c2[i2];

                    var name;
                    var bytes;
                    var fileSize;
                    var date;

                    var c3 = obj.children;
                    for (var i3 = 0, len3 = c3.length; i3 < len3; i3++) {
                        var element = c3[i3];
                        switch (element.nodeName) {
                            case "name":
                                name = element.textContent;
                                if (name === '') {
                                    name = null; // do not use if there is no sensible value
                                }
                                break;
                            case "bytes":
                                var fs = element.textContent;
                                if (new RegExp("^[0-9]+$").test(fs)) {
                                    // Number of bytes: format with human readable units
                                    var num;
                                    var units;
                                    bytes = 0 + fs;
                                    if (bytes < 1024) {
                                        num = bytes;
                                        // units = null
                                    } else if (bytes < 1024 * 1024) {
                                        num = bytes / 1024;
                                        units = "KiB";
                                    } else if (bytes < 1024 * 1024 * 1024) {
                                        num = bytes / 1024 / 1024;
                                        units = "MiB";
                                    } else if (bytes < 1024 * 1024 * 1024 * 1024) {
                                        num = bytes / 1024 / 1024 / 1024;
                                        units = "GiB";
                                    } else {
                                        num = bytes / 1024 / 1024 / 1024 / 1024;
                                        units = "TiB";
                                    }

                                    if (units === null) {
                                        fileSize = bytes + ' B'; // no decimal part
                                    } else {
                                        fileSize = parseFloat(Math.round(num * 10) / 10).toFixed(1) + ' ' + units;
                                    }

                                }
                                break;
                            case "last_modified":
                                if (timestampRegExp.test(element.textContent)) {
                                    // Only use whole seconds precision and replace date-time separator
                                    date = element.textContent.substring(0, 19).replace('T', ' ');
                                }
                                break;
                        }

                    }

                    if (name !== null) {
                        var url;
                        if (baseUrl.charAt(baseUrl.length - 1) === '/') {
                            url = baseUrl + name;
                        } else {
                            url = baseUrl + "/" + name;
                        }

                        this.items.push({
                            url: url,
                            name: name,
                            bytes: bytes,
                            size: fileSize,
                            date: date,
                            selected: false
                        });
                    } else {
                        // <object> doesn't have a <name>: ignore
                    }
                }
            }
        }
    }
};

// Parse a HTML DOM for a <H1> tag to use as the subtitle.

Lisbon._ChooserContext.prototype._parseHTMLTitle = function (hiddenDiv) {

    var h1_tags = hiddenDiv.getElementsByTagName('H1');

    if (0 < h1_tags.length) {
        return h1_tags[0].innerText;
    } else {
        return null;
    }
};

// Parse a HTML DOM for items.
// Populates the `item` member.

Lisbon._ChooserContext.prototype._parseHTMLItems = function (hiddenDiv) {
    var baseUrl = this.options.src;

    this.items.length = 0; // clear any members in the array

    var anchors = hiddenDiv.getElementsByTagName('a');
    for (var i = 0, len = anchors.length; i < len; i++) {
        var anchor = anchors[i];

        // URL is the link's HREF

        var url = anchor.getAttribute("href");
        if (url !== '') {
            // Make sure URL is not relative

            if (!new RegExp("^\w+\:\/\/").test(url)) {
                // Does not start with "scheme://", so not an absolute URL: append to base URL
                if (baseUrl.charAt(baseUrl.length - 1) === '/')
                    url = baseUrl + url;
            } else {
                url = baseUrl + "/" + url;
            }


            // Text is the text of the link

            var name = anchor.innerText;

            // Size and date, if available

            var fileSize = null;
            var date = null;

            var p = anchor.parentNode;
            if (p.nodeName === 'TD') {
                var pp = p.parentNode;
                if (pp.nodeName === 'TR') {
                    var children = pp.childNodes;
                    for (var j = 0, len2 = children.length; j < len2; j++) {
                        var n = children[j];
                        if (n.nodeType === 1 && n.nodeName === 'TD') {
                            if (n.className === "colsize") {
                                fileSize = n.innerText;
                            } else if (n.className === "coldate") {
                                date = n.innerText;
                            }
                        }
                    }
                }
            }

            this.items.push({
                url: url,
                name: name,
                size: fileSize,
                date: date,
                selected: false
            });
        } else {
            // Link without HREF: ignore
        }
    }
};

//----------------------------------------------------------------

Lisbon._chooserItemOnClick = function (event) {
    // this = <tr> element that was clicked
    // it has custom attributes of "chooseContext" and "chooserIndex"

    var context = this.chooserContext;
    var itemIndex = this.chooserIndex;

    var chooseBtn = context.document.getElementById("chooseBtn");
    var item = context.items[itemIndex];

    if (event.shiftKey) {
        //console.log("shift key pressed"); // TODO
    }

    if (!item.selected) {
        // Select the clicked item
        item.selected = true;
        this.className = "row-selected";
    } else {
        // Deselect the clicked item
        item.selected = false;
        this.className = "row-deselected";
    }

    var numSelected = context.numSelected();

    if (numSelected === 0) {
        // Disable "choose" button
        chooseBtn.className = "btnDisabled";
        chooseBtn.onclick = null;
    } else {
        // Enable "choose" button
        chooseBtn.className = "btnEnabled";
        chooseBtn.onclick = function () {
            context._doSuccess();
        }
    }
    return false;
};

//----------------
// Action when source page is loaded.

Lisbon._ChooserContext.prototype.handlePage = function (req) {
    // Parse information from document

    var pageTitle = "";

    var contentType = req.getResponseHeader('content-type')

    if (req.responseXML !== null) {
        // Response parsed by XMLHttpRequest as XML: use it
        pageTitle = this._parseXMLTitle(req.responseXML);
        this._parseXMLItems(req.responseXML);

    } else if (contentType.startsWith('text/plain')) {
        // Response is plain text: cannot parse for links: abort
        this.document.getElementById("message").innerHTML = "Error: source with 'text/plain' content-type is not supported.";
        return;

    } else {
        // Response not parsed as XML: parse it as HTML
        var hiddenDiv = this.document.createElement("div");
        hiddenDiv.setAttribute("style", 'display: none');
        hiddenDiv.innerHTML = req.response; // parse into DOM

        pageTitle = this._parseHTMLTitle(hiddenDiv);
        this._parseHTMLItems(hiddenDiv);
    }

    if (this.options.showSubtitle && pageTitle !== "") {
        this.document.getElementById("subtitle").innerHTML = pageTitle;
    }
    this.document.getElementById("message").innerHTML = "";

    // Produce new links

    var table = maker(this.document, "table");
    var tr = maker(this.document, "tr");
    var td = maker(this.document, "td");
    var a = maker(this.document, "a");

    if (0 < this.items.length) {
        // Parser found some links: produce table

        var theTable = table(null, []);

        for (var i = 0, len = this.items.length; i < len; i++) {
            var item = this.items[i];

            var displayName = item.name;
            if (!displayName) {
                displayName = "untitled";
            }

            var row = tr(null, [
                td(null, [a({href: item.url}, displayName)]),
                td(null, [item.size ? item.size : '']),
                td(null, [item.date ? item.date : ''])
            ]);

            row.chooserContext = this;
            row.chooserIndex = i;

            row.onclick = Lisbon._chooserItemOnClick;

            theTable.appendChild(row);
        }

        this.document.getElementById("contents").appendChild(theTable);

    } else {
        // Parser failed to find any links
        this.document.getElementById("message").innerHTML = "No links found.";
    }
};

//----------------
// Action when source page loading fails.

Lisbon._ChooserContext.prototype.handleError = function (req) {
    var message = "Error: could not get source page";

    if (req.statusText !== '') {
      message += ": " + req.statusText;
    }

    if (req.status !== 0) {
      message += " (HTTP status " + req.status + ")";
    }

    if (req.statusText === '' && req.status === 0) {
      message += ": possibly cross-site request is not permitted.";
    }

    this.document.getElementById("message").innerHTML = message;
};

//----------------------------------------------------------------
// Create a new instance of a running Chooser.

Lisbon._ChooserContext.prototype.run = function () {

    // Create a new window

    var win = window.open("", "_blank",
        'width=640,height=530,status=yes,resizable=yes,scrollbars=yes', true);

    var doc = win.document;

    // Record values in the context for later use

    this.window = win;
    this.document = doc;
    this.items.length = 0; // clear array (just in case)

    // Initial document

    var style = maker(doc, "style");
    var title = maker(doc, "title");
    var h1 = maker(doc, "h1");
    var h2 = maker(doc, "h2");
    var div = maker(doc, "div");
    var p = maker(doc, "p");
    var a = maker(doc, "a");

    var titleStr = this.options.title;
    if (!titleStr)
        titleStr = "Chooser"; // default title

    var head = doc.documentElement.getElementsByTagName('head')[0];
    var body = doc.documentElement.getElementsByTagName('body')[0];
    //var body = doc.documentElement.lastChild;

    head.appendChild(style({type: 'text/css'}, Lisbon._chooserCss));
    head.appendChild(title(null, "Choose files to download"));

    var msg = p({id: "message"}, []);

    body.appendChild(
        div(null, [
            div({id: "title"}, [
                h1(null, titleStr),
                h2({id: "subtitle"}, '')
            ]),
            div({id: "contents"}, [
                msg
            ]),
            div({id: "nav-footer"}, [
                a({id: "chooseBtn", class: "btnDisabled"}, "Choose"),
                a({id: "cancelBtn"}, "Cancel")
            ])
        ])
    );

    var context = this;
    doc.getElementById("cancelBtn").onclick = function () {
        context._doCancel();
    };

    win.onunload = function() {
        context._doCancel();
    };

    body.onkeypress = function (event) {
        console.log("Key pressed: " + event.keyCode);
        switch (event.keyCode) {
            case 13: // Return/Enter
                if (0 < context.numSelected()) {
                    context._doSuccess();
                }
                break;
            case 27: // Escape
                context._doCancel();
                break;
        }
    };

    // Load the source

    if (this.options.src) {
        msg.innerHTML = "Loading...";

        // Use XMLHttpRequest to download the "src"

        var req;
        if (window.XMLHttpRequest) { // for IE7+, Firefox, Chrome, Opera, Safari
            req = new XMLHttpRequest();
        } else { // for IE6, IE5
            req = new ActiveXObject("Microsoft.XMLHTTP");
        }

        req.onreadystatechange = function () {
            if (req.readyState === 4) {  // Request is finished
                if (req.status === 200) {
                    context.handlePage(req);
                } else {
                    context.handleError(req);
                }
            }
        };

        // Construct request

        req.open("GET", this.options.src, true);

        var customAcceptHeader = false;

        if (this.options.headers !== null) {
          for (var key in this.options.headers) {
            if (this.options.headers.hasOwnProperty(key)) {
              var value = this.options.headers[key];
              if (value instanceof Array) {
                // Repeated header
                for (var i = 0, len = value.length; i < len; i++) {
                  req.setRequestHeader(key, value[i].toString());
                }
              } else {
                // Single header
                req.setRequestHeader(key, value.toString());
              }
              if (key.toLowerCase() === 'accept') {
                customAcceptHeader = true;
              }
            }
          }
        }

        if (this.options.isXML) {
            if (! customAcceptHeader) {
              req.setRequestHeader("Accept", "text/xml");
            } else {
	      console.log("lisbon: warning: custom request headers has an 'Accept' header: isXML is ignored");
	    }
        }

        // Send request

        req.send(null);
    } else {
        // No "src" to load
        msg.innerHTML = "Internal error: source URL 'src' not specified.";
    }
};

//================================================================
// Class to represent to options to create a instance of a running Chooser.

Lisbon.Chooser = function (options) {
    this.title = null;
    this.src = null;
    this.headers = null;
    this.isXML = false;
    this.showSubtitle = true;
    this.success = null; // method to invoke when choose button is clicked
    this.cancel = null; // method to invoke when dialog is cancelled

    if (options) {
        this.title = options["title"];
        this.src = options["src"];
        this.headers = options["headers"];
        this.isXML = !!(options.isXML);
        this.showSubtitle = (options["showSubtitle"] !== null) ? !!(options["showSubtitle"]) : true;
        this.success = options.success;
        this.cancel = options.cancel;
    }
};

// Factory method to create a new running Chooser.

Lisbon.Chooser.prototype.run = function () {
    var ctx = new Lisbon._ChooserContext(this);
    ctx.run();
    return ctx;
};

//EOF
