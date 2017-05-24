// ==UserScript==
// @name         Anison.fm Chat Extenstion
// @namespace    http://tampermonkey.net/
// @version      0.3
// @updateURL    https://github.com/APXEOLOG/anison-extension/raw/master/Anison.fm%20Extenstion.user.js
// @downloadURL  https://github.com/APXEOLOG/anison-extension/raw/master/Anison.fm%20Extenstion.user.js
// @description  Few features to make life easier
// @author       APXEOLOG
// @match        *://*.anison.fm/chat/
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @require      http://cdn.jsdelivr.net/qtip2/3.0.3/jquery.qtip.min.js
// @resource     qtip_css http://cdn.jsdelivr.net/qtip2/3.0.3/jquery.qtip.min.css
// @run-at       document-idle
// ==/UserScript==

// Load qtip styles
GM_addStyle(GM_getResourceText("qtip_css"));
// Custom font size
GM_addStyle('.afm_ex_font { font-size: 16px; }');

(function() {
    'use strict';

    // Let's hook data update callback and cache last status update in the local storage, so we can get this information from the content script
    // But since we are inside of the Extension Sandbox, we should create script element and append it to the document
    var statusUpdateHook = 'var _old_update_fn = window.update_status; window.update_status = function(data, textStatus) { localStorage.setItem("anisonStatusData", JSON.stringify(data)); _old_update_fn.apply(this, arguments); };';
    var script = document.createElement('script'); script.type = 'text/javascript'; script.text = statusUpdateHook;
    document.body.appendChild(script);
    // ^ That's advanced security bypass, lol

    function outer(jqElement) {
        return jqElement[0].outerHTML;
    }

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
                                var output = $('<div class="profile-wrapper"><div class="col_l"></div></div>');
                                var mountPoint = output.find('.col_l');
                                // Avatar
                                mountPoint.append(outer(result.find('.profile-wrapper .ava')));
                                mountPoint.append('<hr class="profile-chat-border">');
                                // Contacts
                                mountPoint.append(outer(result.find('.profile-wrapper .profile-contact')));
                                mountPoint.append('<hr class="profile-chat-border">');
                                // Gender
                                mountPoint.append(outer(result.find('.profile-wrapper .col_c .item:eq(2)')));
                                mountPoint.append('<hr class="profile-chat-border">');
                                // Let's find the active order's position in the queue
                                var activeOrderBlock = result.find('.profile-wrapper .active-order');
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
                        my: 'right top',
                        at: 'bottom left',
                        target: false,
                        viewport: $(window),
                        adjust: {
                            y: 20
                        }
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
})();