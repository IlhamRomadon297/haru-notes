/**
 * Haru Notes — PIN global (hash SHA-256, tidak menyimpan PIN mentah)
 */
const HaruSecurity = (function () {
    'use strict';

    const SESSION_KEY = 'haru_pin_unlocked_until';
    const UNLOCK_MS = 30 * 60 * 1000; /* 30 menit */

    const encoder = new TextEncoder();

    const hashPin = async (pin, userId) => {
        const data = encoder.encode(String(userId) + ':' + String(pin).trim());
        const buf = await crypto.subtle.digest('SHA-256', data);
        return Array.from(new Uint8Array(buf))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('');
    };

    const verifyPin = async (pin, storedHash, userId) => {
        if (!storedHash || !pin) return false;
        const h = await hashPin(pin, userId);
        return h === storedHash;
    };

    const setUnlockSession = () => {
        sessionStorage.setItem(SESSION_KEY, String(Date.now() + UNLOCK_MS));
    };

    const clearUnlockSession = () => {
        sessionStorage.removeItem(SESSION_KEY);
    };

    const isUnlockSessionValid = () => {
        const until = parseInt(sessionStorage.getItem(SESSION_KEY) || '0', 10);
        return until > Date.now();
    };

    const validatePinFormat = (pin) => {
        const p = String(pin).trim();
        if (!/^\d{4,8}$/.test(p)) {
            return { ok: false, msg: 'PIN harus 4–8 digit angka.' };
        }
        return { ok: true, value: p };
    };

    return {
        hashPin,
        verifyPin,
        setUnlockSession,
        clearUnlockSession,
        isUnlockSessionValid,
        validatePinFormat
    };
})();
