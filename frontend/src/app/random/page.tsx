"use client";

import { ImportedProject } from "@/components/whiteboard/folderImporter";
import { importFolder } from "@/components/whiteboard/folderImporter";
import { useState } from "react";

export default function Random() {
    const [project, setProject] = useState<ImportedProject | null>(null)

    const [selectedNode, setSelectedNode] = useState<string | null>(null)
    const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())

    const renderNode = (nodeId: string) => {
        console.log('ABCD-nodeId', nodeId)
        if (expandedNodes.has(nodeId)) {
            setSelectedNode(null)
            setExpandedNodes(prev => new Set([...prev].filter(id => id !== nodeId)))
        } else {
            setSelectedNode(nodeId)
            setExpandedNodes(prev => new Set([...prev, nodeId]))
        }
    }
    const renderChildern = (child: any) => {
        return (
            <ol key={child.id} >
                <div style={{ display: 'flex', gap: '5px' }}>
                    <div>{child?.type == "folder" ? '>' : 'F'}</div>
                    <div onClick={() => renderNode(child.id)}>{child?.name}</div>
                </div>
                <div className="ml-5" style={{ display: expandedNodes.has(child.id) ? 'block' : 'none' }}>
                    {child?.children?.map(renderChildern)}
                </div>
            </ol>
        )
    }


    const handleImport = async () => {
        try {
            const importedproject = await importFolder();

            if (!importedproject) {
                console.log("User cancelled import");
                return;
            }
            setProject(importedproject)
            console.log("Imported project:", importedproject);

            console.log(
                "Project JSON:",
                JSON.stringify(importedproject, null, 2)
            );
        } catch (error) {
            console.error("Failed to import project:", error);
        }
    };


    console.log('ABCD-ee', project, expandedNodes, selectedNode)

    return (
        <div className="">
            <button type="button" onClick={handleImport}>
                Import Folder
            </button>
            <ol>
                {project?.children.map(child => renderChildern(child))}
            </ol>
        </div>
    );
}
