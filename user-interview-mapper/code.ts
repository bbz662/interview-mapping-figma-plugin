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

  // Create components
  result.components.forEach((component, index) => {
    const node = figma.createFrame();
    node.resize(200, 100);
    node.name = component.name;
    node.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];

    const text = figma.createText();
    text.characters = component.description;
    text.fontSize = 12;
    text.x = 10;
    text.y = 10;
    node.appendChild(text);

    // Position the node in a grid layout
    const columns = 3;
    node.x = (index % columns) * 250;
    node.y = Math.floor(index / columns) * 150;

    nodeMap.set(component.id, node);
    page.appendChild(node);
  });

  // Create connections between components
  result.components.forEach(component => {
    const startNode = nodeMap.get(component.id);
    if (!startNode) {
      console.error(`Start node not found for component ${component.id}`);
      return;
    }

    component.connections.forEach(connection => {
      const endNode = nodeMap.get(connection.id);
      if (!endNode) {
        console.error(`End node not found for connection ${connection.id}`);
        return;
      }

      try {
        if (typeof figma.createConnector !== 'function') {
          throw new Error('createConnector is not available in this version of Figma API');
        }

        const connector = figma.createConnector();
        connector.strokeWeight = 2;
        connector.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];
        connector.connectorStart = { endpointNodeId: startNode.id, magnet: 'AUTO' };
        connector.connectorEnd = { endpointNodeId: endNode.id, magnet: 'AUTO' };
        connector.connectorLineType = 'ELBOWED';  // or 'STRAIGHT'

        // Set the connector's text
        connector.text.characters = connection.type;
        connector.text.fontSize = 10;

        page.appendChild(connector);

        console.log(`Created connector from ${startNode.name} to ${endNode.name}`);
      } catch (error) {
        console.error('Error creating connector:', error);

        // Fallback to creating a line if connector creation fails
        const line = figma.createLine();
        line.strokeWeight = 2;
        line.strokes = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }];

        const startX = startNode.x + startNode.width / 2;
        const startY = startNode.y + startNode.height / 2;
        const endX = endNode.x + endNode.width / 2;
        const endY = endNode.y + endNode.height / 2;

        line.x = startX;
        line.y = startY;
        line.resize(endX - startX, endY - startY);

        const label = figma.createText();
        label.characters = connection.type;
        label.fontSize = 10;
        label.x = (startX + endX) / 2;
        label.y = (startY + endY) / 2;

        const group = figma.group([line, label], page);
        group.name = `Connection: ${component.name} -> ${connection.type}`;

        console.log(`Created line from ${startNode.name} to ${endNode.name} (fallback)`);
      }
    });
  });

  // Adjust the view to fit all created nodes
  figma.viewport.scrollAndZoomIntoView(page.children);
}