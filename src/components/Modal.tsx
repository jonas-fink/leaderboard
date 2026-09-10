import { useEffect, useRef, type ReactNode } from 'react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title: string;
    children: ReactNode;
}

/**
 * Dünner Wrapper um das native <dialog>. Focus-Trap, Escape-to-close,
 * Backdrop und das Inert-Setzen des Hintergrunds kommen vom Browser —
 * dafür braucht es keine Modal-Library.
 */
export const Modal = ({ open, onClose, title, children }: ModalProps) => {
    const ref = useRef<HTMLDialogElement>(null);

    useEffect(() => {
        const dialog = ref.current;
        if (!dialog) return;
        if (open && !dialog.open) dialog.showModal();
        if (!open && dialog.open) dialog.close();
    }, [open]);

    return (
        <dialog
            ref={ref}
            onClose={onClose}
            onClick={(e) => {
                if (e.target === ref.current) onClose();
            }}
            className="m-auto w-[min(32rem,calc(100vw-2rem))] border-2 border-line bg-surface p-0 text-ink shadow-modal backdrop:bg-bg/70 backdrop:backdrop-blur-sm"
        >
            <div className="flex items-center justify-between gap-4 border-b-2 border-line bg-surface px-5 py-4">
                <h2 className="text-base font-bold text-ink">{title}</h2>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Schließen"
                    className="cursor-pointer px-2 text-xl leading-none text-gold transition-colors hover:text-ink"
                >
                    ×
                </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-5">{children}</div>
        </dialog>
    );
};
