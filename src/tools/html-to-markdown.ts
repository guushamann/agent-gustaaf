import { convert } from "@xberg-io/html-to-markdown";

export function htmlToMarkdown(html: string): string {
    return convert(html).content ?? "";
}
