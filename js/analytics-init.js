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
})();
