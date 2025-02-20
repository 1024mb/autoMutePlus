"use strict";

(function () {
    browser.storage.local.get().then(result => {
        if (result.normalMode === undefined) {
            browser.storage.local.set({
                                          normalMode: true,
                                          privateMode: true,
                                          darkTheme: false,
                                          autoMute: true,
                                          whitelist: "",
                                          blacklist: ""
                                      });
        }

        toggleIcon();
    });

    createMenu([
                   {
                       id: "autoMutePlus",
                   },
                   {
                       id: "addDomainToWhitelist",
                   },
                   {
                       id: "addUrlToWhitelist",
                   },
                   {
                       id: "addDomainToBlacklist",
                   },
                   {
                       id: "addUrlToBlacklist",
                   },
                   {
                       id: "muteAllTabs",
                       icons: {
                           "16": "icons/icon_muted.svg"
                       }
                   },
                   {
                       id: "unmuteAllTabs",
                       icons: {
                           "16": "icons/icon_unmuted.svg"
                       }
                   }
               ]);

    browser.menus.onClicked.addListener(menuListener);
    browser.tabs.onCreated.addListener(createdListener);
    browser.browserAction.onClicked.addListener(toggleAutoMute);
})();

/**
 * @param  {Array<Object>} items
 */
function createMenu(items) {
    items.forEach(item => {
        if (item.id !== "autoMutePlus") {
            item.parentId = "autoMutePlus";
        }

        item.title = browser.i18n.getMessage(item.id);
        browser.menus.create(item);
    });
}

/**
 * @param  {browser.menus.OnClickData} info
 * @param  {browser.tabs.Tab} tab
 */
function menuListener(info, tab) {
    if (info.menuItemId.endsWith("muteAllTabs")) {
        setTabMutes(info.menuItemId === "muteAllTabs");
    } else {
        const url = new URL(tab.url);
        let action;
        let listType;
        [action, listType] = info.menuItemId.split("To");
        addItemToList(escapeRegExp(action === "addDomain" ? url.hostname : url.href), listType);

        if (listType === "Blacklist") {
            setMuted(tab, true);
        }
    }
}

/**
 * @param  {browser.tabs.Tab} tab
 */
function createdListener(tab) {
    autoMute(tab)

    browser.tabs.onUpdated.addListener(updatedListener, {properties: ["url"]});
}

/**
 * @param  {number} tabId
 * @param  {browser.tabs.Tab} changeInfo
 * @param  {browser.tabs.Tab} tab
 */
function updatedListener(tabId, changeInfo, tab) {
    autoMute(tab);
}

/**
 * @param  {boolean} muted
 */
function setTabMutes(muted) {
    browser.tabs.query({}).then(tabs => {
        tabs.forEach(tab => {
            setMuted(tab, muted);
        });
    });
}

/**
 * @param  {browser.tabs.Tab} tab
 * @param  {boolean} muted
 */
function setMuted(tab, muted) {
    browser.tabs.update(tab.id, {muted: muted});
}

/**
 * @param  {string} item
 * @param  {string} listType
 */
function addItemToList(item, listType) {
    listType = listType.toLowerCase();

    browser.storage.local.get(listType).then(result => {
        const listContents = result[listType].trim();

        if (listContents.split("\n").some(line => line.trim() === item.trim())) {
            return
        }

        let keys = {};
        const needsNewline = listContents !== "";
        keys[listType] = listContents + (needsNewline ? "\n" : "") + item;
        browser.storage.local.set(keys);
    });
}

/**
 * @param  {browser.tabs.Tab} tab
 */
function autoMute(tab) {
    browser.storage.local.get().then(result => {
        const normalMode = result.normalMode;
        const privateMode = result.privateMode;
        const whitelisted = listMatchesTab(result.whitelist, tab, result.ignoreAboutTabs, result.ignoreAddonTabs);
        const blacklisted = listMatchesTab(result.blacklist, tab, false, false);

        if (
            blacklisted
            || (!whitelisted && result.autoMute && ((tab.incognito && privateMode) || (!tab.incognito && normalMode)))
        ) {
            console.debug("We should mute")
            setMuted(tab, true);
        } else {
            console.debug("We should unmute")
            setMuted(tab, false);
        }
    });
}

function toggleAutoMute() {
    browser.storage.local.get("autoMute").then(result => {
        browser.storage.local.set({autoMute: !result.autoMute});
        toggleIcon();
    });
}

function toggleIcon() {
    browser.storage.local.get(["autoMute", "darkTheme"]).then(result => {
        browser.browserAction.setIcon({
                                          path: "icons/icon_" + (result.autoMute ? "muted" : "unmuted") + (result.darkTheme ? "_dark" : "") + ".svg"
                                      });
        browser.browserAction.setTitle({
                                           title: browser.i18n.getMessage(
                                               (result.autoMute ? "disable" : "enable") + "AutoMute")
                                       });
    });
}

/**
 * @param  {string} listContents
 * @param  {browser.tabs.Tab} tab
 * @param  {boolean} ignoreAboutTabs
 * @param  {boolean} ignoreAddonTabs
 * @returns {boolean}
 */
function listMatchesTab(listContents, tab, ignoreAboutTabs, ignoreAddonTabs) {
    console.debug(`Checking: ${tab.url}`);

    if (ignoreAboutTabs) {
        if (tab.url.startsWith("about:")) {
            return true
        }
    }

    if (ignoreAddonTabs) {
        if (tab.url.startsWith("moz-extension://")) {
            return true
        }
    }

    for (const line of listContents.split("\n")) {
        const trimmed_line = line.trim();
        if (trimmed_line === "") {
            continue;
        }

        try {
            if ((new RegExp(trimmed_line, "i")).test(tab.url)) {
                return true;
            }
        }
        catch (e) {
            console.log(browser.i18n.getMessage("invalidRegex") + " \"" + trimmed_line + "\".");
        }
    }

    return false;
}

/**
 * @param  {string} string
 * @returns {string}
 */
function escapeRegExp(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
