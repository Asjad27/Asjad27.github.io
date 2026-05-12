/*
 * Asjad Asif Jah — portfolio 2026
 * Vanilla JS for nav, theme, role rotator, scroll-spy, reveal,
 * portfolio filter, lightbox, command palette, keyboard shortcuts,
 * analytics rebinding.
 */
(function () {
    'use strict';

    var doc = document;
    var win = window;
    var root = doc.documentElement;
    var prefersReducedMotion = win.matchMedia && win.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var isFinePointer = win.matchMedia && win.matchMedia('(pointer: fine)').matches;
    var hasGtag = typeof win.gtag === 'function';

    function $(sel, root) { return (root || doc).querySelector(sel); }
    function $$(sel, root) { return Array.prototype.slice.call((root || doc).querySelectorAll(sel)); }
    function on(el, ev, fn, opts) { if (el) el.addEventListener(ev, fn, opts); }
    function track(name, params) { if (hasGtag) try { win.gtag('event', name, params || {}); } catch (e) {} }

    /* ===================== Theme toggle ===================== */
    function setTheme(theme, persist) {
        root.setAttribute('data-theme', theme);
        if (persist) {
            try { localStorage.setItem('theme', theme); } catch (e) {}
        }
        // Swap inline icons (sun/moon)
        var sunSelector = '.theme-icon-light';
        var moonSelector = '.theme-icon-dark';
        $$(sunSelector).forEach(function (n) { n.style.display = theme === 'light' ? 'block' : 'none'; });
        $$(moonSelector).forEach(function (n) { n.style.display = theme === 'light' ? 'none' : 'block'; });
        // Update meta theme-color tag for dynamic browser chrome
        var metaDark = doc.querySelector('meta[name="theme-color"][media*="dark"]');
        var metaLight = doc.querySelector('meta[name="theme-color"][media*="light"]');
        if (metaDark && metaLight) {
            // Browsers already select based on prefers-color-scheme; no change needed.
        }
    }
    function getTheme() {
        return root.getAttribute('data-theme') || 'dark';
    }
    function toggleTheme(viaShortcut) {
        var next = getTheme() === 'dark' ? 'light' : 'dark';
        setTheme(next, true);
        track('theme_toggle', { event_label: next, event_category: 'preference' });
        if (viaShortcut) {
            track('keyboard_shortcut', { event_label: 't', event_category: 'engagement' });
        }
    }
    // Initial sync of icon visibility
    setTheme(getTheme(), false);
    on($('#theme-toggle'), 'click', function () { toggleTheme(false); });
    on($('#drawer-theme-toggle'), 'click', function () { toggleTheme(false); });

    /* ===================== Mobile drawer ===================== */
    var drawer = $('#drawer');
    var drawerBackdrop = $('#drawer-backdrop');
    function openDrawer() {
        if (!drawer) return;
        drawer.classList.add('is-open');
        if (drawerBackdrop) drawerBackdrop.classList.add('is-open');
        drawer.setAttribute('aria-hidden', 'false');
        doc.body.classList.add('no-scroll');
        track('mobile_menu_toggle', { event_category: 'navigation', event_label: 'Mobile Menu' });
    }
    function closeDrawer() {
        if (!drawer) return;
        drawer.classList.remove('is-open');
        if (drawerBackdrop) drawerBackdrop.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
        doc.body.classList.remove('no-scroll');
    }
    on($('#open-drawer'), 'click', openDrawer);
    on($('#close-drawer'), 'click', closeDrawer);
    on(drawerBackdrop, 'click', closeDrawer);
    $$('#drawer a').forEach(function (a) { on(a, 'click', function () { setTimeout(closeDrawer, 50); }); });

    /* ===================== Nav scroll state ===================== */
    var nav = $('#site-nav');
    function syncNavScrolled() {
        if (!nav) return;
        if (win.scrollY > 8) nav.classList.add('is-scrolled');
        else nav.classList.remove('is-scrolled');
    }
    syncNavScrolled();
    on(win, 'scroll', syncNavScrolled, { passive: true });

    /* ===================== Smooth anchor links ===================== */
    $$('a[href^="#"]').forEach(function (a) {
        on(a, 'click', function (ev) {
            var hash = a.getAttribute('href');
            if (hash === '#' || hash.length < 2) return;
            var target = doc.getElementById(hash.slice(1));
            if (!target) return;
            ev.preventDefault();
            target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth', block: 'start' });
            history.replaceState(null, '', hash);
        });
    });
    // Track nav-anim clicks specifically (mirrors original behavior)
    $$('.nav-anim').forEach(function (a) {
        on(a, 'click', function () {
            var section = (a.getAttribute('data-section') || a.getAttribute('href') || '').replace(/^.*#/, '');
            if (section) {
                track('section_navigation', { event_category: 'navigation', event_label: section });
            }
        });
    });

    /* ===================== Scroll-spy + page_view + section time ===================== */
    var SPY_SECTIONS = ['home', 'about-me', 'resume', 'portfolio'];
    var navLinkBySection = {};
    $$('.nav-anim').forEach(function (a) {
        var sec = a.getAttribute('data-section') || (a.getAttribute('href') || '').slice(1);
        if (sec) {
            if (!navLinkBySection[sec]) navLinkBySection[sec] = [];
            navLinkBySection[sec].push(a);
        }
    });
    var activeSection = null;
    var sectionStartTime = new Date();

    function trackSectionTime() {
        if (!activeSection) return;
        var timeSpent = Math.round((new Date() - sectionStartTime) / 1000);
        if (timeSpent <= 0) return;
        track('section_time_spent', {
            event_category: 'engagement',
            event_label: 'Time in Section',
            value: timeSpent,
            section: activeSection
        });
    }
    function setActiveSection(sec) {
        if (sec === activeSection) return;
        trackSectionTime();
        activeSection = sec;
        sectionStartTime = new Date();
        // Update active nav state
        $$('.nav-anim').forEach(function (a) { a.classList.remove('is-active'); });
        if (navLinkBySection[sec]) navLinkBySection[sec].forEach(function (a) { a.classList.add('is-active'); });
        // Send a page_view per logical section (matches original behavior)
        var pretty = sec.charAt(0).toUpperCase() + sec.slice(1).replace(/-/g, ' ');
        track('page_view', {
            page_title: pretty,
            page_location: location.href.split('#')[0] + '#' + sec,
            page_path: '/' + sec
        });
    }

    var sectionEls = SPY_SECTIONS.map(function (id) { return doc.getElementById(id); }).filter(Boolean);
    if (sectionEls.length > 0) {
        // Pick the section that straddles a fixed trigger line near the top of
        // the viewport. This is direction-symmetric and immune to section
        // height differences (the previous ratio-based approach favored short
        // sections like the hero over tall sections like About).
        function updateActiveSection() {
            var triggerY = win.innerHeight * 0.35;
            var candidate = null;
            for (var i = 0; i < sectionEls.length; i++) {
                var rect = sectionEls[i].getBoundingClientRect();
                if (rect.top <= triggerY && rect.bottom > triggerY) {
                    candidate = sectionEls[i].id;
                    break;
                }
            }
            // Fallback: when no section spans the trigger line (e.g. between
            // sections due to padding), pick the last section that started
            // above the trigger line.
            if (!candidate) {
                for (var j = sectionEls.length - 1; j >= 0; j--) {
                    if (sectionEls[j].getBoundingClientRect().top <= triggerY) {
                        candidate = sectionEls[j].id;
                        break;
                    }
                }
            }
            if (candidate) setActiveSection(candidate);
        }

        var rafPending = false;
        function onScrollSpy() {
            if (rafPending) return;
            rafPending = true;
            win.requestAnimationFrame(function () {
                rafPending = false;
                updateActiveSection();
            });
        }
        on(win, 'scroll', onScrollSpy, { passive: true });
        on(win, 'resize', onScrollSpy, { passive: true });

        // Initial state honors any hash in the URL, otherwise derives from
        // current scroll position.
        var initial = (location.hash || '').slice(1);
        if (SPY_SECTIONS.indexOf(initial) >= 0) {
            setActiveSection(initial);
        } else {
            updateActiveSection();
        }
        on(win, 'beforeunload', trackSectionTime);
    }
    // Note: on detail pages no spy sections exist; the detail page's own inline
    // <script> at the top of the document handles its page_view tracking.

    /* ===================== Scroll-depth tracking ===================== */
    (function () {
        var triggered = { 25: false, 50: false, 75: false, 90: false };
        on(win, 'scroll', function () {
            var doc = document.documentElement;
            var scrollPercent = (win.scrollY + win.innerHeight) / doc.scrollHeight * 100;
            Object.keys(triggered).forEach(function (depth) {
                if (scrollPercent >= depth && !triggered[depth]) {
                    triggered[depth] = true;
                    track('scroll_depth', {
                        event_category: 'engagement',
                        event_label: depth + '%',
                        value: parseInt(depth, 10),
                        section: activeSection || 'unknown'
                    });
                }
            });
        }, { passive: true });
    })();

    /* ===================== Reveal on scroll ===================== */
    if ('IntersectionObserver' in win && !prefersReducedMotion) {
        var revealIO = new IntersectionObserver(function (entries) {
            entries.forEach(function (e) {
                if (e.isIntersecting) {
                    e.target.classList.add('is-in');
                    revealIO.unobserve(e.target);
                }
            });
        }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
        $$('.reveal').forEach(function (el) { revealIO.observe(el); });
    } else {
        $$('.reveal').forEach(function (el) { el.classList.add('is-in'); });
    }

    /* ===================== Role typewriter ===================== */
    (function () {
        var el = $('#role-rotator');
        if (!el) return;
        var roles = [
            'head_of_engineering',
            'engineering_manager',
            'technical_lead',
            'fullstack_engineer',
            'spatial_application_engineer',
            'data_scientist'
        ];
        if (prefersReducedMotion) {
            el.textContent = roles[0];
            return;
        }
        var roleIdx = 0;
        var charIdx = roles[0].length;
        var deleting = false;
        function tick() {
            var current = roles[roleIdx];
            if (!deleting) {
                charIdx++;
                el.textContent = current.slice(0, charIdx);
                if (charIdx >= current.length) {
                    deleting = true;
                    setTimeout(tick, 1800);
                    return;
                }
                setTimeout(tick, 55);
            } else {
                charIdx--;
                el.textContent = current.slice(0, charIdx);
                if (charIdx <= 0) {
                    deleting = false;
                    roleIdx = (roleIdx + 1) % roles.length;
                    setTimeout(tick, 250);
                    return;
                }
                setTimeout(tick, 30);
            }
        }
        // Start after a short pause so the initial role is visible
        setTimeout(function () { deleting = true; tick(); }, 1800);
    })();

    /* ===================== Portfolio filter ===================== */
    (function () {
        var pills = $$('.filter-pill');
        if (!pills.length) return;
        var cards = $$('.project-card');
        function apply(filter) {
            cards.forEach(function (c) {
                var cat = c.getAttribute('data-cat') || '';
                var show = filter === 'all' || cat === filter;
                c.classList.toggle('is-hidden', !show);
            });
            pills.forEach(function (p) {
                var active = p.getAttribute('data-filter') === filter;
                p.classList.toggle('is-active', active);
                p.setAttribute('aria-selected', active ? 'true' : 'false');
            });
            track('portfolio_filter', { event_category: 'portfolio', event_label: filter });
        }
        pills.forEach(function (p) {
            on(p, 'click', function () {
                apply(p.getAttribute('data-filter'));
            });
        });
    })();

    /* ===================== YouTube lightbox ===================== */
    (function () {
        var dialog = $('#lightbox');
        var iframe = $('#lightbox-iframe');
        var title = $('#lightbox-title');
        if (!dialog || !iframe) return;
        $$('.project-card[data-yt]').forEach(function (card) {
            on(card, 'click', function () {
                var src = card.getAttribute('data-yt');
                var t = card.getAttribute('data-yt-title') || 'YouTube';
                iframe.src = src + (src.indexOf('?') >= 0 ? '&' : '?') + 'autoplay=1';
                if (title) title.textContent = t;
                if (typeof dialog.showModal === 'function') dialog.showModal();
                else dialog.setAttribute('open', '');
                track('portfolio_click', { event_category: 'portfolio', event_label: t });
            });
        });
        function close() {
            iframe.src = '';
            if (typeof dialog.close === 'function') dialog.close();
            else dialog.removeAttribute('open');
        }
        $$('[data-close-lightbox]').forEach(function (b) { on(b, 'click', close); });
        on(dialog, 'click', function (ev) {
            // Click on backdrop (the dialog element itself, not its inner)
            if (ev.target === dialog) close();
        });
        on(dialog, 'cancel', function () { iframe.src = ''; });
    })();

    /* ===================== Command palette ===================== */
    (function () {
        var dialog = $('#palette');
        var input = $('#palette-input');
        var list = $('#palette-list');
        if (!dialog || !input || !list) return;

        var items = [
            { group: 'navigate', label: 'Home', hint: 'g h', section: 'home' },
            { group: 'navigate', label: 'About', hint: 'g a', section: 'about-me' },
            { group: 'navigate', label: 'Resume', hint: 'g r', section: 'resume' },
            { group: 'navigate', label: 'Portfolio', hint: 'g p', section: 'portfolio' },
            { group: 'links', label: 'LinkedIn', url: 'https://www.linkedin.com/in/asjad-asif-jah/' },
            { group: 'links', label: 'GitHub', url: 'https://github.com/Asjad27/' },
            { group: 'links', label: 'Email', url: 'mailto:asjadjah@gmail.com' },
            { group: 'links', label: 'Download CV', url: 'https://www.dropbox.com/s/catfo4h8k5vzytb/Asjad%20Asif%20Jah.pdf?dl=1', download: true },
            { group: 'links', label: 'Twitter / X', url: 'https://twitter.com/asjad_27' },
            { group: 'links', label: 'Instagram', url: 'https://www.instagram.com/asjad27/' },
            { group: 'links', label: 'Facebook', url: 'https://www.facebook.com/asjad.asif.27/' },
            { group: 'actions', label: 'Toggle theme', hint: 't', action: function () { toggleTheme(false); } },
            { group: 'actions', label: 'Show keyboard shortcuts', hint: '?', action: function () { openShortcuts(); } }
        ];

        var active = 0;
        var filtered = items.slice();

        function render() {
            list.innerHTML = '';
            if (filtered.length === 0) {
                var empty = doc.createElement('div');
                empty.className = 'palette-empty';
                empty.textContent = 'No results';
                list.appendChild(empty);
                return;
            }
            var lastGroup = null;
            filtered.forEach(function (item, idx) {
                if (item.group !== lastGroup) {
                    var label = doc.createElement('div');
                    label.className = 'palette-group-label';
                    label.textContent = item.group;
                    list.appendChild(label);
                    lastGroup = item.group;
                }
                var btn = doc.createElement('button');
                btn.type = 'button';
                btn.className = 'palette-item' + (idx === active ? ' is-active' : '');
                btn.setAttribute('data-idx', String(idx));
                btn.innerHTML = '<span class="ico">' + iconFor(item) + '</span>' +
                                '<span class="label"></span>' +
                                '<span class="hint"></span>';
                btn.querySelector('.label').textContent = item.label;
                btn.querySelector('.hint').textContent = item.hint || '';
                on(btn, 'mouseenter', function () { active = idx; render(); });
                on(btn, 'click', function () { select(idx); });
                list.appendChild(btn);
            });
        }

        function iconFor(item) {
            if (item.group === 'navigate') return '#';
            if (item.group === 'links') return '↗';
            return '⌘';
        }

        function applyFilter(q) {
            q = (q || '').trim().toLowerCase();
            if (!q) { filtered = items.slice(); active = 0; render(); return; }
            filtered = items.filter(function (i) {
                return i.label.toLowerCase().indexOf(q) >= 0 ||
                       (i.group + ' ' + (i.hint || '')).toLowerCase().indexOf(q) >= 0;
            });
            active = 0;
            render();
        }

        function open() {
            input.value = '';
            applyFilter('');
            if (typeof dialog.showModal === 'function') dialog.showModal();
            else dialog.setAttribute('open', '');
            setTimeout(function () { input.focus(); }, 30);
            track('command_palette_open', { event_category: 'engagement' });
        }
        function close() {
            if (typeof dialog.close === 'function') dialog.close();
            else dialog.removeAttribute('open');
        }
        function select(idx) {
            var item = filtered[idx];
            if (!item) return;
            track('command_palette_select', { event_category: 'engagement', event_label: item.label });
            close();
            if (item.section) {
                var target = doc.getElementById(item.section);
                if (target) {
                    target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
                    history.replaceState(null, '', '#' + item.section);
                } else {
                    var base = (location.pathname.indexOf('/html_pages/') >= 0) ? '../index.html' : 'index.html';
                    location.href = base + '#' + item.section;
                }
            } else if (item.url) {
                if (item.download) {
                    var a = doc.createElement('a');
                    a.href = item.url; a.download = '';
                    doc.body.appendChild(a); a.click(); a.remove();
                } else if (item.url.indexOf('mailto:') === 0) {
                    location.href = item.url;
                } else {
                    win.open(item.url, '_blank', 'noopener');
                }
            } else if (typeof item.action === 'function') {
                item.action();
            }
        }

        on(input, 'input', function () { applyFilter(input.value); });
        on(input, 'keydown', function (ev) {
            if (ev.key === 'ArrowDown') { ev.preventDefault(); active = Math.min(active + 1, filtered.length - 1); render(); }
            else if (ev.key === 'ArrowUp') { ev.preventDefault(); active = Math.max(active - 1, 0); render(); }
            else if (ev.key === 'Enter') { ev.preventDefault(); select(active); }
            else if (ev.key === 'Escape') { ev.preventDefault(); close(); }
        });
        on(dialog, 'click', function (ev) { if (ev.target === dialog) close(); });
        on($('#open-palette'), 'click', open);
        on($('#drawer-open-palette'), 'click', function () { closeDrawer(); setTimeout(open, 200); });

        // Expose for external callers (keyboard shortcuts)
        win.__openPalette = open;
    })();

    /* ===================== Shortcuts modal ===================== */
    var shortcutsDialog = $('#shortcuts');
    function openShortcuts() {
        if (!shortcutsDialog) return;
        if (typeof shortcutsDialog.showModal === 'function') shortcutsDialog.showModal();
        else shortcutsDialog.setAttribute('open', '');
    }
    function closeShortcuts() {
        if (!shortcutsDialog) return;
        if (typeof shortcutsDialog.close === 'function') shortcutsDialog.close();
        else shortcutsDialog.removeAttribute('open');
    }
    on($('#open-shortcuts'), 'click', openShortcuts);
    $$('[data-close-shortcuts]').forEach(function (b) { on(b, 'click', closeShortcuts); });
    on(shortcutsDialog, 'click', function (ev) { if (ev.target === shortcutsDialog) closeShortcuts(); });
    if (!isFinePointer) {
        var note = $('#shortcuts-note');
        if (note) note.textContent = '// keyboard required for these shortcuts; this menu is informational on touch devices';
    }
    win.__openShortcuts = openShortcuts;

    /* ===================== Keyboard shortcuts ===================== */
    (function () {
        if (!isFinePointer) return;
        var gPending = false;
        var gTimer = null;
        function clearG() { gPending = false; if (gTimer) { clearTimeout(gTimer); gTimer = null; } }
        function isTyping(target) {
            if (!target) return false;
            var tag = (target.tagName || '').toLowerCase();
            return tag === 'input' || tag === 'textarea' || target.isContentEditable;
        }
        function jumpTo(sec, label) {
            var el = doc.getElementById(sec);
            if (el) {
                el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
                history.replaceState(null, '', '#' + sec);
            } else {
                var base = (location.pathname.indexOf('/html_pages/') >= 0) ? '../index.html' : 'index.html';
                location.href = base + '#' + sec;
            }
            track('keyboard_shortcut', { event_category: 'engagement', event_label: label });
        }
        on(doc, 'keydown', function (ev) {
            if (isTyping(ev.target)) return;
            // Cmd-K / Ctrl-K
            if ((ev.metaKey || ev.ctrlKey) && (ev.key === 'k' || ev.key === 'K')) {
                ev.preventDefault();
                if (typeof win.__openPalette === 'function') win.__openPalette();
                return;
            }
            // Modifier combos otherwise: ignore
            if (ev.metaKey || ev.ctrlKey || ev.altKey) return;
            var key = ev.key.toLowerCase();
            if (gPending) {
                clearG();
                if (key === 'h') { ev.preventDefault(); jumpTo('home', 'g h'); }
                else if (key === 'a') { ev.preventDefault(); jumpTo('about-me', 'g a'); }
                else if (key === 'r') { ev.preventDefault(); jumpTo('resume', 'g r'); }
                else if (key === 'p') { ev.preventDefault(); jumpTo('portfolio', 'g p'); }
                return;
            }
            if (key === 'g') {
                gPending = true;
                gTimer = setTimeout(clearG, 1200);
                return;
            }
            if (key === 't') { ev.preventDefault(); toggleTheme(true); return; }
            if (key === '?' || (ev.shiftKey && key === '/')) {
                ev.preventDefault();
                openShortcuts();
                track('keyboard_shortcut', { event_category: 'engagement', event_label: '?' });
            }
        });
    })();

    /* ===================== Detail-page gallery (scroll-snap chevrons) ===================== */
    (function () {
        $$('.gallery').forEach(function (gallery) {
            var track = $('.gallery-track', gallery);
            var prev = $('[data-gallery-prev]', gallery);
            var next = $('[data-gallery-next]', gallery);
            var counter = $('[data-gallery-counter]', gallery);
            if (!track) return;
            var slides = $$('.gallery-slide', track);
            var total = slides.length;
            if (total <= 1) {
                if (prev) prev.style.display = 'none';
                if (next) next.style.display = 'none';
                if (counter && total === 1) counter.textContent = '1 / 1';
                return;
            }
            function currentIndex() {
                var w = track.clientWidth || 1;
                return Math.round(track.scrollLeft / w);
            }
            function go(delta) {
                var i = currentIndex();
                var target = Math.max(0, Math.min(total - 1, i + delta));
                var w = track.clientWidth;
                track.scrollTo({ left: w * target, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
            }
            function syncCounter() {
                if (counter) counter.textContent = (currentIndex() + 1) + ' / ' + total;
            }
            on(prev, 'click', function () { go(-1); });
            on(next, 'click', function () { go(1); });
            on(track, 'scroll', function () {
                clearTimeout(track.__scrollTimer);
                track.__scrollTimer = setTimeout(syncCounter, 60);
            }, { passive: true });
            syncCounter();
        });
    })();

    /* ===================== Back link from detail pages ===================== */
    $$('a[data-back="portfolio"]').forEach(function (a) {
        on(a, 'click', function () {
            track('portfolio_back', { event_category: 'portfolio', event_label: 'back to portfolio' });
        });
    });

    /* ===================== Set deploy date in footer ===================== */
    (function () {
        var el = $('#footer-deploy');
        if (!el) return;
        var docDate;
        try { docDate = new Date(document.lastModified); } catch (e) {}
        if (!docDate || isNaN(docDate.getTime())) return;
        var y = docDate.getFullYear();
        var m = String(docDate.getMonth() + 1).padStart(2, '0');
        var d = String(docDate.getDate()).padStart(2, '0');
        el.textContent = y + '-' + m + '-' + d;
    })();

})();
