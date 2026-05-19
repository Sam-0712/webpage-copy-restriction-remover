// ==UserScript==
// @name         自动解除网页复制限制
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动解除网页复制限制，支持限制检测和自定义提示。
// @author       Nebulaaaaaaa
// @match        *://*/*
// @grant        GM_setValue
// @grant        GM_getValue
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  function t(e) {
    e.stopPropagation(), e.stopImmediatePropagation && e.stopImmediatePropagation()
  }

  function showToast(message) {
    const existingToast = document.getElementById('copy-unlock-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.id = 'copy-unlock-toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #66ccff;
      color: white;
      padding: 8px 8px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      animation: slideIn 0.3s ease;
      max-width: 300px;
      word-wrap: break-word;
    `;

    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
      }
      @keyframes fadeOut {
        from { opacity: 1; }
        to { opacity: 0; }
      }
    `;
    document.head.appendChild(style);
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.animation = 'fadeOut 0.3s ease forwards';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  function detectRestrictions() {
    let hasRestriction = false;

    document.querySelectorAll("*").forEach(e => {
      const style = window.getComputedStyle(e, null);
      const userSelect = style.getPropertyValue("user-select");
      if (userSelect === "none" || userSelect === "text" === false) {
        hasRestriction = true;
      }
    });

    const blockedEvents = ['copy', 'cut', 'selectstart', 'mousedown', 'keydown'];
    blockedEvents.forEach(eventType => {
      const handlers = getEventListeners(document.documentElement);
      if (handlers && handlers[eventType]) {
        hasRestriction = true;
      }
    });

    return hasRestriction;
  }

  function getEventListeners(element) {
    if (typeof element.getEventListeners === 'function') {
      return element.getEventListeners();
    }
    return null;
  }

  function getRootDomain() {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length >= 2) {
      return parts.slice(-2).join('.');
    }
    return hostname;
  }

  function isDomainUnlocked(rootDomain) {
    const unlockedDomains = GM_getValue('unlockedDomains', []);
    return unlockedDomains.includes(rootDomain);
  }

  function saveUnlockedDomain(rootDomain) {
    const unlockedDomains = GM_getValue('unlockedDomains', []);
    if (!unlockedDomains.includes(rootDomain)) {
      unlockedDomains.push(rootDomain);
      GM_setValue('unlockedDomains', unlockedDomains);
    }
  }

  function unlockCopy() {
    document.querySelectorAll("*").forEach(e => {
      "none" === window.getComputedStyle(e, null).getPropertyValue("user-select") && e.style.setProperty("user-select", "text", "important")
    }), ["copy", "cut", "contextmenu", "selectstart", "mousedown", "mouseup", "mousemove", "keydown", "keypress", "keyup"].forEach(function(e) {
      document.documentElement.addEventListener(e, t, {
        capture: !0
      })
    })
  }

  function init() {
    const rootDomain = getRootDomain();
    const hasRestriction = detectRestrictions();
    const isUnlocked = isDomainUnlocked(rootDomain);

    unlockCopy();

    if (hasRestriction && !isUnlocked) {
      saveUnlockedDomain(rootDomain);
      showToast("已检测并解除网页复制限制！");
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  const observer = new MutationObserver((mutations) => {
    let needUnlock = false;
    mutations.forEach(mutation => {
      if (mutation.addedNodes.length > 0) {
        needUnlock = true;
      }
    });
    if (needUnlock) {
      unlockCopy();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();