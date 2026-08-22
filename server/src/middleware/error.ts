import { ZodError } from 'zod';
import { Error as MongooseError } from 'mongoose';
import type { ErrorRequestHandler, RequestHandler } from 'express';
import type { HttpError } from '#types';

export const notFoundHandler: RequestHandler = (req, res) => {
    res.status(404).json({
        message: `Route ${req.method} ${req.path} gibt es nicht`,
    });
};

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
    if (err instanceof ZodError) {
        res.status(400).json({
            message: 'Validierung fehlgeschlagen',
            issues: err.issues,
        });
        return;
    }

    if (err instanceof MongooseError.ValidationError) {
        res.status(400).json({ message: err.message, issues: err.errors });
        return;
    }

    if (err instanceof MongooseError.CastError) {
        res.status(400).json({ message: `Ungültige ID: ${err.value}` });
        return;
    }

    if ((err as { code?: number }).code === 11000) {
        res.status(409).json({
            message: 'Eintrag existiert bereits',
            keys: (err as { keyValue?: unknown }).keyValue,
        });
        return;
    }

    const status = (err as HttpError).status ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({
        message: (err as Error).message ?? 'Serverfehler',
    });
};
