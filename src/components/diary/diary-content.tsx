import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const PROSE_CLASSES = [
  "diary-prose",
  "[&_h1]:mb-3 [&_h1]:mt-6 [&_h1]:text-xl [&_h1]:font-semibold",
  "[&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_h2]:font-semibold",
  "[&_h3]:mb-2 [&_h3]:mt-4 [&_h3]:text-base [&_h3]:font-semibold",
  "[&_p]:mb-4 [&_p:last-child]:mb-0",
  "[&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-5",
  "[&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_li]:my-1",
  "[&_blockquote]:my-4 [&_blockquote]:border-l-2 [&_blockquote]:pl-3",
  "[&_code]:rounded [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[13px]",
  "[&_pre]:my-4 [&_pre]:overflow-x-auto [&_pre]:rounded [&_pre]:p-3",
  "[&_pre_code]:bg-transparent [&_pre_code]:p-0",
  "[&_a]:underline [&_a]:underline-offset-2",
  "[&_hr]:my-6",
  "[&_table]:my-4 [&_table]:w-full [&_table]:border-collapse",
  "[&_th]:px-2 [&_th]:py-1 [&_th]:text-left",
  "[&_td]:px-2 [&_td]:py-1",
].join(" ");

export function DiaryContent({ children }: { children: string }) {
  return (
    <div
      className={PROSE_CLASSES}
      style={{
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-md)",
        lineHeight: "var(--leading-relaxed)",
        color: "var(--fg)",
      }}
    >
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{children}</ReactMarkdown>
    </div>
  );
}
