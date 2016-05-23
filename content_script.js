var CommentExporter = function(request, sendResponse) {
    var cInterval;
    var numToExtract = 50;
    var extracted = [];
    var commentSelector = '.comment-renderer-content';
    var startTime = 0;
    var fileType = 'xlsx';
    var filenamePrefix = 'YouTubeComments';
    var videoId;

    function extractComments(comments) {
        var now = Math.floor(Date.now() / 1000);

        $('html, body').animate({scrollTop: $(document).height()}, 0);
        $(".load-more-button").click();

        comments.addClass("extracted");

        extracted = $(commentSelector + ".extracted");

        if (extracted.length >= numToExtract) {
            clearInterval(cInterval);

            if (extracted.length > numToExtract) {
                extracted = extracted.slice(0, numToExtract);
            }

            exportToFile(extracted, fileType);
        } else if (now - startTime > 300) {
            console.log('Stopping after 5 minutes');
            clearInterval(cInterval);
            sendResponse( { message: 'timeout' } );
        }

        console.log('Extracted: ' + extracted.length);
    }

    function startExtracting(request) {
        numToExtract = parseInt(request.num);
        fileType = request.fileType;
        videoId = $("meta[itemprop='videoId']")[0].attributes.content.value;
        
        chrome.storage.sync.set({'numToExtract': numToExtract}, function() {
            console.log("Extracting " + numToExtract + ' comments to ' + fileType);

            startTime = Math.floor(Date.now() / 1000);

            cInterval = setInterval(function () {
                extractComments($(commentSelector).not('.extracted'));
            }, 1000);
        });
    }

    function datenum(v, date1904) {
        if (date1904) v += 1462;
        var epoch = Date.parse(v);
        return (epoch - new Date(Date.UTC(1899, 11, 30))) / (24 * 60 * 60 * 1000);
    }

    function sheetFromArrayOfArrays(data, opts) {
        var ws = {};
        var range = {s: {c: 10000000, r: 10000000}, e: {c: 0, r: 0}};
        for (var R = 0; R != data.length; ++R) {
            for (var C = 0; C != data[R].length; ++C) {
                if (range.s.r > R) range.s.r = R;
                if (range.s.c > C) range.s.c = C;
                if (range.e.r < R) range.e.r = R;
                if (range.e.c < C) range.e.c = C;
                var cell = {v: data[R][C]};
                if (cell.v == null) continue;
                var cell_ref = XLSX.utils.encode_cell({c: C, r: R});

                if (typeof cell.v === 'number') cell.t = 'n';
                else if (typeof cell.v === 'boolean') cell.t = 'b';
                else if (cell.v instanceof Date) {
                    cell.t = 'n';
                    cell.z = XLSX.SSF._table[14];
                    cell.v = datenum(cell.v);
                }
                else cell.t = 's';

                ws[cell_ref] = cell;
            }
        }
        if (range.s.c < 10000000) ws['!ref'] = XLSX.utils.encode_range(range);
        return ws;
    }

    function Workbook() {
        if (!(this instanceof Workbook)) return new Workbook();
        this.SheetNames = [];
        this.Sheets = {};
    }

    function s2ab(s) {
        var buf = new ArrayBuffer(s.length);
        var view = new Uint8Array(buf);
        for (var i = 0; i != s.length; ++i) view[i] = s.charCodeAt(i) & 0xFF;
        return buf;
    }

    function exportToFile(items, fileType) {
        fileType = fileType || 'xlsx';
        var contentType = 'application/octet-stream', wbout;

        var oo = [
            [
                ['VideoID', 'Username', 'YTID', 'Comment'],
            ],
            []
        ];

        var ranges = oo[1];

        $.each(items, function (k, v) {
            var item = $(v);
            var authorEl = $(".comment-author-text", item);
            var author = authorEl.text();
            var ytid = authorEl.attr('data-ytid');
            var comment = $(".comment-renderer-text-content", item).text();
            oo[0].push([videoId, author, ytid, comment]);
        });

        /* original data */
        var data = oo[0];
        var ws_name = "YTComments";

        var wb = new Workbook(), ws = sheetFromArrayOfArrays(data);

        /* add ranges to worksheet */
        ws['!merges'] = ranges;

        /* add worksheet to workbook */
        wb.SheetNames.push(ws_name);
        wb.Sheets[ws_name] = ws;

        sendResponse({ message: 'complete' });

        if (fileType == "csv") {
            contentType = 'text/csv';
            wbout = XLSX.utils.sheet_to_csv(ws);
        } else if (fileType == "json") {
            contentType = 'application/json';
            wbout = JSON.stringify(XLSX.utils.sheet_to_json(ws));
        } else {
            wbout = s2ab(XLSX.write(wb, {bookType: 'xlsx', bookSST: false, type: 'binary'}));
        }

        saveAs(new Blob([wbout], {type: contentType}), filenamePrefix + "-" + videoId + "." + fileType);

        // Scroll back to top
        document.body.scrollTop = document.documentElement.scrollTop = 0;
    }

    startExtracting(request);
};

chrome.runtime.onMessage.addListener(
    function (request, sender, sendResponse) {
        if (request.num && request.fileType) {
            new CommentExporter(request, sendResponse);
        }
    }
);

