"use strict";

(function () {
    document.getElementById("title").textContent = browser.i18n.getMessage("options");

    document.getElementById("checkboxLabel1").textContent = browser.i18n.getMessage("normal");
    document.getElementById("checkboxLabel2").textContent = browser.i18n.getMessage("private");
    document.getElementById("checkboxLabel3").textContent = browser.i18n.getMessage("darkTheme");
    document.getElementById("checkboxLabel4").textContent = browser.i18n.getMessage("ignoreAboutTabs");
    document.getElementById("checkboxLabel5").textContent = browser.i18n.getMessage("ignoreAddonTabs");

    document.getElementById("textAreaLabel1").textContent = browser.i18n.getMessage("whitelist");
    document.getElementById("textAreaLabel2").textContent = browser.i18n.getMessage("blacklist");

    document.addEventListener("DOMContentLoaded", restoreOptions);
    document.getElementById("optionsForm").addEventListener("change", saveOptions);

    const whitelist = document.getElementById("whitelist");
    const blacklist = document.getElementById("blacklist");

    if (whitelist.addEventListener) {
        whitelist.addEventListener("input", saveOptions, false);
    }

    if (blacklist.addEventListener) {
        blacklist.addEventListener("input", saveOptions, false);
    }
})();

function saveOptions() {
    const darkTheme = document.getElementById("darkTheme").checked;
    const whitelistContents = document.getElementById("whitelist").value;
    const blacklistContents = document.getElementById("blacklist").value;
    displayRegexWarning(whitelistContents, "whitelist");
    displayRegexWarning(blacklistContents, "blacklist");

    browser.storage.local.get(["autoMute", "darkTheme"]).then(result => {
        if (darkTheme !== result.darkTheme) {
            browser.browserAction.setIcon({
                                              path: "icons/icon_" + (result.autoMute ? "muted" : "unmuted") + (darkTheme ? "_dark" : "") + ".svg"
                                          });
        }

        browser.storage.local.set({
                                      normalMode: document.getElementById("normalMode").checked,
                                      privateMode: document.getElementById("privateMode").checked,
                                      ignoreAboutTabs: document.getElementById("ignoreAboutTabs").checked,
                                      ignoreAddonTabs: document.getElementById("ignoreAddonTabs").checked,
                                      darkTheme: darkTheme,
                                      whitelist: whitelistContents,
                                      blacklist: blacklistContents
                                  });
    });
}

/**
 * @param  {string} listContents
 * @param  {string} type
 */
function displayRegexWarning(listContents, type) {
    const warningsContainer = document.getElementById(type + "-warnings");
    const warningElements = warningsContainer.getElementsByClassName("warning");

    while (warningElements[0]) {
        warningElements[0].parentNode.removeChild(warningElements[0]);
    }

    for (const line of listContents.split("\n")) {
        const trimmed_line = line.trim();

        if (trimmed_line === "") {
            continue;
        }

        try {
            new RegExp(trimmed_line, "i");
        }
        catch (e) {
            const warningElement = document.createElement("span");
            warningElement.classList.add("warning");
            warningElement.appendChild(
                document.createTextNode(
                    browser.i18n.getMessage("invalidRegex") + " \"" + trimmed_line + "\""
                )
            );
            warningsContainer.appendChild(warningElement);
        }
    }
}

function restoreOptions() {
    browser.storage.local.get().then(result => {
        document.getElementById("normalMode").checked = result.normalMode;
        document.getElementById("privateMode").checked = result.privateMode;
        document.getElementById("ignoreAboutTabs").checked = result.ignoreAboutTabs;
        document.getElementById("ignoreAddonTabs").checked = result.ignoreAddonTabs;
        document.getElementById("darkTheme").checked = result.darkTheme;
        document.getElementById("whitelist").value = result.whitelist;
        document.getElementById("blacklist").value = result.blacklist;
    });
}
