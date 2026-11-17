'use client';
export function ContactPageControls({ page, pages, onPage, loading }: {
    page: number;
    pages: number;
    onPage: (page: number) => void;
    loading: boolean;
}) {
    return pages > 1 ? <nav aria-label="Contact option pages" className="mt-3 flex items-center justify-between gap-3 text-sm"><button type="button" disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>Previous contacts</button><span>Page {page} of {pages}</span><button type="button" disabled={loading || page >= pages} onClick={() => onPage(page + 1)}>Next contacts</button></nav> : null;
}
