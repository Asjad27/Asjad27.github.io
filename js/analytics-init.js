(function () {
    if (window.__analyticsInitDone) {
        return;
    }
    window.__analyticsInitDone = true;

    var GA_ID = 'G-ZN99QQR4DB';
    var PRODUCTION_HOSTS = {
        'www.asjadjah.com': true,
        'asjadjah.com': true,
        'asjad27.github.io': true
    };

    // Opt out on production: ?noanalytics, ?noanalytics=1, ?noanalytics=true (not =0 / =false)
    function analyticsOptOutViaQuery() {
        try {
            var p = new URLSearchParams(location.search);
            if (!p.has('noanalytics')) {
                return false;
            }
            var v = p.get('noanalytics');
            if (v === null || v === '') {
                return true;
            }
            var lower = String(v).toLowerCase();
            return lower === '1' || lower === 'true' || lower === 'yes';
        } catch (e) {
            return false;
        }
    }

    var enabled = !!PRODUCTION_HOSTS[location.hostname] && !analyticsOptOutViaQuery();
    window.__analyticsEnabled = enabled;

    window.dataLayer = window.dataLayer || [];

    if (!enabled) {
        window.gtag = function () {};
        return;
    }

    window.gtag = function () {
        window.dataLayer.push(arguments);
    };

    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=' + GA_ID;
    document.head.appendChild(s);

    gtag('js', new Date());

    var extra = typeof window.__gtagConfigExtra === 'object' && window.__gtagConfigExtra !== null
        ? window.__gtagConfigExtra
        : null;
    if (extra) {
        gtag('config', GA_ID, extra);
    } else {
        gtag('config', GA_ID);
    }

    // Delegated link tracker: outbound clicks, mailto/tel (contact intent), file downloads.
    // Anchors that already declare an inline gtag() onclick are skipped to avoid double-counting.
    var DOWNLOAD_EXT = /\.(pdf|zip|7z|rar|tar|gz|csv|xlsx?|docx?|pptx?|key|pages|numbers|mp3|mp4|mov|wav|svg|psd|ai)(\?|#|$)/i;
    var SELF_HOST = location.hostname.toLowerCase();

    function safeHostname(href) {
        try { return new URL(href, location.href).hostname.toLowerCase(); } catch (e) { return ''; }
    }

    function linkText(a) {
        var t = (a.textContent || a.getAttribute('aria-label') || a.getAttribute('title') || '').trim();
        return t ? t.slice(0, 80) : '';
    }

    document.addEventListener('click', function (ev) {
        var a = ev.target && ev.target.closest ? ev.target.closest('a[href]') : null;
        if (!a) {
            return;
        }
        var inlineOnclick = a.getAttribute('onclick') || '';
        if (/gtag\s*\(/.test(inlineOnclick)) {
            return;
        }

        var href = a.getAttribute('href') || '';
        if (!href || href.charAt(0) === '#') {
            return;
        }
        var hrefLower = href.toLowerCase();

        if (hrefLower.indexOf('mailto:') === 0) {
            gtag('event', 'contact_intent', {
                'event_category': 'contact',
                'event_label': 'email',
                'channel': 'email'
            });
            return;
        }
        if (hrefLower.indexOf('tel:') === 0) {
            gtag('event', 'contact_intent', {
                'event_category': 'contact',
                'event_label': 'phone',
                'channel': 'phone'
            });
            return;
        }

        var ext = href.match(DOWNLOAD_EXT);
        if (ext) {
            gtag('event', 'file_download', {
                'event_category': 'engagement',
                'event_label': linkText(a) || href,
                'file_url': href,
                'file_extension': ext[1].toLowerCase()
            });
        }

        if (/^https?:\/\//i.test(href)) {
            var host = safeHostname(href);
            if (host && host !== SELF_HOST) {
                gtag('event', 'outbound_click', {
                    'event_category': 'outbound',
                    'event_label': host,
                    'outbound_url': href,
                    'link_text': linkText(a)
                });
            }
        }
    }, true);
})();
