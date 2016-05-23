function sendStart(message) {
    $("button").attr('disabled','disabled');

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, message, function(response) {
            $("button").attr('disabled','');
        });
    });
}

$(function() {
    $("button").click(function() {
        sendStart({ num: $("input[name='number-comments']").val(), fileType: $(this).val() });
    });

    chrome.storage.sync.get("numToExtract", function(item) {
        if (!item.numToExtract) {
            chrome.storage.sync.set({ numToExtract: 50 });
        } else {
            $("input[name='number-comments']").val(item.numToExtract);
        }
    });
});
