import { test } from 'node:test';
import assert from 'node:assert/strict';

// Wie in auth.check.ts: #config braucht die Werte vor dem Import.
process.env.MONGODB_URI ??= 'mongodb://localhost/test';
process.env.SESSION_SECRET ??= 'geheim';
const { compose, emailChangedMail, resetMail } =
    await import('#services/mail.service');

test('Eingesetzte Werte werden im HTML escaped', () => {
    const mail = emailChangedMail('<script>@example.com');
    assert.ok(!mail.html.includes('<script>'));
    assert.ok(mail.html.includes('&lt;script&gt;@example.com'));
    // Klartext bleibt Klartext.
    assert.ok(mail.text.includes('<script>@example.com'));
});

test('Der Link steht in beiden Fassungen', () => {
    const mail = resetMail('a.b');
    const url = mail.text.match(/https?:\/\/\S+/)?.[0];
    assert.ok(url?.includes('/reset-password?token=a.b'));
    assert.ok(mail.html.includes(`href="${url}"`));
});

test('Ohne Knopf kein Knopf', () => {
    const mail = compose({ subject: 's', heading: 'h', paragraphs: ['p'] });
    assert.ok(!mail.html.includes('Knopf funktioniert nicht'));
    assert.ok(!mail.text.includes('http'));
});
