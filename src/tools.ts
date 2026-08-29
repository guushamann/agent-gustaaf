import { ChatCompletionTool } from 'together-ai/resources/chat/completions.mjs';
import { createFolder } from './tools/create-folder';
import { htmlToMarkdown } from './tools/html-to-markdown';
import { readFileTool } from './tools/read-file';
import { scrapeUrl } from './tools/scrape-url';
import { writeFileTool } from './tools/write-file';

export const toolHandlers: Record<string, (args: Record<string, unknown>, threadId: string) => Promise<string>> = {
  create_folder: async (args, threadId) => createFolder(String(args.path), threadId),
  read_file: async (args, threadId) => readFileTool(String(args.path), threadId),
  write_file: async (args, threadId) => writeFileTool(String(args.path), String(args.content), threadId),
  html_to_markdown: async (args) => htmlToMarkdown(String(args.html)),
  scrape_url: async (args) => scrapeUrl(String(args.url)),
};

export const tools: Array<ChatCompletionTool> = [
  {
    type: "function",
    function: {
      name: "ask_user",
      description: "Ask the user a clarifying question when critical information is missing or ambiguous.",
      parameters: {
        type: "object",
        properties: {
          question: {
            type: "string",
            description: "The question",
          }
        },
        required: ["question"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_folder",
      description: "Create a folder (and any missing parent folders) at the given path. Paths are restricted to the current session folder.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The folder path to create",
          }
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Read the contents of a text file at the given path. Paths are restricted to the current session folder.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The file path to read",
          }
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Write content to a file at the given path, creating parent folders if needed. Paths are restricted to the current session folder.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "The file path to write",
          },
          content: {
            type: "string",
            description: "The content to write",
          }
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "html_to_markdown",
      description: "Convert an HTML string to Markdown.",
      parameters: {
        type: "object",
        properties: {
          html: {
            type: "string",
            description: "The HTML string to convert",
          }
        },
        required: ["html"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "scrape_url",
      description: "Fetch a URL and return the page content.",
      parameters: {
        type: "object",
        properties: {
          url: {
            type: "string",
            description: "The URL to scrape",
          }
        },
        required: ["url"],
      },
    },
  },
]
