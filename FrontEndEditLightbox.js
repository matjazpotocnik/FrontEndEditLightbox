/*!
 * Front-End Edit Lightbox (FEEL) for ProcessWire
 * https://goo.gl/wTeQ4z
 */

var siteModules = (window.FEEL_defaults && window.FEEL_defaults.siteModules) ? window.FEEL_defaults.siteModules : '/site/modules/';
var wireModules = (window.FEEL_defaults && window.FEEL_defaults.wireModules) ? window.FEEL_defaults.wireModules : '/wire/modules/'

var processPageEdit = false;
var processPageAdd = false;
var processSaveRedirect = false;

// fix json_encode escapes (JSON_UNESCAPED_SLASHES is PHP 5.4+)
siteModules = siteModules.replace('\/', '/');
wireModules = wireModules.replace('\/', '/');

if (!window.jQuery) {
    _loadAsset(wireModules + "Jquery/JqueryCore/JqueryCore.js", function () {
        startFEEL();
    });
} else {
    startFEEL();
}

function startFEEL() {

    // extra jQuery check
    if (!window.jQuery) {
        throw new Error("FEEL not loaded (jQuery is not available)");
    }

    $(function () {

        // set global cache true
        $.ajaxSetup({
            cache: true
        });

        if (!$.magnificPopup) {
            jQuery.getScript(wireModules + "Jquery/JqueryMagnific/JqueryMagnific.js")
                .done(function () {
                    // load MP css
                    _loadAsset(wireModules + "Jquery/JqueryMagnific/JqueryMagnific.css");
                    initFEEL();
                })
                .fail(function () {
                    throw new Error("FEEL: Magnific Popup is not available");
                });
        } else {
            initFEEL();
        }

        function initFEEL() {

            var FEEL = $.extend(true, {}, {
                closeOnSave: true,  // auto close lightbox if no validation errors (true/false)
                fixedSaveButton: true,  // set Save button position fixed to the top-right corner
                enableTemplateEdit: false,  // allow page template editing on ctrl-click (true/false)
                selectorsToHide: '#_ProcessPageEditChildren, #_ProcessPageEditDelete, #_ProcessPageEditSettings, #_WireTabDelete',  // list of selectors to hide elements from admin
                fieldHighlightStyle: 'outline: 2px solid #89ADE2; outline-offset: -1px; z-index: 200; position: relative;',  // CSS declarations to style target field (leave empty to disable)
                closeConfirmMessage: 'Are you sure you want to close the editor?',  // text to show on lightbox close if there are unsaved changes
                skipLoadingStyles: false,  // load FrontEndEditLightbox.css (true/false)
                popupOptions: {  // settings to pass to Magnific Popup
                    closeBtnInside: false,
                    fixedContentPos: true,
                    enableEscapeKey: true,
                    closeOnBgClick: false,
                    tClose: 'Close',
                    preloader: false,
                    overflowY: 'hidden'
                }
            }, window.FEEL_defaults, window.FEEL);

            if (!FEEL.skipLoadingStyles) {
                _loadAsset(siteModules + 'FrontEndEditLightbox/FrontEndEditLightbox.css');
            }

            FEEL.selector = 'feel';

            if ($(FEEL.selector).length) {

                if (false === callCallback('onInit', {
                        feel: FEEL
                    })) {
                    return false;
                }

                $(FEEL.selector).each(function () {

                    if (false === callCallback('onEditLinkInit', {
                            feel: FEEL,
                            obj: $(this)
                        })) {
                        return false;
                    }

                    var url = $(this).attr("data-mfp-src"),
                        // targetField = $(this).attr("data-target-field"),
                        targetTab = $(this).attr("data-target-tab") ? $(this).attr("data-target-tab") : "";

                    // page edit url is required
                    if (!url) {
                        return false;
                    }

                    // disable tab activation if the tab is set to hidden
                    // target tab hash needs to be the tab link href
                    if (FEEL.selectorsToHide.indexOf(targetTab.replace('#', '_')) > -1) {
                        targetTab = "";
                    }

                    // using attr because data can't be re-set
                    $(this).attr("data-mfp-src", url + targetTab);

                    callCallback('onEditLinkReady', {
                        feel: FEEL,
                        obj: $(this)
                    });

                    // show feel links if JS is enabled
                    $('body').attr('data-hide-feel', '0');
                });

                var adminIframe = "iframe.mfp-iframe";
                var lsNeedsReload = "feel-needs-reload";

                // extend Magnific Popup with user settings
                $.extend(true, $.magnificPopup.defaults, FEEL.popupOptions);

                // toggle editlink display hotkey
                $('body').on('keydown', function (e) {
                    var body = $(this);
                    if (e.ctrlKey && e.shiftKey) {
                        body.attr('data-hide-feel', (body.attr('data-hide-feel') === '1' ? '0' : '1'));
                    }
                });

                // initialize and open lightbox
                $(document).on('mousedown', FEEL.selector, function (e) {

                    e.preventDefault();

                    // todo add $editLink to all callback functions
                    var iframeSrc = $(this).attr('data-mfp-src');
                    var targetField = $(this).attr('data-target-field');
                    var templateId = $(this).attr('data-template-id');
                    var overrides = $(this).attr('data-overrides');
                    var _FEEL = {};
                    var $editLink = $(this);
                    var mode = 'page-edit';

                    // right click
                    if (e.which === 3) {
                        return false;
                    }

                    // if middle mouse button pressed, open the admin in a new page
                    if (e.which === 2 || e.button === 4) {
                        window.open(iframeSrc.replace('&modal=1', ''));
                        return false;
                    }

                    // create new _FEEL object to avoid overwriting original
                    $.extend(_FEEL, FEEL, overrides ? JSON.parse(overrides) : null);

                    // apply user popupOptions
                    $.extend(true, $.magnificPopup.defaults, _FEEL.popupOptions);

                    // set src to Template instead of Page if modifier key is pressed
                    if (templateId && _FEEL.enableTemplateEdit && e.ctrlKey) {
                        iframeSrc = iframeSrc.replace(/page\/edit\/\?id=[0-9]+/i, 'setup/template/edit?id=' + $(this).attr('data-template-id'));
                        mode = 'template-edit';
                    }

                    if (false === callCallback('onIframeInit', {
                            event: e,
                            feel: _FEEL,
                            obj: $(this),
                            mode: mode
                        })) {
                        return false;
                    }

                    $.magnificPopup.open({
                        type: 'iframe',
                        removalDelay: 100,
                        midClick: true,
                        items: {
                            src: iframeSrc
                        },
                        mainClass: 'mfp-feel',
                        callbacks: {
                            open: function () {

                                localStorage.removeItem(lsNeedsReload);

                                // override "close" method in MagnificPopup object
                                $.magnificPopup.instance.close = function () {

                                    var unsavedMsg;

                                    // get any unsaved message (inputfields.js) - only for chrome
                                    if (navigator.userAgent.toLowerCase().indexOf('chrome') > -1) {
                                        if (document.querySelector('.mfp-feel .mfp-iframe').contentWindow.InputfieldFormBeforeUnloadEvent) {
                                            unsavedMsg = document.querySelector('.mfp-feel .mfp-iframe').contentWindow.InputfieldFormBeforeUnloadEvent({});
                                        }
                                    }

                                    if (false === callCallback('onLightboxClose', {
                                            event: e,
                                            feel: _FEEL,
                                            obj: $(this),
                                            mode: mode
                                        })) {
                                        return false;
                                    }

                                    if (unsavedMsg && !confirm(unsavedMsg + '\n\n' + FEEL.closeConfirmMessage)) {
                                        return false;
                                    }

                                    $.magnificPopup.proto.close.call(this);
                                };

                                // add mfp-spinner
                                $('.mfp-iframe-holder .mfp-content').addClass('mfp-spinner');

                                // hide iframe to mask removing elements on initial load
                                $(adminIframe).css('visibility', 'hidden');

                                // wait until iframe is loaded
                                $(adminIframe).on("load", function () {

                                    // hide iframe again to mask removing elements on frame reload - or maybe not
                                    //$(adminIframe).css('visibility','hidden');

                                    // remove spinner
                                    $('.mfp-iframe-holder .mfp-content').removeClass('mfp-spinner');

                                    // find edit form ProcessPageEdit or ProcessTemplateEdit //todo: check template editing
                                    var editForm = $(this).contents().find('form#' + (mode === 'page-edit' ? 'ProcessPageEdit' : 'ProcessTemplateEdit'));

                                    // if editForm.length > 0 then we are in ProcessPageEdit
                                    // if editForm.length = 0 then we are either:
                                    //   - in ProcessPageAdd or
                                    //   - in ProcessPageEdit, but the beforeHook on ProcessPageEdit::processSaveRedirect
                                    //     fired and prevented the redirect to itself, making the response empty
                                    if (editForm.length) {
                                        processPageEdit = true;
                                    } else {
                                        editForm = $(this).contents().find('form#ProcessPageAdd');
                                        if (editForm.length) {
                                            mode = 'page-add';
                                            processPageAdd = true;
                                        } else {
                                            processSaveRedirect = true;
                                        }
                                    }

                                    // we have a form
                                    if (!processSaveRedirect) {

                                        // add feel-modal to the iframe html for targetting elements inside the iframe
                                        $(this).contents().find('html').addClass('feel-modal');

                                        // CSS needs to be loaded in iframe
                                        if (!_FEEL.skipLoadingStyles) {
                                            _loadAsset(siteModules + 'FrontEndEditLightbox/FrontEndEditLightbox.css?selector="iframe.mfp-iframe"');
                                        }

                                        // move the save button to the fixed position top right
                                        if (_FEEL.fixedSaveButton) {
                                            editForm.find("#submit_save, #Inputfield_submit").addClass('feel-fixed-save-button').appendTo(editForm);
                                        }

                                        // hide selectors
                                        if (_FEEL.selectorsToHide) {
                                            $(this).contents().find(_FEEL.selectorsToHide).remove();
                                        }

                                        // highlight field
                                        if (targetField) {

                                            var selector = '#wrap_';
                                            var target;

                                            // try highlighting wrapper element first (that's above language tabs)
                                            if (!editForm.has("#wrap_" + targetField).length) {
                                                selector = "#";
                                            }

                                            target = editForm.find(selector + targetField);

                                            if (target.length) {
                                                if (_FEEL.fieldHighlightStyle) {
                                                    target.attr("style", _FEEL.fieldHighlightStyle);
                                                }
                                                setTimeout(function () {
                                                    if ($(adminIframe).length) {
                                                        $(adminIframe).contents().scrollTop(target.offset().top - 20);
                                                    }
                                                }, 800)
                                            }
                                        }

                                        //
                                        if (!_FEEL.closeOnSave) {
                                            editForm.on("submit", function () {
                                                // save localStorageKey state
                                                localStorage.setItem(lsNeedsReload, '1');
                                            });
                                        }

                                        // pass execution to callback function
                                        callCallback('onLightboxReady', {
                                            event: e,
                                            feel: _FEEL,
                                            iframe: $(this),
                                            editForm: editForm, // check in your callback, could be undefined!
                                            mode: mode
                                        });

                                        // unhide frame
                                        $(adminIframe).css('visibility', 'visible');
                                    }

                                    if (processPageEdit && _FEEL.closeOnSave) {
                                        // inject hidden input field that will be read by ProcessPageEdit::processSaveRedirect hook
                                        $('<input type="hidden" name="_feelredirect" value="self">').appendTo(editForm);
                                    }

                                    // close the modal
                                    if (processSaveRedirect && mode !== 'template-edit' && mode !== 'page-add') {
                                        setTimeout(function () {
                                            $.magnificPopup.instance.close();
                                        }, 100);
                                    }

                                    // pass execution to callback function
                                    callCallback('onIframeReady', {
                                        event: e,
                                        feel: _FEEL,
                                        iframe: $(this),
                                        editForm: editForm, // check in your callback, could be undefined!
                                        mode: mode
                                    });

                                }); // $(adminIframe).on("load", function ()
                            },
                            afterClose: function (e) {

                                var needsReload = localStorage[lsNeedsReload];
                                //if (!processSaveRedirect && !localStorage[lsNeedsReload]) return;
                                if (!(processSaveRedirect || needsReload)) return;

                                localStorage.removeItem(lsNeedsReload);

                                setTimeout(function () {

                                    // fire onBeforeReload callback
                                    if (false === callCallback('onBeforeReload', {
                                            event: e,
                                            feel: _FEEL,
                                            // obj: $(this),
                                            // editLink: $editLink
                                            obj: $editLink,
                                            mode: mode
                                        })) {
                                        return false;
                                    }

                                    // fire onReload callback
                                    // callCallback('onReload', {
                                    //     event: e,
                                    //     feel: _FEEL,
                                    //     obj: $(this)
                                    // });

                                    window.location.reload(true);
                                }, 100); //setTimeout
                            } //afterClose
                        } //callbacks
                    }); //$.magnificPopup.open

                    e.stopImmediatePropagation();
                    return false;
                }); //$(document).on('mousedown
            } //if ($(FEEL.selector).length)
        } //function initFEEL()
    }); //$(function ()
} //function startFEEL()

function callCallback(fx, params) {
    if (window.FEEL && typeof FEEL[fx] === 'function') {
        params.callbackName = fx;   // add callback name
        return FEEL[fx](params);
    }

    return true;
}


function _loadAsset(path, callback, o) {
    var selector = getUrlParameter('selector', path).replace(/['"]+/g, '').trim(),
        async = getUrlParameter('async', path) === 'true',
        assetType = 'js',
        assetTag = 'script',
        assetSrc = 'src',
        needAsset = true;

    if (selector.length > 0 && !document.querySelector(selector)) return false;

    function getUrlParameter(name, url) {
        name = name.replace(/[\[]/, '\\[').replace(/[\]]/, '\\]');
        url = url ? url : window.location.search;

        // var regex = new RegExp('[\\?&]' + name + '=([^&#]*)'),
        var regex = new RegExp('[\\?&]' + name + '=([^&]*)'),
            results = regex.exec(url);

        return results === null ? '' : decodeURIComponent(results[1].replace(/\+/g, ' '));
    }

    path = path.split(/\?(.+)/)[0]; // remove url parameters (settings)

    if (path.slice(-3) === 'css') {
        assetType = 'css';
        assetTag = 'link';
        assetSrc = 'href';
    }

    if (document.querySelector(assetTag + '[' + assetSrc + '="' + path + '"]')) needAsset = false;

    function callCallback() {
        if (callback) {
            var obj = {};
            if (selector) obj.selector = selector;
            if (o) obj.o = o;
            callback.call(obj);
        }
    }

    if (needAsset) {
        var asset = document.createElement(assetTag);
        asset[assetSrc] = path;

        if (assetType === 'js') {
            asset.type = "text/javascript";
            asset.async = async;

            if (asset.readyState) { // IE
                asset.onreadystatechange = function () {
                    if (asset.readyState === "loaded" || asset.readyState === "complete") {
                        asset.onreadystatechange = null;
                        callCallback();
                    }
                };
            } else {    // others
                asset.onload = callCallback;
            }

        } else {    // CSS
            asset.rel = "stylesheet";
            callCallback();
        }
        document.getElementsByTagName("head")[0].appendChild(asset);

    } else {    // always run callback
        callCallback();
    }
}
