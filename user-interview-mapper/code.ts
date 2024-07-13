// This plugin will open a window to prompt the user to enter a number, and
// it will then create that many rectangles on the screen.

// This file holds the main code for plugins. Code in this file has access to
// the *figma document* via the figma global object.
// You can access browser APIs in the <script> tag inside "ui.html" which has a
// full browser environment (See https://www.figma.com/plugin-docs/how-plugins-run).

interface AnalysisResult {
  components: Component[];
}

interface Component {
  id: string;
  name: string;
  description: string;
  connections: Connection[];
}

interface Connection {
  id: string;
  type: string;
}

interface Point {
  x: number;
  y: number;
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

  // Initialize node positions randomly
  for (const component of result.components) {
    const position = {
      x: Math.random() * figma.viewport.bounds.width,
      y: Math.random() * figma.viewport.bounds.height
    };
    nodeMap.set(component.id, { position });
  }

  // Apply force-directed layout
  const iterations = 50;
  const k = 300; // Spring constant
  for (let i = 0; i < iterations; i++) {
    for (const component of result.components) {
      const nodeInfo = nodeMap.get(component.id);
      if (!nodeInfo) continue;  // Skip if nodeInfo is undefined

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
      for (const connection of component.connections) {
        const connectedNodeInfo = nodeMap.get(connection.id);
        if (connectedNodeInfo) {
          const dx = nodeInfo.position.x - connectedNodeInfo.position.x;
          const dy = nodeInfo.position.y - connectedNodeInfo.position.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          fx -= k * dx / distance;
          fy -= k * dy / distance;
        }
      }

      // Update position
      nodeInfo.position.x += fx * 0.1;
      nodeInfo.position.y += fy * 0.1;
    }
  }

  // Create nodes
  for (const component of result.components) {
    const nodeInfo = nodeMap.get(component.id);
    if (!nodeInfo) continue;  // Skip if nodeInfo is undefined

    const node = figma.createFrame();
    node.resize(nodeWidth, nodeHeight);
    node.name = component.name;
    node.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];

    const innerFrame = figma.createFrame();
    innerFrame.resize(200, 100);
    innerFrame.x = padding;
    innerFrame.y = padding;
    innerFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
    node.appendChild(innerFrame);

    const text = figma.createText();
    text.characters = component.description;
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
  for (const component of result.components) {
    const startNodeInfo = nodeMap.get(component.id);
    if (!startNodeInfo || !startNodeInfo.node) continue;

    for (const connection of component.connections) {
      const endNodeInfo = nodeMap.get(connection.id);
      if (!endNodeInfo || !endNodeInfo.node) continue;

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
      label.characters = connection.type;
      label.fontSize = 10;
      label.x = midX - label.width / 2;
      label.y = midY - label.height / 2;

      const group = figma.group([vector, label], page);
      group.name = `Connection: ${component.name} -> ${connection.type}`;
    }
  }

  // Move all connection groups to the back
  const connections = page.findChildren(n => n.type === 'GROUP' && n.name.startsWith('Connection:'));
  connections.forEach(connection => {
    page.insertChild(0, connection);
  });

  // Adjust the view to fit all created nodes
  figma.viewport.scrollAndZoomIntoView(page.children);
}
