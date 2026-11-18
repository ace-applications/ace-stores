import ReactMarkdown from "react-markdown";

/**
 * Admin-authored product copy. react-markdown escapes raw HTML and strips
 * unsafe link protocols by default, so description text can never inject markup.
 */
export function Markdown({ source, className = "" }: { source: string | null; className?: string }) {
  return (
    <div
      className={`text-[15px] leading-relaxed text-dim [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-3 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-5 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-5 [&_li]:my-1 [&_h2]:mt-5 [&_h2]:font-display [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink [&_h3]:mt-4 [&_h3]:font-semibold [&_h3]:text-ink [&_a]:text-accent [&_a]:underline [&_a]:underline-offset-2 [&_code]:font-mono [&_code]:text-[13px] [&_pre]:my-3 [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-ground [&_pre]:p-3 [&_blockquote]:mt-3 [&_blockquote]:border-s-2 [&_blockquote]:border-hairline [&_blockquote]:ps-4 [&_hr]:my-5 [&_hr]:border-hairline ${className}`}
    >
      <ReactMarkdown
        components={{
          a: ({ children, ...props }) => (
            <a {...props} target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
        }}
      >
        {source ?? ""}
      </ReactMarkdown>
    </div>
  );
}
