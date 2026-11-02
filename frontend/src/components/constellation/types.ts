export type NodeType = "goal" | "skill" | "evidence" | "task";

export interface Node3D {
  id: string;
  type: NodeType;
  label: string;
  level: number;       // Posterior mean skill level (0.0 to 1.0)
  levelAfterPlan: number; // Morphed level under time slider
  uncertainty: number; // Posterior standard deviation (halo radius)
  weight: number;
  gap?: boolean;
  group?: string;
  evidence_count?: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  evidenceList?: Array<{
    id: string;
    doc_id: string;
    doc_name: string;
    mentions: number;
    score: number;
    timestamp: string;
    origin: string;
  }>;
}

export interface Edge3D {
  source: string;
  target: string;
  type: "required" | "prerequisite" | "evidences" | "improves";
  weight: number;
  sourceNode?: Node3D;
  targetNode?: Node3D;
}

export interface GraphData3D {
  target: string;
  target_name: string;
  nodes: Node3D[];
  edges: Edge3D[];
  gaps: string[];
}

export type N = Node3D;
