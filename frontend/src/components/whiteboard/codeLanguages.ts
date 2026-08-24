import type { CodeLanguage } from "@kanban/shared";

/**
 * Languages offered by the canvas palette.
 * `starter` is the content a freshly dropped editor opens with.
 */
export type CodeLanguageOption = {
  id: CodeLanguage;
  label: string;
  badge: string;
  starter: string;
};

export const CODE_LANGUAGE_OPTIONS: CodeLanguageOption[] = [
  {
    id: "typescript",
    label: "TypeScript",
    badge: "TS",
    starter: "export function greet(name: string) {\n  return `Hello, ${name}`;\n}\n",
  },
  {
    id: "javascript",
    label: "JavaScript",
    badge: "JS",
    starter: "function greet(name) {\n  return `Hello, ${name}`;\n}\n",
  },
  {
    id: "python",
    label: "Python",
    badge: "PY",
    starter: 'def greet(name):\n    return f"Hello, {name}"\n',
  },
  {
    id: "sql",
    label: "SQL",
    badge: "SQL",
    starter: "select id, title\nfrom cards\norder by updated_at desc;\n",
  },
  {
    id: "json",
    label: "JSON",
    badge: "{ }",
    starter: '{\n  "name": "example",\n  "items": []\n}\n',
  },
  {
    id: "markdown",
    label: "Markdown",
    badge: "MD",
    starter: "# Notes\n\n- shared in real time\n",
  },
  {
    id: "html",
    label: "HTML",
    badge: "</>",
    starter: '<section class="card">\n  <h1>Hello</h1>\n</section>\n',
  },
  {
    id: "css",
    label: "CSS",
    badge: "CSS",
    starter: ".card {\n  display: grid;\n  gap: 8px;\n}\n",
  },
];

export function findLanguageOption(language: CodeLanguage | undefined): CodeLanguageOption {
  return (
    CODE_LANGUAGE_OPTIONS.find((option) => option.id === language) ??
    CODE_LANGUAGE_OPTIONS[0]
  );
}

/** MIME type used to carry a palette drag onto the canvas. */
export const CODE_NODE_DRAG_TYPE = "application/x-kanban-code-node";
