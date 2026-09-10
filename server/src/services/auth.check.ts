import { test } from 'node:test';
import assert from 'node:assert/strict';

// Die Werte müssen stehen, bevor #config ausgewertet wird — deshalb der
// dynamische Import statt eines Imports am Dateikopf.
process.env.MONGODB_URI ??= 'mongodb://localhost/test';
process.env.ADMIN_PIN ??= 'geheim';
const {
    checkPin,
    issueToken,
    isValidToken,
    isThrottled,
    noteFailedLogin,
    clearFailedLogins,
} = await import('#services/auth.service');

test('Der richtige PIN wird erkannt, ein falscher nicht', () => {
    assert.ok(checkPin('geheim'));
    assert.ok(!checkPin('geheim '));
    assert.ok(!checkPin('geheimer'));
    assert.ok(!checkPin(''));
});

test('Ein frisch ausgestelltes Token ist gültig', () => {
    assert.ok(isValidToken(issueToken()));
});

test('Nach Ablauf ist das Token ungültig', () => {
    const token = issueToken(0);
    assert.ok(isValidToken(token, 1000));
    assert.ok(!isValidToken(token, Date.now()));
});

test('Ein verändertes Ablaufdatum bricht die Signatur', () => {
    const [, signature] = issueToken().split('.');
    const far = Buffer.from(String(Date.now() + 1e9)).toString('base64url');
    assert.ok(!isValidToken(`${far}.${signature}`));
});

test('Unsinn wird abgelehnt statt zu werfen', () => {
    for (const token of ['', '.', 'abc', 'abc.def', 'a.b.c']) {
        assert.ok(!isValidToken(token), token);
    }
});

test('Nach zu vielen Fehlversuchen ist der Absender gesperrt', () => {
    const ip = '10.0.0.1';
    for (let i = 0; i < 19; i++) noteFailedLogin(ip);
    assert.ok(!isThrottled(ip));
    noteFailedLogin(ip);
    assert.ok(isThrottled(ip));
});

test('Eine erfolgreiche Anmeldung räumt die Fehlversuche weg', () => {
    const ip = '10.0.0.2';
    for (let i = 0; i < 20; i++) noteFailedLogin(ip);
    assert.ok(isThrottled(ip));
    clearFailedLogins(ip);
    assert.ok(!isThrottled(ip));
});

test('Nach Ablauf des Fensters zählt der Absender wieder bei null', () => {
    const ip = '10.0.0.3';
    const start = Date.now();
    for (let i = 0; i < 20; i++) noteFailedLogin(ip, start);
    assert.ok(isThrottled(ip, start));
    assert.ok(!isThrottled(ip, start + 11 * 60 * 1000));
});

test('Viele Absender zusammen laufen in den Gesamtdeckel', () => {
    const now = Date.now() + 60 * 60 * 1000;
    // Je Adresse unter dem Einzellimit, in Summe darüber.
    for (let i = 0; i < 21; i++) {
        for (let attempt = 0; attempt < 10; attempt++) {
            noteFailedLogin(`192.168.1.${i}`, now);
        }
    }
    assert.ok(isThrottled('192.168.9.9', now));
});
