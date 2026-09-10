import { pixelSprite } from '../../lib/avatar';

interface PixelSpriteProps {
    /** Hochgeladenes Bild; fehlt es, wird aus dem Seed gezeichnet. */
    imageUrl?: string;
    seed: string;
    /** Kantenlänge in Board-Einheiten. */
    size: number;
    /** Rahmenfarbe als Token-Klasse, z. B. `border-cyan`. */
    frame?: string;
}

/**
 * Avatar oder Team-Banner in einem harten Rahmen. Wer nichts hochgeladen hat,
 * bekommt den deterministischen 5×5-Sprite (PROJEKT.md §8) — gezeichnet als
 * SVG, ohne Abhängigkeit und ohne zweiten Netzwerkaufruf.
 */
const PixelSprite = ({
    imageUrl,
    seed,
    size,
    frame = 'border-cyan',
}: PixelSpriteProps) => {
    const sprite = pixelSprite(seed);

    return (
        <div
            className={`box-border shrink-0 border-2 bg-bg ${frame}`}
            style={{
                width: `calc(var(--u) * ${size})`,
                height: `calc(var(--u) * ${size})`,
                padding: `calc(var(--u) * ${Math.round(size / 14)})`,
            }}
        >
            {imageUrl ? (
                <img src={imageUrl} alt="" className="block h-full w-full" />
            ) : (
                <svg
                    viewBox="0 0 5 5"
                    shapeRendering="crispEdges"
                    className="block h-full w-full"
                    aria-hidden
                >
                    {sprite.cells.map((row, y) =>
                        row.map((on, x) =>
                            on ? (
                                <rect
                                    key={`${x}-${y}`}
                                    x={x}
                                    y={y}
                                    width="1"
                                    height="1"
                                    fill={sprite.color}
                                />
                            ) : null,
                        ),
                    )}
                </svg>
            )}
        </div>
    );
};

export default PixelSprite;
