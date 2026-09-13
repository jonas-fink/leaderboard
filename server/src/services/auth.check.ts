import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

// Die Werte müssen stehen, bevor #config ausgewertet wird — deshalb der
// dynamische Import statt eines Imports am Dateikopf.
process.env.MONGODB_URI ??= 'mongodb://localhost/test';
process.env.SESSION_SECRET ??= 'geheim';
const {
    hashPassword,
    verifyPassword,
    issueToken,
    verifyToken,
    isThrottled,
    noteFailedLogin,
    clearFailedLogins,
    isRegisterThrottled,
    noteRegisterAttempt,
} = await import('#services/auth.service');

test('Hash prüft das richtige Passwort und lehnt das falsche ab', () => {
    const stored = hashPassword('correct horse battery staple');
    assert.ok(verifyPassword('correct horse battery staple', stored));
    assert.ok(!verifyPassword('falsches passwort ab 12', stored));
});

test('Zwei Hashes desselben Passworts sind verschieden (Salt)', () => {
    const a = hashPassword('correct horse battery staple');
    const b = hashPassword('correct horse battery staple');
    assert.notEqual(a, b);
    assert.ok(verifyPassword('correct horse battery staple', a));
    assert.ok(verifyPassword('correct horse battery staple', b));
});

test('Token trägt die userId zurück', () => {
    const token = issueToken('user-1');
    const result = verifyToken(token);
    assert.equal(result?.userId, 'user-1');
});

test('Verfälschte Signatur ergibt null', () => {
    const token = issueToken('user-1');
    const [encoded, signature] = token.split('.');
    const tampered = `${encoded}.${signature!.slice(0, -1)}x`;
    assert.equal(verifyToken(tampered), null);
});

test('Abgelaufenes Token ergibt null', () => {
    const token = issueToken('user-1', 0);
    assert.ok(verifyToken(token, 1000));
    assert.equal(verifyToken(token, Date.now() + 24 * 60 * 60 * 1000), null);
});

test('Fremd signiertes Token ergibt null', () => {
    // Gleicher Aufbau wie issueToken, aber mit einem fremden Schlüssel
    // signiert — simuliert ein Token, das nicht von diesem Server stammt.
    const genuine = issueToken('user-1');
    const [encoded] = genuine.split('.');
    const payload = Buffer.from(encoded!, 'base64url').toString();
    const foreignSignature = createHmac('sha256', 'ein-anderes-geheimnis')
        .update(payload)
        .digest('base64url');
    assert.equal(verifyToken(`${encoded}.${foreignSignature}`), null);
});

test('Unsinn wird abgelehnt statt zu werfen', () => {
    for (const token of ['', '.', 'abc', 'abc.def', 'a.b.c']) {
        assert.equal(verifyToken(token), null, token);
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

test('Registrier-Throttle zählt getrennt von der Anmelde-Throttle', () => {
    const ip = '10.0.0.9';
    const now = Date.now() + 2 * 60 * 60 * 1000;
    for (let i = 0; i < 20; i++) noteRegisterAttempt(ip, now);
    assert.ok(isRegisterThrottled(ip, now));
    // Dieselbe Adresse ist bei der Anmeldung weiterhin unbescholten.
    assert.ok(!isThrottled(ip, now));
});
