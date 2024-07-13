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

  const nodeMap = new Map<string, ComponentNode>();
  const page = figma.currentPage;

  // Create components
  result.components.forEach((component, index) => {
    const node = figma.createComponent();
    node.resize(200, 100);
    node.name = component.name;

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
    if (!startNode) return;

    component.connections.forEach(connection => {
      const endNode = nodeMap.get(connection.id);
      if (!endNode) return;

      const connector = figma.createConnector();
      connector.strokeWeight = 2;
      connector.connectorStart = { endpointNodeId: startNode.id, magnet: 'AUTO' };
      connector.connectorEnd = { endpointNodeId: endNode.id, magnet: 'AUTO' };

      // Add a label to the connector
      const label = figma.createText();
      label.characters = connection.type;
      label.fontSize = 10;

      // Position the label at the midpoint of the connector
      const midX = (startNode.x + endNode.x) / 2;
      const midY = (startNode.y + endNode.y) / 2;
      label.x = midX;
      label.y = midY;

      // Group the connector and label
      const group = figma.group([connector, label], page);
      group.name = `Connection: ${component.name} -> ${connection.type}`;
    });
  });

  // Adjust the view to fit all created nodes
  figma.viewport.scrollAndZoomIntoView(page.children);
}
