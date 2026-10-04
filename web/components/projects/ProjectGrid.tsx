import React from "react";
import { Project } from "@/types";
import { ProjectCard } from "./ProjectCard";

interface ProjectGridProps {
  projects: Project[];
  onDeploy: (project: Project) => void;
  onRollback: (project: Project) => void;
  onViewLogs: (project: Project) => void;
  onOpenEnvVars: (project: Project) => void;
  onOpenTerminal?: (project: Project) => void;
}

export const ProjectGrid: React.FC<ProjectGridProps> = ({
  projects,
  onDeploy,
  onRollback,
  onViewLogs,
  onOpenEnvVars,
  onOpenTerminal,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {projects.map((proj) => (
          <ProjectCard
            key={proj.id}
            project={proj}
            onDeploy={onDeploy}
            onRollback={onRollback}
            onViewLogs={onViewLogs}
            onOpenEnvVars={onOpenEnvVars}
            onOpenTerminal={onOpenTerminal}
          />
        ))}
      </div>
    </div>
  );
};
