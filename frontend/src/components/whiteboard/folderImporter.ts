// folderImporter.ts

export type ProjectFile = {
    id: string;
    name: string;
    type: "file";
    path: string;
    content: string;
};

export type ProjectFolder = {
    id: string;
    name: string;
    type: "folder";
    path: string;
    children: ProjectNode[];
};

export type ProjectNode = ProjectFile | ProjectFolder;

export type ImportedProject = {
    title: string;
    type: "project";
    children: ProjectNode[];
    files: ProjectFile[];
};

// --------------------------------------------------
// Browser API typings
// --------------------------------------------------

interface DirectoryPickerOptions {
    mode?: "read" | "readwrite";
    startIn?: string;
}

interface Window {
    showDirectoryPicker?: (
        options?: DirectoryPickerOptions
    ) => Promise<FileSystemDirectoryHandle>;
}

// --------------------------------------------------
// Configuration
// --------------------------------------------------

const IGNORED_DIRECTORIES = new Set([
    "node_modules",
    ".git",
    ".next",
    ".turbo",
    "dist",
    "build",
    "coverage",
    ".cache",
]);

// --------------------------------------------------
// ID generator
// --------------------------------------------------

function generateId(): string {
    return crypto.randomUUID();
}

// --------------------------------------------------
// Import folder
// --------------------------------------------------

export async function importFolder(): Promise<ImportedProject | null> {
    if (!window.showDirectoryPicker) {
        throw new Error(
            "Folder import is not supported in this browser."
        );
    }

    try {
        const directoryHandle =
            await window.showDirectoryPicker({
                mode: "read",
            });

        const files: ProjectFile[] = [];

        const children = await readDirectory(
            directoryHandle,
            "",
            files
        );

        return {
            title: directoryHandle.name,
            type: "project",
            children,
            files,
        };
    } catch (error) {
        // User cancelled the folder picker
        if (
            error instanceof DOMException &&
            error.name === "AbortError"
        ) {
            return null;
        }

        throw error;
    }
}

// --------------------------------------------------
// Read directory recursively
// --------------------------------------------------

async function readDirectory(
    directoryHandle: FileSystemDirectoryHandle,
    parentPath: string,
    files: ProjectFile[]
): Promise<ProjectNode[]> {
    const children: ProjectNode[] = [];

    for await (const [
        name,
        handle,
    ] of directoryHandle.entries()) {
        // Ignore unwanted directories
        if (
            handle.kind === "directory" &&
            IGNORED_DIRECTORIES.has(name)
        ) {
            continue;
        }

        const currentPath = parentPath
            ? `${parentPath}/${name}`
            : name;

        // ----------------------------------------------
        // Directory
        // ----------------------------------------------

        if (handle.kind === "directory") {
            const folderChildren = await readDirectory(
                handle,
                currentPath,
                files
            );

            const folder: ProjectFolder = {
                id: generateId(),
                name,
                type: "folder",
                path: currentPath,
                children: folderChildren,
            };

            children.push(folder);

            continue;
        }

        // ----------------------------------------------
        // File
        // ----------------------------------------------

        if (handle.kind === "file") {
            const fileHandle =
                handle as FileSystemFileHandle;

            const file = await fileHandle.getFile();

            const content = await file.text();

            const projectFile: ProjectFile = {
                id: generateId(),
                name,
                type: "file",
                path: currentPath,
                content,
            };

            children.push(projectFile);

            files.push(projectFile);
        }
    }

    // Optional: folders first, then files
    children.sort((a, b) => {
        if (a.type !== b.type) {
            return a.type === "folder" ? -1 : 1;
        }

        return a.name.localeCompare(b.name);
    });

    return children;
}