"use client";

import { importFolder } from "./folderImporter";

export default function ProjectImporter() {
    const handleImport = async () => {
        try {
            const project = await importFolder();

            if (!project) {
                console.log("User cancelled import");
                return;
            }

            console.log("Imported project:", project);

            console.log(
                "Project JSON:",
                JSON.stringify(project, null, 2)
            );
        } catch (error) {
            console.error("Failed to import project:", error);
        }
    };

    return (
        <button onClick={handleImport}>
            Import Folder
        </button>
    );
}