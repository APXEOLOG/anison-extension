// ==UserScript==
// @name         Anison.fm Chat Extenstion
// @namespace    http://tampermonkey.net/
// @version      0.6
// @updateURL    https://github.com/APXEOLOG/anison-extension/raw/master/Anison.fm%20Extenstion.user.js
// @downloadURL  https://github.com/APXEOLOG/anison-extension/raw/master/Anison.fm%20Extenstion.user.js
// @description  Few features to make life easier
// @author       APXEOLOG
// @match        *://*.anison.fm/*
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @resource     qtip_css http://cdn.jsdelivr.net/qtip2/3.0.3/jquery.qtip.min.css
// @run-at       document-idle
// ==/UserScript==

// Chat tooltip extension
function afm_ext_chatTooltip() {
    // Let's hook data update callback and cache last status update in the local storage, so we can get this information from the content script
    // But since we are inside of the Extension Sandbox, we should create script element and append it to the document
    var statusUpdateHook = 'var _old_update_fn = window.update_status; window.update_status = function(data, textStatus) { localStorage.setItem("anisonStatusData", JSON.stringify(data)); _old_update_fn.apply(this, arguments); };';
    var script = document.createElement('script'); script.type = 'text/javascript'; script.text = statusUpdateHook;
    document.body.appendChild(script);
    // ^ That's advanced security bypass, lol

    // Also apply qtip2 script and style
    var qtip2script = document.createElement('script'); qtip2script.type = 'text/javascript'; qtip2script.src = "//cdn.jsdelivr.net/qtip2/3.0.3/jquery.qtip.min.js";
    document.body.appendChild(qtip2script);
    GM_addStyle(GM_getResourceText("qtip_css"));
    GM_addStyle('.afm_ex_font { font-size: 16px; }');

    function outer(jqElement) {
        return jqElement[0].outerHTML;
    }

    // Chat tooltip extension
    $('#chat_frame').load(function() {
        // Setup hover handler
        $('#chat_frame').contents().find('#onlineList').on('mouseover', 'a', function (event) {
            var parent = $(this).parent();
            var elementId = parent.attr('id');
            // Filter links to only match username link
            if (typeof elementId === "string" && elementId.indexOf('ajaxChat_u_') === 0) {
                // Parse userId
                var userId = parseInt(elementId.substr('ajaxChat_u_'.length));
                // Setup tooltip
                $(this).qtip({
                    style: { classes: 'qtip-light qtip-rounded qtip-shadow afm_ex_font' },
                    content: {
                        title: $(this).text(), // Username as title
                        text: function (event, api) {
                            $.get('user/' + userId, function (data) {
                                // Generate tooltip
                                var result = $(data);
                                var output = $('<div class="profile-wrapper" style="width: 250px; height: 400px;"><div class="col_l"></div></div>');
                                var mountPoint = output.find('.col_l');
                                // Avatar
                                mountPoint.append(outer(result.find('.profile-wrapper .ava')));
                                mountPoint.append('<hr class="profile-chat-border">');
                                // Name
                                var name = result.find('.profile-wrapper .col_c h2:eq(0)')[0].childNodes[0].nodeValue.trim();
                                mountPoint.append('<h2>' + name + '</h2>');
                                // Contacts
                                mountPoint.append(outer(result.find('.profile-wrapper .profile-contact')));
                                mountPoint.append('<hr class="profile-chat-border">');
                                // Gender
                                mountPoint.append(outer(result.find('.profile-wrapper .col_c .item:eq(2)')));
                                mountPoint.append('<hr class="profile-chat-border">');
                                // Let's find the active order's position in the queue
                                var activeOrderBlock = result.find('.profile-wrapper .active-order');
                                // Patch buttons
                                activeOrderBlock.find('.song_links').css({ 'left': '2px' });
                                // Extract song link
                                var songLink = activeOrderBlock.find('.track a').attr('href');
                                if (songLink) {
                                    // Extract song id
                                    var matches = songLink.match(/\/song\/(\d+)\/up/);
                                    if (matches.length == 2) {
                                        var songId = matches[1];
                                        var anisonStatusData = localStorage.getItem("anisonStatusData");
                                        // Search in the queue if it is initialized
                                        if (anisonStatusData) {
                                            anisonStatusData = JSON.parse(anisonStatusData);
                                            for (var i = 0; i < anisonStatusData.orders_list.length; i++) {
                                                if (anisonStatusData.orders_list[i].song_id == songId) {
                                                    // Entry found, add this information to the dom
                                                    activeOrderBlock.find('.track a').append(' (#' + (i + 1) + ')');
                                                    break;
                                                }
                                            }
                                        }
                                    }
                                }
                                // Active order
                                mountPoint.append(outer(activeOrderBlock));
                                api.set('content.text', outer(output));
                            });
                            return 'Loading...';
                        }
                    },
                    position: {
                        my: 'center right',
                        at: 'center left',
                        target: [ window.innerWidth - 220, 85 ],
                        effect: false,
                        viewport: $(window),
                    },
                    overwrite: true,
                    show: {
                        event: event.type,
                        ready: true
                    },
                    hide: {
                        fixed: true,
                        delay: 300
                    }
                });
            }
        });
    });
}

// Logout button extension
function afm_ext_logoutButton() {
    if ($('#bot_panel .user_info .name').attr('href').indexOf('/login') === -1) {
        // Show only if we are logged in
        $('#bot_panel .user_info').append(' <span class="text">&nbsp;(<a href="/user/logout" class="name">выйти</a>)</span>');
    }
}

(function() {
    'use strict';
    // Do not process iframes
    if (window.top !== window.self) {
        return;
    }
    // Always enable logout button
    afm_ext_logoutButton();
    // Enable chat extenson only in the chat
    if (window.location.pathname === "/chat/") {
        afm_ext_chatTooltip();
    }
})();