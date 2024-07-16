// code.ts

// Interfaces
interface KACard {
  id: string;
  event: string;
  innerVoice: string;
  value: string;
}

interface Cluster {
  id: string;
  name: string;
  representingValue: string;
  kaCards: string[];
}

interface Connection {
  from: string;
  to: string;
  type: 'strong' | 'weak';
  description: string;
  relatedKACards: string[];
}

interface KAAnalysis {
  kaCards: KACard[];
  clusters: Cluster[];
  connections: Connection[];
}

interface AnalysisResult {
  kaAnalysis: KAAnalysis;
}

// Main code
figma.showUI(__html__);

figma.ui.onmessage = async (msg: { type: string; result?: AnalysisResult; error?: string }) => {
  if (msg.type === 'analysis-complete') {
    if (msg.result) {
      try {
        await renderAnalysisResults(msg.result);
        figma.closePlugin();
      } catch (error) {
        console.error('Error rendering analysis results:', error);
        figma.notify('An error occurred while rendering the analysis results.', { error: true });
      }
    } else if (msg.error) {
      figma.notify(`Error: ${msg.error}`, { error: true });
    }
  }
};

async function renderAnalysisResults(result: AnalysisResult) {
  const frame = figma.createFrame();
  frame.name = 'KA Analysis';
  frame.resize(1000, 800);

  await renderClusters(result.kaAnalysis.clusters, frame);
  await renderConnections(result.kaAnalysis.connections, frame);
}

async function renderClusters(clusters: Cluster[], parent: FrameNode) {
  const clusterSize = 150;
  const padding = 20;

  for (let i = 0; i < clusters.length; i++) {
    const cluster = clusters[i];
    const x = (i % 3) * (clusterSize + padding);
    const y = Math.floor(i / 3) * (clusterSize + padding);

    const clusterNode = figma.createFrame();
    clusterNode.name = cluster.name;
    clusterNode.resize(clusterSize, clusterSize);
    clusterNode.x = x;
    clusterNode.y = y;
    clusterNode.cornerRadius = 8;
    clusterNode.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 1 } }];

    const text = figma.createText();
    await figma.loadFontAsync({ family: "Inter", style: "Regular" });
    text.characters = cluster.name;
    text.fontSize = 12;
    text.x = 10;
    text.y = 10;
    text.textAutoResize = 'HEIGHT';
    text.resize(clusterSize - 20, 20);

    clusterNode.appendChild(text);
    parent.appendChild(clusterNode);
  }
}

async function renderConnections(connections: Connection[], parent: FrameNode) {
  for (const connection of connections) {
    const fromNode = parent.findChild(n => n.name === connection.from) as FrameNode;
    const toNode = parent.findChild(n => n.name === connection.to) as FrameNode;

    if (fromNode && toNode) {
      const line = figma.createLine();
      line.x = fromNode.x + fromNode.width / 2;
      line.y = fromNode.y + fromNode.height / 2;
      line.strokeWeight = connection.type === 'strong' ? 2 : 1;
      line.strokeCap = 'ROUND';
      line.strokeJoin = 'ROUND';
      line.resize(
        toNode.x + toNode.width / 2 - line.x,
        toNode.y + toNode.height / 2 - line.y
      );
      parent.appendChild(line);
    }
  }
}