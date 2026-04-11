import type { ReactNode } from "react";
import katex from "katex";
import { extractMarkdownHeadings } from "../lib/text";

function renderInlineFormattedText(text: string, keyPrefix: string): ReactNode[] {
  const tokens = text.split(
    /(\[[^\]]+]\((?:https?:\/\/|\/)[^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\$[^$\n]+\$|\\\([^)]+\))/g,
  );

  return tokens.filter(Boolean).map((token, index) => {
    const key = `${keyPrefix}-${index}`;
    const linkMatch = token.match(/^\[([^\]]+)\]\(((?:https?:\/\/|\/)[^)]+)\)$/);
    if (linkMatch) {
      const [, label, href] = linkMatch;
      return (
        <a
          className="text-[color:var(--color-primary)] underline decoration-dotted underline-offset-2 transition hover:text-[color:var(--text-strong)]"
          href={href}
          key={key}
          rel={href.startsWith("http") ? "noreferrer" : undefined}
          target={href.startsWith("http") ? "_blank" : undefined}
        >
          {label}
        </a>
      );
    }

    if (/^`[^`]+`$/.test(token)) {
      return <code key={key}>{token.slice(1, -1)}</code>;
    }

    if (/^\*\*[^*]+\*\*$/.test(token)) {
      return <strong key={key}>{token.slice(2, -2)}</strong>;
    }

    const inlineMathDollarMatch = token.match(/^\$([^$\n]+)\$$/);
    if (inlineMathDollarMatch) {
      return renderKatexMath(inlineMathDollarMatch[1], false, key);
    }

    const inlineMathParenMatch = token.match(/^\\\((.+)\\\)$/);
    if (inlineMathParenMatch) {
      return renderKatexMath(inlineMathParenMatch[1], false, key);
    }

    return <span key={key}>{token}</span>;
  });
}

function renderKatexMath(expression: string, displayMode: boolean, key: string): ReactNode {
  const source = expression.trim();
  if (!source) {
    return null;
  }

  try {
    const html = katex.renderToString(source, {
      displayMode,
      output: "htmlAndMathml",
      strict: "ignore",
      throwOnError: false,
    });

    return (
      <span
        className={
          displayMode
            ? "my-2 block overflow-x-auto rounded-lg border border-[color:var(--line-soft)] bg-white/45 px-2 py-1"
            : "inline-block align-baseline"
        }
        dangerouslySetInnerHTML={{ __html: html }}
        key={key}
      />
    );
  } catch {
    return <code key={key}>{displayMode ? `$$${source}$$` : `$${source}$`}</code>;
  }
}

function isHorizontalRuleLine(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed) {
    return false;
  }

  // Markdown horizontal rules: --- / *** / ___ and spaced variants like - - -
  return /^([-*_])(?:\s*\1){2,}$/.test(trimmed);
}

interface RichContentProps {
  content: string;
}

export default function RichContent({ content }: RichContentProps) {
  const normalized = content.replace(/\r/g, "").trim();
  if (!normalized) {
    return <p className="text-sm text-[color:var(--text-muted)]">内容暂时为空。</p>;
  }

  const blocks = normalized
    .split(/\n{2,}/)
    .map((block) => block.trim())
    .filter(Boolean);
  const headingAnchors = extractMarkdownHeadings(normalized);
  let headingIndex = 0;

  return (
    <>
      {blocks.map((block, blockIndex) => {
        const key = `detail-block-${blockIndex}`;
        const lines = block.split("\n");
        const imageLines = lines
          .map((line) => line.trim().match(/^!\[([^\]]*)\]\((https?:\/\/[^)\s]+)\)$/))
          .filter(Boolean) as RegExpMatchArray[];

        if (imageLines.length === lines.length && imageLines.length > 0) {
          return (
            <div className="grid gap-3 sm:grid-cols-2" key={key}>
              {imageLines.map((match, imageIndex) => (
                <figure className="grid gap-1 rounded-lg border border-[color:var(--line-soft)] bg-white/45 p-2" key={`${key}-image-${imageIndex}`}>
                  <img alt={match[1] || "详情图片"} src={match[2]} />
                  {match[1] ? <figcaption>{match[1]}</figcaption> : null}
                </figure>
              ))}
            </div>
          );
        }

        if (lines.length === 1 && isHorizontalRuleLine(lines[0])) {
          return <hr className="my-3 border-0 border-t border-dashed border-[color:var(--line-soft)]" key={key} />;
        }

        const headingMatch = block.match(/^(#{1,4})\s+(.+)$/);
        if (headingMatch) {
          const [, marks, title] = headingMatch;
          const headingAnchorID = headingAnchors[headingIndex]?.anchorID;
          headingIndex += 1;
          if (marks.length === 1) {
            return (
              <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text-strong)]" id={headingAnchorID} key={key}>
                {title}
              </h2>
            );
          }
          if (marks.length === 2) {
            return (
              <h3 className="mt-2 text-xl font-semibold text-[color:var(--text-strong)]" id={headingAnchorID} key={key}>
                {title}
              </h3>
            );
          }
          return (
            <h4 className="mt-2 text-lg font-semibold text-[color:var(--text-strong)]" id={headingAnchorID} key={key}>
              {title}
            </h4>
          );
        }

        if (lines.every((line) => /^\d+\.\s+/.test(line.trim()))) {
          return (
            <ol className="grid list-decimal gap-1 pl-5 text-sm text-[color:var(--text-main)]" key={key}>
              {lines.map((line, index) => (
                <li key={`${key}-li-${index}`}>
                  {renderInlineFormattedText(
                    line.replace(/^\d+\.\s+/, ""),
                    `${key}-li-${index}`,
                  )}
                </li>
              ))}
            </ol>
          );
        }

        if (lines.every((line) => /^[-*+]\s+/.test(line.trim()))) {
          return (
            <ul className="grid list-disc gap-1 pl-5 text-sm text-[color:var(--text-main)]" key={key}>
              {lines.map((line, index) => (
                <li key={`${key}-li-${index}`}>
                  {renderInlineFormattedText(
                    line.replace(/^[-*+]\s+/, ""),
                    `${key}-li-${index}`,
                  )}
                </li>
              ))}
            </ul>
          );
        }

        if (lines.every((line) => /^>\s?/.test(line.trim()))) {
          return (
            <blockquote className="grid gap-2 border-l-2 border-[color:var(--line-strong)] bg-white/35 px-3 py-2 text-sm text-[color:var(--text-soft)]" key={key}>
              {lines.map((line, index) => (
                <p key={`${key}-quote-${index}`}>
                  {renderInlineFormattedText(
                    line.replace(/^>\s?/, ""),
                    `${key}-quote-${index}`,
                  )}
                </p>
              ))}
            </blockquote>
          );
        }

        if (block.startsWith("```") && block.endsWith("```")) {
          const code = block.replace(/^```[^\n]*\n?/, "").replace(/\n?```$/, "");
          return (
            <pre className="overflow-x-auto rounded-lg border border-[color:var(--line-soft)] bg-[color:var(--surface-card)] p-3 text-sm" key={key}>
              <code>{code}</code>
            </pre>
          );
        }

        const displayMathDollarMatch = block.match(/^\$\$\n?([\s\S]*?)\n?\$\$$/);
        if (displayMathDollarMatch) {
          return (
            <div className="my-2 overflow-x-auto rounded-lg border border-[color:var(--line-soft)] bg-white/45 p-2" key={key}>
              {renderKatexMath(displayMathDollarMatch[1], true, `${key}-math`)}
            </div>
          );
        }

        const displayMathBracketMatch = block.match(/^\\\[\n?([\s\S]*?)\n?\\\]$/);
        if (displayMathBracketMatch) {
          return (
            <div className="my-2 overflow-x-auto rounded-lg border border-[color:var(--line-soft)] bg-white/45 p-2" key={key}>
              {renderKatexMath(displayMathBracketMatch[1], true, `${key}-math`)}
            </div>
          );
        }

        return (
          <p className="text-sm leading-7 text-[color:var(--text-main)]" key={key}>
            {lines.map((line, lineIndex) => (
              <span key={`${key}-line-${lineIndex}`}>
                {renderInlineFormattedText(line, `${key}-line-${lineIndex}`)}
                {lineIndex < lines.length - 1 ? <br /> : null}
              </span>
            ))}
          </p>
        );
      })}
    </>
  );
}
