import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';

// Die Werte müssen stehen, bevor #config ausgewertet wird — deshalb der
// dynamische Import statt eines Imports am Dateikopf (Muster aus
// auth.check.ts).
process.env.MONGODB_URI ??= 'mongodb://localhost/test';
process.env.ADMIN_PIN ??= 'geheim';
const { Game } = await import('#models');

/**
 * `new Model()` und `.validate()` brauchen keine Verbindung zur DB — nur
 * `.save()` würde eine benötigen. Das erlaubt, den Zwei-Schritt-Fall aus
 * BE-9 ohne Mongo-Instanz zu prüfen: zwei `validate()`-Aufrufe auf demselben
 * Dokument stehen für zwei Requests (anlegen, dann patchen).
 */
const versusGame = (überschreiben: Record<string, unknown> = {}) => ({
    tournamentId: '000000000000000000000001',
    slug: 'rocket-league',
    title: 'Rocket League',
    genre: 'sports',
    scoring: 'versus',
    primaryMetric: {
        key: 'goals',
        label: 'Tore',
        sortOrder: 'DESC',
        formatter: 'integer',
    },
    ...überschreiben,
});

test('eine neu angelegte Versus-Disziplin mit DESC ist gültig', async () => {
    const game = new Game(versusGame());
    await assert.doesNotReject(() => game.validate());
});

test('die DESC-Invariante gilt auch, wenn scoring in einem früheren Request gesetzt wurde', async () => {
    // Request 1: Disziplin wird als Versus mit DESC angelegt.
    const game = new Game(versusGame());
    await game.validate();

    // Request 2: nur primaryMetric.sortOrder wird auf ASC gepatcht, scoring
    // ist im Patch nicht enthalten — Zod sieht diesen Request isoliert und
    // hätte keinen Grund, ihn abzulehnen. Das Dokument trägt scoring:
    // 'versus' aber weiterhin aus Request 1.
    game.set({
        primaryMetric: {
            key: 'goals',
            label: 'Tore',
            sortOrder: 'ASC',
            formatter: 'integer',
        },
    });

    // Die Fehlerklasse muss `ValidationError` sein, nicht ein einfacher
    // `Error` — sonst übersetzt `errorHandler` sie nicht nach 400, sondern
    // fällt auf 500 zurück (BE-9).
    await assert.rejects(
        () => game.validate(),
        (err: unknown) => err instanceof mongoose.Error.ValidationError,
    );
});

test('eine metrische Disziplin mit ASC bleibt unberührt von der Invariante', async () => {
    const game = new Game(
        versusGame({
            scoring: 'metric',
            primaryMetric: {
                key: 'time',
                label: 'Zeit',
                sortOrder: 'ASC',
                formatter: 'time_ms',
            },
        }),
    );
    await assert.doesNotReject(() => game.validate());
});
