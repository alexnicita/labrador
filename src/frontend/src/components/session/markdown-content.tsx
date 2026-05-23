import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";

type MarkdownContentProps = {
  children: string;
  className?: string;
};

type MarkdownPreviewProps = MarkdownContentProps;

const markdownComponents: Components = {
  h1: ({ className, ...props }) => (
    <h1 className={cn("my-3 text-[1.35em] font-bold leading-tight first:mt-0", className)} {...props} />
  ),
  h2: ({ className, ...props }) => (
    <h2 className={cn("my-3 text-[1.2em] font-bold leading-tight first:mt-0", className)} {...props} />
  ),
  h3: ({ className, ...props }) => (
    <h3 className={cn("my-2 text-[1.08em] font-bold leading-tight first:mt-0", className)} {...props} />
  ),
  h4: ({ className, ...props }) => (
    <h4 className={cn("my-2 font-bold leading-tight first:mt-0", className)} {...props} />
  ),
  h5: ({ className, ...props }) => (
    <h5 className={cn("my-2 text-[0.95em] font-bold leading-tight first:mt-0", className)} {...props} />
  ),
  h6: ({ className, ...props }) => (
    <h6 className={cn("my-2 text-[0.9em] font-bold uppercase leading-tight first:mt-0", className)} {...props} />
  ),
  p: ({ className, ...props }) => (
    <p className={cn("my-2 first:mt-0 last:mb-0", className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn("font-semibold text-[#1f6feb] underline-offset-3 hover:underline", className)}
      rel="noreferrer"
      target="_blank"
      {...props}
    />
  ),
  ul: ({ className, ...props }) => (
    <ul className={cn("my-2 list-disc space-y-1 pl-5", className)} {...props} />
  ),
  ol: ({ className, ...props }) => (
    <ol className={cn("my-2 list-decimal space-y-1 pl-5", className)} {...props} />
  ),
  li: ({ className, ...props }) => (
    <li className={cn("pl-1", className)} {...props} />
  ),
  blockquote: ({ className, ...props }) => (
    <blockquote
      className={cn(
        "my-3 border-l-2 border-[#b7d4ff] bg-[#f5f9ff] px-3 py-2 text-[#263241]",
        className,
      )}
      {...props}
    />
  ),
  code: ({ className, ...props }) => (
    <code
      className={cn(
        "break-words rounded-[5px] bg-[#f3f6f9] px-1 py-0.5 font-mono text-[0.92em] text-[#263241]",
        className,
      )}
      {...props}
    />
  ),
  pre: ({ className, ...props }) => (
    <pre
      className={cn(
        "my-3 max-w-full overflow-x-auto rounded-[8px] border border-[#dfe5eb] bg-[#f8fafc] p-3 text-[12px] leading-5 text-[#1f2937]",
        className,
      )}
      {...props}
    />
  ),
  table: ({ className, ...props }) => (
    <div className="my-3 w-full max-w-full min-w-0 overflow-x-auto rounded-[9px] border border-[#dfe5eb]">
      <table
        className={cn(
          "w-full min-w-[360px] border-collapse text-left text-[12px] sm:min-w-[520px]",
          className,
        )}
        {...props}
      />
    </div>
  ),
  thead: ({ className, ...props }) => (
    <thead className={cn("bg-[#f8fafc]", className)} {...props} />
  ),
  th: ({ className, ...props }) => (
    <th
      className={cn(
        "border-b border-l border-[#e4e9ef] px-3 py-2 first:border-l-0 font-semibold text-[#111318]",
        className,
      )}
      {...props}
    />
  ),
  td: ({ className, ...props }) => (
    <td
      className={cn(
        "border-b border-l border-[#edf1f5] px-3 py-2 align-top first:border-l-0 last:border-r-0",
        className,
      )}
      {...props}
    />
  ),
  hr: ({ className, ...props }) => (
    <hr className={cn("my-4 border-[#dfe5eb]", className)} {...props} />
  ),
};

const markdownPreviewComponents: Components = {
  h1: ({ children }) => <>{children}</>,
  h2: ({ children }) => <>{children}</>,
  h3: ({ children }) => <>{children}</>,
  h4: ({ children }) => <>{children}</>,
  h5: ({ children }) => <>{children}</>,
  h6: ({ children }) => <>{children}</>,
  p: ({ children }) => <>{children}</>,
  strong: ({ className, ...props }) => (
    <strong className={cn("font-semibold", className)} {...props} />
  ),
  em: ({ className, ...props }) => (
    <em className={cn("italic", className)} {...props} />
  ),
  a: ({ className, ...props }) => (
    <a
      className={cn("font-semibold text-[#1f6feb] underline-offset-3 hover:underline", className)}
      rel="noreferrer"
      target="_blank"
      {...props}
    />
  ),
  code: ({ className, ...props }) => (
    <code
      className={cn(
        "rounded-[4px] bg-[#e9f0f8] px-1 py-0.5 font-mono text-[0.92em]",
        className,
      )}
      {...props}
    />
  ),
  pre: ({ children }) => <>{children}</>,
  blockquote: ({ children }) => <>{children}</>,
  ul: ({ children }) => <>{children}</>,
  ol: ({ children }) => <>{children}</>,
  li: ({ children }) => <span>{children} </span>,
  table: ({ children }) => <>{children}</>,
  thead: ({ children }) => <>{children}</>,
  tbody: ({ children }) => <>{children}</>,
  tr: ({ children }) => <>{children} </>,
  th: ({ children }) => <span>{children} </span>,
  td: ({ children }) => <span>{children} </span>,
  hr: () => <span> </span>,
};

export function MarkdownContent({ children, className }: MarkdownContentProps) {
  return (
    <div className={cn("w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere]", className)}>
      <ReactMarkdown components={markdownComponents} remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

export function MarkdownPreview({ children, className }: MarkdownPreviewProps) {
  return (
    <div className={cn("w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere]", className)}>
      <ReactMarkdown components={markdownPreviewComponents} remarkPlugins={[remarkGfm]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
