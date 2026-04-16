/**
 * Geothority Embed Script v1.0
 * Automatically injects schema markup, FAQ content, and meta tags
 * onto customer websites using their Geothority data.
 *
 * Usage:
 *   <script src="https://geothority.io/embed.js" data-key="geo_YOUR_KEY"></script>
 *
 * Options (all optional):
 *   data-schema="false"       — disable schema injection
 *   data-faq="false"          — disable FAQ widget
 *   data-meta="false"         — disable meta tag injection
 *   data-faq-target="#my-id"  — CSS selector for FAQ container (default: #geothority-faq)
 *   data-theme="light|dark|auto" — FAQ widget theme (default: auto)
 */
(function () {
  'use strict';

  // Get config from script tag
  var script =
    document.currentScript ||
    document.querySelector('script[data-key]') ||
    document.querySelector('script[data-geothority-key]');
  if (!script) return;

  var apiKey =
    script.getAttribute('data-key') ||
    script.getAttribute('data-geothority-key');
  if (!apiKey) {
    console.warn('[Geothority] Missing data-key attribute on script tag');
    return;
  }

  var API_BASE = 'https://geothority.io/api/plugin/data';
  var options = {
    injectSchema: script.getAttribute('data-schema') !== 'false',
    injectFaq: script.getAttribute('data-faq') !== 'false',
    injectMeta: script.getAttribute('data-meta') !== 'false',
    faqSelector: script.getAttribute('data-faq-target') || '#geothority-faq',
    theme: script.getAttribute('data-theme') || 'auto',
  };

  // Fetch embed data
  fetch(API_BASE + '?key=' + encodeURIComponent(apiKey))
    .then(function (res) {
      return res.json();
    })
    .then(function (data) {
      if (data.error) {
        console.warn('[Geothority]', data.error);
        return;
      }

      // 1. Inject JSON-LD Schema
      if (options.injectSchema && data.schema && Array.isArray(data.schema)) {
        data.schema.forEach(function (schema) {
          var el = document.createElement('script');
          el.type = 'application/ld+json';
          el.textContent = JSON.stringify(schema);
          document.head.appendChild(el);
        });
        console.log('[Geothority] Schema markup injected ✅');
      }

      // 2. Inject Meta Tags (only if not already present)
      if (options.injectMeta && data.metaTags) {
        if (
          !document.querySelector('meta[name="description"]') &&
          data.metaTags.description
        ) {
          var metaDesc = document.createElement('meta');
          metaDesc.name = 'description';
          metaDesc.content = data.metaTags.description;
          document.head.appendChild(metaDesc);
        }
        // Add OG tags if missing
        if (
          !document.querySelector('meta[property="og:title"]') &&
          data.metaTags.title
        ) {
          addMeta('og:title', data.metaTags.title, 'property');
          addMeta('og:description', data.metaTags.description, 'property');
        }
        console.log('[Geothority] Meta tags injected ✅');
      }

      // 3. Render FAQ Widget
      if (options.injectFaq && data.faq && Array.isArray(data.faq) && data.faq.length > 0) {
        var container = document.querySelector(options.faqSelector);
        if (container) {
          renderFaq(container, data.faq, data.business, options.theme);
          console.log('[Geothority] FAQ widget rendered ✅');
        }
      }

      // 4. Report installation to Geothority (fire-and-forget)
      reportInstall(apiKey, {
        url: window.location.hostname,
        schema: options.injectSchema,
        faq: !!document.querySelector(options.faqSelector),
        meta: options.injectMeta,
      });
    })
    .catch(function (err) {
      console.warn('[Geothority] Error loading data:', err.message);
    });

  function addMeta(name, content, attr) {
    if (!content) return;
    var meta = document.createElement('meta');
    meta.setAttribute(attr || 'name', name);
    meta.content = content;
    document.head.appendChild(meta);
  }

  function renderFaq(container, faqs, business, theme) {
    var isDark =
      theme === 'dark' ||
      (theme === 'auto' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    var bg = isDark ? '#1a1a2e' : '#ffffff';
    var text = isDark ? '#e0e0e0' : '#1a1a2e';
    var border = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
    var mutedText = isDark ? '#a0a0a0' : '#555555';

    var html =
      '<div style="font-family:system-ui,-apple-system,BlinkMacSystemFont,sans-serif;max-width:720px;margin:0 auto;">';
    html +=
      '<h2 style="font-size:24px;font-weight:700;margin-bottom:24px;color:' +
      text +
      '">Frequently Asked Questions</h2>';

    faqs.forEach(function (faq) {
      html +=
        '<details style="margin-bottom:12px;border:1px solid ' +
        border +
        ';border-radius:12px;overflow:hidden;background:' +
        bg +
        '">';
      html +=
        '<summary style="padding:16px 20px;cursor:pointer;font-weight:600;font-size:15px;color:' +
        text +
        ';list-style:none;display:flex;align-items:center;justify-content:space-between;">' +
        escapeHtml(faq.question) +
        '<span style="color:#10b981;font-size:20px;margin-left:12px;">+</span>' +
        '</summary>';
      html +=
        '<div style="padding:0 20px 16px;font-size:14px;line-height:1.7;color:' +
        mutedText +
        '">' +
        escapeHtml(faq.answer) +
        '</div>';
      html += '</details>';
    });

    html += '</div>';

    // Also inject FAQPage schema into <head>
    var schemaEl = document.createElement('script');
    schemaEl.type = 'application/ld+json';
    schemaEl.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faqs.map(function (f) {
        return {
          '@type': 'Question',
          name: f.question,
          acceptedAnswer: { '@type': 'Answer', text: f.answer },
        };
      }),
    });
    document.head.appendChild(schemaEl);

    container.innerHTML = html;
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function reportInstall(key, data) {
    fetch('https://geothority.io/api/plugin/report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: key, install: data }),
    }).catch(function () {
      // Silent fail — reporting is best-effort
    });
  }
})();
