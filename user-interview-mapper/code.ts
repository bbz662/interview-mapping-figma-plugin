// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

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
  type: string;
  description?: string;
  relatedKACards?: string[];
}

interface AnalysisResult {
  kaCards: KACard[];
  clusters: Cluster[];
  connections: Connection[];
}

interface NodeInfo {
  position: { x: number; y: number };
  node?: FrameNode;
}

figma.showUI(__html__, { width: 500, height: 500 });

figma.ui.onmessage = async (msg: { type: string; result?: AnalysisResult; error?: string }) => {
  if (msg.type === 'analysis-complete') {
    if (msg.result) {
      await renderAnalysisResults(msg.result);
      figma.closePlugin();
    } else if (msg.error) {
      figma.notify(`Error: ${msg.error}`, { error: true });
    }
  }
};

async function renderAnalysisResults(result: AnalysisResult): Promise<void> {
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  const nodeMap = new Map<string, NodeInfo>();
  const page = figma.currentPage;
  const padding = 20;
  const nodeWidth = 200 + padding * 2;
  const nodeHeight = 100 + padding * 2;

  // Initialize node positions randomly for clusters
  for (const cluster of result.clusters) {
    const position = {
      x: Math.random() * figma.viewport.bounds.width,
      y: Math.random() * figma.viewport.bounds.height
    };
    nodeMap.set(cluster.id, { position });
  }

  // Apply force-directed layout
  const iterations = 50;
  const k = 300; // Spring constant
  for (let i = 0; i < iterations; i++) {
    for (const cluster of result.clusters) {
      const nodeInfo = nodeMap.get(cluster.id);
      if (!nodeInfo) continue;

      let fx = 0, fy = 0;

      // Repulsive force from other nodes
      for (const otherNodeInfo of nodeMap.values()) {
        if (otherNodeInfo !== nodeInfo) {
          const dx = nodeInfo.position.x - otherNodeInfo.position.x;
          const dy = nodeInfo.position.y - otherNodeInfo.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          if (distance > 0) {
            const force = k * k / distance;
            fx += force * dx / distance;
            fy += force * dy / distance;
          }
        }
      }

      // Attractive force from connected nodes
      for (const connection of result.connections) {
        if (connection.from === cluster.id || connection.to === cluster.id) {
          const connectedId = connection.from === cluster.id ? connection.to : connection.from;
          const connectedNodeInfo = nodeMap.get(connectedId);
          if (connectedNodeInfo) {
            const dx = nodeInfo.position.x - connectedNodeInfo.position.x;
            const dy = nodeInfo.position.y - connectedNodeInfo.position.y;
            const distance = Math.sqrt(dx * dx + dy * dy);
            fx -= k * dx / distance;
            fy -= k * dy / distance;
          }
        }
      }

      // Update position
      nodeInfo.position.x += fx * 0.1;
      nodeInfo.position.y += fy * 0.1;
    }
  }

  // Create nodes for clusters
  for (const cluster of result.clusters) {
    const nodeInfo = nodeMap.get(cluster.id);
    if (!nodeInfo) continue;

    const node = figma.createFrame();
    node.resize(nodeWidth, nodeHeight);
    node.name = cluster.name;
    node.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];

    const innerFrame = figma.createFrame();
    innerFrame.resize(200, 100);
    innerFrame.x = padding;
    innerFrame.y = padding;
    innerFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    node.appendChild(innerFrame);

    const text = figma.createText();
    text.characters = `${cluster.name}\n${cluster.representingValue}`;
    text.fontSize = 12;
    text.x = 10;
    text.y = 10;
    innerFrame.appendChild(text);

    node.x = nodeInfo.position.x;
    node.y = nodeInfo.position.y;

    nodeInfo.node = node;
    page.appendChild(node);
  }

  // Create connections
  for (const connection of result.connections) {
    const startNodeInfo = nodeMap.get(connection.from);
    const endNodeInfo = nodeMap.get(connection.to);
    if (!startNodeInfo || !startNodeInfo.node || !endNodeInfo || !endNodeInfo.node) continue;

    const vector = figma.createVector();
    vector.strokeWeight = 2;
    vector.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

    const startNode = startNodeInfo.node;
    const endNode = endNodeInfo.node;
    const startCenter = { x: startNode.x + startNode.width / 2, y: startNode.y + startNode.height / 2 };
    const endCenter = { x: endNode.x + endNode.width / 2, y: endNode.y + endNode.height / 2 };

    let startX, startY, endX, endY;

    if (Math.abs(startCenter.x - endCenter.x) > Math.abs(startCenter.y - endCenter.y)) {
      startX = startCenter.x < endCenter.x ? startNode.x + startNode.width : startNode.x;
      startY = startCenter.y;
      endX = startCenter.x < endCenter.x ? endNode.x : endNode.x + endNode.width;
      endY = endCenter.y;
    } else {
      startX = startCenter.x;
      startY = startCenter.y < endCenter.y ? startNode.y + startNode.height : startNode.y;
      endX = endCenter.x;
      endY = startCenter.y < endCenter.y ? endNode.y : endNode.y + endNode.height;
    }

    const midX = (startX + endX) / 2;
    const midY = (startY + endY) / 2;

    await vector.setVectorNetworkAsync({
      vertices: [
        { x: startX, y: startY },
        { x: midX, y: startY },
        { x: midX, y: endY },
        { x: endX, y: endY }
      ],
      segments: [
        { start: 0, end: 1 },
        { start: 1, end: 2 },
        { start: 2, end: 3 }
      ]
    });

    const label = figma.createText();
    label.characters = `${connection.type}\n${connection.description || ''}`;
    label.fontSize = 10;
    label.x = midX - label.width / 2;
    label.y = midY - label.height / 2;

    const group = figma.group([vector, label], page);
    group.name = `Connection: ${connection.from} -> ${connection.to}`;
  }

  // Move all connection groups to the back
  const connections = page.findChildren(n => n.type === 'GROUP' && n.name.startsWith('Connection:'));
  connections.forEach(connection => {
    page.insertChild(0, connection);
  });

  // Adjust the view to fit all created nodes
  figma.viewport.scrollAndZoomIntoView(page.children);
}