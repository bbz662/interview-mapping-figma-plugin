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

  const nodeMap = new Map<string, SceneNode>();
  const page = figma.currentPage;
  const padding = 20; // Padding around nodes

  // Create components
  for (const component of result.components) {
    const node = figma.createFrame();
    node.resize(200 + padding * 2, 100 + padding * 2); // Increase node size to accommodate padding
    node.name = component.name;
    node.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];

    const innerFrame = figma.createFrame(); // Create an inner frame for content
    innerFrame.resize(200, 100);
    innerFrame.x = padding;
    innerFrame.y = padding;
    innerFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]; // White background
    node.appendChild(innerFrame);

    const text = figma.createText();
    text.characters = component.description;
    text.fontSize = 12;
    text.x = 10;
    text.y = 10;
    innerFrame.appendChild(text);

    // Position the node in a grid layout
    const index = result.components.indexOf(component);
    const columns = 3;
    node.x = (index % columns) * (250 + padding * 2);
    node.y = Math.floor(index / columns) * (150 + padding * 2);

    nodeMap.set(component.id, node);
    page.appendChild(node);
  }

  // Create connections between components
  for (const component of result.components) {
    const startNode = nodeMap.get(component.id);
    if (!startNode) {
      console.error(`Start node not found for component ${component.id}`);
      continue;
    }

    for (const connection of component.connections) {
      const endNode = nodeMap.get(connection.id);
      if (!endNode) {
        console.error(`End node not found for connection ${connection.id}`);
        continue;
      }

      // Create a vector
      const vector = figma.createVector();
      vector.strokeWeight = 2;
      vector.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

      // Calculate start and end points with padding
      const startX = startNode.x + startNode.width / 2;
      const startY = startNode.y + startNode.height / 2;
      const endX = endNode.x + endNode.width / 2;
      const endY = endNode.y + endNode.height / 2;

      // Calculate midpoint for orthogonal routing
      const midX = (startX + endX) / 2;
      const midY = (startY + endY) / 2;

      // Create orthogonal path
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

      // Add a label to the vector
      const label = figma.createText();
      label.characters = connection.type;
      label.fontSize = 10;

      // Position the label at the midpoint of the vector
      label.x = midX;
      label.y = midY;

      // Group the vector and label
      const group = figma.group([vector, label], page);
      group.name = `Connection: ${component.name} -> ${connection.type}`;

      console.log(`Created connection from ${startNode.name} to ${endNode.name}`);
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
