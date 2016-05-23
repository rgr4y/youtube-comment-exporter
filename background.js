chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (tab.url.indexOf('www.youtube.com') > -1) {
        chrome.pageAction.show(tabId);
    }
});
